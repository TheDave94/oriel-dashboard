// ====================================================================
// Name & Entity Utility Functions
// ====================================================================
// Ported from dist/utils/oriel-helpers.js with full TypeScript types,
// module-level RegExp caches, and regex-escaping for area names.
// ====================================================================

import { Registry } from '../Registry';
import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceSectionConfig } from '../types/lovelace';
import type { AreaRegistryEntry, EntityRegistryEntry } from '../types/registries';
import type { AreasDisplay, FloorsDisplay, OrielConfig } from '../types/strategy';

// -- Module-level RegExp caches (shared across all calls) -------------

interface AreaRegExps {
  start: RegExp;
  end: RegExp;
  middle: RegExp;
}

const _areaRegExpCache = new Map<string, AreaRegExps>();

const _coverTypeRegExps: RegExp[] = [
  'Rollo',
  'Rollos',
  'Rolladen',
  'Rolläden',
  'Vorhang',
  'Vorhänge',
  'Jalousie',
  'Jalousien',
  'Shutter',
  'Shutters',
  'Blind',
  'Blinds',
].map((type) => new RegExp(`\\b${type}\\b`, 'gi'));

// -- Helper: escape special regex characters --------------------------

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// -- Helper: extract friendly name or fallback from entity ID ---------

function getFriendlyName(entityId: string, hass: HomeAssistant): string | null {
  const state = hass.states[entityId];
  if (!state) return null;
  const objectId = entityId.split('.')[1] ?? entityId;
  return (state.attributes?.friendly_name as string | undefined) ?? objectId.replace(/_/g, ' ');
}

// -- Exported functions -----------------------------------------------

/**
 * Strips the area name from an entity's friendly name.
 * Uses cached, regex-escaped patterns per area name to avoid recompilation
 * and prevent bugs with special characters in area names.
 */
export function stripAreaName(entityId: string, area: AreaRegistryEntry, hass: HomeAssistant): string {
  const state = hass.states[entityId];
  if (!state) return entityId;

  const name = getFriendlyName(entityId, hass);
  if (!name) return entityId;

  const areaName = area.name;
  if (!areaName) return name;

  // Build and cache RegExps for this area name (compiled once, reused)
  if (!_areaRegExpCache.has(areaName)) {
    const escaped = escapeRegExp(areaName);
    _areaRegExpCache.set(areaName, {
      start: new RegExp(`^${escaped}\\s+`, 'i'),
      end: new RegExp(`\\s+${escaped}$`, 'i'),
      middle: new RegExp(`\\s+${escaped}\\s+`, 'i'),
    });
  }

  const re = _areaRegExpCache.get(areaName);
  if (!re) return name;
  const cleanName = name.replace(re.start, '').replace(re.end, '').replace(re.middle, ' ').trim();

  // Only use cleaned name if something meaningful remains
  if (cleanName.length > 0 && cleanName.toLowerCase() !== areaName.toLowerCase()) {
    return cleanName;
  }

  return name;
}

/**
 * Resolves the `name` to emit on a room tile. Default behaviour is the
 * area-stripped friendly name (stripAreaName). When `use_entity_name` is
 * set, returns HA's name object `{ type: 'entity' }` instead, so the tile
 * renders the entity name only — suppressing HA 2026.02's "Device › Entity"
 * scheme (verified honored on the tile card). See issue #208.
 */
export function tileName(
  entityId: string,
  area: AreaRegistryEntry,
  hass: HomeAssistant,
  config: { use_entity_name?: boolean },
): string | { type: 'entity' } {
  if (config?.use_entity_name) return { type: 'entity' };
  return stripAreaName(entityId, area, hass);
}

/**
 * Strips cover type terms (Rollo, Jalousie, Shutter, etc.) from an entity's
 * friendly name. Uses pre-compiled RegExps for performance.
 */
export function stripCoverType(entityId: string, hass: HomeAssistant): string {
  const state = hass.states[entityId];
  if (!state) return entityId;

  let name = getFriendlyName(entityId, hass);
  if (!name) return entityId;

  // Remove cover type terms using pre-compiled patterns
  for (const regex of _coverTypeRegExps) {
    regex.lastIndex = 0;
    name = name.replace(regex, '').trim();
  }

  // Collapse multiple whitespace
  name = name.replace(/\s+/g, ' ').trim();

  // Only use cleaned name if something meaningful remains
  if (name.length > 0) {
    return name;
  }

  // Fallback to original friendly name
  const objectId = entityId.split('.')[1] ?? entityId;
  return (state.attributes?.friendly_name as string | undefined) ?? objectId.replace(/_/g, ' ');
}

/**
 * Resolve floor display order. Returns floor_ids in the user-configured
 * order (`floors_display.order`), with any floors not listed appended in
 * HA registry order. With no config, returns HA registry order unchanged
 * (zero behavioural change for existing dashboards). Single source of truth
 * for every floor-grouped view so they never disagree. (#129)
 */
export function getOrderedFloorIds(hass: HomeAssistant, display?: FloorsDisplay): string[] {
  const all = Object.keys(hass.floors);
  const order = display?.order ?? [];
  if (order.length === 0) return all;
  return [...all].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return all.indexOf(a) - all.indexOf(b); // unordered → keep registry order
  });
}

/**
 * Filters areas based on display configuration (hidden list) and sorts them
 * by the configured order or alphabetically as fallback.
 */
export function getVisibleAreas(
  areas: AreaRegistryEntry[],
  displayConfig?: AreasDisplay,
  useDefaultSort?: boolean
): AreaRegistryEntry[] {
  const hiddenAreas = displayConfig?.hidden ?? [];

  // Filter out hidden areas
  const visibleAreas = areas.filter((area) => !hiddenAreas.includes(area.area_id));

  // If useDefaultSort is true, use HA's native area order (as-is from registry)
  if (useDefaultSort) {
    return visibleAreas;
  }

  const orderConfig = displayConfig?.order ?? [];

  // Sort by configured order, then alphabetically for unordered
  if (orderConfig.length > 0) {
    visibleAreas.sort((a, b) => {
      const indexA = orderConfig.indexOf(a.area_id);
      const indexB = orderConfig.indexOf(b.area_id);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  } else {
    visibleAreas.sort((a, b) => a.name.localeCompare(b.name));
  }

  return visibleAreas;
}

/**
 * Like getVisibleAreas but reads from hass.areas (synchronous Record)
 * instead of Registry.areas (requires WebSocket init).
 * Used by the dashboard entry point to avoid blocking on Registry.
 */
export function getVisibleAreasFromHass(
  hass: HomeAssistant,
  displayConfig?: AreasDisplay,
  useDefaultSort?: boolean
): AreaRegistryEntry[] {
  return getVisibleAreas(Object.values(hass.areas), displayConfig, useDefaultSort);
}

/**
 * Checks whether an entity should be excluded from the dashboard based on
 * its registry flags: hidden, entity_category, labels, and config.
 *
 * Delegates to Registry.isEntityExcludedWithStateCategory() which covers
 * all exclusion criteria including state attribute fallback.
 */
export function isEntityHiddenOrDisabled(entity: EntityRegistryEntry, _hass: HomeAssistant): boolean {
  return Registry.isEntityExcludedWithStateCategory(entity.entity_id);
}

/**
 * Comparator that sorts entity IDs by last_changed timestamp,
 * most recently changed first.
 */
export function sortByLastChanged(a: string, b: string, hass: HomeAssistant): number {
  const stateA = hass.states[a];
  const stateB = hass.states[b];
  if (!stateA || !stateB) return 0;

  const dateA = new Date(stateA.last_changed).getTime();
  const dateB = new Date(stateB.last_changed).getTime();
  return dateB - dateA; // Newest first
}

// -- Area context for summary tiles (#131) ----------------------------

/**
 * Resolves the area name for an entity, falling back through its device:
 * entity.area_id → device.area_id → null. Returns null when neither the
 * entity nor its device is assigned to an area.
 */
export function getAreaNameForEntity(entityId: string, hass: HomeAssistant): string | null {
  const entity = Registry.getEntity(entityId);
  let areaId: string | null = entity?.area_id ?? null;
  if (!areaId && entity?.device_id) {
    const device = Registry.getDevice(entity.device_id);
    areaId = device?.area_id ?? null;
  }
  if (!areaId) return null;
  return hass.areas?.[areaId]?.name ?? null;
}

/**
 * Joins a resolved area name and a display name as "Area • name", returning the
 * display name unchanged when there is no area. Shared formatter so the section
 * pass and the summary group cards (lights/covers) produce the same label; the
 * group cards resolve the area via their own cached lookup and pass the name in
 * here. See issue #131.
 */
export function joinAreaName(areaName: string | null | undefined, displayName: string): string {
  return areaName ? `${areaName} • ${displayName}` : displayName;
}

/**
 * Builds an area-qualified tile label — "Area • Friendly name", or just the
 * area name when no friendly name exists. Returns null when the entity has no
 * area, so callers can leave the tile's default name untouched.
 */
export function areaQualifiedTileName(entityId: string, hass: HomeAssistant): string | null {
  const areaName = getAreaNameForEntity(entityId, hass);
  if (!areaName) return null;
  const friendly = hass.states[entityId]?.attributes?.friendly_name as string | undefined;
  return friendly ? joinAreaName(areaName, friendly) : areaName;
}

/**
 * Whether the "area context in summaries" capability is enabled. Reads the
 * general `show_area_in_summaries` flag and honors the legacy battery-only
 * `show_area_in_battery_view` flag as an alias (read-migration), so existing
 * configs keep working. See issue #131.
 */
export function showAreaInSummaries(config: OrielConfig): boolean {
  return config.show_area_in_summaries === true || config.show_area_in_battery_view === true;
}

/**
 * Applies area-qualified names to every tile in a summary view's sections,
 * mutating in place. Skips non-tile cards (headings, badges) and tiles that
 * already carry an explicit name, and leaves area-less entities untouched.
 * This is the single application point for the area-context capability across
 * the flat summary views (batteries/security/climate). See issue #131.
 */
export function applyAreaContextToSections(
  sections: LovelaceSectionConfig[],
  hass: HomeAssistant,
): LovelaceSectionConfig[] {
  for (const section of sections) {
    const cards = (section as { cards?: Array<Record<string, unknown>> }).cards;
    if (!Array.isArray(cards)) continue;
    for (const card of cards) {
      if (card?.type !== 'tile' || typeof card.entity !== 'string' || card.name !== undefined) {
        continue;
      }
      const label = areaQualifiedTileName(card.entity, hass);
      if (label) card.name = label;
    }
  }
  return sections;
}
