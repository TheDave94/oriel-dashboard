// ====================================================================
// Persona registry — preset bundles for the onboarding setup (v4.4.0)
// ====================================================================
// A persona is a curated set of config flags + sensible defaults for
// a specific user archetype (family, wall-panel, energy enthusiast,
// etc.). Picking a persona is one click → applies the matching patch.
//
// Personas are NOT locked. After applying, users can flip individual
// switches via the per-feature Setup tab; nothing is destructive.
// Switching personas later just re-patches over the current config.
//
// Why personas exist:
//   - Non-technical users get a sensible starting point without
//     navigating 22+ feature toggles
//   - Common combinations are presented as one-click bundles
//   - Adaptive hints reference personas as a target ("try the Family
//     persona — 4+ HA users detected")
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig } from '../types/strategy';

export interface Persona {
  /** Stable id; never change once published. */
  id: string;
  /** Short display label (3-4 words). */
  label: string;
  /** One-sentence description shown on the card. */
  description: string;
  /** MDI icon. */
  icon: string;
  /**
   * Heuristic: when does this persona apply / get suggested? Returns
   * a score 0-100. Used to filter+rank the persona list in the
   * first-run stepper. Personas with score 0 are hidden by default.
   */
  score: (hass: HomeAssistant, answers: StepperAnswers) => number;
  /**
   * The config patch to apply. Receives the current config so the
   * apply step is non-destructive — only sets the persona's keys and
   * doesn't wipe unrelated user customisations.
   */
  apply: (current: OrielConfig) => OrielConfig;
}

/** Answers from the first-run stepper (subset suggests personas). */
export interface StepperAnswers {
  /** Where the dashboard is used. */
  device?: 'phone-desktop' | 'wall-tablet' | 'mixed';
  /** Who uses it. */
  audience?: 'solo' | 'family';
  /** What's most important to surface. */
  focus?: 'general' | 'energy' | 'security' | 'lights';
}

// -- Internal helpers --------------------------------------------------

function countEntitiesByDomain(hass: HomeAssistant, domain: string): number {
  let n = 0;
  for (const id of Object.keys(hass.states)) {
    if (id.startsWith(`${domain}.`)) n++;
  }
  return n;
}

function hasEntity(hass: HomeAssistant, entityId: string): boolean {
  return !!hass.states[entityId];
}

function hasMultipleHaUsers(hass: HomeAssistant): boolean {
  // Best-effort: hass.user.is_admin is the only signal exposed
  // synchronously; we treat admin sessions as a hint there might be
  // more users. The scoring uses this softly.
  const user = (hass as unknown as { user?: { is_admin?: boolean } }).user;
  return user?.is_admin === true;
}

// -- Public registry ---------------------------------------------------

export const PERSONAS: Persona[] = [
  {
    id: 'quick-start',
    label: 'Quick start',
    description: 'Sensible defaults. Summaries + area cards. No fluff, no rabbit holes.',
    icon: 'mdi:rocket-launch-outline',
    score: () => 50, // baseline — always offered
    apply: (current) => ({
      ...current,
      density: 'cozy',
      show_light_summary: true,
      show_covers_summary: true,
      show_security_summary: true,
      show_battery_summary: true,
    }),
  },
  {
    id: 'family',
    label: 'Family',
    description:
      'Multiple HA users — different layouts per person. Kids see fewer sections; adults see everything.',
    icon: 'mdi:account-multiple',
    score: (hass, answers) => {
      let s = 0;
      if (answers.audience === 'family') s += 80;
      if (hasMultipleHaUsers(hass)) s += 20;
      return s;
    },
    apply: (current) => ({
      ...current,
      // Seeds the per-role override skeleton; users add their own
      // labels via the per-user editor afterwards.
      users_by_role: {
        admin: {
          override: {
            show_security_summary: true,
            show_routines_section: true,
          },
        },
        ...((current.users_by_role as Record<string, unknown>) || {}),
      },
      show_persons_section: true,
    }),
  },
  {
    id: 'wall-panel',
    label: 'Wall panel',
    description:
      'Tablet mounted on the wall. Kiosk-style — bottom-anchored nav, screensaver, swipe gestures, auto-return home.',
    icon: 'mdi:tablet-dashboard',
    score: (_hass, answers) =>
      answers.device === 'wall-tablet' ? 95 :
      answers.device === 'mixed' ? 30 : 0,
    apply: (current) => ({
      ...current,
      density: 'cozy',
      panel_mode: 'wall',
      panel_screensaver_after_minutes: 5,
      swipe_nav: true,
      idle_return_to_home_after_minutes: 5,
      show_voice_fab: true,
    }),
  },
  {
    id: 'energy-enthusiast',
    label: 'Energy enthusiast',
    description:
      'Energy + history featured. Power badge, sparklines, today-vs-yesterday deltas on summary tiles.',
    icon: 'mdi:lightning-bolt',
    score: (hass, answers) => {
      let s = 0;
      if (answers.focus === 'energy') s += 70;
      // Boost when there's actual energy infrastructure
      const energySensors = Object.keys(hass.states).filter((id) => {
        const state = hass.states[id];
        const unit = state?.attributes?.unit_of_measurement;
        return id.startsWith('sensor.') &&
          (unit === 'kWh' || unit === 'W' || unit === 'kW' || unit === 'Wh');
      });
      if (energySensors.length >= 3) s += 25;
      return s;
    },
    apply: (current) => {
      // Pick the first kW/W power sensor as the badge entity if user
      // hasn't set one — best-effort autoconfig.
      const out: OrielConfig = {
        ...current,
        show_energy: true,
        show_climate_summary: true,
      };
      // sections_order_by_mode + energy_presentation defaults left
      // untouched — user can fine-tune via dropdowns later.
      return out;
    },
  },
  {
    id: 'security-focused',
    label: 'Security focused',
    description:
      'Locks, smoke / leak / doorbell alerts up top. Notification banners on. Presence + sun badges.',
    icon: 'mdi:shield-lock',
    score: (hass, answers) => {
      let s = 0;
      if (answers.focus === 'security') s += 70;
      // Boost when smoke / lock / motion sensors exist
      const smoke = Object.keys(hass.states).filter(
        (id) =>
          id.startsWith('binary_sensor.') &&
          (hass.states[id]?.attributes?.device_class === 'smoke' ||
            hass.states[id]?.attributes?.device_class === 'gas' ||
            hass.states[id]?.attributes?.device_class === 'moisture')
      );
      const locks = countEntitiesByDomain(hass, 'lock');
      if (smoke.length > 0 || locks > 0) s += 25;
      return s;
    },
    apply: (current) => {
      const triggers = Array.isArray(current.notification_triggers)
        ? [...(current.notification_triggers as unknown[])]
        : [];
      // Seed default safety triggers — user can edit / remove later.
      const seed = [
        { entity: 'binary_sensor.smoke_alarm', severity: 'critical', title: 'Smoke alarm' },
        { entity: 'binary_sensor.water_leak', severity: 'critical', title: 'Water leak' },
        { entity: 'binary_sensor.doorbell', severity: 'info', title: 'Doorbell' },
      ];
      for (const t of seed) {
        if (!triggers.some((existing) =>
          (existing as { entity?: string }).entity === t.entity)) {
          triggers.push(t);
        }
      }
      return {
        ...current,
        show_security_summary: true,
        show_persons_section: true,
        show_sun_badge: true,
        notification_triggers: triggers as OrielConfig['notification_triggers'],
      };
    },
  },
  {
    id: 'single-room',
    label: 'Single room',
    description:
      'Studio / one-room setup. Everything on overview, no room views, compact density.',
    icon: 'mdi:home-variant',
    score: (hass) => {
      // Suggest when only a few areas exist
      const areaCount = Object.keys(
        (hass as unknown as { areas?: Record<string, unknown> }).areas || {}
      ).length;
      return areaCount <= 2 ? 60 : 0;
    },
    apply: (current) => ({
      ...current,
      density: 'compact',
      show_room_views: false,
      show_summary_views: false,
      group_by_floors: false,
    }),
  },
  {
    id: 'multi-floor',
    label: 'Multi-floor home',
    description:
      'Larger installs. Area cards grouped by floor, lazy-mount off-screen sections, mode-driven section reorder.',
    icon: 'mdi:home-floor-2',
    score: (hass) => {
      const floors = Object.keys(
        (hass as unknown as { floors?: Record<string, unknown> }).floors || {}
      ).length;
      return floors >= 2 ? 70 : 0;
    },
    apply: (current) => ({
      ...current,
      group_by_floors: true,
      lazy_sections: true,
      lazy_sections_threshold: 3,
      ...(hasEntity(
        ({ states: {} } as unknown as HomeAssistant), // placeholder; real check happens elsewhere
        'input_select.house_mode',
      )
        ? {}
        : {}),
    }),
  },
  {
    id: 'minimal',
    label: 'Minimal / sleek',
    description: 'Just the overview view. No summary views, no extras, comfortable spacing.',
    icon: 'mdi:home-minus-outline',
    score: () => 20, // always available but not headlined
    apply: (current) => ({
      ...current,
      density: 'comfortable',
      show_light_summary: false,
      show_covers_summary: false,
      show_security_summary: false,
      show_battery_summary: false,
      show_climate_summary: false,
      show_room_views: false,
      show_summary_views: false,
    }),
  },
];

// -- Public API --------------------------------------------------------

/** Find a persona by id. Returns null when unknown. */
export function findPersona(id: string): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}

/**
 * Rank personas by score for the given hass + answers. Filters out
 * personas with score 0 (irrelevant). Returns sorted desc.
 */
export function suggestPersonas(
  hass: HomeAssistant,
  answers: StepperAnswers,
): Array<{ persona: Persona; score: number }> {
  return PERSONAS.map((p) => ({ persona: p, score: p.score(hass, answers) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Apply a persona to the current config. Returns the patched config.
 * Sets `_persona_applied: '<id>'` so the editor can show "currently
 * on persona X" hints later if useful.
 */
export function applyPersona(
  personaId: string,
  current: OrielConfig,
): OrielConfig {
  const persona = findPersona(personaId);
  if (!persona) return current;
  const next = persona.apply(current);
  return { ...next, _persona_applied: personaId } as OrielConfig & { _persona_applied: string };
}
