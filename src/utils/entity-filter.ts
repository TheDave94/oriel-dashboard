// ====================================================================
// ENTITY FILTER — Central entity filtering utilities
// ====================================================================
// Uses Registry for pre-computed exclusion sets and Maps.
// Replaces the scattered filtering logic from data-collectors.js.
// ====================================================================

import { Registry } from '../Registry';
import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig, PersonData } from '../types/strategy';

/**
 * Collects person entities with home/away state.
 */
export function collectPersons(hass: HomeAssistant, config: Simon42StrategyConfig): PersonData[] {
  const personIds = Registry.getEntityIdsForDomain('person');

  return personIds
    .filter(id => {
      if (Registry.isExcludedByLabel(id)) return false;
      if (Registry.isHiddenByConfig(id)) return false;
      const state = hass.states[id];
      if (!state) return false;
      return true;
    })
    .map(id => {
      const state = hass.states[id];
      return {
        entity_id: id,
        name: state.attributes?.friendly_name || id.split('.')[1],
        state: state.state,
        isHome: state.state === 'home',
      };
    });
}

/**
 * Finds the first available weather entity.
 */
export function findWeatherEntity(hass: HomeAssistant): string | undefined {
  const weatherIds = Registry.getEntityIdsForDomain('weather');
  return weatherIds.find(id => {
    if (Registry.isExcludedByLabel(id)) return false;
    if (Registry.isHiddenByConfig(id)) return false;
    const state = hass.states[id];
    if (!state) return false;
    if (state.attributes?.entity_category) return false;
    return true;
  });
}

/**
 * Finds a dummy sensor entity for tile card color rendering.
 * Cached per call — should only be called once per generate().
 */
export function findDummySensor(hass: HomeAssistant): string {
  const sensorIds = Registry.getEntityIdsForDomain('sensor');
  for (const id of sensorIds) {
    if (Registry.isExcludedByLabel(id)) continue;
    const state = hass.states[id];
    if (!state) continue;
    if (state.state === 'unavailable' || state.state === 'unknown') continue;
    if (state.attributes?.entity_category === 'config' || state.attributes?.entity_category === 'diagnostic') continue;
    return id;
  }
  // Fallback: try any light
  const lightIds = Registry.getEntityIdsForDomain('light');
  for (const id of lightIds) {
    if (Registry.isExcludedByLabel(id)) continue;
    const state = hass.states[id];
    if (state) return id;
  }
  return 'sun.sun';
}
