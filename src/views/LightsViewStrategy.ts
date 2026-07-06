// ====================================================================
// VIEW STRATEGY — LIGHTS (reactive group cards)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { densePlacement } from '../utils/view-builder';
import type { LovelaceViewConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';
import { resolveDensity } from '../utils/density';
import { buildBubblePopupSection, isBubbleCardInstalled } from '../utils/bubble-integration';

interface LightsViewStrategyParams {
  entities?: string[];
  /** Legacy field — strategy entrypoint passes `dashboardConfig`. */
  config?: OrielConfig;
  dashboardConfig?: OrielConfig;
}

class OrielViewLights extends HTMLElement {
  static async generate(
    config: LightsViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    const dashboardConfig: OrielConfig = config.dashboardConfig || config.config || {};
    const groupByFloors = dashboardConfig.group_lights_by_floors === true;
    const nestedGroups = dashboardConfig.nested_light_groups === true;
    const sortBy = dashboardConfig.lights_sort_by === 'name' ? 'name' : 'last_changed';
    // When the user enables nested light groups, default to expanded so
    // the members are visible without an extra click. Tapping the group
    // tile itself opens more-info (HA convention), so a chevron-only
    // expand wasn't discoverable. Matches RoomViewStrategy's behaviour
    // for its inline lights section. Users can override.
    const defaultExpanded = dashboardConfig.light_groups_default_expanded !== false;
    const density = resolveDensity(dashboardConfig);
    const bubbleEnabled =
      dashboardConfig.use_bubble_drawers === true && isBubbleCardInstalled();

    const card = (group_type: 'on' | 'off') => ({
      type: 'custom:oriel-lights-group-card',
      entities: config.entities,
      config: config.config,
      group_type,
      group_by_floors: groupByFloors,
      nested_groups: nestedGroups,
      default_expanded: defaultExpanded,
      sort_by: sortBy,
      ...(density ? { density } : {}),
      ...(bubbleEnabled ? { bubble_drawers: true } : {}),
    });

    // One group per SECTION. HA's sections view lays sections out side-by-side
    // (responsive, wrapping on narrow), each at full section width — so On and
    // Off sit beside each other without being squeezed into one width-capped
    // section, which crammed the wide tiles together and overlapped them.
    const sections: LovelaceSectionConfig[] = [
      { type: 'grid', cards: [card('on')] },
      { type: 'grid', cards: [card('off')] },
    ];
    // Co-locate the bubble pop-ups for this view's lights — Bubble Card pop-ups
    // are view-scoped, so the rewired tile taps need a matching pop-up here.
    if (bubbleEnabled) {
      const popups = buildBubblePopupSection(
        Registry.getVisibleEntityIdsForDomain('light'),
        hass,
      );
      if (popups) sections.push(popups);
    }
    return { type: 'sections', ...densePlacement(dashboardConfig), sections };
  }
}

customElements.define('ll-strategy-view-oriel-lights', OrielViewLights);
