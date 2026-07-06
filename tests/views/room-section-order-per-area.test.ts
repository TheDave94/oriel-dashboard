// ============================================================================
// Tests — per-area room_section_order override
// ============================================================================
// The global `room_section_order` (#293) reorders every room view's
// entity-group sections. `areas_options.<area>.room_section_order` now
// overrides it for one room only: per-area → global → default resolution,
// same never-drop normalization (listed keys first, remaining defaults
// appended). Upstream simon42 ships the equivalent as `stacks_order` (#338);
// Oriel keeps its own key name.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/RoomViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

// One light + one media_player → the view emits a 'lights' and a 'media'
// group section whose relative order the config controls.
const ENTITIES = [
  { entity_id: 'light.room', area_id: 'area_test', state: 'off' },
  {
    entity_id: 'media_player.room',
    area_id: 'area_test',
    state: 'idle',
    attributes: { device_class: 'tv' },
  },
];

async function roomView(dashboardConfig: Record<string, unknown>): Promise<any> {
  const hass = makeHass({
    areas: [{ area_id: 'area_test', name: 'Test Area' }],
    entities: ENTITIES,
  });
  const area = (hass.areas as Record<string, any>)['area_test'];
  const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
  return strategy.generate({ area, groups_options: {}, dashboardConfig }, hass);
}

/**
 * Index of the section referencing `entityId`, or -1. Matches both plain
 * `entity:` cards (tiles) and group cards carrying an `entities:` array
 * (lights render as `custom:oriel-lights-group-card`).
 */
function sectionIndexOf(view: any, entityId: string): number {
  return (view?.sections ?? []).findIndex((s: any) => {
    let found = false;
    const walk = (cards: any[]) => {
      for (const c of cards ?? []) {
        if (c?.entity === entityId) found = true;
        if (
          Array.isArray(c?.entities) &&
          c.entities.some((e: any) => e === entityId || e?.entity === entityId)
        ) {
          found = true;
        }
        if (Array.isArray(c?.cards)) walk(c.cards);
      }
    };
    walk(s?.cards);
    return found;
  });
}

/** sectionIndexOf, but fails the test instead of returning -1. */
function mustFind(view: any, entityId: string): number {
  const idx = sectionIndexOf(view, entityId);
  expect(idx, `section containing ${entityId}`).toBeGreaterThanOrEqual(0);
  return idx;
}

describe('Room view — per-area section order override', () => {
  it('defaults: lights before media', async () => {
    const view = await roomView({});
    expect(mustFind(view, 'light.room')).toBeLessThan(mustFind(view, 'media_player.room'));
  });

  it('global room_section_order applies when no per-area override is set', async () => {
    const view = await roomView({ room_section_order: ['media', 'lights'] });
    expect(mustFind(view, 'media_player.room')).toBeLessThan(mustFind(view, 'light.room'));
  });

  it('per-area override beats the global order for that area', async () => {
    const view = await roomView({
      room_section_order: ['media', 'lights'],
      areas_options: { area_test: { room_section_order: ['lights', 'media'] } },
    });
    expect(mustFind(view, 'light.room')).toBeLessThan(mustFind(view, 'media_player.room'));
  });

  it("a different area's override does not leak into this room", async () => {
    const view = await roomView({
      room_section_order: ['media', 'lights'],
      areas_options: { other_area: { room_section_order: ['lights', 'media'] } },
    });
    expect(mustFind(view, 'media_player.room')).toBeLessThan(mustFind(view, 'light.room'));
  });

  it('partial per-area list never drops sections (remaining defaults appended)', async () => {
    const view = await roomView({
      areas_options: { area_test: { room_section_order: ['media'] } },
    });
    // media leads; lights still present via default-append.
    expect(mustFind(view, 'media_player.room')).toBeLessThan(mustFind(view, 'light.room'));
  });
});
