// ============================================================================
// AirWatch reader — thin, generate-time + reactive-card shared helpers
// ============================================================================
// Mirrors the PollenWatch reader (utils/pollen.ts): the AirWatch integration
// owns all bucketing (consensus levels, the worst-sub-index, EAQI bands); Oriel
// only reads states/attributes and never re-derives a threshold. The one
// deliberate difference from the pollen reader — warranted, not incidental — is
// that this consumes the divergence **binary_sensor explicitly** (AirWatch's
// typed PROBLEM signal) rather than inferring from the `mixed` state. For
// PollenWatch that retrofit was rejected (its binary_sensor is a redundant
// boolean; source_levels already lives on the consensus sensor) — but for new
// code the typed signal is the right surface.
//
// AirWatch v1.0.3 + the overall-entity addition expose:
//   sensor.airwatch_analytics_<pollutant>_consensus       (enum good/elevated/high/mixed)
//     attrs: level, level_label, source_levels, source_count, max_possible_sources
//   binary_sensor.airwatch_analytics_<pollutant>_divergence  (device_class PROBLEM)
//     on = sources disagree by >1 level; attr: source_levels
//   sensor.airwatch_analytics_overall                     (worst agreed sub-index)
//     attrs: level, level_label, worst_pollutant, diverged_pollutants
//   sensor.airwatch_<source>_<pollutant>                  (raw µg/m³; european_aqi index)
// ============================================================================

import type { HomeAssistant } from '../types/homeassistant';

const PREFIX = 'sensor.airwatch_';
const CONSENSUS_PREFIX = 'sensor.airwatch_analytics_';
const DIVERGENCE_PREFIX = 'binary_sensor.airwatch_analytics_';
const OVERALL_ID = 'sensor.airwatch_analytics_overall';

/** Canonical pollutant keys, in display order. `european_aqi` is a parallel
 *  composite index (not a sub-index) — kept last and never folded into the
 *  worst-of (the overall entity already excludes it). */
export const AIR_POLLUTANTS = [
  'pm2_5',
  'pm10',
  'nitrogen_dioxide',
  'ozone',
  'sulphur_dioxide',
  'carbon_monoxide',
  'european_aqi',
] as const;
export type AirPollutant = (typeof AIR_POLLUTANTS)[number];

/** Carbon monoxide is deliberately NOT part of the European AQI — it has no
 *  EAQI band (AirWatch scores it on WHO/EU bounds). The card renders it
 *  honestly: real level, no EAQI-band affordance. */
export const CO_POLLUTANT: AirPollutant = 'carbon_monoxide';

export const AIR_LABELS: Record<AirPollutant, string> = {
  pm2_5: 'PM2.5',
  pm10: 'PM10',
  nitrogen_dioxide: 'Nitrogen dioxide',
  ozone: 'Ozone',
  sulphur_dioxide: 'Sulphur dioxide',
  carbon_monoxide: 'Carbon monoxide',
  european_aqi: 'European AQI',
};

const AIR_ICONS: Record<AirPollutant, string> = {
  pm2_5: 'mdi:blur',
  pm10: 'mdi:blur',
  nitrogen_dioxide: 'mdi:molecule',
  ozone: 'mdi:weather-windy',
  sulphur_dioxide: 'mdi:molecule',
  carbon_monoxide: 'mdi:molecule-co',
  european_aqi: 'mdi:air-filter',
};

export function airIcon(pollutant: AirPollutant): string {
  return AIR_ICONS[pollutant] ?? 'mdi:air-filter';
}

/** Consensus / overall level vocabulary. `mixed` = sources disagree by >1
 *  level (no agreed level); a number can't hold it. */
export type AirLevel = 'good' | 'elevated' | 'high' | 'mixed';

const SEVERITY: Record<AirLevel, string> = {
  good: 'green',
  elevated: 'yellow',
  high: 'red',
  mixed: 'orange',
};

/** Color token for a level (or empty for unknown). */
export function airSeverityColor(level: AirLevel | null): string {
  return level ? SEVERITY[level] : '';
}

/** True when a pollutant is worth surfacing on the heading badge row —
 *  elevated/high, or diverged (sources disagree). */
export function airIsActive(level: AirLevel | null, diverged: boolean): boolean {
  return diverged || level === 'elevated' || level === 'high';
}

// -- entity ids --------------------------------------------------------------

export function airConsensusId(pollutant: AirPollutant): string {
  return `${CONSENSUS_PREFIX}${pollutant}_consensus`;
}

export function airDivergenceId(pollutant: AirPollutant): string {
  return `${DIVERGENCE_PREFIX}${pollutant}_divergence`;
}

export function airOverallId(): string {
  return OVERALL_ID;
}

// -- detection ---------------------------------------------------------------

/** True when the AirWatch integration is installed (any `sensor.airwatch_*`).
 *  Mirrors detectPollenwatchInstalled — same entity-prefix scan. */
export function detectAirwatchInstalled(hass: HomeAssistant): boolean {
  for (const id of Object.keys(hass.states)) {
    if (id.startsWith(PREFIX)) return true;
  }
  return false;
}

/** Pollutants that currently have a consensus sensor present. */
export function detectAirPollutants(hass: HomeAssistant): AirPollutant[] {
  return AIR_POLLUTANTS.filter((p) => hass.states[airConsensusId(p)] !== undefined);
}

// -- per-pollutant reading ---------------------------------------------------

function parseLevel(raw: string | undefined): AirLevel | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === 'good' || v === 'elevated' || v === 'high' || v === 'mixed') return v;
  return null;
}

export interface AirPollutantReading {
  pollutant: AirPollutant;
  /** Consensus level (good/elevated/high), or 'mixed' / null when unknown. */
  level: AirLevel | null;
  /** Sources contributing now / registry ceiling (the N-of-M honesty badge). */
  count: number | null;
  max: number | null;
  /** Per-source `{source: level}` — which sources, and which disagree. */
  levels: Record<string, number>;
  /** Explicit divergence from the typed PROBLEM binary_sensor. */
  diverged: boolean;
  /** carbon_monoxide has no EAQI band — the honest odd-one-out. */
  noEaqiBand: boolean;
}

/** Read one pollutant's consensus + its divergence binary_sensor. The boolean
 *  comes from the typed binary_sensor (the warranted-for-new-code choice);
 *  count/max/source_levels come from the consensus sensor's attributes. */
export function readAirPollutant(hass: HomeAssistant, pollutant: AirPollutant): AirPollutantReading {
  const consensus = hass.states[airConsensusId(pollutant)];
  const level = parseLevel(consensus?.state);

  let count: number | null = null;
  let max: number | null = null;
  const levels: Record<string, number> = {};
  if (consensus) {
    const c = consensus.attributes?.source_count;
    const m = consensus.attributes?.max_possible_sources;
    if (typeof c === 'number') count = c;
    if (typeof m === 'number' && m >= 1) max = m;
    const raw = consensus.attributes?.source_levels;
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'number') levels[k] = v;
      }
    }
  }

  const divEntity = hass.states[airDivergenceId(pollutant)];
  // Explicit typed signal; fall back to the `mixed` level if the binary_sensor
  // is absent or unavailable (single/<2-source pollutants have none).
  const diverged =
    divEntity && divEntity.state !== 'unavailable' && divEntity.state !== 'unknown'
      ? divEntity.state === 'on'
      : level === 'mixed';

  return {
    pollutant,
    level,
    count,
    max,
    levels,
    diverged,
    noEaqiBand: pollutant === CO_POLLUTANT,
  };
}

// -- overall (worst sub-index) ----------------------------------------------

export interface AirOverall {
  level: AirLevel | null; // worst agreed level, or 'mixed'/null
  worstPollutant: AirPollutant | null;
  divergedPollutants: AirPollutant[];
}

/** Read the AirWatch overall worst-sub-index entity. Falls back to computing
 *  the worst-of from per-pollutant consensus when the entity is absent, so
 *  Oriel has no hard release-ordering dependency on the AirWatch overall PR. */
export function readAirOverall(hass: HomeAssistant, readings: AirPollutantReading[]): AirOverall {
  const entity = hass.states[OVERALL_ID];
  if (entity && entity.state !== 'unavailable' && entity.state !== 'unknown') {
    const level = parseLevel(entity.state);
    const worst = entity.attributes?.worst_pollutant;
    const diverged = entity.attributes?.diverged_pollutants;
    return {
      level,
      worstPollutant: isAirPollutant(worst) ? worst : null,
      divergedPollutants: Array.isArray(diverged) ? diverged.filter(isAirPollutant) : [],
    };
  }
  return computeOverall(readings);
}

/** Fallback worst-of: max agreed level across pollutants (excluding the
 *  european_aqi composite); a diverged pollutant has no agreed level and is
 *  recorded separately, never ranked. Mirrors AirWatch's overall_consensus. */
function computeOverall(readings: AirPollutantReading[]): AirOverall {
  const RANK: Record<string, number> = { good: 0, elevated: 1, high: 2 };
  let worstLevel = -1;
  let worstPollutant: AirPollutant | null = null;
  const divergedPollutants: AirPollutant[] = [];
  for (const r of readings) {
    if (r.pollutant === 'european_aqi') continue;
    if (r.diverged) {
      divergedPollutants.push(r.pollutant);
      continue;
    }
    const rank = r.level ? RANK[r.level] : undefined;
    if (rank !== undefined && rank > worstLevel) {
      worstLevel = rank;
      worstPollutant = r.pollutant;
    }
  }
  const LABEL: AirLevel[] = ['good', 'elevated', 'high'];
  if (worstLevel >= 0) {
    return { level: LABEL[worstLevel] ?? null, worstPollutant, divergedPollutants };
  }
  if (divergedPollutants.length) {
    return { level: 'mixed', worstPollutant: null, divergedPollutants };
  }
  return { level: null, worstPollutant: null, divergedPollutants: [] };
}

function isAirPollutant(v: unknown): v is AirPollutant {
  return typeof v === 'string' && (AIR_POLLUTANTS as readonly string[]).includes(v);
}
