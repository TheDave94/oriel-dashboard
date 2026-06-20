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
// pair no longer renders any content. `buildBubblePopupCards` now emits
// the v3.2+ shape with a domain-appropriate Bubble button inside the
// pop-up. The hash-routed navigation (`withBubbleTapAction`) is
// unchanged across the v3.2 break.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';

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
 * Domain-appropriate content rendered inside the pop-up `cards: []`.
 * Lights and covers default to a slider button (the natural primary
 * control); climate / fan / media_player default to a state button
 * (Bubble auto-picks the right secondary controls per domain). Any
 * other domain falls through to a plain HA tile so the pop-up still
 * has something useful even for unsupported domains.
 *
 * Required as of Bubble Card v3.2.0 — a pop-up with no `cards:` renders
 * empty content (or surfaces the migration nag dialog on each load).
 */
function buildPopupContent(entityId: string): LovelaceCardConfig[] {
  const domain = entityId.split('.')[0] ?? '';
  switch (domain) {
    case 'light':
    case 'cover':
      return [{
        type: 'custom:bubble-card',
        card_type: 'button',
        button_type: 'slider',
        entity: entityId,
      }];
    case 'climate':
    case 'fan':
    case 'media_player':
      return [{
        type: 'custom:bubble-card',
        card_type: 'button',
        button_type: 'state',
        entity: entityId,
      }];
    default:
      return [{ type: 'tile', entity: entityId }];
  }
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
      cards: buildPopupContent(id),
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
