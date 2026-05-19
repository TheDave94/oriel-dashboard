#!/usr/bin/env node
// Translation file linter — catches three classes of bug:
//   1. Invalid JSON
//   2. Duplicate keys in any object (JSON.parse silently keeps the last value)
//   3. Key-parity drift between en.json and de.json (key in one, missing in the other)
//
// JSON.parse drops duplicate keys without raising, so for (2) we re-tokenize
// the raw text and walk the object structure ourselves.

import { readFileSync } from 'node:fs';

const FILES = ['src/translations/en.json', 'src/translations/de.json'];

let problems = 0;
const report = (file, msg) => {
  console.error(`[lint-translations] ${file}: ${msg}`);
  problems++;
};

// Walk a JSON.parse-able text and report duplicate keys.
// Uses a simple state machine over the raw text so we see every key occurrence,
// not just the last one (which is all JSON.parse retains).
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
      // string literal — find matching close, honoring escapes
      const start = i;
      let startLine = line;
      i++;
      while (i < len && text[i] !== '"') {
        if (text[i] === '\\') i++;
        if (text[i] === '\n') line++;
        i++;
      }
      const value = text.slice(start + 1, i);
      i++; // past closing quote
      // skip whitespace
      while (i < len && /\s/.test(text[i])) { if (text[i] === '\n') line++; i++; }
      // if next non-ws is ':', this string is a key
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

// Walk a parsed object and collect every leaf key-path.
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

const parsed = {};
for (const f of FILES) {
  let raw;
  try {
    raw = readFileSync(f, 'utf8');
  } catch (e) {
    report(f, `cannot read: ${e.message}`);
    continue;
  }
  try {
    parsed[f] = JSON.parse(raw);
  } catch (e) {
    report(f, `invalid JSON: ${e.message}`);
    continue;
  }
  findDuplicateKeys(f, raw);
}

// Key-parity check between en and de.
if (parsed[FILES[0]] && parsed[FILES[1]]) {
  const enKeys = new Set(collectKeys(parsed[FILES[0]]));
  const deKeys = new Set(collectKeys(parsed[FILES[1]]));
  for (const k of enKeys) {
    if (!deKeys.has(k)) report(FILES[1], `missing key '${k}' (present in en.json)`);
  }
  for (const k of deKeys) {
    if (!enKeys.has(k)) report(FILES[0], `missing key '${k}' (present in de.json)`);
  }
}

if (problems > 0) {
  console.error(`\n[lint-translations] ${problems} problem(s) found.`);
  process.exit(1);
}
console.log('[lint-translations] OK');
