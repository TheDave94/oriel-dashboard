// ====================================================================
// Weather & Energy Section Builders
// ====================================================================
// Independent section builders for weather forecast and energy
// distribution. Each returns a single section or null.
// ====================================================================

import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { localize } from '../utils/localize';

/**
 * Creates the weather forecast section.
 * Returns null if weather is disabled or no entity available.
 */
export function createWeatherSection(
  weatherEntity: string | null,
  showWeather: boolean,
  hideHeading: boolean = false
): LovelaceSectionConfig | null {
  if (!weatherEntity || !showWeather) return null;

  const cards: LovelaceCardConfig[] = [];
  if (!hideHeading) {
    cards.push({
      type: 'heading',
      heading: localize('sections.weather'),
      heading_style: 'title',
      icon: 'mdi:weather-partly-cloudy',
    });
  }
  cards.push({
    type: 'weather-forecast',
    entity: weatherEntity,
    forecast_type: 'daily',
  });

  return { type: 'grid', cards };
}

/**
 * Creates the energy distribution section.
 * Returns null if energy is disabled.
 */
export function createEnergySection(
  showEnergy: boolean,
  linkDashboard: boolean = true,
  hideHeading: boolean = false
): LovelaceSectionConfig | null {
  if (!showEnergy) return null;

  const cards: LovelaceCardConfig[] = [];
  if (!hideHeading) {
    cards.push({
      type: 'heading',
      heading: localize('sections.energy'),
      heading_style: 'title',
      icon: 'mdi:lightning-bolt',
    });
  }
  cards.push({
    type: 'energy-distribution',
    link_dashboard: linkDashboard,
  });

  return { type: 'grid', cards };
}
