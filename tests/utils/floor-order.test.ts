// ============================================================================
// Tests — configurable floor ordering (#129)
// ============================================================================
// getOrderedFloorIds is the single source of truth for floor order across the
// overview, lights, and covers views. Default = HA registry order; with
// floors_display.order it sorts listed floors first (in that order), then any
// unlisted floors in registry order.
// ============================================================================

import { describe, it, expect } from 'vitest';

import { getOrderedFloorIds } from '../../src/utils/name-utils';
import { makeHass } from '../fixtures/hass';

const HASS = () =>
  makeHass({
    floors: [
      { floor_id: 'ground', name: 'Ground' },
      { floor_id: 'first', name: 'First' },
      { floor_id: 'attic', name: 'Attic' },
    ],
  });

describe('getOrderedFloorIds (#129)', () => {
  it('returns HA registry order when no config is given', () => {
    expect(getOrderedFloorIds(HASS(), undefined)).toEqual(['ground', 'first', 'attic']);
  });

  it('returns registry order when order is empty', () => {
    expect(getOrderedFloorIds(HASS(), { order: [] })).toEqual(['ground', 'first', 'attic']);
  });

  it('applies a full custom order', () => {
    expect(getOrderedFloorIds(HASS(), { order: ['attic', 'ground', 'first'] })).toEqual([
      'attic',
      'ground',
      'first',
    ]);
  });

  it('places listed floors first, unlisted ones after in registry order', () => {
    // Only 'attic' listed → it goes first; ground/first follow in registry order.
    expect(getOrderedFloorIds(HASS(), { order: ['attic'] })).toEqual([
      'attic',
      'ground',
      'first',
    ]);
  });

  it('ignores unknown floor_ids in the order list', () => {
    expect(getOrderedFloorIds(HASS(), { order: ['gone', 'first'] })).toEqual([
      'first',
      'ground',
      'attic',
    ]);
  });
});
