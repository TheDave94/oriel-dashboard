// ====================================================================
// VIEW STRATEGY — BATTERIES (Battery Status Overview)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { EntityRegistryDisplayEntry } from '../types/registries';

class Simon42ViewBatteriesStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    const entities: EntityRegistryDisplayEntry[] = config.entities;

    // Exclusion sets
    const excludeSet = new Set<string>();
    for (const e of entities) {
      if (e.labels?.includes('no_dboard')) excludeSet.add(e.entity_id);
    }

    const hiddenFromConfig = new Set<string>();
    if (config.config?.areas_options) {
      for (const areaOptions of Object.values(config.config.areas_options) as any[]) {
        if (areaOptions.groups_options) {
          for (const groupOptions of Object.values(areaOptions.groups_options) as any[]) {
            if (Array.isArray(groupOptions.hidden)) {
              for (const id of groupOptions.hidden) hiddenFromConfig.add(id);
            }
          }
        }
      }
    }

    // Filter battery entities
    const batteryEntities = Object.keys(hass.states).filter(entityId => {
      const state = hass.states[entityId];
      if (!state) return false;

      const isBattery = entityId.includes('battery') || state.attributes?.device_class === 'battery';
      if (!isBattery) return false;
      if (!entityId.startsWith('sensor.') && !entityId.startsWith('binary_sensor.')) return false;

      const registryEntry = hass.entities?.[entityId];
      if (registryEntry?.hidden_by) return false;
      if (registryEntry?.disabled_by) return false;
      if (config.config?.hide_mobile_app_batteries && registryEntry?.platform === 'mobile_app') return false;

      if (excludeSet.has(entityId)) return false;
      if (hiddenFromConfig.has(entityId)) return false;

      if (entityId.startsWith('binary_sensor.')) return true;
      const value = parseFloat(state.state);
      return !isNaN(value);
    });

    // Deduplication: remove binary_sensor if %-sensor exists on same device
    const sensorDeviceIds = new Set<string>();
    for (const id of batteryEntities) {
      if (id.startsWith('sensor.')) {
        const deviceId = hass.entities?.[id]?.device_id;
        if (deviceId) sensorDeviceIds.add(deviceId);
      }
    }
    const dedupedEntities = batteryEntities.filter(id => {
      if (!id.startsWith('binary_sensor.')) return true;
      const deviceId = hass.entities?.[id]?.device_id;
      return !deviceId || !sensorDeviceIds.has(deviceId);
    });

    // Group by status
    const critical: string[] = [];
    const low: string[] = [];
    const good: string[] = [];

    for (const entityId of dedupedEntities) {
      const state = hass.states[entityId];
      if (entityId.startsWith('binary_sensor.')) {
        (state.state === 'on' ? critical : good).push(entityId);
        continue;
      }
      const value = parseFloat(state.state);
      if (value < 20) critical.push(entityId);
      else if (value <= 50) low.push(entityId);
      else good.push(entityId);
    }

    const sections: LovelaceSectionConfig[] = [];

    if (critical.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading: `🔴 Kritisch (< 20%) - ${critical.length} ${critical.length === 1 ? 'Batterie' : 'Batterien'}`, heading_style: 'title' },
          ...critical.map(e => ({ type: 'tile', entity: e, vertical: false, state_content: ['state', 'last_changed'], color: 'red' })),
        ],
      });
    }

    if (low.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading: `🟡 Niedrig (20-50%) - ${low.length} ${low.length === 1 ? 'Batterie' : 'Batterien'}`, heading_style: 'title' },
          ...low.map(e => ({ type: 'tile', entity: e, vertical: false, state_content: ['state', 'last_changed'], color: 'yellow' })),
        ],
      });
    }

    if (good.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading: `🟢 Gut (> 50%) - ${good.length} ${good.length === 1 ? 'Batterie' : 'Batterien'}`, heading_style: 'title' },
          ...good.map(e => ({ type: 'tile', entity: e, vertical: false, state_content: ['state', 'last_changed'], color: 'green' })),
        ],
      });
    }

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-batteries', Simon42ViewBatteriesStrategy);
