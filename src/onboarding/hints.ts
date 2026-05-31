// ====================================================================
// Adaptive hints — "Did you know?" prompts in the Setup tab (v4.4.0)
// ====================================================================
// Each hint inspects hass state + current config; when the condition
// fires, the Setup tab surfaces a dismissable card with an Apply
// button. Hints are small, opinionated nudges — one detection + one
// config patch.
//
// Hints are dismissed per-id via `_dismissed_hints: string[]` on the
// config. Once dismissed, they don't reappear unless the user resets
// onboarding.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig } from '../types/strategy';

export interface AdaptiveHint {
  /** Stable id used for dismissal tracking. */
  id: string;
  /** Short title shown on the card. */
  title: string;
  /** One-sentence rationale. */
  description: string;
  /** MDI icon. */
  icon: string;
  /** Condition that surfaces the hint. */
  test: (hass: HomeAssistant, config: OrielConfig) => boolean;
  /**
   * Config patch when Apply is clicked. Receives the current hass so
   * the patch can inspect entity state at apply time (e.g. read an
   * input_select's `attributes.options`). Returns `null` to signal
   * "did not apply" — used when the prerequisite the hint promised
   * to act on isn't actually there at apply time (race between
   * detect + click). The caller still dismisses on null to keep the
   * UX clean; a console.warn explains the no-op.
   */
  apply: (current: OrielConfig, hass: HomeAssistant) => OrielConfig | null;
  /** Optional CTA label. Defaults to 'Apply'. */
  ctaLabel?: string;
}

/**
 * Lowercase + collapse `[\s_-]+` to underscore. Matches the
 * normalization used by the strategy's mode-reorder lookup
 * (`OverviewViewStrategy.ts:296`) and the section/room visibility
 * mode-entity match (`utils/visibility.ts:48`), so keys written here
 * are guaranteed to match what those readers expect.
 *
 * Three copies of this function currently exist (strategy inline,
 * visibility module-scope, this one). They agree on `[\s_-]+`; the
 * Mode Order editor tab uses `[\s-]+` (no underscore). See
 * docs/investigations/house-mode-mismatch.md for the dedup follow-up.
 */
export function normalizeHouseModeKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, '_');
}

// -- Detection helpers ------------------------------------------------

function countByDomain(hass: HomeAssistant, domain: string): number {
  let n = 0;
  for (const id of Object.keys(hass.states)) {
    if (id.startsWith(`${domain}.`)) n++;
  }
  return n;
}

function hasCameraEntities(hass: HomeAssistant): boolean {
  return countByDomain(hass, 'camera') >= 1;
}

function hasMultipleFloors(hass: HomeAssistant): boolean {
  const floors = (hass as unknown as { floors?: Record<string, unknown> }).floors;
  return floors ? Object.keys(floors).length >= 2 : false;
}

function hasMultipleHaUsers(hass: HomeAssistant): boolean {
  // The strategy editor session has hass.user; for a real count we'd
  // need an admin WS call. Heuristic: admin sessions are likely to
  // have other users.
  const user = (hass as unknown as { user?: { is_admin?: boolean } }).user;
  return user?.is_admin === true;
}

function hasInputSelectHouseMode(hass: HomeAssistant): boolean {
  return !!hass.states['input_select.house_mode'];
}

// -- Hint registry ----------------------------------------------------

const HINTS: AdaptiveHint[] = [
  {
    id: 'try-family-persona',
    title: 'Multiple HA users detected',
    description:
      'You have more than one HA user. The Family persona sets up per-role overrides so each person gets their own dashboard.',
    icon: 'mdi:account-multiple',
    ctaLabel: 'Apply Family persona',
    test: (hass, config) =>
      hasMultipleHaUsers(hass) &&
      !config.users_by_role &&
      !config.users,
    apply: (current, _hass) => ({
      ...current,
      users_by_role: {
        admin: {
          override: {
            show_security_summary: true,
            show_routines_section: true,
          },
        },
      },
      show_persons_section: true,
    }),
  },
  {
    id: 'enable-floor-grouping',
    title: 'Multiple floors detected',
    description:
      'You have more than one floor defined. Enable floor grouping to organise area cards by floor on the overview.',
    icon: 'mdi:home-floor-2',
    test: (hass, config) =>
      hasMultipleFloors(hass) && config.group_by_floors !== true,
    apply: (current, _hass) => ({ ...current, group_by_floors: true }),
  },
  {
    id: 'enable-mode-reorder',
    title: 'input_select.house_mode detected',
    description:
      'Use the existing house mode to reshuffle dashboard sections by mode — one section order per option in your input_select. Tune each per-mode order in the Mode Order tab afterwards.',
    icon: 'mdi:cog-sync',
    test: (hass, config) =>
      hasInputSelectHouseMode(hass) &&
      !config.sections_order_by_mode,
    apply: (current, hass) => {
      // Read the actual options off the input_select at apply time
      // rather than writing a hardcoded vocabulary. The previous
      // (v4.4.0) shape wrote `morning/evening/night/away` keys
      // regardless of what the user's input_select actually had —
      // for HA's common `At Home / Away / Holiday` shape that
      // produced a sections_order_by_mode map that only matched on
      // "Away" and silently fell back to `sections_order` for the
      // other two states. See docs/investigations/house-mode-mismatch.md.
      const optsRaw = hass.states['input_select.house_mode']?.attributes?.options;
      const options = Array.isArray(optsRaw) ? (optsRaw as string[]) : [];
      if (options.length === 0) {
        // detect() passed (entity exists) but its options array is
        // missing or empty at apply time. Refuse rather than writing
        // a guess — the Mode Order tab can seed the map once options
        // exist.
        console.warn(
          '[oriel] enable-mode-reorder hint: input_select.house_mode has no options to read; not applying.',
        );
        return null;
      }
      const seed: Record<string, string[]> = {};
      for (const opt of options) {
        // Placeholder per-mode order — same shape for every detected
        // mode so the user has something to start tuning from in the
        // Mode Order tab. The contract that matters here is the
        // KEYS: normalizeHouseModeKey('At Home') === 'at_home', which
        // is exactly what the strategy normalizes the entity state to
        // at lookup time.
        seed[normalizeHouseModeKey(opt)] = ['overview', 'areas', 'weather'];
      }
      return { ...current, sections_order_by_mode: seed };
    },
  },
  {
    id: 'enable-lazy-sections',
    title: 'Large entity registry',
    description:
      'You have many entities. Enable lazy-mount so sections below the fold defer subscribing until you scroll there — improves first-render performance.',
    icon: 'mdi:download-multiple',
    test: (hass, config) =>
      Object.keys(hass.states).length >= 500 && config.lazy_sections !== true,
    apply: (current, _hass) => ({
      ...current,
      lazy_sections: true,
      lazy_sections_threshold: 3,
    }),
  },
  {
    id: 'enable-routines',
    title: 'Scenes / scripts available',
    description:
      'Add the Routines section to surface your scenes and scripts ranked by last-used — one tap to trigger from the overview.',
    icon: 'mdi:play-box-multiple',
    test: (hass, config) =>
      (countByDomain(hass, 'scene') + countByDomain(hass, 'script') >= 3) &&
      config.show_routines_section !== true,
    apply: (current, _hass) => ({ ...current, show_routines_section: true }),
  },
  {
    id: 'enable-camera-cameras-in-rooms',
    title: 'Camera entities found',
    description:
      'Cameras are shown in their room views by default. Add the Camera-first room view in the area you care most about, or enable Bubble Card drawers for instant preview.',
    icon: 'mdi:cctv',
    test: (hass, config) => hasCameraEntities(hass) && config.show_cameras_in_rooms === false,
    ctaLabel: 'Show cameras in room views',
    apply: (current, _hass) => {
      const next = { ...current } as OrielConfig & { show_cameras_in_rooms?: boolean };
      delete next.show_cameras_in_rooms; // default true
      return next;
    },
  },
];

/** Exported for tests to look up individual hints by id. */
export { HINTS };

/**
 * Detect which hints should currently show. Filters out dismissed
 * hints and hints whose test fails.
 */
export function detectHints(
  hass: HomeAssistant,
  config: OrielConfig,
): AdaptiveHint[] {
  const dismissed = new Set(
    (config as { _dismissed_hints?: string[] })._dismissed_hints ?? [],
  );
  return HINTS.filter((h) => !dismissed.has(h.id) && h.test(hass, config));
}

/** Mark a hint as dismissed in the config. Returns the patched config. */
export function dismissHint(config: OrielConfig, hintId: string): OrielConfig {
  const current =
    ((config as { _dismissed_hints?: string[] })._dismissed_hints as string[]) ?? [];
  if (current.includes(hintId)) return config;
  return {
    ...config,
    _dismissed_hints: [...current, hintId],
  } as OrielConfig & { _dismissed_hints: string[] };
}
