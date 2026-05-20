#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename, security/detect-object-injection
 *  -- this script runs only in CI against translation files committed
 *     to this repo. There is no user-controlled input. File paths come
 *     from a readdir of the locked translations directory; object
 *     accesses are over the resulting parsed JSON.
 */
// Translation file linter — catches three classes of bug:
//   1. Invalid JSON
//   2. Duplicate keys in any object (JSON.parse silently keeps the last value)
//   3. Key-parity drift between en.json and every other locale (missing keys
//      in either direction)
//
// JSON.parse drops duplicate keys without raising, so for (2) we re-tokenize
// the raw text and walk the object structure ourselves.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TRANSLATIONS_DIR = 'src/translations';
const REFERENCE_LANG = 'en';
const REFERENCE_PATH = path.join(TRANSLATIONS_DIR, `${REFERENCE_LANG}.json`);

// Discover every JSON file in the translations directory. New locales
// require nothing more than dropping a file alongside en.json.
const localeFiles = readdirSync(TRANSLATIONS_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((name) => path.join(TRANSLATIONS_DIR, name))
  .sort();

if (!localeFiles.includes(REFERENCE_PATH)) {
  console.error(`[lint-translations] ${REFERENCE_PATH} missing — that's the reference locale.`);
  process.exit(1);
}

let problems = 0;

function report(file, msg) {
  console.error(`[lint-translations] ${file}: ${msg}`);
  problems++;
}

// Walk a JSON.parse-able text and report duplicate keys.
function findDuplicateKeys(file, text) {
  const stack = [new Set()]; // each frame = keys seen so far in the current object
  let i = 0;
  let line = 1;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (c === '\n') line++;
    if (c === '{') { stack.push(new Set()); i++; continue; }
    if (c === '}') { stack.pop(); i++; continue; }
    if (c === '[') { stack.push(null); i++; continue; } // sentinel: skip dup-tracking inside arrays
    if (c === ']') { stack.pop(); i++; continue; }
    if (c === '"') {
      const start = i;
      const startLine = line;
      i++;
      while (i < len && text[i] !== '"') {
        if (text[i] === '\\') i++;
        if (text[i] === '\n') line++;
        i++;
      }
      const value = text.slice(start + 1, i);
      i++;
      while (i < len && /\s/.test(text[i])) { if (text[i] === '\n') line++; i++; }
      if (text[i] === ':') {
        const frame = stack[stack.length - 1];
        if (frame instanceof Set) {
          if (frame.has(value)) {
            report(file, `duplicate key '${value}' near line ${startLine}`);
          }
          frame.add(value);
        }
      }
      continue;
    }
    i++;
  }
}

function collectKeys(obj, prefix = '') {
  const out = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      const v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.push(...collectKeys(v, next));
      } else {
        out.push(next);
      }
    }
  }
  return out;
}

// Parse each locale file. Track raw text so we can run the duplicate-key
// detector against it (JSON.parse drops dupes silently).
const parsed = {};
for (const file of localeFiles) {
  const text = readFileSync(file, 'utf8');
  try {
    parsed[file] = { json: JSON.parse(text), text };
  } catch (e) {
    report(file, `invalid JSON: ${e.message}`);
    parsed[file] = null;
  }
}

for (const file of localeFiles) {
  if (parsed[file]) findDuplicateKeys(file, parsed[file].text);
}

// Parity check: every locale must have the same keys as the reference.
const reference = parsed[REFERENCE_PATH];
if (reference) {
  const refKeys = new Set(collectKeys(reference.json));
  for (const file of localeFiles) {
    if (file === REFERENCE_PATH) continue;
    if (!parsed[file]) continue;
    const localeKeys = new Set(collectKeys(parsed[file].json));
    for (const k of refKeys) {
      if (!localeKeys.has(k)) report(file, `missing key '${k}' (present in ${REFERENCE_PATH})`);
    }
    for (const k of localeKeys) {
      if (!refKeys.has(k)) report(REFERENCE_PATH, `missing key '${k}' (present in ${file})`);
    }
  }
}

if (problems > 0) {
  console.error(`\n[lint-translations] ${problems} problem(s) found.`);
  process.exit(1);
}
console.log(`[lint-translations] OK (${localeFiles.length} locale(s))`);
