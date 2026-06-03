// ============================================================================
// Tests — localize() miss-semantics (F2-root)
// ============================================================================
// localize() returns '' (empty string) on a translation miss — NOT the key —
// so the `localize(key) || 'fallback'` idiom fires and raw keys never leak
// into the UI. Before this fix a miss returned the key-string (truthy), so
// every defensive `|| 'fallback'` was silently bypassed and the raw key
// surfaced verbatim. This is the required-gate guard for that contract.
// ============================================================================

import { describe, it, expect, vi } from 'vitest';

import { setupLocalize, localize } from '../../src/utils/localize';

// A key that is guaranteed absent from en.json (namespaced nonsense).
const ABSENT_KEY = 'definitely.not.a.real.key.f2root';

describe('localize() — miss-semantics (F2-root)', () => {
  it('returns the translation for a present key', () => {
    setupLocalize({ locale: { language: 'en' } } as never);
    // `sections.routines` was added in v4.17.1 (F1) and is present in en.json.
    expect(localize('sections.routines')).toBe('Routines');
  });

  it('returns "" (NOT the key) for a missing key', () => {
    setupLocalize({ locale: { language: 'en' } } as never);
    const result = localize(ABSENT_KEY);
    expect(result).toBe('');
    expect(result).not.toBe(ABSENT_KEY);
  });

  it('makes the `localize(key) || fallback` idiom fire on a miss', () => {
    setupLocalize({ locale: { language: 'en' } } as never);
    expect(localize(ABSENT_KEY) || 'fallback').toBe('fallback');
    // and does NOT override a real translation
    expect(localize('sections.routines') || 'fallback').toBe('Routines');
  });

  it('falls back to English for an unknown language, still "" on a miss', () => {
    setupLocalize({ locale: { language: 'xx' } } as never);
    expect(localize('sections.routines')).toBe('Routines'); // en fallback
    expect(localize(ABSENT_KEY)).toBe('');
  });

  it('returns "" (not the key) when not yet initialized', async () => {
    // Fresh module instance so the singleton _localize is unset.
    vi.resetModules();
    const fresh = await import('../../src/utils/localize');
    expect(fresh.localize(ABSENT_KEY)).toBe('');
  });

  // Regression for the migrated SimpleConfigEditor computeLabel (category-iii):
  // under miss→'' the label must fall back to the raw field name, not blank.
  it('computeLabel idiom falls back to the field name on a miss (not blank)', () => {
    setupLocalize({ locale: { language: 'en' } } as never);
    const labelFor = (name: string) => localize(`some.absent.prefix.${name}`) || name;
    expect(labelFor('brightness')).toBe('brightness');
  });
});
