// ============================================================================
// Tests — AirWatch reader (utils/airquality)
// ============================================================================
// Pins the thin-reader contract: entity-id construction, detection, the
// per-pollutant consensus read (level + N-of-M + source_levels), the EXPLICIT
// divergence binary_sensor consumption (with a mixed-state fallback), the CO
// no-EAQI-band flag, and the overall worst-sub-index read with its compute
// fallback. The integration owns bucketing; the reader only reads.
// ============================================================================

import { describe, it, expect } from 'vitest';

import {
  airConsensusId,
  airDivergenceId,
  airIsActive,
  airOverallId,
  detectAirPollutants,
  detectAirwatchInstalled,
  readAirOverall,
  readAirPollutant,
} from '../../src/utils/airquality';
import type { HomeAssistant } from '../../src/types/homeassistant';

type S = { state: string; attributes?: Record<string, unknown> };
function hassOf(states: Record<string, S>): HomeAssistant {
  return { states } as unknown as HomeAssistant;
}

describe('entity ids', () => {
  it('builds the consensus / divergence / overall ids', () => {
    expect(airConsensusId('pm2_5')).toBe('sensor.airwatch_analytics_pm2_5_consensus');
    expect(airDivergenceId('ozone')).toBe('binary_sensor.airwatch_analytics_ozone_divergence');
    expect(airOverallId()).toBe('sensor.airwatch_analytics_overall');
  });
});

describe('detection', () => {
  it('detectAirwatchInstalled keys on the sensor.airwatch_ prefix', () => {
    expect(detectAirwatchInstalled(hassOf({ 'sensor.airwatch_open_meteo_pm2_5': { state: '4' } }))).toBe(true);
    expect(detectAirwatchInstalled(hassOf({ 'sensor.living_room_temp': { state: '21' } }))).toBe(false);
  });

  it('detectAirPollutants lists pollutants with a consensus sensor', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_pm2_5_consensus': { state: 'good' },
      'sensor.airwatch_analytics_ozone_consensus': { state: 'high' },
    });
    expect(detectAirPollutants(hass)).toEqual(['pm2_5', 'ozone']);
  });
});

describe('readAirPollutant', () => {
  it('reads level, N-of-M counts, and source_levels from the consensus', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_pm2_5_consensus': {
        state: 'elevated',
        attributes: {
          source_count: 2,
          max_possible_sources: 3,
          source_levels: { open_meteo: 1, sensor_community: 1 },
        },
      },
    });
    const r = readAirPollutant(hass, 'pm2_5');
    expect(r.level).toBe('elevated');
    expect(r.count).toBe(2);
    expect(r.max).toBe(3);
    expect(r.levels).toEqual({ open_meteo: 1, sensor_community: 1 });
    expect(r.diverged).toBe(false);
  });

  it('takes divergence from the typed binary_sensor explicitly', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_pm2_5_consensus': { state: 'mixed', attributes: {} },
      'binary_sensor.airwatch_analytics_pm2_5_divergence': { state: 'on' },
    });
    expect(readAirPollutant(hass, 'pm2_5').diverged).toBe(true);
  });

  it('binary_sensor off → not diverged even when present', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_pm2_5_consensus': { state: 'good', attributes: {} },
      'binary_sensor.airwatch_analytics_pm2_5_divergence': { state: 'off' },
    });
    expect(readAirPollutant(hass, 'pm2_5').diverged).toBe(false);
  });

  it('falls back to the mixed state when no divergence binary_sensor (single/<2-source)', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_pm2_5_consensus': { state: 'mixed', attributes: {} },
    });
    expect(readAirPollutant(hass, 'pm2_5').diverged).toBe(true);
  });

  it('falls back to mixed when the binary_sensor is unavailable', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_pm2_5_consensus': { state: 'mixed', attributes: {} },
      'binary_sensor.airwatch_analytics_pm2_5_divergence': { state: 'unavailable' },
    });
    expect(readAirPollutant(hass, 'pm2_5').diverged).toBe(true);
  });

  it('flags carbon_monoxide as having no EAQI band', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_carbon_monoxide_consensus': { state: 'good', attributes: {} },
    });
    const r = readAirPollutant(hass, 'carbon_monoxide');
    expect(r.noEaqiBand).toBe(true);
    expect(readAirPollutant(hass, 'carbon_monoxide').level).toBe('good'); // real level, honest
  });
});

describe('airIsActive', () => {
  it('is true for elevated/high or any divergence', () => {
    expect(airIsActive('good', false)).toBe(false);
    expect(airIsActive('good', true)).toBe(true);
    expect(airIsActive('elevated', false)).toBe(true);
    expect(airIsActive('high', false)).toBe(true);
    expect(airIsActive(null, false)).toBe(false);
  });
});

describe('readAirOverall', () => {
  const reading = (pollutant: string, level: string | null, diverged = false) =>
    ({
      pollutant,
      level,
      count: null,
      max: null,
      levels: {},
      diverged,
      noEaqiBand: pollutant === 'carbon_monoxide',
    }) as ReturnType<typeof readAirPollutant>;

  it('reads the overall entity when present', () => {
    const hass = hassOf({
      'sensor.airwatch_analytics_overall': {
        state: 'high',
        attributes: { worst_pollutant: 'ozone', diverged_pollutants: ['pm2_5'] },
      },
    });
    const o = readAirOverall(hass, []);
    expect(o.level).toBe('high');
    expect(o.worstPollutant).toBe('ozone');
    expect(o.divergedPollutants).toEqual(['pm2_5']);
  });

  it('falls back to computing the worst-of when the entity is absent', () => {
    const o = readAirOverall(hassOf({}), [
      reading('pm2_5', 'good'),
      reading('ozone', 'high'),
      reading('nitrogen_dioxide', 'elevated'),
    ]);
    expect(o.level).toBe('high');
    expect(o.worstPollutant).toBe('ozone');
  });

  it('fallback excludes a diverged pollutant from the max and lists it', () => {
    const o = readAirOverall(hassOf({}), [
      reading('pm2_5', 'elevated'),
      reading('ozone', null, true), // diverged
    ]);
    expect(o.level).toBe('elevated');
    expect(o.worstPollutant).toBe('pm2_5');
    expect(o.divergedPollutants).toEqual(['ozone']);
  });

  it('fallback excludes the european_aqi composite from the worst-of', () => {
    const o = readAirOverall(hassOf({}), [reading('pm2_5', 'good'), reading('european_aqi', 'high')]);
    expect(o.level).toBe('good'); // european_aqi ignored
  });

  it('fallback → mixed when nothing agrees but something diverges', () => {
    const o = readAirOverall(hassOf({}), [reading('ozone', null, true)]);
    expect(o.level).toBe('mixed');
    expect(o.worstPollutant).toBeNull();
  });
});
