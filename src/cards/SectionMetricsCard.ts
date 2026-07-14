// ====================================================================
// SECTION METRICS CARD — invisible section-height recorder (#182)
// ====================================================================
// Planted by the strategy (utils/section-packing) into views that use
// dense_section_placement. Renders nothing and occupies a 0-height
// grid slot; its only job is to measure the real rendered height of
// every section in the ancestor hui-sections-view and persist them to
// localStorage. The next strategy run turns those pixels into exact
// per-section `row_span` values, replacing the config-side estimates
// that first-paint packing runs on.
//
// Section heights don't depend on the sections' own row_span (the view
// grid top-aligns items), so measuring and re-spanning never
// oscillates. Storage is per device — correct, since heights are
// viewport-dependent.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { writeMeasuredHeights } from '../utils/section-packing';

interface SectionMetricsConfig {
  type: string;
  /** Storage namespace — identifies the view these sections belong to. */
  view_key: string;
}

/** How long to keep polling for the ancestor sections view before
 *  giving up (covers slow chunk loads and editor previews where the
 *  ancestor never appears). */
const ATTACH_RETRY_MS = 500;
const ATTACH_RETRY_LIMIT = 20;

/** Ignore sub-pixel and scrollbar jitter. */
const MIN_DELTA_PX = 8;

class OrielSectionMetricsCard extends HTMLElement {
  private _config?: SectionMetricsConfig;
  private _resizeObserver?: ResizeObserver;
  private _mutationObserver?: MutationObserver;
  private _viewRoot?: ShadowRoot;
  private _attachTimer?: ReturnType<typeof setTimeout>;
  private _writeTimer?: ReturnType<typeof setTimeout>;
  private _attachAttempts = 0;
  private _lastWritten = new Map<string, number>();

  public setConfig(config: SectionMetricsConfig): void {
    if (!config?.view_key || typeof config.view_key !== 'string') {
      throw new Error('oriel-section-metrics: `view_key` config required');
    }
    this._config = config;
  }

  // hass updates are irrelevant — sizes are observed, not derived.
  public set hass(_hass: HomeAssistant | undefined) {
    /* intentionally empty */
  }

  public getCardSize(): number {
    return 0;
  }

  public getGridOptions(): { columns: number | 'full'; rows: number } {
    return { columns: 'full', rows: 0 };
  }

  public connectedCallback(): void {
    this.style.display = 'none';
    this._attachAttempts = 0;
    this._tryAttach();
  }

  public disconnectedCallback(): void {
    if (this._attachTimer) clearTimeout(this._attachTimer);
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    this._resizeObserver = undefined;
    this._mutationObserver = undefined;
    this._viewRoot = undefined;
  }

  /** Walks the composed tree upward to the ancestor hui-sections-view;
   *  retries while HA is still mounting the view around us. */
  private _tryAttach(): void {
    let node: Node | null = this.parentNode;
    while (node) {
      if (node instanceof Element && node.tagName === 'HUI-SECTIONS-VIEW') break;
      node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
    }
    const root = node instanceof Element ? node.shadowRoot : null;
    if (!root) {
      if (this._attachAttempts++ < ATTACH_RETRY_LIMIT && this.isConnected) {
        this._attachTimer = setTimeout(() => this._tryAttach(), ATTACH_RETRY_MS);
      }
      return;
    }
    this._viewRoot = root;

    this._resizeObserver = new ResizeObserver(() => this._scheduleWrite());
    this._mutationObserver = new MutationObserver(() => {
      this._observeSections();
      this._scheduleWrite();
    });
    this._mutationObserver.observe(root, { childList: true, subtree: true });
    this._observeSections();
    this._scheduleWrite();
  }

  private _sectionWrappers(): Element[] {
    return this._viewRoot ? [...this._viewRoot.querySelectorAll('.section')] : [];
  }

  private _observeSections(): void {
    if (!this._resizeObserver) return;
    this._resizeObserver.disconnect();
    for (const wrapper of this._sectionWrappers()) {
      this._resizeObserver.observe(wrapper);
    }
  }

  private _scheduleWrite(): void {
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => this._measureAndStore(), 300);
  }

  private _measureAndStore(): void {
    const viewKey = this._config?.view_key;
    if (!viewKey || !this._viewRoot) return;

    const heights: Record<string, number> = {};
    for (const wrapper of this._sectionWrappers()) {
      const section = wrapper.querySelector('hui-section') as
        | (Element & { config?: { oriel_section_key?: string } })
        | null;
      const key = section?.config?.oriel_section_key;
      if (!key) continue;
      const px = wrapper.getBoundingClientRect().height;
      if (px > 0) heights[key] = Math.round(px);
    }
    if (Object.keys(heights).length === 0) return;

    let changed = this._lastWritten.size !== Object.keys(heights).length;
    if (!changed) {
      for (const [key, px] of Object.entries(heights)) {
        const prev = this._lastWritten.get(key);
        if (prev === undefined || Math.abs(prev - px) > MIN_DELTA_PX) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    this._lastWritten = new Map(Object.entries(heights));
    writeMeasuredHeights(viewKey, heights);
  }
}

customElements.define('oriel-section-metrics', OrielSectionMetricsCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-section-metrics')) {
  window.customCards.push({
    type: 'oriel-section-metrics',
    name: 'Oriel Section Metrics',
    description:
      'Invisible helper used by the strategy with dense_section_placement: records real section heights so row spans become exact on the next dashboard load.',
  });
}
