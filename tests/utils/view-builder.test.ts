// ============================================================================
// Tests — dense section placement (#203)
// ============================================================================
// Oriel keeps weather and energy as separate sections; HA's non-dense masonry
// aligns each row to the tallest section, leaving vertical gaps. The opt-in
// `dense_section_placement` global toggle spreads HA's native
// `dense_section_placement: true` onto every generated sections view via the
// densePlacement() helper. Default off, so existing dashboards are unchanged.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { densePlacement, createOverviewView } from '../../src/utils/view-builder';

describe('densePlacement', () => {
  it('returns the dense flag only when explicitly enabled', () => {
    expect(densePlacement({ dense_section_placement: true })).toEqual({
      dense_section_placement: true,
    });
  });

  it('returns an empty fragment when disabled, absent, or config undefined', () => {
    expect(densePlacement({ dense_section_placement: false })).toEqual({});
    expect(densePlacement({})).toEqual({});
    expect(densePlacement(undefined)).toEqual({});
  });
});

describe('createOverviewView — dense placement wiring', () => {
  it('sets dense_section_placement on the view when enabled', () => {
    const view = createOverviewView([], [], { dense_section_placement: true });
    expect(view.dense_section_placement).toBe(true);
  });

  it('omits the key entirely when disabled or config absent (no layout change)', () => {
    expect('dense_section_placement' in createOverviewView([], [])).toBe(false);
    expect('dense_section_placement' in createOverviewView([], [], {})).toBe(false);
    expect(
      'dense_section_placement' in createOverviewView([], [], { dense_section_placement: false }),
    ).toBe(false);
  });
});
