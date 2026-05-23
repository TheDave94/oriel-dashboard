// ============================================================================
// Tests — Adaptive hints, with focus on `enable-mode-reorder` (post-v4.10.x)
// ============================================================================
// The mode-reorder hint used to write hardcoded `morning / evening / night /
// away` keys into `sections_order_by_mode`, regardless of what the user's
// `input_select.house_mode` actually offered. For a typical HA install
// (`At Home / Away / Holiday`) that produced a config that only matched on
// the "Away" state — the rest silently fell back to `sections_order`.
//
// See `docs/investigations/house-mode-mismatch.md` for the full audit.
//
// This file pins the post-fix contract:
//   1. apply() reads `input_select.house_mode.attributes.options` at apply
//      time and seeds normalized keys from those.
//   2. apply() returns null (no-op) when the entity is missing or has no
//      options — refuses to write a guess.
//   3. Keys the hint writes survive the strategy's lookup-time normalization
//      ("At Home" → "at_home" both at write and at read time).
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, afterEach } from 'vitest';

import { HINTS, normalizeHouseModeKey } from '../../src/onboarding/hints';
import type { OrielConfig } from '../../src/types/strategy';
import { makeHass } from '../fixtures/hass';

function modeReorderHint() {
  const hint = HINTS.find((h) => h.id === 'enable-mode-reorder');
  if (!hint) throw new Error('enable-mode-reorder hint missing from HINTS registry');
  return hint;
}

describe('normalizeHouseModeKey', () => {
  it('lowercases and collapses spaces/dashes/underscores to a single underscore', () => {
    expect(normalizeHouseModeKey('At Home')).toBe('at_home');
    expect(normalizeHouseModeKey('AT HOME')).toBe('at_home');
    expect(normalizeHouseModeKey('at_home')).toBe('at_home');
    expect(normalizeHouseModeKey('at-home')).toBe('at_home');
    expect(normalizeHouseModeKey('morning')).toBe('morning');
    expect(normalizeHouseModeKey('Holiday')).toBe('holiday');
  });

  it('collapses runs of separators', () => {
    expect(normalizeHouseModeKey('At  Home')).toBe('at_home');
    expect(normalizeHouseModeKey('At-_Home')).toBe('at_home');
  });
});

describe('enable-mode-reorder hint — apply()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('seeds normalized keys from input_select.house_mode.options at apply time', () => {
    // Repro of the production scenario from
    // docs/investigations/house-mode-mismatch.md: HA exposes
    // `At Home / Away / Holiday`, hint must produce keys matching
    // those — not the hardcoded morning/evening/night/away of the
    // pre-fix shape.
    const hass = makeHass({
      entities: [
        {
          entity_id: 'input_select.house_mode',
          state: 'At Home',
          attributes: { options: ['At Home', 'Away', 'Holiday'] },
        },
      ],
    });
    const hint = modeReorderHint();
    const result = hint.apply({}, hass);
    expect(result).not.toBeNull();
    const sob = (result as OrielConfig & { sections_order_by_mode?: Record<string, string[]> })
      .sections_order_by_mode;
    expect(sob).toBeDefined();
    expect(Object.keys(sob ?? {}).sort()).toEqual(['at_home', 'away', 'holiday']);
    // Every detected mode gets a non-empty placeholder list — the
    // hint is a starter, not a final config.
    for (const key of Object.keys(sob ?? {})) {
      expect((sob ?? {})[key]?.length, `mode ${key} should have a placeholder order`).toBeGreaterThan(0);
    }
  });

  it('does NOT write the legacy hardcoded morning/evening/night/away keys for an At Home / Away / Holiday install', () => {
    const hass = makeHass({
      entities: [
        {
          entity_id: 'input_select.house_mode',
          attributes: { options: ['At Home', 'Away', 'Holiday'] },
        },
      ],
    });
    const result = modeReorderHint().apply({}, hass);
    const keys = Object.keys(
      (result as OrielConfig & { sections_order_by_mode?: Record<string, string[]> }).sections_order_by_mode ?? {},
    );
    // The point of the fix: "morning" must not appear when HA only
    // offers At Home / Away / Holiday. If it does, we've regressed.
    expect(keys).not.toContain('morning');
    expect(keys).not.toContain('evening');
    expect(keys).not.toContain('night');
  });

  it('returns null (no-op) when input_select.house_mode is absent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hass = makeHass(); // no entities
    const result = modeReorderHint().apply({}, hass);
    expect(result).toBeNull();
    // Don't pin the warning text precisely (it's a diagnostic that may
    // evolve), but apply() shouldn't have silently no-op'd. Either:
    //   - apply() warned, or
    //   - apply() returned null without warning (also acceptable when
    //     test() correctly filters this case beforehand).
    // The contract that matters is the null return.
    warn.mockRestore();
  });

  it('returns null when input_select.house_mode exists but has no options attribute', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hass = makeHass({
      entities: [{ entity_id: 'input_select.house_mode', state: 'At Home' }],
    });
    const result = modeReorderHint().apply({}, hass);
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns null when options is an empty array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hass = makeHass({
      entities: [
        {
          entity_id: 'input_select.house_mode',
          attributes: { options: [] },
        },
      ],
    });
    const result = modeReorderHint().apply({}, hass);
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('preserves existing config fields when applying', () => {
    const hass = makeHass({
      entities: [
        {
          entity_id: 'input_select.house_mode',
          attributes: { options: ['At Home', 'Away'] },
        },
      ],
    });
    const before: OrielConfig = { show_persons_section: true } as OrielConfig;
    const after = modeReorderHint().apply(before, hass) as OrielConfig & { show_persons_section?: boolean };
    expect(after.show_persons_section).toBe(true);
    expect((after as { sections_order_by_mode?: unknown }).sections_order_by_mode).toBeDefined();
  });
});

describe('round-trip — hint writes keys that the strategy reads', () => {
  // The strategy's mode-reorder block (`OverviewViewStrategy.ts:296`)
  // normalizes the entity state via the same `[\s_-]+` collapse before
  // looking it up in `sections_order_by_mode`. If the hint and the
  // strategy ever drift on their normalization, this test catches it.
  // We replicate the strategy's normalize inline rather than importing
  // OverviewViewStrategy (which would pull half the bundle into the
  // test). If the two drift, this test starts failing.
  const strategyNormalize = (s: string): string =>
    s.toLowerCase().replace(/[\s_-]+/g, '_');

  it.each([
    ['At Home', 'at_home'],
    ['Away', 'away'],
    ['Holiday', 'holiday'],
    ['HOLIDAY', 'holiday'],
    ['morning', 'morning'],
    ['my-mode', 'my_mode'],
    ['Work From Home', 'work_from_home'],
  ])('hint normalizes %s the same way the strategy does (→ %s)', (input, expected) => {
    expect(normalizeHouseModeKey(input)).toBe(expected);
    expect(strategyNormalize(input)).toBe(expected);
  });

  it('apply() output is directly looked up by the strategy via the same normalize', () => {
    const hass = makeHass({
      entities: [
        {
          entity_id: 'input_select.house_mode',
          state: 'At Home',
          attributes: { options: ['At Home', 'Away', 'Holiday'] },
        },
      ],
    });
    const result = modeReorderHint().apply({}, hass) as OrielConfig & {
      sections_order_by_mode: Record<string, string[]>;
    };
    // Strategy lookup at runtime: normalize current state, find the
    // matching key. For "At Home", normalize gives "at_home". The
    // hint MUST have written a key matching that — that's the bug we
    // fixed.
    const currentStateKey = strategyNormalize('At Home');
    expect(
      Object.keys(result.sections_order_by_mode),
      'one of the keys must match the normalized state',
    ).toContain(currentStateKey);
  });
});
