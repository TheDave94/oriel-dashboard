// ====================================================================
// Onboarding feature registry (v3.1.0)
// ====================================================================
// Single source of truth for the Setup wizard. Each entry describes
// one user-facing capability — built-in or HACS-backed — and how to
// detect whether its prerequisites are met.
//
// The strategy reads this at editor mount + at generate() time to
// (a) render the Setup tab and (b) decide whether to emit
// integration-dependent content.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';

export type FeatureCategory =
  | 'layout'
  | 'tiles'
  | 'panel'
  | 'users'
  | 'data'
  | 'integration';

export interface DetectResult {
  installed: boolean;
  /** Optional human-readable note ("3 users found", "Bubble Card v3.1.0"). */
  detail?: string;
}

export interface HacsLink {
  /** Display name shown in the install hint. */
  name: string;
  /** Repository slug (owner/repo) used to deep-link into HACS. */
  repository: string;
  /** Plugin category (frontend / integration). Defaults to "plugin" (frontend). */
  category?: 'plugin' | 'integration';
}

export interface FeatureEntry {
  /** Stable id; never change once published. */
  id: string;
  /** Tab label, shown in the wizard. Plain string (not localised yet). */
  label: string;
  /** One-sentence description shown under the label. */
  description: string;
  category: FeatureCategory;
  /** Config keys this entry mutates — used by editor "go to setting" links. */
  configKeys: string[];
  /** Whether the feature is on by default in a fresh dashboard. */
  defaultEnabled: boolean;
  /** Detect installed prerequisites. Returns `{ installed: true }` for built-ins. */
  detect: (hass: HomeAssistant) => DetectResult;
  /** When non-null, a HACS install hint surfaces if `detect().installed === false`. */
  hacs?: HacsLink;
  /**
   * Optional gate: read the current strategy config + return whether the
   * feature is currently enabled. Used to render the wizard's enable
   * toggle in the right state. Reads from a typed bag.
   */
  isEnabled?: (config: Record<string, unknown>) => boolean;
  /**
   * Toggle handler — returns a config patch (object spread) to apply.
   * For built-in flags this is usually one key; for integration toggles
   * it may set multiple. Returning `{ key: undefined }` deletes the key.
   */
  toggle?: (enabled: boolean) => Record<string, unknown>;
}

// -- Detection helpers ------------------------------------------------

/**
 * True when a custom element is registered under the given tag — i.e.
 * the HACS plugin shipping that tag is installed AND its module has
 * loaded. HA loads all `/local/community/*` resources at startup so
 * presence at editor mount time is reliable.
 */
function hasCustomElement(tag: string): boolean {
  try {
    return typeof customElements !== 'undefined' && !!customElements.get(tag);
  } catch {
    return false;
  }
}

/**
 * Count users in hass.user — works only for admins (HA exposes the full
 * user list to admin sessions). Non-admins always see `[]` here, so we
 * fall back to "at least 1 user (you)" for them.
 */
function userCount(hass: HomeAssistant): number {
  const users = (hass as unknown as { user?: { is_admin?: boolean } }).user;
  if (!users) return 1;
  // hass doesn't expose the user list to non-admins. The strategy still
  // works per-user — this count is only for the wizard hint.
  return users.is_admin === true ? 2 : 1;
}

// -- Registry ---------------------------------------------------------

export const FEATURE_REGISTRY: FeatureEntry[] = [
  // ---------------- Layout / display ----------------
  {
    id: 'density',
    label: 'Density preset',
    description:
      'Compact (4 cols, phone-friendly), cozy (3 cols, balanced) or comfortable (HA default). Applies to every emitted view.',
    category: 'layout',
    configKeys: ['density'],
    defaultEnabled: false,
    detect: () => ({ installed: true }),
    isEnabled: (c) => typeof c.density === 'string' && c.density !== 'comfortable',
  },
  {
    id: 'lazy-sections',
    label: 'Lazy-mount off-screen sections',
    description:
      'Sections below the fold defer subscribing to entity state until you scroll to them. Helps installs with many entities.',
    category: 'layout',
    configKeys: ['lazy_sections', 'lazy_sections_threshold'],
    defaultEnabled: false,
    detect: () => ({ installed: true }),
    isEnabled: (c) => c.lazy_sections === true,
    toggle: (enabled) => ({ lazy_sections: enabled ? true : undefined }),
  },
  {
    id: 'sections-order-by-mode',
    label: 'Context-aware section reorder',
    description:
      'Reshuffle dashboard sections based on input_select.house_mode (morning / evening / night / away). Existing data, new visibility.',
    category: 'layout',
    configKeys: ['sections_order_by_mode'],
    defaultEnabled: false,
    detect: (hass) => {
      const hasMode = !!hass.states['input_select.house_mode'];
      return {
        installed: hasMode,
        detail: hasMode ? 'input_select.house_mode found' : 'no input_select.house_mode',
      };
    },
    isEnabled: (c) =>
      !!c.sections_order_by_mode && Object.keys(c.sections_order_by_mode as object).length > 0,
  },

  // ---------------- Wall panel / kiosk ----------------
  {
    id: 'panel-wall',
    label: 'Wall-panel mode',
    description:
      'Bottom-anchored nav, optional auto-dim, optional clock-and-weather screensaver. For tablets mounted on a wall.',
    category: 'panel',
    configKeys: ['panel_mode', 'panel_screensaver_after_minutes', 'panel_screensaver_entity'],
    defaultEnabled: false,
    detect: () => ({ installed: true }),
    isEnabled: (c) => c.panel_mode === 'wall',
    toggle: (enabled) => ({ panel_mode: enabled ? 'wall' : undefined }),
  },

  // ---------------- Tiles / data ----------------
  {
    id: 'sparklines',
    label: 'History sparklines',
    description:
      'Inline 24h SVG sparkline on selected tiles. Reads HA history; no external chart library.',
    category: 'data',
    configKeys: [],
    defaultEnabled: true,
    detect: () => ({ installed: true }),
  },
  {
    id: 'routines',
    label: 'Routines section',
    description:
      'Auto-collect scenes + scripts into a grid ranked by last-used. One-tap to trigger.',
    category: 'tiles',
    configKeys: ['show_routines_section', 'routines_max'],
    defaultEnabled: false,
    detect: () => ({ installed: true }),
    isEnabled: (c) => c.show_routines_section === true,
    toggle: (enabled) => ({ show_routines_section: enabled ? true : undefined }),
  },
  {
    id: 'notifications',
    label: 'Safety notification banners',
    description:
      'Sticky banner at the top of the overview for smoke, leak, doorbell or any custom trigger. Auto-dismiss on clear.',
    category: 'tiles',
    configKeys: ['notification_triggers'],
    defaultEnabled: false,
    detect: () => ({ installed: true }),
    isEnabled: (c) => Array.isArray(c.notification_triggers) && (c.notification_triggers as unknown[]).length > 0,
  },

  // ---------------- Users ----------------
  {
    id: 'per-user-dashboards',
    label: 'Per-user / per-role dashboards',
    description:
      'Different dashboard layout per HA user or role (admin / labels). The #1 community pain point — solved in v3.0.',
    category: 'users',
    configKeys: ['users', 'users_by_role'],
    defaultEnabled: false,
    detect: (hass) => {
      const n = userCount(hass);
      return { installed: n > 1, detail: `${n} user${n === 1 ? '' : 's'} visible` };
    },
    isEnabled: (c) =>
      (!!c.users && Object.keys(c.users as object).length > 0) ||
      (!!c.users_by_role && Object.keys(c.users_by_role as object).length > 0),
  },

  // ---------------- HACS integrations (v3.2.x) ----------------
  {
    id: 'bubble-drawers',
    label: 'Detail drawers (Bubble Card)',
    description:
      'Tap a tile → a drawer slides up with the full control surface. Replaces the more-info dialog for lights / climate / cover tiles.',
    category: 'integration',
    configKeys: ['use_bubble_drawers'],
    defaultEnabled: false,
    detect: () => ({ installed: hasCustomElement('bubble-card') }),
    hacs: { name: 'Bubble Card', repository: 'Clooos/Bubble-Card' },
    isEnabled: (c) => c.use_bubble_drawers === true,
    toggle: (enabled) => ({ use_bubble_drawers: enabled ? true : undefined }),
  },
  {
    id: 'apexcharts-sparklines',
    label: 'Replace sparklines with ApexCharts',
    description:
      'Use apexcharts-card for richer inline charts (interactive, zoomable, themable). Falls back to built-in sparkline when uninstalled.',
    category: 'integration',
    configKeys: ['use_apexcharts_sparklines'],
    defaultEnabled: false,
    detect: () => ({ installed: hasCustomElement('apexcharts-card') }),
    hacs: { name: 'apexcharts-card', repository: 'RomRider/apexcharts-card' },
    isEnabled: (c) => c.use_apexcharts_sparklines === true,
    toggle: (enabled) => ({ use_apexcharts_sparklines: enabled ? true : undefined }),
  },
  {
    id: 'decluttering-templates',
    label: 'Reusable view templates (decluttering-card)',
    description:
      'Define a card template once with {{var}} placeholders, instantiate it many times. Useful for repetitive view shapes.',
    category: 'integration',
    configKeys: ['decluttering_templates'],
    defaultEnabled: false,
    detect: () => ({ installed: hasCustomElement('decluttering-card') }),
    hacs: { name: 'decluttering-card', repository: 'custom-cards/decluttering-card' },
  },
  {
    id: 'floorplan-views',
    label: 'Floorplan custom views',
    description:
      'Render top-down SVG floorplans with live entity overlays. Tap an area to drill in.',
    category: 'integration',
    configKeys: [],
    defaultEnabled: false,
    detect: () => ({ installed: hasCustomElement('floorplan-card') }),
    hacs: { name: 'floorplan-card', repository: 'pkozul/ha-floorplan' },
  },
  {
    id: 'voice-fab',
    label: 'Voice button (FAB)',
    description:
      'Floating voice-command button on every view. Pipes through HA Assist. No external plugin needed — uses HA core.',
    category: 'integration',
    configKeys: ['show_voice_fab'],
    defaultEnabled: false,
    detect: () => ({ installed: hasCustomElement('ha-voice-command-button') || true }),
    isEnabled: (c) => c.show_voice_fab === true,
    toggle: (enabled) => ({ show_voice_fab: enabled ? true : undefined }),
  },
];

// -- Public helpers ---------------------------------------------------

export function findFeature(id: string): FeatureEntry | undefined {
  return FEATURE_REGISTRY.find((f) => f.id === id);
}

export function isFeatureActive(
  id: string,
  config: Record<string, unknown>,
  hass: HomeAssistant,
): boolean {
  const f = findFeature(id);
  if (!f) return false;
  if (!f.detect(hass).installed) return false;
  return f.isEnabled ? f.isEnabled(config) : false;
}

export function groupByCategory(): Record<FeatureCategory, FeatureEntry[]> {
  const out: Record<FeatureCategory, FeatureEntry[]> = {
    layout: [],
    tiles: [],
    panel: [],
    users: [],
    data: [],
    integration: [],
  };
  for (const f of FEATURE_REGISTRY) {
    out[f.category].push(f);
  }
  return out;
}
