// ====================================================================
// Areas Section Builder
// ====================================================================
// Ported from dist/utils/simon42-section-builder.js (createAreasSection)
// with full TypeScript types.
// Creates area cards grouped by floor or as a single flat section.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { AreaRegistryEntry } from '../types/registries';

/**
 * Builds a single area card config for use in area sections.
 */
function buildAreaCard(area: AreaRegistryEntry): LovelaceCardConfig {
  return {
    type: 'area',
    area: area.area_id,
    display_type: 'compact',
    alert_classes: ['motion', 'moisture', 'occupancy'],
    sensor_classes: ['temperature', 'humidity', 'volatile_organic_compounds_parts'],
    features: [{ type: 'area-controls' }],
    features_position: 'inline',
    navigation_path: area.area_id,
    vertical: false,
  };
}

/**
 * Creates the areas section(s).
 *
 * - Without floor grouping: returns a single section with all areas.
 * - With floor grouping: returns an array of sections, one per floor,
 *   plus an optional "Weitere Bereiche" section for areas without a floor.
 */
export function createAreasSection(
  visibleAreas: AreaRegistryEntry[],
  groupByFloors: boolean = false,
  hass: HomeAssistant | null = null,
): LovelaceSectionConfig | LovelaceSectionConfig[] {
  // No floor grouping: flat list
  if (!groupByFloors || !hass) {
    return {
      type: 'grid',
      cards: [
        {
          type: 'heading',
          heading_style: 'title',
          heading: 'Bereiche',
        },
        ...visibleAreas.map(buildAreaCard),
      ],
    };
  }

  // Group areas by floor
  const areasByFloor = new Map<string, AreaRegistryEntry[]>();
  const areasWithoutFloor: AreaRegistryEntry[] = [];

  for (const area of visibleAreas) {
    if (area.floor_id) {
      if (!areasByFloor.has(area.floor_id)) {
        areasByFloor.set(area.floor_id, []);
      }
      areasByFloor.get(area.floor_id)!.push(area);
    } else {
      areasWithoutFloor.push(area);
    }
  }

  // Build sections per floor
  const sections: LovelaceSectionConfig[] = [];

  // Sort floors alphabetically by name
  const sortedFloors = Array.from(areasByFloor.keys()).sort((a, b) => {
    const floorA = hass.floors?.[a];
    const floorB = hass.floors?.[b];
    const nameA = floorA?.name || a;
    const nameB = floorB?.name || b;
    return nameA.localeCompare(nameB);
  });

  for (const floorId of sortedFloors) {
    const areas = areasByFloor.get(floorId)!;
    const floor = hass.floors?.[floorId];
    const floorName = floor?.name || floorId;
    const floorIcon = floor?.icon || 'mdi:floor-plan';

    sections.push({
      type: 'grid',
      cards: [
        {
          type: 'heading',
          heading_style: 'title',
          heading: floorName,
          icon: floorIcon,
        },
        ...areas.map(buildAreaCard),
      ],
    });
  }

  // Areas without a floor
  if (areasWithoutFloor.length > 0) {
    sections.push({
      type: 'grid',
      cards: [
        {
          type: 'heading',
          heading_style: 'title',
          heading: 'Weitere Bereiche',
          icon: 'mdi:home-outline',
        },
        ...areasWithoutFloor.map(buildAreaCard),
      ],
    });
  }

  return sections;
}
