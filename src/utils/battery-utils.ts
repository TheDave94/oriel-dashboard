import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig } from '../types/strategy';
import { filterBatteryEntities } from './entity-filter';

export type BatteryStatus = 'unknown' | 'critical' | 'low' | 'good';
export type RecBatteryStatus = Record<BatteryStatus, BatteryStatusGroup>;

export interface BatteryStatusGroup {
  entities: string[];
}

export interface BatteryStatusDisplay {
  icon: string;
  color: string;
  info: string | null;
}

type BatteryConfig = Pick<
  Simon42StrategyConfig,
  'hide_mobile_app_batteries' | 'show_unknown_battery_group' | 'battery_critical_threshold' | 'battery_low_threshold'
>;

/**
 * Returns the display configuration for each battery status.
 * Thresholds are taken from the config, with defaults if not set.
 */
export function getBatteryStatusDisplay(config: BatteryConfig, status: BatteryStatus): BatteryStatusDisplay {
  const criticalThreshold = config.battery_critical_threshold ?? 20;
  const lowThreshold = config.battery_low_threshold ?? 50;

  switch (status) {
    case 'unknown':  return { icon: 'mdi:battery-unknown', color: 'white', info: null, };
    case 'critical': return { icon: 'mdi:battery-alert', color: 'red', info: `< ${criticalThreshold}%`, };
    case 'low':      return { icon: 'mdi:battery-20', color: 'yellow', info: `${criticalThreshold}% - ${lowThreshold}%`, };
    case 'good':     return { icon: 'mdi:battery', color: 'green', info: `> ${lowThreshold}%`, };
  }
}

export function getBatteryStatusGroup(batteryGroups: RecBatteryStatus, status: BatteryStatus): BatteryStatusGroup {
  switch (status) {
    case 'unknown': return batteryGroups.unknown;
    case 'critical': return batteryGroups.critical;
    case 'low': return batteryGroups.low;
    case 'good': return batteryGroups.good;
  }
}

export function buildBatteryStatusGroups(hass: HomeAssistant, config: BatteryConfig): RecBatteryStatus {
  const batteryGroups: RecBatteryStatus = {
    unknown: { entities: [] },
    critical: { entities: [] },
    low: { entities: [] },
    good: { entities: [] },
  };

  const criticalThreshold = config.battery_critical_threshold ?? 20;
  const lowThreshold = config.battery_low_threshold ?? 50;

  for (const entityId of filterBatteryEntities(hass, config)) {
    let group: BatteryStatusGroup;

    // eslint-disable-next-line security/detect-object-injection
    const state = hass.states[entityId]?.state || '';
    if (config.show_unknown_battery_group && (state === 'unavailable' || state === 'unknown')) {
      group = batteryGroups.unknown;
    } else if (entityId.startsWith('binary_sensor.')) {
      group = state === 'on' ? batteryGroups.critical : batteryGroups.good;
    } else {
      const value = parseFloat(state ?? '');
      if (isNaN(value)) group = batteryGroups.critical;
      else if (value < criticalThreshold) group = batteryGroups.critical;
      else if (value <= lowThreshold) group = batteryGroups.low;
      else group = batteryGroups.good;
    }
    group.entities.push(entityId);
  }

  return batteryGroups;
}
