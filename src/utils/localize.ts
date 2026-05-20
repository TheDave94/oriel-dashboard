// ====================================================================
// Localization Utility (i18n)
// ====================================================================
// Singleton localization function. Reads hass.locale.language once at
// setup time. Falls back to English for missing keys/languages.
//
// Adding a new locale:
//   1. Drop `src/translations/<lang>.json` (mirroring en.json).
//   2. Add the import + `LANGUAGES` map entry below (two lines).
//
// Why explicit imports instead of a runtime glob: vitest uses Vite
// under the hood while production builds via webpack — there's no
// glob syntax that works in both (`require.context` for webpack,
// `import.meta.glob` for Vite). Explicit imports work everywhere and
// keep chunk-splitting deterministic. lint-translations.mjs in CI
// auto-discovers all JSON files in the dir and runs parity checks
// against en.json, so the static map and the filesystem can't drift.
// ====================================================================

import * as de from '../translations/de.json';
import * as en from '../translations/en.json';
import type { HomeAssistant } from '../types/homeassistant';

const LANGUAGES: Record<string, unknown> = { de, en };
const DEFAULT_LANG = 'en';

function getTranslatedString(key: string, lang: string): string | undefined {
  try {
    return key.split('.').reduce(
      (o, i) => (o as Record<string, unknown>)[i],
      LANGUAGES[lang],
    ) as string;
  } catch {
    return undefined;
  }
}

let _localize: ((key: string) => string) | undefined;

/**
 * Initialize localization from the hass object.
 * Must be called once before localize() is used (typically in Registry.initialize).
 */
export function setupLocalize(hass?: HomeAssistant): void {
  const lang = hass?.locale.language ?? hass?.language ?? DEFAULT_LANG;
  _localize = (key: string) =>
    getTranslatedString(key, lang) ?? getTranslatedString(key, DEFAULT_LANG) ?? key;
}

/**
 * Translate a key using dot notation (e.g. 'views.lights').
 * Returns the key itself if no translation is found.
 */
export function localize(key: string): string {
  if (!_localize) return key;
  return _localize(key);
}
