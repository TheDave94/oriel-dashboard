// ====================================================================
// VIEW STRATEGY — BATTERIES (Battery Status Overview)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig, LovelaceCardConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { type BatteryStatus, type BatteryStatusGroup, buildBatteryStatusGroups, getBatteryStatusDisplay, getBatteryStatusGroup } from '../utils/battery-utils';
import { localize } from '../utils/localize';

type BatteryStatusKeys = BatteryStatus[];
type BatteryStatusKeyList = BatteryStatusKeys[];

/**
 * Smart Grid Layout:
 * Groups battery status groups into 1-3 grid sections based on their entity counts, to optimize visual balance and minimize empty space.
 * - If all groups have very few entities, they are combined into a single section.
 * - If one group has significantly more entities than the others, it gets its own section, while smaller groups are combined.
 */
function smartGridGrouping(batteryGroups: Record<BatteryStatus, BatteryStatusGroup>): BatteryStatusKeyList {

  // Determine the maximum entity count among groups with entities (ignoring empty groups)
  const maxEntities = [...Object.values(batteryGroups)]
    .filter((group) => group.entities.length > 0)
    .reduce((max, group) => Math.max(max, group.entities.length), 0);

  // If all groups are empty, return an empty array
  if (maxEntities === 0) return [];

  // Loop through each group and assign it to a grid group based on its count relative to maxEntities
  let numEntities = 0;
  let statusKeyList: BatteryStatusKeyList = [];
  for (const [key, group] of Object.entries(batteryGroups) as Array<[BatteryStatus, BatteryStatusGroup]>) {
    if (group.entities.length === 0) continue;

    // If adding this group would exceed 75% of maxEntities, start a new grid group
    numEntities += group.entities.length;
    if (statusKeyList.length !== 0 && (numEntities <= maxEntities * 0.75)) {
      statusKeyList[statusKeyList.length - 1].push(key);
    } else {
      statusKeyList.push([key]);
    }
  }

  // If we still end up with 4 groups, merge them into a 2-column grid
  if (statusKeyList.length === 4) {
    return [[statusKeyList[0][0], statusKeyList[1][0]], [statusKeyList[2][0], statusKeyList[3][0]]];
  }
  return statusKeyList;
}

class Simon42ViewBatteriesStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    const strategyConfig = config.config || {};
    const batteryGroups = buildBatteryStatusGroups(hass, strategyConfig);
  
    const sections: LovelaceSectionConfig[] = [];

    // Build columns based on available status groups
    for (const statusKeyList of smartGridGrouping(batteryGroups)) {
      const cards: LovelaceCardConfig[] = [];

      // Build sections based on grid groups
      for (const status of statusKeyList) {

        const group = getBatteryStatusGroup(batteryGroups, status);
        const entities = group.entities.sort((a: string, b: string) =>{
          const valA = parseFloat(hass.states[a]?.state);
          const valB = parseFloat(hass.states[b]?.state);
          if (isNaN(valA)) return -1;
          if (isNaN(valB)) return 1;
          return valA - valB;
        });

        const style = getBatteryStatusDisplay(strategyConfig, status);
        const oneOrMany = entities.length === 1 ? 'battery_one' : 'battery_many';
        cards.push({
          type: 'heading',
          heading: `${localize('batteries.' + status)} ` + (style.info ? `(${style.info})` : '') +
            ` - ${entities.length} ${localize('batteries.' + oneOrMany)}`,
          heading_style: 'title',
          icon: style.icon,
        });
        cards.push(...entities.map((e: string) => ({
          type: 'tile',
          entity: e,
          vertical: false,
          state_content: ['state', 'last_changed'],
          color: style.color,
        })));
      }

      if (cards.length > 0) {
        sections.push({
          type: 'grid',
          cards,
        });
      }
    }

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-batteries', Simon42ViewBatteriesStrategy);
