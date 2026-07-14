// ====================================================================
// VIEW STRATEGY — MAINTENANCE (Updates, Critical Batteries, Unavailable Devices)
// ====================================================================
// Opt-in admin-flavoured view (show_maintenance_view). Ported from
// upstream simon42 #344, adapted to Oriel's Registry + section-packing
// architecture (the upstream video-tips subsystem is deliberately not
// ported — simon42-branded content). Main content:
//   1. Pending updates as tiles (category-inclusive — Shelly firmware
//      updates ship as config/diagnostic entities)
//   2. Critical batteries (mirrors the Batteries view's critical bucket;
//      heading deep-links there when that view is enabled)
//   3. Unavailable devices — one tile per DEVICE where ALL visible
//      entities are unavailable (single broken entities on otherwise
//      healthy devices deliberately don't count); last, it's usually
//      the longest list
//   4. HA's built-in repairs / updates / discovered-devices cards —
//      the card types only exist since HA 2026.3 (an unknown type
//      renders as a red error card), so they're version-gated; older
//      frontends simply get nothing extra (the update tiles already
//      cover updates)
//   5. 24h activity logbook scoped to exactly the entities this view
//      reported (show_maintenance_activity, default on)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { densePlacement } from '../utils/view-builder';
import { packSections } from '../utils/section-packing';
import type { LovelaceViewConfig, LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { getBatteryEntities } from '../utils/entity-filter';
import { applyAreaContextToSections, showAreaInSummaries } from '../utils/name-utils';
import { phoneFullWidth } from '../utils/viewport';

interface MaintenanceViewStrategyParams {
  config?: OrielConfig;
}

/**
 * Numeric HA-version gate ('2026.3.1' → major 2026, minor 3). String
 * comparison would get '2026.10' < '2026.3' wrong, so parse the two
 * leading components as integers. Missing/unparsable versions fail
 * closed (false) — better no built-in cards than red error cards.
 * Exported for tests.
 */
export function haVersionAtLeast(hass: HomeAssistant, major: number, minor: number): boolean {
  const raw = hass.config?.version;
  if (typeof raw !== 'string') return false;
  const match = raw.match(/^(\d+)\.(\d+)/);
  if (!match || !match[1] || !match[2]) return false;
  const maj = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  return maj > major || (maj === major && min >= minor);
}

/** Pending update entities — category-inclusive, state 'on' only. */
function collectPendingUpdates(hass: HomeAssistant): string[] {
  return Registry.getUpdateEntityIds().filter((id) => hass.states[id]?.state === 'on');
}

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown', 'none', 'restarting']);

/**
 * Critical batteries — mirrors the Batteries view's critical bucket
 * exactly (same thresholds, same unavailable_batteries_bucket handling,
 * same voltage-sensor skip) so both views always agree on what's
 * critical. Sorted lowest level first.
 */
function collectCriticalBatteries(hass: HomeAssistant, config: OrielConfig): string[] {
  const criticalThreshold = config.battery_critical_threshold ?? 20;
  const unavailableIsCritical = config.unavailable_batteries_bucket === 'critical';
  const critical: string[] = [];

  for (const entityId of getBatteryEntities(hass, config)) {
    const state = hass.states[entityId];
    if (!state) continue;
    if (entityId.startsWith('binary_sensor.')) {
      if (UNAVAILABLE_STATES.has(state.state)) {
        if (unavailableIsCritical) critical.push(entityId);
        continue;
      }
      // device_class 'battery' binary sensors: 'on' === low.
      if (state.state === 'on') critical.push(entityId);
      continue;
    }
    const value = parseFloat(state.state);
    const unit = state.attributes?.unit_of_measurement;
    // Percentage thresholds only apply to %-based sensors (see
    // BatteriesViewStrategy for the voltage-sensor rationale).
    if (unit && unit !== '%') continue;
    if (isNaN(value)) {
      if (unavailableIsCritical) critical.push(entityId);
      continue;
    }
    if (value < criticalThreshold) critical.push(entityId);
  }

  critical.sort((a, b) => {
    const valA = parseFloat(hass.states[a]?.state ?? '');
    const valB = parseFloat(hass.states[b]?.state ?? '');
    if (isNaN(valA)) return -1;
    if (isNaN(valB)) return 1;
    return valA - valB;
  });
  return critical;
}

interface UnavailableDevice {
  /** First visible entity — the tile rides on it. */
  representativeId: string;
  /** Device display name (name_by_user beats integration name). */
  name: string;
}

/**
 * Devices where ALL visible entities are 'unavailable'. A single broken
 * entity on an otherwise healthy device deliberately doesn't count —
 * that's an entity problem, not a device outage. Devices with zero
 * visible entities are skipped (nothing to represent them with).
 */
function collectUnavailableDevices(hass: HomeAssistant): UnavailableDevice[] {
  const out: UnavailableDevice[] = [];
  for (const deviceId of Object.keys(hass.devices ?? {})) {
    const visibleIds = Registry.getEntityIdsForDevice(deviceId).filter(
      (id) => !Registry.isEntityExcluded(id) && hass.states[id] !== undefined,
    );
    const representativeId = visibleIds[0];
    if (!representativeId) continue;
    if (!visibleIds.every((id) => hass.states[id]?.state === 'unavailable')) continue;

    const device = Registry.getDevice(deviceId);
    out.push({
      representativeId,
      name: device?.name_by_user || device?.name || representativeId,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

// -- Section builders (exported for unit tests) ------------------------

/** Pending updates as tiles — same construction as the overview's maintenance section. */
export function buildUpdatesSection(pendingIds: string[]): LovelaceSectionConfig | null {
  if (pendingIds.length === 0) return null;
  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: `${localize('maintenance.updates')} (${pendingIds.length})`,
        heading_style: 'title',
        icon: 'mdi:update',
      },
      ...pendingIds.map((entityId) => ({
        type: 'tile',
        entity: entityId,
        vertical: false,
        state_content: ['state', 'installed_version'],
        color: 'orange',
        ...phoneFullWidth(),
      })),
    ],
  };
}

/** Critical batteries; heading deep-links to the Batteries view when it's enabled. */
export function buildCriticalBatteriesSection(
  criticalIds: string[],
  config: OrielConfig,
): LovelaceSectionConfig | null {
  if (criticalIds.length === 0) return null;
  const batteriesViewEnabled = config.show_battery_summary !== false;
  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: `${localize('maintenance.critical_batteries')} (${criticalIds.length})`,
        heading_style: 'title',
        icon: 'mdi:battery-alert',
        ...(batteriesViewEnabled
          ? { tap_action: { action: 'navigate', navigation_path: 'batteries' } }
          : {}),
      },
      ...criticalIds.map((entityId) => ({
        type: 'tile',
        entity: entityId,
        vertical: false,
        state_content: ['state', 'last_changed'],
        color: 'red',
        ...phoneFullWidth(),
      })),
    ],
  };
}

/** Unavailable devices — one tile per device, riding its first visible entity. */
export function buildUnavailableDevicesSection(
  devices: UnavailableDevice[],
): LovelaceSectionConfig | null {
  if (devices.length === 0) return null;
  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: `${localize('maintenance.unavailable_devices')} (${devices.length})`,
        heading_style: 'title',
        icon: 'mdi:lan-disconnect',
      },
      ...devices.map((device) => ({
        type: 'tile',
        entity: device.representativeId,
        name: device.name,
        vertical: false,
        state_content: 'last_changed',
        ...phoneFullWidth(),
      })),
    ],
  };
}

/**
 * HA's built-in repairs / updates / discovered-devices cards. The card
 * types only exist since HA 2026.3 — on older frontends an unknown card
 * type renders as a red error card, so this degrades to nothing there
 * (the update tiles already cover updates). The cards gate themselves
 * to admins and hide when empty. Exported for tests.
 */
export function buildNativeMaintenanceSection(hass: HomeAssistant): LovelaceSectionConfig | null {
  if (!haVersionAtLeast(hass, 2026, 3)) return null;
  const cards: LovelaceCardConfig[] = [
    {
      type: 'repairs',
      hide_empty: true,
      grid_options: { columns: 'full' },
    },
    {
      type: 'updates',
      hide_empty: true,
      grid_options: { columns: 'full' },
    },
    {
      type: 'discovered-devices',
      hide_empty: true,
      grid_options: { columns: 'full' },
    },
  ];
  return { type: 'grid', cards };
}

/** Logbook queries get heavy with long entity lists — bound the target. */
const MAX_ACTIVITY_ENTITIES = 50;

/**
 * 24h logbook scoped to exactly the entities this view reported
 * (pending updates, critical batteries, unavailable-device
 * representatives). Opt-out via show_maintenance_activity; auto-hides
 * without the logbook integration or when nothing was reported.
 * Exported for tests.
 */
export function buildMaintenanceActivitySection(
  hass: HomeAssistant,
  config: OrielConfig,
  reportedEntityIds: string[],
): LovelaceSectionConfig | null {
  if (config.show_maintenance_activity === false) return null;
  if (!hass.config?.components?.includes('logbook')) return null;
  if (reportedEntityIds.length === 0) return null;

  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: localize('maintenance.activity'),
        heading_style: 'title',
        icon: 'mdi:history',
      },
      {
        type: 'logbook',
        target: { entity_id: reportedEntityIds.slice(0, MAX_ACTIVITY_ENTITIES) },
        hours_to_show: 24,
        grid_options: { columns: 12 },
      },
    ],
  };
}

class OrielViewMaintenance extends HTMLElement {
  static async generate(
    config: MaintenanceViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    const strategyConfig = config.config || {};

    const pendingUpdates = collectPendingUpdates(hass);
    const criticalBatteries = collectCriticalBatteries(hass, strategyConfig);
    const unavailableDevices = collectUnavailableDevices(hass);

    const sections: LovelaceSectionConfig[] = [];

    const nativeSection = buildNativeMaintenanceSection(hass);
    if (nativeSection) sections.push(nativeSection);

    const updatesSection = buildUpdatesSection(pendingUpdates);
    if (updatesSection) sections.push(updatesSection);

    const batteriesSection = buildCriticalBatteriesSection(criticalBatteries, strategyConfig);
    if (batteriesSection) sections.push(batteriesSection);

    // Unavailable devices deliberately last — usually the longest list.
    const unavailableSection = buildUnavailableDevicesSection(unavailableDevices);
    if (unavailableSection) sections.push(unavailableSection);

    const activitySection = buildMaintenanceActivitySection(hass, strategyConfig, [
      ...pendingUpdates,
      ...criticalBatteries,
      ...unavailableDevices.map((device) => device.representativeId),
    ]);
    if (activitySection) sections.push(activitySection);

    const finalSections = showAreaInSummaries(strategyConfig)
      ? applyAreaContextToSections(sections, hass)
      : sections;
    return {
      type: 'sections',
      ...densePlacement(strategyConfig),
      sections: packSections(strategyConfig, finalSections, 'maintenance'),
    };
  }
}

customElements.define('ll-strategy-view-oriel-maintenance', OrielViewMaintenance);
