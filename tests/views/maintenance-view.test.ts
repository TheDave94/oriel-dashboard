// ============================================================================
// Tests — Maintenance view: updates, critical batteries, unavailable devices
// ============================================================================
// Ported from upstream simon42 #344 (Oriel adaptation — no video tips, no
// summary tile; the view is gated on show_maintenance_view). Covers:
//  - pending-update tiles, category-inclusive (config-category firmware
//    updates like Shelly's must appear),
//  - the critical-batteries bucket honoring battery_critical_threshold and
//    unavailable_batteries_bucket,
//  - the unavailable-devices rollup: one tile per device, only when ALL of
//    the device's visible entities are unavailable,
//  - the numeric HA-version gate for the built-in repairs / updates /
//    discovered-devices cards (2026.3+ only),
//  - the 24h activity logbook scoped to exactly the reported entities.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass, type HassFixtureSpec } from '../fixtures/hass';

import '../../src/views/MaintenanceViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

const BASE_SPEC: HassFixtureSpec = {
  areas: [{ area_id: 'office', name: 'Office' }],
  devices: [
    { id: 'dev-dead', area_id: 'office' },
    { id: 'dev-half', area_id: 'office' },
  ],
  entities: [
    // Updates — one plain, one config-category (Shelly-style firmware),
    // one up to date.
    { entity_id: 'update.core', state: 'on' },
    { entity_id: 'update.shelly_firmware', state: 'on', entity_category: 'config' },
    { entity_id: 'update.addon', state: 'off' },
    // Batteries — one critical, one healthy.
    {
      entity_id: 'sensor.door_battery',
      state: '15',
      area_id: 'office',
      attributes: { device_class: 'battery', unit_of_measurement: '%' },
    },
    {
      entity_id: 'sensor.hub_battery',
      state: '80',
      area_id: 'office',
      attributes: { device_class: 'battery', unit_of_measurement: '%' },
    },
    // dev-dead: ALL visible entities unavailable → rolls up to one tile.
    { entity_id: 'light.dead_bulb', state: 'unavailable', device_id: 'dev-dead' },
    { entity_id: 'sensor.dead_power', state: 'unavailable', device_id: 'dev-dead' },
    // dev-half: one unavailable, one alive → no rollup.
    { entity_id: 'light.half_bulb', state: 'unavailable', device_id: 'dev-half' },
    { entity_id: 'sensor.half_power', state: 'on', device_id: 'dev-half' },
  ],
  components: ['logbook'],
  version: '2026.1.2',
};

async function generate(
  config: Record<string, unknown> = {},
  spec: HassFixtureSpec = BASE_SPEC,
): Promise<any> {
  const hass = makeHass(spec);
  const strategy = customElements.get('ll-strategy-view-oriel-maintenance') as any;
  return strategy.generate({ config }, hass);
}

function allCards(view: any): any[] {
  return (view?.sections ?? []).flatMap((s: any) => s?.cards ?? []);
}

function tileEntities(view: any): string[] {
  return allCards(view)
    .filter((c: any) => c.type === 'tile')
    .map((c: any) => c.entity);
}

function sectionByHeadingIcon(view: any, icon: string): any {
  return (view?.sections ?? []).find((s: any) =>
    (s?.cards ?? []).some((c: any) => c?.type === 'heading' && c?.icon === icon),
  );
}

function logbookCard(view: any): any {
  return allCards(view).find((c: any) => c?.type === 'logbook');
}

describe('Maintenance view — pending updates', () => {
  it('renders tiles for pending updates, including config-category entities', async () => {
    const view = await generate();
    const section = sectionByHeadingIcon(view, 'mdi:update');
    expect(section).toBeDefined();
    const entities = section.cards.filter((c: any) => c.type === 'tile').map((c: any) => c.entity);
    expect(entities).toContain('update.core');
    // Category-inclusive: the pre-filtered visible map would drop this one.
    expect(entities).toContain('update.shelly_firmware');
    // Up to date → not pending.
    expect(entities).not.toContain('update.addon');
    const tile = section.cards.find((c: any) => c.entity === 'update.core');
    expect(tile.state_content).toEqual(['state', 'installed_version']);
    expect(tile.color).toBe('orange');
  });

  it('omits the updates section when nothing is pending', async () => {
    const spec: HassFixtureSpec = {
      ...BASE_SPEC,
      entities: BASE_SPEC.entities!.map((e) =>
        e.entity_id.startsWith('update.') ? { ...e, state: 'off' } : e,
      ),
    };
    const view = await generate({}, spec);
    expect(sectionByHeadingIcon(view, 'mdi:update')).toBeUndefined();
  });
});

describe('Maintenance view — critical batteries', () => {
  it('lists only batteries below the critical threshold', async () => {
    const view = await generate();
    const section = sectionByHeadingIcon(view, 'mdi:battery-alert');
    expect(section).toBeDefined();
    const entities = section.cards.filter((c: any) => c.type === 'tile').map((c: any) => c.entity);
    expect(entities).toContain('sensor.door_battery'); // 15 < 20
    expect(entities).not.toContain('sensor.hub_battery'); // 80
  });

  it('respects a custom battery_critical_threshold', async () => {
    const view = await generate({ battery_critical_threshold: 10 });
    // 15% is no longer critical → the whole section disappears.
    expect(sectionByHeadingIcon(view, 'mdi:battery-alert')).toBeUndefined();
  });

  it('buckets unavailable batteries per unavailable_batteries_bucket', async () => {
    const spec: HassFixtureSpec = {
      ...BASE_SPEC,
      entities: [
        ...BASE_SPEC.entities!,
        {
          entity_id: 'sensor.lost_battery',
          state: 'unavailable',
          attributes: { device_class: 'battery', unit_of_measurement: '%' },
        },
      ],
    };
    // Default bucket 'good' → not critical.
    const viewDefault = await generate({}, spec);
    expect(tileEntities(viewDefault)).not.toContain('sensor.lost_battery');
    // Explicit 'critical' → surfaces in the critical section.
    const viewCritical = await generate({ unavailable_batteries_bucket: 'critical' }, spec);
    const section = sectionByHeadingIcon(viewCritical, 'mdi:battery-alert');
    const entities = section.cards.filter((c: any) => c.type === 'tile').map((c: any) => c.entity);
    expect(entities).toContain('sensor.lost_battery');
  });

  it('deep-links the heading to the batteries view when it is enabled', async () => {
    const view = await generate();
    const heading = sectionByHeadingIcon(view, 'mdi:battery-alert').cards.find(
      (c: any) => c.type === 'heading',
    );
    expect(heading.tap_action).toEqual({ action: 'navigate', navigation_path: 'batteries' });
    const viewNoBatteries = await generate({ show_battery_summary: false });
    const headingNoLink = sectionByHeadingIcon(viewNoBatteries, 'mdi:battery-alert').cards.find(
      (c: any) => c.type === 'heading',
    );
    expect(headingNoLink.tap_action).toBeUndefined();
  });
});

describe('Maintenance view — unavailable devices rollup', () => {
  it('rolls a device into ONE tile only when ALL its visible entities are unavailable', async () => {
    const view = await generate();
    const section = sectionByHeadingIcon(view, 'mdi:lan-disconnect');
    expect(section).toBeDefined();
    const tiles = section.cards.filter((c: any) => c.type === 'tile');
    // dev-dead → exactly one tile riding the first entity.
    expect(tiles).toHaveLength(1);
    expect(tiles[0].entity).toBe('light.dead_bulb');
    expect(tiles[0].state_content).toBe('last_changed');
    // dev-half has a live entity → its unavailable sibling must NOT appear.
    const entities = tiles.map((c: any) => c.entity);
    expect(entities).not.toContain('light.half_bulb');
    expect(entities).not.toContain('sensor.dead_power'); // sibling, not a second tile
  });

  it('skips devices with zero visible entities', async () => {
    const spec: HassFixtureSpec = {
      ...BASE_SPEC,
      devices: [...BASE_SPEC.devices!, { id: 'dev-diag' }],
      entities: [
        ...BASE_SPEC.entities!,
        // Only a diagnostic entity → device has zero VISIBLE entities.
        {
          entity_id: 'sensor.diag_only',
          state: 'unavailable',
          device_id: 'dev-diag',
          entity_category: 'diagnostic',
        },
      ],
    };
    const view = await generate({}, spec);
    expect(tileEntities(view)).not.toContain('sensor.diag_only');
  });
});

describe('Maintenance view — HA-native cards version gate', () => {
  const nativeTypes = (view: any) =>
    allCards(view)
      .map((c: any) => c.type)
      .filter((t: string) => ['repairs', 'updates', 'discovered-devices'].includes(t));

  it('emits repairs/updates/discovered-devices cards on HA 2026.3+', async () => {
    const view = await generate({}, { ...BASE_SPEC, version: '2026.3.0' });
    expect(nativeTypes(view)).toEqual(['repairs', 'updates', 'discovered-devices']);
  });

  it('compares the version numerically, not as a string', async () => {
    // '2026.10' < '2026.3' under string comparison — must still qualify.
    const view = await generate({}, { ...BASE_SPEC, version: '2026.10.1' });
    expect(nativeTypes(view)).toHaveLength(3);
  });

  it('emits nothing extra on older HA (2025.x / early 2026.x / missing)', async () => {
    for (const version of ['2025.12.3', '2026.1.2', undefined]) {
      const view = await generate({}, { ...BASE_SPEC, version });
      expect(nativeTypes(view)).toHaveLength(0);
    }
  });
});

describe('Maintenance view — activity log (24h logbook)', () => {
  it('targets exactly the reported entities', async () => {
    const view = await generate();
    const card = logbookCard(view);
    expect(card).toBeDefined();
    expect(card.hours_to_show).toBe(24);
    const target: string[] = card.target.entity_id;
    expect(target).toContain('update.core'); // pending update
    expect(target).toContain('update.shelly_firmware'); // pending update (config category)
    expect(target).toContain('sensor.door_battery'); // critical battery
    expect(target).toContain('light.dead_bulb'); // unavailable-device representative
    // Not reported by the view → not in the log.
    expect(target).not.toContain('update.addon');
    expect(target).not.toContain('sensor.hub_battery');
    expect(target).not.toContain('light.half_bulb');
  });

  it('is omitted when show_maintenance_activity is false', async () => {
    const view = await generate({ show_maintenance_activity: false });
    expect(logbookCard(view)).toBeUndefined();
  });

  it('is omitted when the logbook integration is not loaded', async () => {
    const view = await generate({}, { ...BASE_SPEC, components: [] });
    expect(logbookCard(view)).toBeUndefined();
  });
});
