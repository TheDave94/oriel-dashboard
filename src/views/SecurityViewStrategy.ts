// ====================================================================
// VIEW STRATEGY — SECURITY (Locks, Doors, Garages, Windows, Smoke/Gas)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { densePlacement } from '../utils/view-builder';
import type { LovelaceViewConfig, LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { SECURITY_EXCLUDED_PLATFORMS } from '../utils/entity-filter';
import { applyAreaContextToSections, showAreaInSummaries } from '../utils/name-utils';
import { phoneFullWidth } from '../utils/viewport';

interface SecurityViewStrategyParams {
  config?: OrielConfig;
}

// -- Activity log (24h logbook à la HA's security panel) --------------

// Entities carrying this label stay in the security sections but are
// excluded from the activity logbook — e.g. interior door contacts whose
// history is just noise there (same label convention as `no_dboard`).
// Ported from upstream simon42 #336.
const SECLOG_EXCLUDE_LABEL = 'no_seclog';

function isExcludedFromSecurityLog(entityId: string): boolean {
  return Registry.getEntity(entityId)?.labels?.includes(SECLOG_EXCLUDE_LABEL) === true;
}

/**
 * 24h logbook section over the view's security entities + persons.
 * Returns null when disabled, when the logbook integration isn't loaded,
 * or when nothing would appear in it. Exported for tests.
 */
export function buildActivitySection(
  hass: HomeAssistant,
  dashboardConfig: OrielConfig,
  securityEntityIds: string[],
): LovelaceSectionConfig | null {
  if (dashboardConfig.show_security_activity === false) return null;
  if (!hass.config?.components?.includes('logbook')) return null;

  const logbookEntityIds = [
    ...securityEntityIds,
    ...Registry.getVisibleEntityIdsForDomain('person'),
  ].filter((id) => !isExcludedFromSecurityLog(id));
  if (logbookEntityIds.length === 0) return null;

  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: localize('security.activity'),
        heading_style: 'title',
      },
      {
        type: 'logbook',
        target: { entity_id: logbookEntityIds },
        hours_to_show: 24,
        grid_options: { columns: 12 },
      },
    ],
  };
}

// -- Cameras shown in the security view --------------------------------

/**
 * Lean still-image camera cards (HA security panel style) — no name, no
 * state, half width. The rich picture-glance construction stays exclusive
 * to the camera view. Heading deep-links there when it's enabled.
 * Exported for tests.
 */
export function buildCamerasSection(
  cameraIds: string[],
  cameraViewEnabled: boolean,
): LovelaceSectionConfig | null {
  if (cameraIds.length === 0) return null;
  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: localize('security.cameras'),
        heading_style: 'subtitle',
        icon: 'mdi:cctv',
        ...(cameraViewEnabled
          ? { tap_action: { action: 'navigate', navigation_path: 'cameras' } }
          : {}),
      },
      ...cameraIds.map((id) => ({
        type: 'picture-entity',
        entity: id,
        camera_image: id,
        camera_view: 'auto',
        show_state: false,
        show_name: false,
        grid_options: { columns: 6, rows: 2 },
      })),
    ],
  };
}

class OrielViewSecurity extends HTMLElement {
  static async generate(
    config: SecurityViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    // Use pre-filtered visible entities from Registry
    // Covers lock, cover, binary_sensor domains across all areas
    const allVisibleByDomain = (domain: string) => Registry.getVisibleEntityIdsForDomain(domain);

    // Categorize entities
    const locks: string[] = [];
    const doors: string[] = [];          // cover.door + cover.gate (security: open/closed)
    const motorizedWindows: string[] = []; // cover.window (electric Velux etc.)
    const garages: string[] = [];
    const windows: string[] = [];        // binary_sensor.door/window/opening (contact sensors)
    const smokeGas: string[] = [];
    const waterLeak: string[] = [];

    for (const id of [
      ...allVisibleByDomain('lock'),
      ...allVisibleByDomain('cover'),
      ...allVisibleByDomain('binary_sensor'),
    ]) {
      if (!hass.states[id]) continue;

      const state = hass.states[id];
      const deviceClass = state.attributes?.device_class;

      if (id.startsWith('lock.')) {
        locks.push(id);
      } else if (id.startsWith('cover.')) {
        if (deviceClass === 'garage') garages.push(id);
        else if (deviceClass === 'window') motorizedWindows.push(id);
        else if (deviceClass === 'door' || deviceClass === 'gate') doors.push(id);
      } else if (id.startsWith('binary_sensor.')) {
        const entry = Registry.getEntity(id);
        if (entry?.platform && SECURITY_EXCLUDED_PLATFORMS.has(entry.platform)) continue;
        // Drop relay-style devices that incidentally expose an opening
        // binary_sensor (e.g. SONOFF ZBMINIR2/L2 — they're switches whose
        // "opening" state mirrors the relay, not a real door/window contact).
        // Heuristic: if the same parent device also exposes a switch.*
        // entity, the binary_sensor is the relay-state indicator.
        if (deviceClass === 'opening' && entry?.device_id) {
          const siblings = Registry.getEntityIdsForDevice(entry.device_id);
          if (siblings.some((sid) => sid.startsWith('switch.'))) continue;
        }
        if (deviceClass && ['door', 'window', 'garage_door', 'opening'].includes(deviceClass)) windows.push(id);
        else if (deviceClass && ['smoke', 'gas', 'heat'].includes(deviceClass)) smokeGas.push(id);
        else if (deviceClass === 'moisture') waterLeak.push(id);
      }
    }

    const sections: LovelaceSectionConfig[] = [];

    // Locks
    if (locks.length > 0) {
      const unlocked = locks.filter((e) => hass.states[e]?.state === 'unlocked');
      const locked = locks.filter((e) => hass.states[e]?.state === 'locked');
      const cards: LovelaceCardConfig[] = [];

      if (unlocked.length > 0) {
        cards.push({
          type: 'heading',
          heading: localize('security.locks_unlocked'),
          heading_style: 'subtitle',
          icon: 'mdi:lock-open',
          badges: [
            {
              type: 'entity',
              entity: unlocked[0],
              show_name: false,
              show_state: false,
              tap_action: { action: 'perform-action', perform_action: 'lock.lock', target: { entity_id: unlocked } },
              icon: 'mdi:lock',
            },
          ],
        });
        cards.push(
          ...unlocked.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'lock-commands' }],
            state_content: 'last_changed',
          }))
        );
      }
      if (locked.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.locks_locked'), heading_style: 'subtitle', icon: 'mdi:lock' });
        cards.push(
          ...locked.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'lock-commands' }],
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Doors/Gates
    if (doors.length > 0) {
      const open = doors.filter((e) => hass.states[e]?.state === 'open');
      const closed = doors.filter((e) => hass.states[e]?.state === 'closed');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({
          type: 'heading',
          heading: localize('security.doors_open'),
          heading_style: 'subtitle',
          icon: 'mdi:door-open',
          badges: [
            {
              type: 'entity',
              entity: open[0],
              show_name: false,
              show_state: false,
              tap_action: {
                action: 'perform-action',
                perform_action: 'cover.close_cover',
                target: { entity_id: open },
              },
              icon: 'mdi:arrow-down',
            },
          ],
        });
        cards.push(
          ...open.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.doors_closed'), heading_style: 'subtitle', icon: 'mdi:door-closed' });
        cards.push(
          ...closed.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Motorized windows (cover.* with device_class=window — e.g. Velux electric)
    if (motorizedWindows.length > 0) {
      const open = motorizedWindows.filter((e) => hass.states[e]?.state === 'open');
      const closed = motorizedWindows.filter((e) => hass.states[e]?.state === 'closed');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({
          type: 'heading',
          heading: localize('security.motorized_windows_open'),
          heading_style: 'subtitle',
          icon: 'mdi:window-open-variant',
          badges: [
            {
              type: 'entity',
              entity: open[0],
              show_name: false,
              show_state: false,
              tap_action: {
                action: 'perform-action',
                perform_action: 'cover.close_cover',
                target: { entity_id: open },
              },
              icon: 'mdi:arrow-down',
            },
          ],
        });
        cards.push(
          ...open.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.motorized_windows_closed'), heading_style: 'subtitle', icon: 'mdi:window-closed-variant' });
        cards.push(
          ...closed.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Garages
    if (garages.length > 0) {
      const open = garages.filter((e) => hass.states[e]?.state === 'open');
      const closed = garages.filter((e) => hass.states[e]?.state === 'closed');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({
          type: 'heading',
          heading: localize('security.garages_open'),
          heading_style: 'subtitle',
          icon: 'mdi:garage-open',
          badges: [
            {
              type: 'entity',
              entity: open[0],
              show_name: false,
              show_state: false,
              tap_action: {
                action: 'perform-action',
                perform_action: 'cover.close_cover',
                target: { entity_id: open },
              },
              icon: 'mdi:arrow-down',
            },
          ],
        });
        cards.push(
          ...open.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.garages_closed'), heading_style: 'subtitle', icon: 'mdi:garage' });
        cards.push(
          ...closed.map((e) => ({
            type: 'tile', ...phoneFullWidth(),
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Windows/Openings
    if (windows.length > 0) {
      const open = windows.filter((e) => hass.states[e]?.state === 'on');
      const closed = windows.filter((e) => hass.states[e]?.state === 'off');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.windows_open'), heading_style: 'subtitle', icon: 'mdi:window-open' });
        cards.push(...open.map((e) => ({ type: 'tile', ...phoneFullWidth(), entity: e, state_content: 'last_changed' })));
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.windows_closed'), heading_style: 'subtitle', icon: 'mdi:window-closed' });
        cards.push(...closed.map((e) => ({ type: 'tile', ...phoneFullWidth(), entity: e, state_content: 'last_changed' })));
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Smoke/Gas detectors
    if (smokeGas.length > 0) {
      const active = smokeGas.filter((e) => hass.states[e]?.state === 'on');
      const inactive = smokeGas.filter((e) => hass.states[e]?.state === 'off');
      const cards: LovelaceCardConfig[] = [];

      if (active.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.smoke_gas_active'), heading_style: 'subtitle', icon: 'mdi:smoke-detector-alert' });
        cards.push(...active.map((e) => ({ type: 'tile', ...phoneFullWidth(), entity: e, state_content: 'last_changed' })));
      }
      if (inactive.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.smoke_gas_inactive'), heading_style: 'subtitle', icon: 'mdi:smoke-detector' });
        cards.push(...inactive.map((e) => ({ type: 'tile', ...phoneFullWidth(), entity: e, state_content: 'last_changed' })));
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Water leak / moisture sensors
    if (waterLeak.length > 0) {
      const active = waterLeak.filter((e) => hass.states[e]?.state === 'on');
      const inactive = waterLeak.filter((e) => hass.states[e]?.state === 'off');
      const cards: LovelaceCardConfig[] = [];

      if (active.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.water_leak_active'), heading_style: 'subtitle', icon: 'mdi:water-alert' });
        cards.push(...active.map((e) => ({ type: 'tile', ...phoneFullWidth(), entity: e, state_content: 'last_changed' })));
      }
      if (inactive.length > 0) {
        cards.push({ type: 'heading', heading: localize('security.water_leak_inactive'), heading_style: 'subtitle', icon: 'mdi:water-check' });
        cards.push(...inactive.map((e) => ({ type: 'tile', ...phoneFullWidth(), entity: e, state_content: 'last_changed' })));
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // User-picked extra entities (smart appliances, custom sensors, etc.)
    const extraEntities: string[] = (config.config?.security_extra_entities || []).filter(
      (id: string) => hass.states[id] !== undefined
    );
    if (extraEntities.length > 0) {
      const cards: LovelaceCardConfig[] = [
        {
          type: 'heading',
          heading: localize('security.extra_entities'),
          heading_style: 'subtitle',
          icon: 'mdi:home-alert',
        },
        ...extraEntities.map((e) => ({
          type: 'tile', ...phoneFullWidth(),
          entity: e,
          state_content: ['state', 'last_changed'],
        })),
      ];
      sections.push({ type: 'grid', cards });
    }

    const dashboardConfig = config.config || {};

    // Cameras (opt-in) — lean still-image cards, HA security-panel style.
    const cameraIds =
      dashboardConfig.show_cameras_in_security === true
        ? Registry.getVisibleEntityIdsForDomain('camera').filter(
            (id) => hass.states[id] !== undefined,
          )
        : [];
    const camerasSection = buildCamerasSection(
      cameraIds,
      dashboardConfig.show_camera_view === true,
    );
    if (camerasSection) sections.push(camerasSection);

    // Activity log — leads the view by default, optionally trails
    // (security_activity_position: 'end'). Cameras join the logbook so
    // motion/person events on them show up too.
    const activitySection = buildActivitySection(hass, dashboardConfig, [
      ...locks,
      ...doors,
      ...motorizedWindows,
      ...garages,
      ...windows,
      ...smokeGas,
      ...waterLeak,
      ...cameraIds,
    ]);
    if (activitySection) {
      if (dashboardConfig.security_activity_position === 'end') sections.push(activitySection);
      else sections.unshift(activitySection);
    }

    return {
      type: 'sections',
      ...densePlacement(dashboardConfig),
      sections: showAreaInSummaries(dashboardConfig)
        ? applyAreaContextToSections(sections, hass)
        : sections,
    };
  }
}

customElements.define('ll-strategy-view-oriel-security', OrielViewSecurity);
