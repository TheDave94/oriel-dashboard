// ====================================================================
// LAZY CARD — IntersectionObserver-deferred child card
// ====================================================================
// Wraps a single Lovelace card config and only mounts it once the
// element scrolls into view (plus rootMargin so it's ready by the
// time the user actually sees it). Once mounted, stays mounted —
// no re-unmount on scroll-out (predictable behaviour > marginal
// memory wins).
//
// Used by OverviewViewStrategy to defer sections beyond the initial
// viewport. Addresses Part 0 #3 (large-install perf cliff) without
// touching HA frontend internals — the strategy just emits this
// card type in place of regular ones.
// ====================================================================

import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig } from '../types/lovelace';
import { estimateCardGridSize, SECTION_ROW_UNIT_PX } from '../utils/section-packing';

interface LazyCardConfig {
  type: string;
  card: LovelaceCardConfig;
  /** Margin around the viewport to consider "near visible". Default 200px. */
  root_margin?: string;
  /** Reserved height while the child hasn't mounted yet. Helps avoid
   *  layout jank when the lazy card finally swaps in. Defaults to the
   *  child's estimated rendered height. */
  placeholder_height?: string;
}

class OrielLazyCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _mounted = false;

  private _config!: LazyCardConfig;
  private _observer?: IntersectionObserver;
  // Computed once per config — the estimate is pure in the config, and
  // hass updates arrive hundreds of times per minute.
  private _estimate = { columns: 12 as number | 'full', rows: 3 };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .placeholder {
      width: 100%;
      min-height: var(--oriel-lazy-min-height, 40px);
    }
  `;

  public setConfig(config: LazyCardConfig): void {
    if (!config?.card || typeof config.card !== 'object') {
      throw new Error('oriel-lazy-card: `card` config required');
    }
    this._config = config;
    this._estimate = estimateCardGridSize(config.card);
  }

  public getCardSize(): number {
    // We can't ask the child until it's mounted — report the estimated
    // height instead. HA accepts a number of ~56px rows.
    return Math.max(1, Math.ceil(this._estimate.rows));
  }

  /**
   * Grid sizing for the section layout. The child isn't mounted yet when
   * HA asks, so we can't delegate to its getGridOptions() — without an
   * answer HA falls back to full-width/auto and every lazy-wrapped tile
   * loses its half-section width. The wrapped config's own `grid_options`
   * are authoritative (already merged into the estimate); rows stay
   * 'auto' unless explicitly numeric so the mounted child keeps its
   * natural height (a wrong numeric row count would clip it).
   */
  public getGridOptions(): { columns: number | 'full'; rows: number | 'auto' } {
    const explicitRows = (
      this._config?.card?.grid_options as { rows?: number | 'auto' } | undefined
    )?.rows;
    return {
      columns: this._estimate.columns,
      rows: typeof explicitRows === 'number' ? explicitRows : 'auto',
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // The placeholder doesn't read hass at all — skip the render churn
    // from HA's per-state-change hass assignments until the child mounts.
    // (The very first update must run so firstUpdated can attach the
    // IntersectionObserver.)
    if (this.hasUpdated && !this._mounted && changedProps.size === 1 && changedProps.has('hass')) {
      return false;
    }
    return true;
  }

  protected firstUpdated(): void {
    const rootMargin = this._config.root_margin ?? '200px';
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this._mounted) {
            this._mounted = true;
            this._observer?.disconnect();
            this._observer = undefined;
            break;
          }
        }
      },
      { rootMargin },
    );
    this._observer.observe(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = undefined;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._mounted) {
      // Reserve roughly the child's eventual height (row units minus the
      // trailing gap) so mounting doesn't shift the layout. Explicit
      // config wins.
      const estimatedPx = Math.max(40, Math.round(this._estimate.rows * SECTION_ROW_UNIT_PX - 8));
      const minHeight = this._config?.placeholder_height ?? `${estimatedPx}px`;
      return html`<div
        class="placeholder"
        style=${`--oriel-lazy-min-height: ${minHeight}`}
      ></div>`;
    }
    // HA exposes <hui-card> as a public custom element for embedding
    // arbitrary card configs. The element handles type-resolution,
    // hass propagation, and grid-options forwarding.
    return html`<hui-card .config=${this._config.card} .hass=${this.hass}></hui-card>`;
  }
}

customElements.define('oriel-lazy-card', OrielLazyCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-lazy-card')) {
  window.customCards.push({
    type: 'oriel-lazy-card',
    name: 'Oriel Lazy Card',
    description:
      'IntersectionObserver wrapper that defers child card mounting until the viewport reaches it. Used internally by the strategy to lazy-mount sections beyond the initial viewport.',
  });
}
