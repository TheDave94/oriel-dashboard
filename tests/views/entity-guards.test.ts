// ============================================================================
// Tests — entity-existence guards on view-level emissions (Part 2 C / E)
// ============================================================================
// Curated zone-presence entities and the panel screensaver entity must be
// dropped when they no longer exist, matching the existence guard every other
// surface already applies (the HA→Oriel entity-drift class).
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/RoomViewStrategy';
import '../../src/views/OverviewViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

function deepCards(view: any): any[] {
  const out: any[] = [];
  for (const s of view?.sections ?? []) for (const c of s?.cards ?? []) out.push(c);
  return out;
}

describe('room view — curated presence_entities existence guard (C)', () => {
  it('drops a curated presence entity that no longer exists', async () => {
    const areaId = 'area_test';
    const hass = makeHass({
      areas: [{ area_id: areaId, name: 'Test Area' }],
      entities: [
        { entity_id: 'binary_sensor.p1', area_id: areaId, attributes: { device_class: 'occupancy' } },
        { entity_id: 'binary_sensor.p2', area_id: areaId, attributes: { device_class: 'occupancy' } },
        // binary_sensor.gone is NOT in hass.states
      ],
    });
    const area = (hass.areas as Record<string, any>)[areaId];
    const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
    const view = await strategy.generate(
      {
        area,
        groups_options: {},
        dashboardConfig: {
          areas_options: {
            [areaId]: { presence_entities: ['binary_sensor.p1', 'binary_sensor.p2', 'binary_sensor.gone'] },
          },
        },
      },
      hass,
    );
    const card = deepCards(view).find((c) => c.type === 'custom:oriel-zone-presence-card');
    expect(card).toBeDefined();
    expect(card.entities).toEqual(['binary_sensor.p1', 'binary_sensor.p2']); // gone dropped
  });
});

describe('overview view — panel screensaver entity existence guard (E)', () => {
  async function screensaverCard(screensaverEntity: string, present: boolean): Promise<any> {
    const entities = present ? [{ entity_id: screensaverEntity }] : [];
    const hass = makeHass({ entities });
    const strategy = customElements.get('ll-strategy-view-oriel-overview') as any;
    const view = await strategy.generate(
      { dashboardConfig: { panel_mode: 'wall', panel_screensaver_entity: screensaverEntity } },
      hass,
    );
    // the screensaver card sits in its own panel section
    for (const s of view?.sections ?? [])
      for (const c of s?.cards ?? [])
        if (c.type === 'custom:oriel-screensaver-card') return c;
    return null;
  }

  it('omits the entity key when the screensaver entity is gone', async () => {
    const card = await screensaverCard('sensor.gone', false);
    expect(card).not.toBeNull();
    expect(card).not.toHaveProperty('entity');
  });

  it('keeps the entity when it exists', async () => {
    const card = await screensaverCard('sensor.kiosk', true);
    expect(card).not.toBeNull();
    expect(card.entity).toBe('sensor.kiosk');
  });
});

describe('room view — custom_cards orphan-title guard (hollow-shell class)', () => {
  it('does not emit a lone title heading for an area custom card with an empty body', async () => {
    const areaId = 'area_test';
    const hass = makeHass({ areas: [{ area_id: areaId, name: 'Test Area' }], entities: [] });
    const area = (hass.areas as Record<string, any>)[areaId];
    const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
    const view = await strategy.generate(
      {
        area,
        groups_options: {},
        dashboardConfig: {
          custom_cards: [
            // Titled but parses to an empty array — must NOT yield a section that
            // is just the "Empty" heading with nothing under it.
            { target_area: areaId, title: 'Empty', parsed_config: [] },
            { target_area: areaId, title: 'Has Content', parsed_config: [{ type: 'markdown', content: 'hi' }] },
          ],
        },
      },
      hass,
    );
    const headings = deepCards(view)
      .filter((c) => c.type === 'heading')
      .map((c) => c.heading);
    expect(headings).not.toContain('Empty'); // orphan title suppressed
    expect(headings).toContain('Has Content'); // real one still rendered
  });
});
