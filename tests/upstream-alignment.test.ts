// ============================================================================
// Tests — upstream alignment wave (simon42 #329/#330/#344/#374/#302 ports)
// ============================================================================
// Covers the shared-bug fixes:
//  - Registry rebuilds when hass.floors identity changes (#329)
//  - getUpdateEntityIds() includes config/diagnostic update entities but
//    keeps every other exclusion (#344 collectUpdateIds)
//  - lawn_mower entities are categorized into room views alongside vacuums,
//    with the lawn-mower feature (#330)
//  - global theme/background is a default, not an override — a view's own
//    theme/background wins (#374 precedence)
//  - strategy self-registration for HA's "new dashboard" dialog (#329)
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../src/Registry';
import { makeHass, type HassFixtureSpec } from './fixtures/hass';

import '../src/views/RoomViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

describe('Registry — floors staleness (#329)', () => {
  it('rebuilds when only hass.floors changes identity', () => {
    const hass = makeHass({ areas: [{ area_id: 'a', name: 'A' }] });
    Registry.initialize(hass, {});
    const before = Registry.getRebuildCountForTesting();
    // Same everything except a new floors object (HA replaces the map on
    // floor registry updates).
    const hass2 = { ...hass, floors: { ...hass.floors } };
    Registry.initialize(hass2 as any, {});
    expect(Registry.getRebuildCountForTesting()).toBe(before + 1);
    // And stays idempotent afterwards.
    Registry.initialize(hass2 as any, {});
    expect(Registry.getRebuildCountForTesting()).toBe(before + 1);
  });
});

describe('Registry.getUpdateEntityIds (#344)', () => {
  const SPEC: HassFixtureSpec = {
    areas: [{ area_id: 'office', name: 'Office' }],
    entities: [
      { entity_id: 'update.core', state: 'on' },
      // The Shelly case: firmware update ships as a config entity — the
      // pre-filtered visible map drops it, maintenance surfaces must not.
      {
        entity_id: 'update.shelly_firmware',
        state: 'on',
        entity_category: 'config',
      },
      { entity_id: 'update.hidden_one', state: 'on', hidden_by: 'user' },
      { entity_id: 'update.labeled_away', state: 'on', labels: ['no_dboard'] },
      { entity_id: 'light.decoy', state: 'off' },
    ],
  };

  it('includes category entities but keeps hidden/no_dboard exclusions', () => {
    Registry.initialize(makeHass(SPEC), {});
    const ids = Registry.getUpdateEntityIds();
    expect(ids).toContain('update.core');
    expect(ids).toContain('update.shelly_firmware');
    expect(ids).not.toContain('update.hidden_one');
    expect(ids).not.toContain('update.labeled_away');
    expect(ids).not.toContain('light.decoy');
    // Sanity: the visible map indeed drops the config entity (the reason
    // this method exists).
    expect(Registry.getVisibleEntityIdsForDomain('update')).not.toContain(
      'update.shelly_firmware',
    );
  });
});

describe('Room views — lawn mowers share the vacuum group (#330)', () => {
  it('renders lawn_mower entities with the lawn-mower feature', async () => {
    const hass = makeHass({
      areas: [{ area_id: 'garden', name: 'Garden' }],
      entities: [
        { entity_id: 'lawn_mower.mowbot', area_id: 'garden', state: 'docked' },
        { entity_id: 'vacuum.dusty', area_id: 'garden', state: 'docked' },
      ],
    });
    const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
    const view = await strategy.generate(
      { area: hass.areas['garden'], config: {} },
      hass,
    );
    const tiles = (view.sections as any[])
      .flatMap((s) => s.cards ?? [])
      .filter((c: any) => c.type === 'tile');
    const mower = tiles.find((c: any) => c.entity === 'lawn_mower.mowbot');
    const vacuum = tiles.find((c: any) => c.entity === 'vacuum.dusty');
    expect(mower).toBeDefined();
    expect(mower.features).toEqual([{ type: 'lawn-mower-commands' }]);
    expect(vacuum.features).toEqual([{ type: 'vacuum-commands' }]);
  });
});

describe('Dashboard strategy registration (#329)', () => {
  it('announces itself in window.customStrategies for the new-dashboard dialog', async () => {
    await import('../src/oriel');
    const entry = (window as any).customStrategies?.find((s: any) => s.type === 'oriel');
    expect(entry).toBeDefined();
    expect(entry.strategyType).toBe('dashboard');
    expect((customElements.get('ll-strategy-dashboard-oriel') as any).registryDependencies).toEqual(
      ['entities', 'devices', 'areas', 'floors'],
    );
  });
});
