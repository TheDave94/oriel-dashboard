// ====================================================================
// View Builder - Creates View Definitions
// ====================================================================

import type { LovelaceViewConfig, LovelaceBadgeConfig, LovelaceSectionConfig } from '../types/lovelace';
import { localize } from './localize';
import { packSections } from './section-packing';

/**
 * Opt-in dense masonry placement for a `sections` view.
 *
 * HA's sections view is a row-major grid where every row track aligns to the
 * tallest section placed in it — sections of differing height (e.g. the areas
 * grid vs. the summaries block) leave large vertical gaps. Two things have to
 * work together to close them (#182):
 *
 *  1. `dense_section_placement: true` on the view (`grid-auto-flow: row
 *     dense`) lets HA backfill free grid cells out of source order — this
 *     helper contributes the flag, and
 *  2. per-section `row_span` values that split the grid into fine-grained
 *     tracks so short sections can actually stack beside tall ones — without
 *     them the dense flag has no free cells to fill and visibly does
 *     nothing. Views produce those by passing their sections through
 *     `packSections()` (utils/section-packing) and returning its result.
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
    sections: packSections(config, sections, 'overview'),
  };
}
