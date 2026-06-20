// ============================================================================
// Tests — area context in summary tiles (#131)
// ============================================================================
// Covers the shared helpers that back the "show area name in summaries"
// capability and their application across the flat summary views
// (batteries / security / climate):
//   1. getAreaNameForEntity — 3-way resolution (entity → device → none)
//   2. areaQualifiedTileName — "Area • Friendly" / area-only / null
//   3. showAreaInSummaries — general flag + legacy battery-only alias
//   4. applyAreaContextToSections — only un-named tiles with an area
//   5. each view applies it under the flag (general + legacy), not otherwise
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';
import {
  getAreaNameForEntity,
  areaQualifiedTileName,
  showAreaInSummaries,
  applyAreaContextToSections,
} from '../../src/utils/name-utils';

// View strategies register their custom elements on import; we call the
// static generate() directly via the registry (matches the existing view tests).
import '../../src/views/BatteriesViewStrategy';
import '../../src/views/SecurityViewStrategy';
import '../../src/views/ClimateViewStrategy';

// Lights/covers summaries render via group cards, not section-level tiles, so
// the area qualifier lives in the cards' own name path — exercise those too.
import '../../src/cards/LightsGroupCard';
import '../../src/cards/CoversGroupCard';

// <hui-tile-card> shim — records setConfig so we can read the name the covers
// group card would have emitted. (Same shim the existing card tests use.)
class HuiTileCardShim extends HTMLElement {
  public lastConfig: Record<string, unknown> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hass: any;
  setConfig(cfg: Record<string, unknown>): void {
    this.lastConfig = cfg;
  }
}
if (!customElements.get('hui-tile-card')) {
  customElements.define('hui-tile-card', HuiTileCardShim);
}

beforeEach(() => {
  Registry.resetForTesting();
});

// -- 1. getAreaNameForEntity -------------------------------------------------

describe('getAreaNameForEntity — 3-way resolution', () => {
  it('resolves the area directly from the entity', () => {
    const hass = makeHass({
      areas: [{ area_id: 'a1', name: 'Kitchen' }],
      entities: [{ entity_id: 'sensor.x', area_id: 'a1' }],
    });
    Registry.initialize(hass, {});
    expect(getAreaNameForEntity('sensor.x', hass)).toBe('Kitchen');
  });

  it('falls back to the device area when the entity has none', () => {
    const hass = makeHass({
      areas: [{ area_id: 'a1', name: 'Kitchen' }],
      devices: [{ id: 'd1', area_id: 'a1' }],
      entities: [{ entity_id: 'sensor.x', device_id: 'd1' }],
    });
    Registry.initialize(hass, {});
    expect(getAreaNameForEntity('sensor.x', hass)).toBe('Kitchen');
  });

  it('prefers the entity area over the device area', () => {
    const hass = makeHass({
      areas: [
        { area_id: 'a1', name: 'Kitchen' },
        { area_id: 'a2', name: 'Hallway' },
      ],
      devices: [{ id: 'd1', area_id: 'a2' }],
      entities: [{ entity_id: 'sensor.x', area_id: 'a1', device_id: 'd1' }],
    });
    Registry.initialize(hass, {});
    expect(getAreaNameForEntity('sensor.x', hass)).toBe('Kitchen');
  });

  it('returns null when neither entity nor device has an area', () => {
    const hass = makeHass({
      devices: [{ id: 'd1', area_id: null }],
      entities: [{ entity_id: 'sensor.x', device_id: 'd1' }],
    });
    Registry.initialize(hass, {});
    expect(getAreaNameForEntity('sensor.x', hass)).toBeNull();
  });
});

// -- 2. areaQualifiedTileName ------------------------------------------------

describe('areaQualifiedTileName', () => {
  it('joins area and friendly name with a bullet', () => {
    const hass = makeHass({
      areas: [{ area_id: 'a1', name: 'Kitchen' }],
      entities: [{ entity_id: 'sensor.x', area_id: 'a1', attributes: { friendly_name: 'Window Battery' } }],
    });
    Registry.initialize(hass, {});
    expect(areaQualifiedTileName('sensor.x', hass)).toBe('Kitchen • Window Battery');
  });

  it('returns the area name alone when there is no friendly name', () => {
    const hass = makeHass({
      areas: [{ area_id: 'a1', name: 'Kitchen' }],
      entities: [{ entity_id: 'sensor.x', area_id: 'a1' }],
    });
    Registry.initialize(hass, {});
    expect(areaQualifiedTileName('sensor.x', hass)).toBe('Kitchen');
  });

  it('returns null when the entity has no area', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'sensor.x', attributes: { friendly_name: 'Orphan' } }],
    });
    Registry.initialize(hass, {});
    expect(areaQualifiedTileName('sensor.x', hass)).toBeNull();
  });
});

// -- 3. showAreaInSummaries (flag + legacy alias) ----------------------------

describe('showAreaInSummaries', () => {
  it('is true when the general flag is set', () => {
    expect(showAreaInSummaries({ show_area_in_summaries: true })).toBe(true);
  });

  it('honors the legacy show_area_in_battery_view as an alias', () => {
    expect(showAreaInSummaries({ show_area_in_battery_view: true })).toBe(true);
  });

  it('is false when neither flag is set', () => {
    expect(showAreaInSummaries({})).toBe(false);
    expect(showAreaInSummaries({ show_area_in_summaries: false, show_area_in_battery_view: false })).toBe(false);
  });
});

// -- 4. applyAreaContextToSections -------------------------------------------

describe('applyAreaContextToSections', () => {
  it('names only un-named tiles that resolve to an area; leaves the rest', () => {
    const hass = makeHass({
      areas: [{ area_id: 'a1', name: 'Kitchen' }],
      entities: [
        { entity_id: 'sensor.in_area', area_id: 'a1', attributes: { friendly_name: 'Sensor A' } },
        { entity_id: 'sensor.no_area', attributes: { friendly_name: 'Sensor B' } },
        { entity_id: 'sensor.named', area_id: 'a1', attributes: { friendly_name: 'Sensor C' } },
      ],
    });
    Registry.initialize(hass, {});

    const sections: any[] = [
      {
        type: 'grid',
        cards: [
          { type: 'heading', heading: 'Group' },
          { type: 'tile', entity: 'sensor.in_area' },
          { type: 'tile', entity: 'sensor.no_area' },
          { type: 'tile', entity: 'sensor.named', name: 'Custom' },
        ],
      },
    ];

    applyAreaContextToSections(sections, hass);
    const [heading, inArea, noArea, named] = sections[0].cards;

    expect(heading.heading).toBe('Group'); // untouched
    expect(heading.name).toBeUndefined();
    expect(inArea.name).toBe('Kitchen • Sensor A'); // qualified
    expect(noArea.name).toBeUndefined(); // no area → left alone
    expect(named.name).toBe('Custom'); // explicit name preserved
  });

  it('mutates and returns the same sections array', () => {
    const hass = makeHass();
    Registry.initialize(hass, {});
    const sections: any[] = [];
    expect(applyAreaContextToSections(sections, hass)).toBe(sections);
  });
});

// -- 5. View-level application ----------------------------------------------

const AREA = { area_id: 'a_test', name: 'Test Area' };

function collectTiles(view: any): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  for (const section of view?.sections ?? []) {
    for (const card of section?.cards ?? []) {
      if (card?.type === 'tile') out.push(card);
    }
  }
  return out;
}

async function generate(tag: string, hassSpec: any, config: any): Promise<any> {
  const hass = makeHass(hassSpec);
  Registry.resetForTesting();
  const strategy = customElements.get(tag) as any;
  return strategy.generate({ config }, hass);
}

describe('summary views apply area context under the flag', () => {
  const cases = [
    {
      name: 'batteries',
      tag: 'll-strategy-view-oriel-batteries',
      spec: {
        areas: [AREA],
        entities: [
          {
            entity_id: 'sensor.test_battery',
            area_id: AREA.area_id,
            state: '10',
            attributes: { device_class: 'battery', unit_of_measurement: '%', friendly_name: 'Door Battery' },
          },
        ],
      },
      expected: 'Test Area • Door Battery',
    },
    {
      name: 'security',
      tag: 'll-strategy-view-oriel-security',
      spec: {
        areas: [AREA],
        entities: [
          {
            entity_id: 'lock.front_door',
            area_id: AREA.area_id,
            state: 'unlocked',
            attributes: { friendly_name: 'Front Door' },
          },
        ],
      },
      expected: 'Test Area • Front Door',
    },
    {
      name: 'climate',
      tag: 'll-strategy-view-oriel-climate',
      spec: {
        areas: [AREA],
        entities: [
          {
            entity_id: 'climate.bedroom',
            area_id: AREA.area_id,
            state: 'heat',
            attributes: { hvac_action: 'heating', current_temperature: 21, friendly_name: 'Bedroom' },
          },
        ],
      },
      expected: 'Test Area • Bedroom',
    },
  ];

  for (const c of cases) {
    it(`${c.name}: general flag qualifies tile names`, async () => {
      const view = await generate(c.tag, c.spec, { show_area_in_summaries: true });
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.every((t) => t.name === c.expected)).toBe(true);
    });

    it(`${c.name}: legacy show_area_in_battery_view alias also qualifies`, async () => {
      const view = await generate(c.tag, c.spec, { show_area_in_battery_view: true });
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.every((t) => t.name === c.expected)).toBe(true);
    });

    it(`${c.name}: no flag leaves tiles un-named`, async () => {
      const view = await generate(c.tag, c.spec, {});
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.every((t) => t.name === undefined)).toBe(true);
    });
  }
});

// -- 6. Summary group cards (lights / covers) -------------------------------
// These render via oriel-lights-group-card / oriel-covers-group-card, so the
// qualifier lives in the cards' own name path. The lights card is shared with
// room views (single-area), so it must qualify only in the cross-area summary
// context (no `_config.area`); the covers card is summary-only, so it always
// qualifies under the flag.

const WZ = { area_id: 'wz', name: 'Wohnzimmer' };

function lightsCard(config: Record<string, unknown>, hass: ReturnType<typeof makeHass>): any {
  const el = document.createElement('oriel-lights-group-card') as any;
  el.setConfig({ group_type: 'on', ...config });
  el.hass = hass;
  return el;
}

function coversCard(config: Record<string, unknown>, hass: ReturnType<typeof makeHass>): any {
  const el = document.createElement('oriel-covers-group-card') as any;
  el.setConfig({ group_type: 'open', ...config });
  el.hass = hass;
  return el;
}

describe('lights group card — area qualifier (summary context only)', () => {
  function hassWithLight(areaId: string | null): ReturnType<typeof makeHass> {
    const hass = makeHass({
      areas: [WZ],
      entities: [{ entity_id: 'light.lamp', area_id: areaId, attributes: { friendly_name: 'Stehlampe' } }],
    });
    Registry.initialize(hass, {});
    return hass;
  }

  it('summary + flag on + area → "Area • Friendly"', () => {
    const el = lightsCard({ config: { show_area_in_summaries: true } }, hassWithLight('wz'));
    expect(el._getDisplayName('light.lamp')).toBe('Wohnzimmer • Stehlampe');
  });

  it('summary + flag off → no qualifier (undefined, default name)', () => {
    const el = lightsCard({ config: {} }, hassWithLight('wz'));
    expect(el._getDisplayName('light.lamp')).toBeUndefined();
  });

  it('summary + flag on + no area → no qualifier', () => {
    const el = lightsCard({ config: { show_area_in_summaries: true } }, hassWithLight(null));
    expect(el._getDisplayName('light.lamp')).toBeUndefined();
  });

  it('room context (single area) + flag on → strips area, does NOT prefix', () => {
    const el = lightsCard({ area: WZ, config: { show_area_in_summaries: true } }, hassWithLight('wz'));
    const name = el._getDisplayName('light.lamp');
    expect(name).toBe('Stehlampe'); // stripAreaName output, not "Wohnzimmer • …"
    expect(name).not.toContain(' • ');
  });

  it('legacy show_area_in_battery_view alias also qualifies the lights summary', () => {
    const el = lightsCard({ config: { show_area_in_battery_view: true } }, hassWithLight('wz'));
    expect(el._getDisplayName('light.lamp')).toBe('Wohnzimmer • Stehlampe');
  });
});

describe('covers group card — area qualifier (summary-only)', () => {
  function hassWithCover(areaId: string | null): ReturnType<typeof makeHass> {
    const hass = makeHass({
      areas: [WZ],
      entities: [
        {
          entity_id: 'cover.fenster',
          area_id: areaId,
          state: 'open',
          attributes: { device_class: 'shutter', friendly_name: 'Fenster' },
        },
      ],
    });
    Registry.initialize(hass, {});
    return hass;
  }

  it('flag on + area → "Area • name"', () => {
    const el = coversCard({ config: { show_area_in_summaries: true } }, hassWithCover('wz'));
    expect(el._getOrCreateTileCard('cover.fenster').lastConfig?.name).toBe('Wohnzimmer • Fenster');
  });

  it('flag off → bare (stripped) name, no prefix', () => {
    const el = coversCard({ config: {} }, hassWithCover('wz'));
    expect(el._getOrCreateTileCard('cover.fenster').lastConfig?.name).toBe('Fenster');
  });

  it('flag on + no area → no prefix', () => {
    const el = coversCard({ config: { show_area_in_summaries: true } }, hassWithCover(null));
    expect(el._getOrCreateTileCard('cover.fenster').lastConfig?.name).toBe('Fenster');
  });

  it('legacy alias also qualifies the covers summary', () => {
    const el = coversCard({ config: { show_area_in_battery_view: true } }, hassWithCover('wz'));
    expect(el._getOrCreateTileCard('cover.fenster').lastConfig?.name).toBe('Wohnzimmer • Fenster');
  });
});
