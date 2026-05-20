// ====================================================================
// Localization Utility (i18n)
// ====================================================================
// Singleton localization function. Reads hass.locale.language once at
// setup time. Falls back to English for missing keys/languages.
// Pattern adapted from mushroom-strategy.
//
// Adding a new locale: drop `src/translations/<lang>.json` and add it
// to the import + `languages` map below. Both edits land in this one
// file. Webpack's static `import` syntax doesn't support runtime
// directory globbing (that's a Vite feature) — the explicit map keeps
// chunk splitting deterministic and the bundle small (only languages
// the user actually has installed get loaded by the runtime). See
// `lint-translations.mjs` for the parity-check guard.
// ====================================================================

import * as de from '../translations/de.json';
import * as en from '../translations/en.json';
import type { HomeAssistant } from '../types/homeassistant';

const languages: Record<string, unknown> = { de, en };
const DEFAULT_LANG = 'en';

function getTranslatedString(key: string, lang: string): string | undefined {
  try {
    return key.split('.').reduce((o, i) => (o as Record<string, unknown>)[i], languages[lang]) as string;
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
  _localize = (key: string) => getTranslatedString(key, lang) ?? getTranslatedString(key, DEFAULT_LANG) ?? key;
}

/**
 * Translate a key using dot notation (e.g. 'views.lights').
 * Returns the key itself if no translation is found.
 */
export function localize(key: string): string {
  if (!_localize) return key;
  return _localize(key);
}
