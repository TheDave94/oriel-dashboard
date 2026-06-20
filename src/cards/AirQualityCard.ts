// ============================================================================
// oriel-air-quality-card — multi-source air quality from AirWatch
// ============================================================================
// Sibling of oriel-pollen-card. Thin reactive reader over the AirWatch
// integration's consensus / divergence / overall entities: a worst-sub-index
// headline plus a per-pollutant strip, each pollutant carrying its consensus
// level, the N-of-M source-count honesty badge, and an explicit divergence
// flag (read from AirWatch's typed PROBLEM binary_sensor — the warranted
// choice for new code). Carbon monoxide renders honestly: its real level, with
// a note that it sits on WHO/EU bounds, not the European AQI (it has no EAQI
// band). The integration owns all bucketing; this card only reads.
// ============================================================================

import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import {
  AIR_POLLUTANTS,
  AIR_LABELS,
  airConsensusId,
  airDivergenceId,
  airIcon,
  airOverallId,
  airSeverityColor,
  detectAirPollutants,
  readAirOverall,
  readAirPollutant,
  type AirLevel,
  type AirPollutant,
  type AirPollutantReading,
} from '../utils/airquality';
import { localize } from '../utils/localize';

interface AirQualityCardConfig {
  /** Which pollutants to show; empty → all currently present. */
  pollutants: AirPollutant[];
  /** When false (default), pollutants at level `good` (and not diverged) are
   *  hidden — the strip only shows what warrants attention. */
  show_good: boolean;
}

const SEVERITY_TO_VAR: Record<string, string> = {
  red: 'var(--red-color)',
  orange: 'var(--orange-color)',
  yellow: 'var(--yellow-color)',
  green: 'var(--green-color)',
};

function levelVar(level: AirLevel | null): string {
  return SEVERITY_TO_VAR[airSeverityColor(level)] || '';
}

class OrielAirQualityCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;

  private _config: AirQualityCardConfig = {
    pollutants: [...AIR_POLLUTANTS],
    show_good: false,
  };
  private _relevantIds: Set<string> | null = null;

  static styles = css`
    ha-card {
      padding: var(--ha-space-4, 16px);
    }
    .headline {
      display: flex;
      align-items: baseline;
      gap: var(--ha-space-2, 8px);
      margin-bottom: var(--ha-space-3, 12px);
    }
    .headline-level {
      font-size: var(--ha-font-size-xl, 22px);
      font-weight: var(--ha-font-weight-bold, 700);
    }
    .headline-sub {
      font-size: var(--ha-font-size-s, 13px);
      color: var(--secondary-text-color);
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1, 4px);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      padding: var(--ha-space-1, 4px) 0;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      color: inherit;
    }
    .row:focus-visible {
      outline: 2px solid var(--primary-color);
      border-radius: 4px;
    }
    .row-name {
      flex: 1;
      font-size: var(--ha-font-size-s, 13px);
      color: var(--primary-text-color);
    }
    .differ {
      color: var(--orange-color);
      font-size: var(--ha-font-size-xs, 11px);
      white-space: nowrap;
    }
    .row-level {
      font-size: var(--ha-font-size-s, 13px);
      text-transform: capitalize;
      font-weight: var(--ha-font-weight-medium, 500);
    }
    .row-sources {
      font-size: var(--ha-font-size-xs, 11px);
      color: var(--secondary-text-color);
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
      cursor: help;
    }
    .co-note {
      color: var(--secondary-text-color);
      cursor: help;
      --mdc-icon-size: 14px;
    }
    .empty {
      color: var(--secondary-text-color);
      text-align: center;
      padding: var(--ha-space-2, 8px);
    }
  `;

  setConfig(config: Record<string, unknown>): void {
    const rawTypes = Array.isArray(config.pollutants) ? config.pollutants : [];
    const pollutants = (rawTypes as unknown[]).filter((t): t is AirPollutant =>
      (AIR_POLLUTANTS as readonly unknown[]).includes(t)
    );
    this._config = {
      pollutants,
      show_good: config.show_good === true,
    };
    this._relevantIds = null;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has('hass') || !this.hass) return;
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (!oldHass || oldHass.entities !== this.hass.entities) {
      const pollutants = this._resolvePollutants();
      const ids = new Set<string>([airOverallId()]);
      for (const p of pollutants) {
        ids.add(airConsensusId(p));
        ids.add(airDivergenceId(p));
      }
      this._relevantIds = ids;
    }
  }

  private _resolvePollutants(): AirPollutant[] {
    if (this._config.pollutants.length > 0) return this._config.pollutants;
    if (!this.hass) return [];
    const present = detectAirPollutants(this.hass);
    return present.length > 0 ? present : [...AIR_POLLUTANTS];
  }

  render(): TemplateResult {
    if (!this.hass) return html``;
    const pollutants = this._resolvePollutants();
    const readings = pollutants.map((p) => readAirPollutant(this.hass!, p));
    const overall = readAirOverall(this.hass, readings);

    // Hide clean (good, non-diverged) pollutants unless show_good; keep unknown
    // (null level) so the user sees a species reporting no data.
    const rows = this._config.show_good ? readings : readings.filter((r) => r.diverged || r.level !== 'good');

    if (rows.length === 0) {
      return html`<ha-card
        ><div class="empty">${localize('editor.air_quality_no_data') || 'No air quality data'}</div></ha-card
      >`;
    }

    return html`
      <ha-card>
        ${this._renderHeadline(overall)}
        <div class="rows">${rows.map((r) => this._renderRow(r))}</div>
      </ha-card>
    `;
  }

  private _renderHeadline(overall: ReturnType<typeof readAirOverall>): TemplateResult {
    const levelText = this._levelLabel(overall.level);
    let sub: string;
    if (overall.level === 'mixed' || (!overall.worstPollutant && overall.divergedPollutants.length)) {
      sub = `${localize('editor.air_quality_sources_disagree') || 'sources disagree'}`;
    } else if (overall.worstPollutant) {
      const worst = AIR_LABELS[overall.worstPollutant];
      sub = `${localize('editor.air_quality_worst') || 'worst'}: ${worst}`;
    } else {
      sub = localize('editor.air_quality_overall') || 'overall';
    }
    return html`
      <div class="headline">
        <span class="headline-level" style="color: ${levelVar(overall.level)}">${levelText}</span>
        <span class="headline-sub">${sub}</span>
      </div>
    `;
  }

  private _renderRow(r: AirPollutantReading): TemplateResult {
    const id = airConsensusId(r.pollutant);
    return html`
      <button
        class="row"
        @click=${() => this._openMoreInfo(id)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._openMoreInfo(id);
          }
        }}
      >
        <ha-icon icon=${airIcon(r.pollutant)} style="color: ${levelVar(r.level)}"></ha-icon>
        <span class="row-name">${AIR_LABELS[r.pollutant]}</span>
        ${r.noEaqiBand ? this._renderCoNote() : nothing}
        ${r.diverged
          ? html`<span class="differ" title=${this._sourcesDetail(r)}
              >⚠ ${localize('editor.air_quality_differ') || 'differ'}</span
            >`
          : nothing}
        <span class="row-level" style="color: ${levelVar(r.level)}">${this._levelLabel(r.level)}</span>
        ${this._renderSourceBadge(r)}
      </button>
    `;
  }

  private _renderSourceBadge(r: AirPollutantReading): TemplateResult | typeof nothing {
    if (r.count == null || r.max == null) return nothing;
    const detail = this._sourcesDetail(r);
    return html`<span class="row-sources" title=${detail} aria-label=${detail}>${r.count}/${r.max}</span>`;
  }

  private _renderCoNote(): TemplateResult {
    const text =
      localize('editor.air_quality_co_note') ||
      'Carbon monoxide is not part of the European AQI; severity from WHO/EU guidelines.';
    return html`<ha-icon
      class="co-note"
      icon="mdi:information-outline"
      role="img"
      title=${text}
      aria-label=${text}
    ></ha-icon>`;
  }

  private _sourcesDetail(r: AirPollutantReading): string {
    const LABELS = ['good', 'elevated', 'high'];
    const parts = Object.entries(r.levels).map(([src, lvl]) => `${src.replace(/_/g, ' ')}: ${LABELS[lvl] ?? lvl}`);
    return parts.length ? parts.join(' · ') : `${r.count ?? '?'} of ${r.max ?? '?'} sources`;
  }

  private _levelLabel(level: AirLevel | null): string {
    if (level === null) return localize('editor.air_quality_level_unknown') || '—';
    return localize(`editor.air_quality_level_${level}`) || level;
  }

  private _openMoreInfo(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  getCardSize(): number {
    return 2;
  }
}

if (!customElements.get('oriel-air-quality-card')) {
  customElements.define('oriel-air-quality-card', OrielAirQualityCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-air-quality-card')) {
  window.customCards.push({
    type: 'oriel-air-quality-card',
    name: 'Oriel Air Quality Card',
    description:
      'Multi-source air quality from the AirWatch integration — worst sub-index, per-pollutant consensus, N-of-M source badge, and explicit divergence. Rendered as a first-party card, no manual config.',
  });
}
