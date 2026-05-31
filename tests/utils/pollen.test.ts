// ============================================================================
// Tests — PollenWatch helpers (v2 schema)
// ============================================================================
// Locks down the source-specific scaling that drives card colour and the
// weather-card badge gating. PollenWatch v2 (May 2026) expanded the
// integration to 24 canonical species across six raw sources plus an
// analytics consensus, and replaced the v1 `medium` consensus level
// with a `mixed` state (genuine cross-source disagreement). These tests
// pin the v2 mapping. Each test passes a synthetic hass-like fixture so
// behaviour is deterministic without depending on the live HA instance.
// ============================================================================

import { describe, it, expect } from 'vitest';

import {
  detectAvailableSources,
  detectAvailableTypes,
  detectPollenwatchInstalled,
  isActivePollen,
  pollenIcon,
  pollenLevel,
  pollenSensorId,
  pollenSeverityColor,
  resolvePollenTypes,
} from '../../src/utils/pollen';
import type { HassEntity } from '../../src/types/homeassistant';
import {
  ALL_POLLEN_TYPES,
  type PollenSource,
  type PollenType,
} from '../../src/types/strategy';
import { makeHass } from '../fixtures/hass';

function st(entity_id: string, state: string, unit?: string): HassEntity {
  return {
    entity_id,
    state,
    attributes: unit ? { unit_of_measurement: unit, state_class: 'measurement' } : {},
    last_changed: '2026-05-31T00:00:00Z',
    last_updated: '2026-05-31T00:00:00Z',
    context: { id: '', user_id: null, parent_id: null },
  } as HassEntity;
}

const SOURCES: PollenSource[] = [
  'analytics',
  'open_meteo',
  'polleninformation',
  'dwd',
  'meteoswiss',
  'epin',
  'google',
];

describe('pollenSensorId', () => {
  it('routes analytics through the _consensus suffix', () => {
    expect(pollenSensorId('analytics', 'grass')).toBe(
      'sensor.pollenwatch_analytics_grass_consensus',
    );
  });

  it.each(SOURCES.filter((s) => s !== 'analytics'))(
    'builds <prefix><species> for %s',
    (src) => {
      expect(pollenSensorId(src, 'birch')).toBe(`sensor.pollenwatch_${src}_birch`);
    },
  );

  it('honours canonical v2 species keys (not common-name aliases)', () => {
    // v2 entity_ids use the registry key, not the common name —
    // `plantago` not `plantain`, `carpinus` not `hornbeam`, etc.
    expect(pollenSensorId('epin', 'plantago')).toBe(
      'sensor.pollenwatch_epin_plantago',
    );
    expect(pollenSensorId('epin', 'carpinus')).toBe(
      'sensor.pollenwatch_epin_carpinus',
    );
  });
});

describe('detectPollenwatchInstalled', () => {
  it('is true when any pollenwatch sensor exists', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'sensor.pollenwatch_open_meteo_grass' }],
    });
    expect(detectPollenwatchInstalled(hass)).toBe(true);
  });

  it('is false on an instance without pollenwatch', () => {
    const hass = makeHass({ entities: [{ entity_id: 'sensor.living_room_temp' }] });
    expect(detectPollenwatchInstalled(hass)).toBe(false);
  });
});

describe('detectAvailableSources', () => {
  it('returns only sources whose prefix matches at least one sensor', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.pollenwatch_open_meteo_grass' },
        { entity_id: 'sensor.pollenwatch_analytics_grass_consensus' },
        { entity_id: 'sensor.pollenwatch_dwd_birch' },
        { entity_id: 'sensor.pollenwatch_epin_plantago' },
      ],
    });
    expect(detectAvailableSources(hass)).toEqual([
      'analytics',
      'open_meteo',
      'dwd',
      'epin',
    ]);
  });

  it('includes meteoswiss when its prefix is present', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'sensor.pollenwatch_meteoswiss_grass' }],
    });
    expect(detectAvailableSources(hass)).toEqual(['meteoswiss']);
  });
});

describe('detectAvailableTypes', () => {
  it('lists only pollens with a sensor for the chosen source', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.pollenwatch_open_meteo_grass' },
        { entity_id: 'sensor.pollenwatch_open_meteo_birch' },
        { entity_id: 'sensor.pollenwatch_polleninformation_ragweed' },
      ],
    });
    // Sort matches canonical ALL_POLLEN_TYPES order (alder, birch, grass, ...).
    expect(detectAvailableTypes(hass, 'open_meteo')).toEqual(['birch', 'grass']);
    expect(detectAvailableTypes(hass, 'polleninformation')).toEqual(['ragweed']);
    expect(detectAvailableTypes(hass, 'google')).toEqual([]);
  });

  it('picks up v2 species additions (e.g. plantago, alternaria)', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.pollenwatch_epin_plantago' },
        { entity_id: 'sensor.pollenwatch_epin_alternaria' },
      ],
    });
    expect(detectAvailableTypes(hass, 'epin')).toEqual(['plantago', 'alternaria']);
  });
});

describe('resolvePollenTypes', () => {
  const hass = makeHass({
    entities: [
      { entity_id: 'sensor.pollenwatch_analytics_grass_consensus' },
      { entity_id: 'sensor.pollenwatch_analytics_birch_consensus' },
    ],
  });

  it('falls back to all detected types when config is empty', () => {
    expect(resolvePollenTypes(hass, 'analytics', undefined)).toEqual(['birch', 'grass']);
    expect(resolvePollenTypes(hass, 'analytics', [])).toEqual(['birch', 'grass']);
  });

  it('drops configured types with no backing sensor', () => {
    const configured: PollenType[] = ['grass', 'olive', 'birch'];
    expect(resolvePollenTypes(hass, 'analytics', configured)).toEqual(['grass', 'birch']);
  });
});

describe('pollenLevel — analytics (v2 enum: none/low/high/mixed)', () => {
  it('passes through every v2 enum value', () => {
    expect(pollenLevel('analytics', st('x', 'none'))).toBe('none');
    expect(pollenLevel('analytics', st('x', 'low'))).toBe('low');
    expect(pollenLevel('analytics', st('x', 'high'))).toBe('high');
    expect(pollenLevel('analytics', st('x', 'mixed'))).toBe('mixed');
  });

  it('is case-insensitive', () => {
    expect(pollenLevel('analytics', st('x', 'HIGH'))).toBe('high');
    expect(pollenLevel('analytics', st('x', 'Mixed'))).toBe('mixed');
  });

  it('rejects v1-era `medium` (gone in v2)', () => {
    // Pin: if a user has a stale state object from a v1 install, we
    // resolve to null rather than silently treating it as low/high.
    expect(pollenLevel('analytics', st('x', 'medium'))).toBe(null);
  });

  it('returns null for unknown / unavailable / nodata', () => {
    expect(pollenLevel('analytics', st('x', 'wat'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'unavailable'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'unknown'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'nodata'))).toBe(null);
  });
});

describe('pollenLevel — polleninformation (0–4)', () => {
  it('buckets the Austrian scale into none/low/high', () => {
    expect(pollenLevel('polleninformation', st('x', '0'))).toBe('none');
    expect(pollenLevel('polleninformation', st('x', '1'))).toBe('low');
    expect(pollenLevel('polleninformation', st('x', '2'))).toBe('high');
    expect(pollenLevel('polleninformation', st('x', '3'))).toBe('high');
    expect(pollenLevel('polleninformation', st('x', '4'))).toBe('high');
  });
});

describe('pollenLevel — google (0–5)', () => {
  it('buckets the Google scale into none/low/high', () => {
    expect(pollenLevel('google', st('x', '0'))).toBe('none');
    expect(pollenLevel('google', st('x', '1'))).toBe('low');
    expect(pollenLevel('google', st('x', '2'))).toBe('low');
    expect(pollenLevel('google', st('x', '3'))).toBe('high');
    expect(pollenLevel('google', st('x', '4'))).toBe('high');
    expect(pollenLevel('google', st('x', '5'))).toBe('high');
  });
});

describe('pollenLevel — dwd (0–3 ordinal)', () => {
  it('buckets DWD ordinal levels', () => {
    expect(pollenLevel('dwd', st('x', '0'))).toBe('none');
    expect(pollenLevel('dwd', st('x', '1'))).toBe('low');
    expect(pollenLevel('dwd', st('x', '1.5'))).toBe('low');
    expect(pollenLevel('dwd', st('x', '2'))).toBe('high');
    expect(pollenLevel('dwd', st('x', '3'))).toBe('high');
  });
});

describe('pollenLevel — grains/m³ sources (open_meteo / meteoswiss / epin)', () => {
  it.each(['open_meteo', 'meteoswiss', 'epin'] as const)(
    '%s uses the grains/m³ heuristic',
    (src) => {
      expect(pollenLevel(src, st('x', '0', 'grains/m³'))).toBe('none');
      expect(pollenLevel(src, st('x', '5', 'grains/m³'))).toBe('low');
      expect(pollenLevel(src, st('x', '49', 'grains/m³'))).toBe('low');
      expect(pollenLevel(src, st('x', '50', 'grains/m³'))).toBe('high');
      expect(pollenLevel(src, st('x', '500', 'grains/m³'))).toBe('high');
    },
  );
});

describe('isActivePollen (v2: high or mixed)', () => {
  it('treats high and mixed as active', () => {
    expect(isActivePollen('high')).toBe(true);
    expect(isActivePollen('mixed')).toBe(true);
  });
  it('treats low / none / null as quiet', () => {
    expect(isActivePollen('low')).toBe(false);
    expect(isActivePollen('none')).toBe(false);
    expect(isActivePollen(null)).toBe(false);
  });
});

describe('pollenSeverityColor', () => {
  it('maps severity buckets to palette tokens', () => {
    expect(pollenSeverityColor('high')).toBe('red');
    // mixed shares orange with the v1 `medium` so upgrading users see
    // the same hue for "worth attention but not definitively high".
    expect(pollenSeverityColor('mixed')).toBe('orange');
    expect(pollenSeverityColor('low')).toBe('yellow');
    expect(pollenSeverityColor('none')).toBe('green');
    expect(pollenSeverityColor(null)).toBe('disabled');
  });
});

describe('pollenIcon', () => {
  it('returns a non-empty mdi id for every v2 canonical species', () => {
    for (const t of ALL_POLLEN_TYPES) {
      expect(pollenIcon(t)).toMatch(/^mdi:/);
    }
  });

  it('uses a tree mark for tree species', () => {
    expect(pollenIcon('birch')).toBe('mdi:tree');
    expect(pollenIcon('oak')).toBe('mdi:tree');
    expect(pollenIcon('hazel')).toBe('mdi:tree');
  });

  it('uses a mushroom mark for the lone fungal spore', () => {
    expect(pollenIcon('alternaria')).toBe('mdi:mushroom-outline');
  });
});
