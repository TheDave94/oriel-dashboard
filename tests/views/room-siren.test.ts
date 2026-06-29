// ============================================================================
// Tests — siren entities surface in room views (#138)
// ============================================================================
// siren is an actionable output domain (alarms). It was only surfaced as a
// camera companion, never as a standalone room tile. The room strategy now
// categorizes siren.* entities and renders a tile with a toggle feature.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/RoomViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

// Recursively collect every tile card (tiles live inside nested grid sections).
function allTiles(view: any): any[] {
  const out: any[] = [];
  const walk = (cards: any[]) => {
    for (const c of cards ?? []) {
      if (c?.type === 'tile') out.push(c);
      if (Array.isArray(c?.cards)) walk(c.cards);
    }
  };
  for (const s of view?.sections ?? []) walk(s?.cards);
  return out;
}

async function roomView(entities: any[]): Promise<any> {
  const areaId = 'area_test';
  const hass = makeHass({ areas: [{ area_id: areaId, name: 'Test Area' }], entities });
  const area = (hass.areas as Record<string, any>)[areaId];
  const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
  return strategy.generate({ area, groups_options: {}, dashboardConfig: {} }, hass);
}

describe('Room view — siren entities', () => {
  it('renders a tile for a siren entity in the area', async () => {
    const view = await roomView([
      { entity_id: 'siren.alarm', area_id: 'area_test', state: 'off' },
    ]);
    const tile = allTiles(view).find((t) => t.entity === 'siren.alarm');
    expect(tile).toBeDefined();
    expect(tile.features).toEqual([{ type: 'toggle' }]);
  });
});
