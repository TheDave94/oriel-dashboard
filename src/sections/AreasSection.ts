// ====================================================================
// Areas Section Builder
// ====================================================================
// Ported from dist/utils/oriel-section-builder.js (createAreasSection)
// with full TypeScript types.
// Creates area cards grouped by floor or as a single flat section.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { AreaRegistryEntry } from '../types/registries';
import type { FloorsDisplay } from '../types/strategy';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { getOrderedFloorIds } from '../utils/name-utils';

// Area control domains to check (same as HA, with optional 'switch')
const CONTROL_DOMAINS = [
  'light',
  'fan',
  'switch',
  'cover-shutter',
  'cover-blind',
  'cover-curtain',
  'cover-shade',
  'cover-awning',
  'cover-garage',
  'cover-gate',
  'cover-door',
  'cover-window',
  'cover-damper',
] as const;

type ControlDomain = (typeof CONTROL_DOMAINS)[number];

/**
 * Pre-computes which area-controls actually have entities in this area.
 * This avoids the area card having to scan all entities at render time.
 * Same approach as HA's areas-overview-view-strategy.
 */
function getAreaControls(areaId: string, hass: HomeAssistant): ControlDomain[] {
  const areaEntities = Registry.getVisibleEntitiesForArea(areaId);
  if (areaEntities.length === 0) return [];

  const found = new Set<ControlDomain>();

  for (const entity of areaEntities) {
    const state = hass.states[entity.entity_id];
    if (!state) continue;

    const domain = entity.entity_id.split('.')[0];
    const deviceClass = state.attributes?.device_class as string | undefined;

    if (domain === 'light') found.add('light');
    else if (domain === 'fan') found.add('fan');
    else if (domain === 'switch' && Registry.config.show_switches_on_areas) found.add('switch');
    else if (domain === 'cover' && deviceClass) {
      const key = `cover-${deviceClass}` as ControlDomain;
      if (CONTROL_DOMAINS.includes(key)) found.add(key);
    }
  }

  // Return in canonical CONTROL_DOMAINS order, not entity-iteration order.
  // Set preserves insertion order in JS, which depends on the order entities
  // happened to be added — that varies between areas (because the entity
  // registry returns entities in registration order), so without an explicit
  // sort, two areas with the same control mix could produce shortcut icons
  // in different orders. Original analysis: upstream simon42#201.
  return CONTROL_DOMAINS.filter((d) => found.has(d));
}

// Alert-relevant binary sensor device classes.
// Excludes noisy classes like light, connectivity, battery, plug, power, running, problem.
const ALERT_DEVICE_CLASSES = new Set([
  'motion', 'occupancy', 'sound',
  'moisture',
  'smoke', 'gas', 'heat', 'cold', 'safety', 'tamper', 'vibration',
]);

// Window/door alerts are gated by a separate toggle (show_window_alerts_on_areas)
// because they're less universally desired — many users have permanent contact
// sensors on doors that they don't want as constant "alerts" on the overview.
const WINDOW_ALERT_DEVICE_CLASSES = new Set(['window', 'door', 'opening', 'garage_door']);

/**
 * Pre-computes which binary sensor alert classes exist in this area.
 * Only returns device classes from the allowlist that have at least one
 * binary_sensor entity, so the area card doesn't scan all entities at render time.
 */
function getAreaAlertClasses(
  areaId: string,
  hass: HomeAssistant,
  includeStandardAlerts: boolean,
  includeWindowAlerts: boolean
): string[] {
  const areaEntities = Registry.getVisibleEntitiesForArea(areaId);
  if (areaEntities.length === 0) return [];

  const found = new Set<string>();

  for (const entity of areaEntities) {
    const domain = entity.entity_id.split('.')[0];
    if (domain !== 'binary_sensor') continue;

    const state = hass.states[entity.entity_id];
    const deviceClass = state?.attributes?.device_class as string | undefined;
    if (!deviceClass) continue;
    if (includeStandardAlerts && ALERT_DEVICE_CLASSES.has(deviceClass)) found.add(deviceClass);
    else if (includeWindowAlerts && WINDOW_ALERT_DEVICE_CLASSES.has(deviceClass)) found.add(deviceClass);
  }

  return [...found];
}

/**
 * Builds a single area card config for use in area sections.
 * Pre-filters controls and sensor_classes like HA does — the card
 * only gets what actually exists, avoiding expensive entity scanning at render.
 */
function buildAreaCard(area: AreaRegistryEntry, hass: HomeAssistant): LovelaceCardConfig {
  const controls = getAreaControls(area.area_id, hass);

  // Only include sensor_classes that are configured on the area (like HA does)
  const sensorClasses: string[] = [];
  if (area.temperature_entity_id && hass.states[area.temperature_entity_id]) {
    sensorClasses.push('temperature');
  }
  if (area.humidity_entity_id && hass.states[area.humidity_entity_id]) {
    sensorClasses.push('humidity');
  }

  // Pre-filter alert classes if enabled. Window/door classes are gated by a
  // separate toggle so users can opt into open-window badges independently.
  const showAlerts = Registry.config.show_alerts_on_areas === true;
  const showWindowAlerts = Registry.config.show_window_alerts_on_areas === true;
  const alertClasses = showAlerts || showWindowAlerts
    ? getAreaAlertClasses(area.area_id, hass, showAlerts, showWindowAlerts)
    : undefined;

  const native: LovelaceCardConfig = {
    type: 'area',
    area: area.area_id,
    display_type: 'compact',
    sensor_classes: sensorClasses.length > 0 ? sensorClasses : undefined,
    alert_classes: alertClasses && alertClasses.length > 0 ? alertClasses : undefined,
    features: controls.length > 0 ? [{ type: 'area-controls', controls }] : [],
    features_position: 'inline',
    navigation_path: area.area_id,
    vertical: false,
    grid_options: { columns: 'full' },
  };

  // #150: long-press → scene menu. HA's area card has no hold_action, so
  // when enabled AND the area has scenes, wrap the native card in
  // oriel-area-card (which owns the hold gesture). Otherwise emit the
  // native card unchanged — zero overhead when the feature is off.
  if (Registry.config.area_hold_shows_scenes === true) {
    const scenes = Registry.getVisibleEntitiesForArea(area.area_id)
      .map((e) => e.entity_id)
      .filter((id) => id.startsWith('scene.'));
    if (scenes.length > 0) {
      // Disable the inner card's own tap so the gesture bubbles to the
      // wrapper (which owns tap → navigate and hold → scene menu). The
      // wrapper carries navigation_path to replicate the tap navigation.
      const inner: LovelaceCardConfig = { ...native, tap_action: { action: 'none' } };
      delete (inner as { navigation_path?: string }).navigation_path;
      return {
        type: 'custom:oriel-area-card',
        area_card_config: inner,
        scenes,
        navigation_path: area.area_id,
      };
    }
  }

  return native;
}

/**
 * Fallback floor icons based on HA's floor icons (mdi:home-floor-0 to mdi:home-floor-3, mdi:home-floor-negative-1).
 * HA doesn't provide a default icon for floors, but these are commonly used in custom floor plans.
 */
function getFloorIcon(level: number | null | undefined): string {
  if (level == null) return 'mdi:floor-plan';
  if (level === -1) return 'mdi:home-floor-negative-1';
  if (level >= 0 && level <= 3) return `mdi:home-floor-${level}`;
  return 'mdi:floor-plan';
}

/**
 * Creates the areas section(s).
 *
 * - Without floor grouping: returns a single section with all areas.
 * - With floor grouping: returns an array of sections, one per floor,
 *   plus an optional "Weitere Bereiche" section for areas without a floor.
 */
export function createAreasSection(
  visibleAreas: AreaRegistryEntry[],
  groupByFloors: boolean = false,
  hass: HomeAssistant | null = null,
  hideAreasHeading: boolean = false,
  hideAreasOtherHeading: boolean = false,
  floorsDisplay?: FloorsDisplay
): LovelaceSectionConfig | LovelaceSectionConfig[] | null {
  // Auto-hide: no visible areas → no section at all (not a lonely heading)
  if (visibleAreas.length === 0) return null;

  // No floor grouping: flat list
  if (!groupByFloors || !hass) {
    const cards: LovelaceCardConfig[] = [];
    if (!hideAreasHeading) {
      cards.push({
        type: 'heading',
        heading_style: 'title',
        heading: localize('sections.areas'),
      });
    }
    for (const area of visibleAreas) cards.push(buildAreaCard(area, hass as HomeAssistant));
    return { type: 'grid', cards };
  }

  // Group areas by floor
  const areasByFloor = new Map<string, AreaRegistryEntry[]>();
  const areasWithoutFloor: AreaRegistryEntry[] = [];

  for (const area of visibleAreas) {
    if (area.floor_id) {
      if (!areasByFloor.has(area.floor_id)) {
        areasByFloor.set(area.floor_id, []);
      }
      areasByFloor.get(area.floor_id)?.push(area);
    } else {
      areasWithoutFloor.push(area);
    }
  }

  // Build sections per floor
  const sections: LovelaceSectionConfig[] = [];

  // Floor order: user-configured (floors_display.order) falling back to HA's
  // registry order. getOrderedFloorIds is the shared source of truth so the
  // overview, lights, and covers views never disagree. (#129)
  const floorOrder = getOrderedFloorIds(hass, floorsDisplay);
  const sortedFloors = floorOrder.filter((id) => areasByFloor.has(id));

  for (const floorId of sortedFloors) {
    const areas = areasByFloor.get(floorId) ?? [];
    const floor = hass.floors[floorId] as (typeof hass.floors)[string] | undefined;
    const floorName = floor?.name || floorId;
    const floorIcon = floor?.icon || getFloorIcon(floor?.level);

    sections.push({
      type: 'grid',
      cards: [
        {
          type: 'heading',
          heading_style: 'title',
          heading: floorName,
          icon: floorIcon,
        },
        ...areas.map((area) => buildAreaCard(area, hass)),
      ],
    });
  }

  // Areas without a floor
  if (areasWithoutFloor.length > 0) {
    const cards: LovelaceCardConfig[] = [];
    if (!hideAreasOtherHeading) {
      cards.push({
        type: 'heading',
        heading_style: 'title',
        heading: localize('sections.areas_other'),
        icon: 'mdi:home-outline',
      });
    }
    for (const area of areasWithoutFloor) cards.push(buildAreaCard(area, hass));
    sections.push({ type: 'grid', cards });
  }

  return sections;
}
