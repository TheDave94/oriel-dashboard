// ====================================================================
// View Builder - Creates View Definitions
// ====================================================================

import type { LovelaceViewConfig, LovelaceBadgeConfig, LovelaceSectionConfig } from '../types/lovelace';
import { localize } from './localize';

/**
 * Opt-in dense masonry placement for a `sections` view.
 *
 * HA's sections view places each section into the shortest column but aligns
 * new rows to the tallest section in the row — so sections of differing height
 * (e.g. weather and energy, which are separate sections) leave large vertical
 * gaps. Setting `dense_section_placement: true` tells HA to pack sections into
 * whatever column has room, closing the gaps.
 *
 * Returns a spreadable fragment: the flag when the user enabled it, otherwise
 * nothing — so existing dashboards keep their current layout unless they opt in.
 * Ported from upstream simon42 #338 (fixes the #203 card-arrangement gaps).
 */
export function densePlacement(config?: {
  dense_section_placement?: boolean;
}): { dense_section_placement: true } | Record<string, never> {
  return config?.dense_section_placement === true ? { dense_section_placement: true } : {};
}

/**
 * Creates the main overview view.
 *
 * - Badges and header are only included when personBadges has entries.
 * - Type "sections" with max 3 columns.
 */
export function createOverviewView(
  sections: LovelaceSectionConfig[],
  personBadges: LovelaceBadgeConfig[],
  config?: { dense_section_placement?: boolean }
): LovelaceViewConfig {
  return {
    title: localize('views.overview'),
    path: 'home',
    icon: 'mdi:home',
    type: 'sections',
    max_columns: 3,
    ...densePlacement(config),
    badges: personBadges.length > 0 ? personBadges : undefined,
    header:
      personBadges.length > 0
        ? {
            layout: 'center',
            badges_position: 'bottom',
            badges_wrap: 'wrap',
          }
        : undefined,
    sections,
  };
}
