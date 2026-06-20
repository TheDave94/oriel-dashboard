// ====================================================================
// Bubble Card integration helpers
// ====================================================================
// Bubble Card is a popular HACS plugin (Clooos/Bubble-Card). It uses
// hash-routed pop-ups: a `custom:bubble-card` with `card_type: pop-up`
// and `hash: '#foo'` slides up when the dashboard URL contains `#foo`.
//
// We expose these helpers:
//
// 1. `isBubbleCardInstalled()` — runtime detect via customElements
// 2. `bubbleHashFor(entityId)` — canonical hash from entity_id
// 3. `buildBubblePopupCards(entities, hass)` — pop-up section content
// 4. `withBubbleTapAction(tile, entityId)` — tile tap-action override
// 5. `isBubbleActionable(entityId)` — domain-in-actionable-set check
//    (use at dynamic-domain emit sites: room_pins, favorites)
//
// Strategy code opts in via `dashboardConfig.use_bubble_drawers` AND
// runtime presence of `bubble-card`. When either is false we no-op.
//
// Bubble Card v3.2.0 (May 2026) made pop-ups **standalone cards** that
// require a `cards: []` array of children — the pre-3.2 shape that
// auto-rendered controls from a single top-level `entity`/`button_type`
// pair no longer renders any content. `buildBubblePopupCards` emits the
// v3.2+ shape and fills `cards:` with an HA `tile` carrying the
// entity's real inline controls (brightness, setpoint, position,
// transport, …) — a control surface on par with HA more-info, not a
// bare button shell. The tile is HA-native, so it renders identically
// on every Bubble Card 3.2.x (verified against v3.2.3, David's prod).
// The hash-routed navigation (`withBubbleTapAction`) is unchanged
// across the v3.2 break.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { buildDomainControlFeatures } from './domain-features';

/**
 * Entity domains for which we emit Bubble Card pop-ups and rewire tile
 * tap_actions. Matches the domain set the Bubble drawers can render
 * controls for — light brightness, climate hvac, cover position, fan
 * speed, media playback. Other domains keep HA's default more-info.
 */
export const BUBBLE_ACTIONABLE_DOMAINS: readonly string[] = [
  'light',
  'climate',
  'cover',
  'fan',
  'media_player',
];

/** True when entity_id's domain is in {@link BUBBLE_ACTIONABLE_DOMAINS}. */
export function isBubbleActionable(entityId: string): boolean {
  const domain = entityId.split('.')[0] ?? '';
  return BUBBLE_ACTIONABLE_DOMAINS.includes(domain);
}

export function isBubbleCardInstalled(): boolean {
  try {
    return typeof customElements !== 'undefined' && !!customElements.get('bubble-card');
  } catch {
    return false;
  }
}

/** Stable hash for an entity_id. `light.living_room` → `#bubble-light-living-room`. */
export function bubbleHashFor(entityId: string): string {
  return `#bubble-${entityId.replace(/\./g, '-')}`;
}

/**
 * Returns a copy of `tile` with `tap_action` overridden to navigate to
 * the bubble-card hash for this entity. Strategy callers should guard
 * with `dashboardConfig.use_bubble_drawers && isBubbleCardInstalled()`
 * — when either is false, return the tile untouched.
 */
export function withBubbleTapAction<T extends Record<string, unknown>>(
  tile: T,
  entityId: string,
): T {
  return {
    ...tile,
    tap_action: { action: 'navigate', navigation_path: bubbleHashFor(entityId) },
  };
}

/**
 * Content rendered inside the pop-up `cards: []` — a real control
 * surface, not a bare shell.
 *
 * Bubble Card pop-ups (v3.2+) are containers: they render whatever
 * cards are in `cards:` and add no domain controls of their own. The
 * previous implementation put a single Bubble *button* in here
 * (`button_type: slider` for light/cover → at most one slider;
 * `button_type: state` for climate/fan/media → a read-only label with
 * ZERO controls), so the drawer was far less capable than HA's native
 * more-info dialog.
 *
 * We instead drop an HA `tile` card carrying the entity's full set of
 * supported inline features (brightness + colour-temp, position +
 * open/close, setpoint + HVAC modes, fan speed, media transport +
 * volume — see {@link buildDomainControlFeatures}). The tile is HA-
 * native, so it renders identically regardless of Bubble Card version,
 * and reuses Oriel's per-domain control knowledge rather than
 * re-encoding it in Bubble's dialect. A pop-up has the vertical room to
 * stack every supported control, giving more-info-equivalent parity
 * inside the Bubble slide-up.
 *
 * Falls back to a bare `tile` (toggle + tap-through to more-info) for
 * any entity with no inline features — still useful, never a shell.
 */
function buildPopupContent(entityId: string, hass: HomeAssistant): LovelaceCardConfig[] {
  const state = hass.states[entityId];
  const features = state ? buildDomainControlFeatures(state) : [];
  const tile: LovelaceCardConfig = { type: 'tile', entity: entityId };
  if (features.length > 0) {
    tile.features = features;
    // Stack controls below the tile header (the drawer has the room) —
    // not the compact inline row the summary tiles use.
    tile.features_position = 'bottom';
  }
  return [tile];
}

/**
 * Build the bubble-card pop-up definitions for the supplied entity IDs.
 * One card per entity, each routable via its canonical hash. Skip any
 * entity not present in `hass.states`.
 *
 * Bubble-card pop-ups are invisible until their hash is active, so
 * embedding them in a grid section adds zero visual footprint.
 *
 * Emits the v3.2+ standalone-pop-up shape: `cards:` holds a
 * domain-appropriate Bubble button, and the top-level no longer carries
 * `entity`/`button_type` (those fields are non-functional in v3.2+).
 */
/**
 * Wraps {@link buildBubblePopupCards} in an invisible grid section, or returns
 * null when there are no pop-ups to emit.
 *
 * Bubble Card pop-ups are **view-scoped**: a tile's `navigate → #bubble-<id>`
 * tap only opens if a pop-up with that hash is rendered on the SAME view. So
 * every view whose tiles are rewired (`withBubbleTapAction` / `bubble_drawers`)
 * must co-locate its pop-ups — not just the Overview. Pop-ups are invisible
 * until their hash is active, so the section adds zero visual footprint.
 */
export function buildBubblePopupSection(
  entityIds: string[],
  hass: HomeAssistant,
): LovelaceSectionConfig | null {
  const cards = buildBubblePopupCards(entityIds, hass);
  return cards.length > 0 ? { type: 'grid', cards } : null;
}

export function buildBubblePopupCards(
  entityIds: string[],
  hass: HomeAssistant,
): LovelaceCardConfig[] {
  const cards: LovelaceCardConfig[] = [];
  for (const id of entityIds) {
    const state = hass.states[id];
    if (!state) continue;
    const friendly = (state.attributes?.friendly_name as string | undefined) ?? id;
    cards.push({
      type: 'custom:bubble-card',
      card_type: 'pop-up',
      hash: bubbleHashFor(id),
      name: friendly,
      cards: buildPopupContent(id, hass),
    });
  }
  return cards;
}

/**
 * Returns the actionable entity IDs from `hass.states` that we'd ship
 * as bubble-card pop-ups. Currently: lights, climates, covers, fans
 * and media players.
 *
 * Skips entities the user has excluded from the dashboard (F6/Rung-0):
 * pass `isExcluded` — normally `Registry.isEntityExcluded` — so that the
 * `no_dboard` label, `hidden_by`, per-area `groups_options.hidden`, and
 * the config/diagnostic categories are honored here exactly as they are
 * on every other oriel surface. The predicate defaults to a no-op so the
 * function stays pure and testable; the strategy call site supplies the
 * real one.
 */
export function collectBubbleCandidates(
  hass: HomeAssistant,
  isExcluded: (entityId: string) => boolean = () => false,
): string[] {
  const out: string[] = [];
  for (const entityId of Object.keys(hass.states)) {
    if (isBubbleActionable(entityId) && !isExcluded(entityId)) {
      out.push(entityId);
    }
  }
  return out.sort();
}
