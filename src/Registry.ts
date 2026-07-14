// ====================================================================
// ORIEL - Registry (Singleton)
// ====================================================================
// Central data access layer. Replaces scattered entity filtering across
// multiple JS files with pre-computed Maps and Sets for O(1) lookups.
//
// Usage:
//   Registry.initialize(hass, config);   // once at strategy start
//   Registry.getEntitiesForArea('bad');   // anywhere afterwards
//   Registry.isEntityExcluded('light.x'); // full exclusion check
// ====================================================================

import type { HomeAssistant } from './types/homeassistant';
import type {
  EntityRegistryEntry,
  DeviceRegistryEntry,
  AreaRegistryEntry,
  FloorRegistryEntry,
} from './types/registries';
import type { OrielConfig } from './types/strategy';
import { timeStart, timeEnd, debugLog } from './utils/debug';
import { setupLocalize } from './utils/localize';

/**
 * Static singleton registry that holds all HA registry data and provides
 * fast lookups. Must be initialized once via Registry.initialize() before
 * any other access.
 *
 * Reads directly from hass.entities/devices/areas (synchronous, no WebSocket
 * calls). All members are static, all maps are built once on initialize().
 */
class Registry {
  // Prevent instantiation
  private constructor() {}

  // === Raw data references ===

  private static _hass: HomeAssistant;
  private static _config: OrielConfig;

  // === Registry arrays (from hass object) ===

  /** Entity registry entries from hass.entities */
  private static _fetchedEntities: EntityRegistryEntry[];

  /** Device registry entries from hass.devices */
  private static _fetchedDevices: DeviceRegistryEntry[];

  /** Area registry entries from hass.areas */
  private static _fetchedAreas: AreaRegistryEntry[];

  // === Pre-computed Maps for O(1) lookups ===

  /** Entity registry entry by entity_id */
  private static _entityById: Map<string, EntityRegistryEntry>;

  /** Device registry entry by device id */
  private static _deviceById: Map<string, DeviceRegistryEntry>;

  /** Entity IDs grouped by device_id */
  private static _entitiesByDevice: Map<string, string[]>;

  /** Entity registry entries grouped by resolved area_id (entity.area_id || device.area_id) */
  private static _entitiesByArea: Map<string, EntityRegistryEntry[]>;

  /** Entity IDs grouped by domain prefix (e.g. "light", "sensor") */
  private static _entitiesByDomain: Map<string, string[]> = new Map();

  // === Pre-filtered Maps (visible entities only — no hidden/disabled/excluded) ===

  /** Visible entity entries grouped by area (pre-filtered during init) */
  private static _visibleEntitiesByArea: Map<string, EntityRegistryEntry[]>;

  /** Visible entity IDs grouped by domain (pre-filtered during init) */
  private static _visibleEntitiesByDomain: Map<string, string[]> = new Map();

  /** Config/diagnostic entities grouped by area (for potential future use) */
  private static _configDiagEntitiesByArea: Map<string, EntityRegistryEntry[]>;

  // === Pre-computed exclusion Sets ===

  /** Entities with the "no_dboard" label — excluded from all dashboard views */
  private static _excludeSet: Set<string>;

  /** Entities hidden via areas_options.*.groups_options.*.hidden in config */
  private static _hiddenFromConfig: Set<string>;

  /** Initialization flag */
  private static _initialized: boolean = false;
  /**
   * Identity of the `hass.entities` object the Registry was last built
   * from. HA mutates `hass` via Object.assign of new references on
   * registry updates (entity renames, area assignments) — the entity
   * map identity flips even when individual entries are unchanged. By
   * comparing identity we rebuild only when there's actually new
   * data, which keeps initialize() idempotent within a single render
   * pass but invalidates correctly on real registry events.
   *
   * ## Note on churn-cost mitigations (follow-up #2 §5, v4.7.0)
   *
   * The original review proposed three mitigations against sustained
   * `hass.entities` churn (Zigbee/Z-Wave device-add bursts, bulk area
   * reassignments): per-card shouldUpdate filtering (5a), microtask
   * coalescing of repeated initialize() calls (5b), and diff-based
   * incremental rebuilds (5c).
   *
   * Before shipping any of them we measured the actual cost. See
   * `tests/perf/registry-churn.bench.test.ts` — on a 300-entity
   * fixture, 10 successive `hass.entities` replacements cost
   * **min 2.2ms / avg 3.8ms / max 5.6ms** end-to-end. Extrapolated
   * to a 2000-entity install (the original concern), worst case is
   * ~30-40ms across a 10-event burst — well inside any reasonable
   * UI budget.
   *
   * The bench measures Registry-rebuild cost only. The spec's
   * remaining concern was per-card render cost on irrelevant `hass`
   * updates (`@property hass` triggers re-render regardless of
   * whether any relevant entity changed). That cost is real but
   * separate from the Registry, and was not measured here.
   *
   * Decision: **no mitigations shipped in v4.7.0.** The Registry path
   * is fast enough on current scale; 5a remains a documented option
   * for a future PR if a real user reports stutter on a large
   * install. The bench stays in CI as a regression guard.
   */
  private static _builtFromEntities: unknown = null;
  private static _builtFromDevices: unknown = null;
  private static _builtFromAreas: unknown = null;
  private static _builtFromFloors: unknown = null;
  private static _builtFromAreasOptions: string | null = null;

  /**
   * Count of full rebuilds that actually fired (not idempotent early-
   * returns). Used by the perf-churn bench test to verify coalescing
   * + cache-hit behaviour. Reset by `resetForTesting()`.
   */
  private static _rebuildCount: number = 0;

  /** Test-only: read the rebuild counter. Lives next to resetForTesting. */
  static getRebuildCountForTesting(): number {
    return Registry._rebuildCount;
  }

  /**
   * Reset the Registry singleton between tests so each test starts with a
   * clean slate. Production code never calls this — the singleton lives for
   * the lifetime of the dashboard. Exported so vitest test files can clear
   * cross-test state without using vi.resetModules() (which is expensive).
   */
  static resetForTesting(): void {
    Registry._initialized = false;
    Registry._builtFromEntities = null;
    Registry._builtFromDevices = null;
    Registry._builtFromAreas = null;
    Registry._builtFromFloors = null;
    Registry._builtFromAreasOptions = null;
    Registry._rebuildCount = 0;
  }

  // =====================================================================
  // Initialization
  // =====================================================================

  /**
   * Initialize the registry from hass object and strategy config.
   * Synchronous — reads directly from hass.entities/devices/areas.
   * Idempotent across one render pass; rebuilds when the underlying
   * hass registries' identity changes (HA replaces the maps on
   * registry updates).
   */
  static initialize(hass: HomeAssistant, config: OrielConfig): void {
    // A caller passing an empty config has no opinion (view strategies
    // fall back to `config.config || {}` when embedded standalone) —
    // don't let it evict the dashboard's real config.
    const hasConfig = config && Object.keys(config).length > 0;
    // Only areas_options feeds the pre-built maps (via
    // _hiddenFromConfig); every other config key is read live through
    // Registry.config. Fingerprint it so an editor save that hides an
    // entity rebuilds even though no hass registry changed.
    const configFingerprint = hasConfig
      ? JSON.stringify(config.areas_options ?? null)
      : Registry._builtFromAreasOptions;

    if (
      Registry._initialized &&
      Registry._builtFromEntities === hass.entities &&
      Registry._builtFromDevices === hass.devices &&
      Registry._builtFromAreas === hass.areas &&
      Registry._builtFromFloors === hass.floors &&
      Registry._builtFromAreasOptions === configFingerprint
    ) {
      // Maps are current — but keep the live references fresh: hass is
      // replaced on every state change, and consumers read states,
      // floors, and config toggles through these getters.
      Registry._hass = hass;
      if (hasConfig) Registry._config = config;
      return;
    }

    timeStart('registry-init');
    Registry._rebuildCount += 1;
    Registry._hass = hass;
    if (hasConfig || !Registry._initialized) Registry._config = config;

    // Initialize localization from hass language settings
    setupLocalize(hass);

    // Read registries from hass object (synchronous, no WebSocket)
    Registry._fetchedEntities = Object.values(hass.entities);
    Registry._fetchedDevices = Object.values(hass.devices);
    Registry._fetchedAreas = Object.values(hass.areas);

    // Build exclusion sets FIRST (needed by entity maps for pre-filtering)
    timeStart('registry-buildExclusionSets');
    Registry._buildExclusionSets();
    timeEnd('registry-buildExclusionSets');

    // Build pre-computed Maps/Sets for O(1) lookups (raw + pre-filtered)
    timeStart('registry-buildDeviceMaps');
    Registry._buildDeviceMaps();
    timeEnd('registry-buildDeviceMaps');

    timeStart('registry-buildEntityMaps');
    Registry._buildEntityMaps();
    timeEnd('registry-buildEntityMaps');

    // Markers committed only AFTER a successful build: stamping them up
    // front would make a mid-build exception look like a completed
    // rebuild to the guard, silently serving half-built maps forever.
    Registry._builtFromEntities = hass.entities;
    Registry._builtFromDevices = hass.devices;
    Registry._builtFromAreas = hass.areas;
    Registry._builtFromFloors = hass.floors;
    Registry._builtFromAreasOptions = hasConfig
      ? JSON.stringify(config.areas_options ?? null)
      : Registry._builtFromAreasOptions;
    Registry._initialized = true;
    debugLog(
      `Registry initialized: ${Registry._fetchedEntities.length} entities, ${Registry._fetchedDevices.length} devices, ${Registry._fetchedAreas.length} areas`
    );
    timeEnd('registry-init');
  }

  // =====================================================================
  // Map building (private)
  // =====================================================================

  // =====================================================================
  // Visibility check (private helper for pre-filtering)
  // =====================================================================

  /**
   * Check if an entity should be visible on the dashboard.
   * Combines all exclusion criteria into a single check:
   * - no_dboard label
   * - Config-hidden (areas_options)
   * - hidden (by user/integration)
   * - entity_category config/diagnostic
   *
   * Note: disabled entities are already excluded from hass.entities.
   */
  private static _isEntityVisible(entity: EntityRegistryEntry): boolean {
    if (Registry._excludeSet.has(entity.entity_id)) return false;
    if (Registry._hiddenFromConfig.has(entity.entity_id)) return false;
    if (entity.hidden) return false;
    if (entity.entity_category === 'config' || entity.entity_category === 'diagnostic') return false;
    return true;
  }

  /**
   * Check if an entity is config or diagnostic category.
   */
  private static _isConfigOrDiagnostic(entity: EntityRegistryEntry): boolean {
    return entity.entity_category === 'config' || entity.entity_category === 'diagnostic';
  }

  // =====================================================================
  // Map building (private)
  // =====================================================================

  /**
   * Build entity lookup maps from fetched registry data and hass.states.
   *
   * Builds both raw maps (for editor/special cases) and pre-filtered maps
   * (for dashboard views/cards). Pre-filtering removes hidden/disabled/
   * excluded entities once during init, eliminating redundant checks downstream.
   *
   * Raw maps:
   * - _entityById, _entitiesByDomain, _entitiesByDevice, _entitiesByArea
   *
   * Pre-filtered maps:
   * - _visibleEntitiesByArea, _visibleEntitiesByDomain, _configDiagEntitiesByArea
   */
  private static _buildEntityMaps(): void {
    const entities = Registry._fetchedEntities;

    // Entity by ID (always raw — needed for individual lookups)
    Registry._entityById = new Map();
    for (const e of entities) {
      Registry._entityById.set(e.entity_id, e);
    }

    // Entities by domain — raw + visible. NOT state-gated at build time:
    // states arriving after the build (integration still starting up)
    // don't bump any registry identity, so a build-time gate dropped
    // those entities from every domain view until an unrelated registry
    // event. The state filter lives in the query methods instead,
    // evaluated against the LIVE hass reference (kept fresh on every
    // initialize()).
    Registry._entitiesByDomain = new Map();
    Registry._visibleEntitiesByDomain = new Map();
    for (const e of entities) {
      const dotIndex = e.entity_id.indexOf('.');
      const domain = e.entity_id.substring(0, dotIndex);

      // Raw map (all registry entities with a state)
      if (!Registry._entitiesByDomain.has(domain)) {
        Registry._entitiesByDomain.set(domain, []);
      }
      Registry._entitiesByDomain.get(domain)?.push(e.entity_id);

      // Visible map (pre-filtered)
      if (Registry._isEntityVisible(e)) {
        if (!Registry._visibleEntitiesByDomain.has(domain)) {
          Registry._visibleEntitiesByDomain.set(domain, []);
        }
        Registry._visibleEntitiesByDomain.get(domain)?.push(e.entity_id);
      }
    }

    // Entities by device (raw only — device grouping is internal)
    Registry._entitiesByDevice = new Map();
    for (const e of entities) {
      if (e.device_id) {
        if (!Registry._entitiesByDevice.has(e.device_id)) {
          Registry._entitiesByDevice.set(e.device_id, []);
        }
        Registry._entitiesByDevice.get(e.device_id)?.push(e.entity_id);
      }
    }

    // Entities by area — raw + visible + config/diagnostic
    Registry._entitiesByArea = new Map();
    Registry._visibleEntitiesByArea = new Map();
    Registry._configDiagEntitiesByArea = new Map();

    for (const e of entities) {
      const areaId = e.area_id || (e.device_id ? Registry._deviceById.get(e.device_id)?.area_id : undefined);
      if (!areaId) continue;

      // Raw map (all entities in area)
      if (!Registry._entitiesByArea.has(areaId)) {
        Registry._entitiesByArea.set(areaId, []);
      }
      Registry._entitiesByArea.get(areaId)?.push(e);

      // Config/diagnostic map (separate bucket)
      if (Registry._isConfigOrDiagnostic(e)) {
        if (!Registry._configDiagEntitiesByArea.has(areaId)) {
          Registry._configDiagEntitiesByArea.set(areaId, []);
        }
        Registry._configDiagEntitiesByArea.get(areaId)?.push(e);
      }

      // Visible map (pre-filtered — excludes hidden/disabled/labeled/category)
      if (Registry._isEntityVisible(e)) {
        if (!Registry._visibleEntitiesByArea.has(areaId)) {
          Registry._visibleEntitiesByArea.set(areaId, []);
        }
        Registry._visibleEntitiesByArea.get(areaId)?.push(e);
      }
    }
  }

  /** Build device lookup map from fetched device registry. */
  private static _buildDeviceMaps(): void {
    Registry._deviceById = new Map();
    for (const d of Registry._fetchedDevices) {
      Registry._deviceById.set(d.id, d);
    }
  }

  /**
   * Build exclusion sets from labels and config.
   *
   * Exclusion pipeline (matches the JS data-collectors logic):
   * 1. no_dboard label -> _excludeSet
   * 2. areas_options.*.groups_options.*.hidden -> _hiddenFromConfig
   */
  private static _buildExclusionSets(): void {
    // no_dboard label exclusion
    Registry._excludeSet = new Set();
    for (const e of Registry._fetchedEntities) {
      if (e.labels?.includes('no_dboard')) {
        Registry._excludeSet.add(e.entity_id);
      }
    }

    // Hidden from config (areas_options.{areaId}.groups_options.{domain}.hidden).
    // Null-tolerant throughout: hand-edited YAML with bare keys
    // (`areas_options:\n  kitchen:`) parses to null values, and a throw
    // here kills the whole dashboard generate.
    Registry._hiddenFromConfig = new Set();
    const areasOptions = Registry._config.areas_options;
    if (areasOptions) {
      for (const areaOpts of Object.values(areasOptions)) {
        if (areaOpts?.groups_options) {
          for (const groupOpts of Object.values(areaOpts.groups_options)) {
            if (groupOpts?.hidden && Array.isArray(groupOpts.hidden)) {
              for (const id of groupOpts.hidden) {
                Registry._hiddenFromConfig.add(id);
              }
            }
          }
        }
      }
    }
  }

  // =====================================================================
  // Public accessors — raw data
  // =====================================================================

  /** The Home Assistant instance. */
  static get hass(): HomeAssistant {
    return Registry._hass;
  }

  /** The strategy configuration. */
  static get config(): OrielConfig {
    return Registry._config;
  }

  /** Whether initialize() has been called. */
  static get initialized(): boolean {
    return Registry._initialized;
  }

  // =====================================================================
  // Entity lookups
  // =====================================================================

  /** Get entity registry entry by entity_id. O(1). */
  static getEntity(entityId: string): EntityRegistryEntry | undefined {
    return Registry._entityById.get(entityId);
  }

  /**
   * Registry entity IDs for a domain that currently HAVE a state.
   * The state gate runs here at query time against the live hass —
   * NOT at map-build time — so entities whose state arrives after the
   * build (integration startup race) appear as soon as it does.
   */
  static getEntityIdsForDomain(domain: string): string[] {
    return (Registry._entitiesByDomain.get(domain) || []).filter(
      (id) => id in Registry._hass.states,
    );
  }

  /**
   * Get all entity registry entries assigned to an area.
   * Includes entities whose device resolves to that area.
   * O(1).
   */
  static getEntitiesForArea(areaId: string): EntityRegistryEntry[] {
    return Registry._entitiesByArea.get(areaId) || [];
  }

  /** Get all entity IDs belonging to a device. O(1). */
  static getEntityIdsForDevice(deviceId: string): string[] {
    return Registry._entitiesByDevice.get(deviceId) || [];
  }

  // =====================================================================
  // Pre-filtered entity lookups (visible entities only)
  // =====================================================================

  /**
   * Get visible entity IDs for a domain.
   * Pre-filtered: no hidden, no_dboard, config/diagnostic, config-hidden.
   * State-gated at query time (see getEntityIdsForDomain).
   */
  static getVisibleEntityIdsForDomain(domain: string): string[] {
    return (Registry._visibleEntitiesByDomain.get(domain) || []).filter(
      (id) => id in Registry._hass.states,
    );
  }

  /**
   * update.* entities for maintenance surfaces (overview updates
   * section, updates badge, maintenance view). Unlike the pre-filtered
   * domain map, `entity_category` does NOT exclude here: firmware
   * updates routinely ship as config/diagnostic entities (e.g. Shelly),
   * and maintenance surfaces exist precisely to show them. Every other
   * exclusion (no_dboard label, areas_options hidden, hidden_by) still
   * applies. Ported from upstream simon42 #344's collectUpdateIds fix.
   */
  static getUpdateEntityIds(): string[] {
    return (Registry._entitiesByDomain.get('update') ?? []).filter((id) => {
      if (!(id in Registry._hass.states)) return false;
      const entity = Registry._entityById.get(id);
      if (!entity) return false;
      if (Registry._excludeSet.has(id)) return false;
      if (Registry._hiddenFromConfig.has(id)) return false;
      if (entity.hidden) return false;
      return true;
    });
  }

  /**
   * Get state-only entity IDs for a domain — entities present in
   * `hass.states` but absent from the entity registry (`hass.entities`).
   *
   * These are typically legacy YAML / MQTT entities configured without a
   * `unique_id`, so HA never creates a registry entry. The Registry's domain
   * maps are built entirely from the registry, so such entities are invisible
   * to `getVisibleEntityIdsForDomain`. Views that should surface them (e.g. the
   * Climate view for YAML-configured MQTT thermostats, #155) merge this list in.
   *
   * Filtered by the criteria checkable without a registry entry: the no_dboard
   * label set, areas_options config-hidden, and config/diagnostic category from
   * state attributes. O(n) over hass.states — call once per view, not per card.
   */
  static getStateOnlyEntityIdsForDomain(domain: string): string[] {
    const prefix = `${domain}.`;
    const out: string[] = [];
    for (const entityId of Object.keys(Registry._hass.states)) {
      if (!entityId.startsWith(prefix)) continue;
      if (Registry._entityById.has(entityId)) continue; // registry entity — already handled
      if (Registry._excludeSet.has(entityId)) continue;
      if (Registry._hiddenFromConfig.has(entityId)) continue;
      const cat = Registry._hass.states[entityId]?.attributes?.entity_category;
      if (cat === 'config' || cat === 'diagnostic') continue;
      out.push(entityId);
    }
    return out;
  }

  /**
   * Get visible entity registry entries for an area. O(1).
   * Pre-filtered: no hidden, no_dboard, config/diagnostic, config-hidden.
   */
  static getVisibleEntitiesForArea(areaId: string): EntityRegistryEntry[] {
    return Registry._visibleEntitiesByArea.get(areaId) || [];
  }

  /**
   * Get config/diagnostic entities for an area. O(1).
   * Only entities with entity_category = 'config' or 'diagnostic'.
   */
  static getConfigDiagEntitiesForArea(areaId: string): EntityRegistryEntry[] {
    return Registry._configDiagEntitiesByArea.get(areaId) || [];
  }

  // =====================================================================
  // Device lookups
  // =====================================================================

  /** Get device registry entry by device id. O(1). */
  static getDevice(deviceId: string): DeviceRegistryEntry | undefined {
    return Registry._deviceById.get(deviceId);
  }

  // =====================================================================
  // Area / Floor accessors
  // =====================================================================

  /** All area registry entries (from hass.areas). */
  static get areas(): AreaRegistryEntry[] {
    return Registry._fetchedAreas;
  }

  /** All floor registry entries (from hass — no WS endpoint needed). */
  static get floors(): FloorRegistryEntry[] {
    return Object.values(Registry._hass.floors);
  }

  // =====================================================================
  // Exclusion checks
  // =====================================================================

  /** Check if entity is excluded by the "no_dboard" label. */
  static isExcludedByLabel(entityId: string): boolean {
    return Registry._excludeSet.has(entityId);
  }

  /** Check if entity is hidden via areas_options config. */
  static isHiddenByConfig(entityId: string): boolean {
    return Registry._hiddenFromConfig.has(entityId);
  }

  /**
   * Full exclusion check combining all filtering criteria.
   *
   * 1. no_dboard label
   * 2. areas_options hidden
   * 3. hidden (by user/integration)
   * 4. entity_category "config" or "diagnostic"
   *
   * Note: disabled entities are already excluded from hass.entities.
   */
  static isEntityExcluded(entityId: string): boolean {
    if (Registry._excludeSet.has(entityId)) return true;
    if (Registry._hiddenFromConfig.has(entityId)) return true;

    const entry = Registry._entityById.get(entityId);
    if (!entry) return false; // Entity not in registry — don't exclude

    if (entry.hidden) return true;
    if (entry.entity_category === 'config' || entry.entity_category === 'diagnostic') return true;

    return false;
  }

  /**
   * Extended exclusion check that also checks entity_category from
   * state attributes as a fallback.
   *
   * Use this for the summary card which works with hass.states keys
   * and may encounter entities where entity_category is only available
   * in state attributes, not the registry.
   */
  static isEntityExcludedWithStateCategory(entityId: string): boolean {
    if (Registry.isEntityExcluded(entityId)) return true;

    // Fallback: check entity_category from state attributes
    const state = Registry._hass.states[entityId];
    if (state?.attributes?.entity_category === 'config' || state?.attributes?.entity_category === 'diagnostic') {
      return true;
    }

    return false;
  }

}

export { Registry };
