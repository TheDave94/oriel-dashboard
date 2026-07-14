// ====================================================================
// SECTION METRICS CARD — invisible section-height recorder (#182)
// ====================================================================
// Planted by the strategy (utils/section-packing) into views that use
// dense_section_placement. Renders nothing and hides its own grid
// slot; its only job is to record the real rendered height of every
// section in the ancestor hui-sections-view into localStorage (under
// the store key the strategy stamped into its config). The next
// strategy run turns those pixels into exact per-section `row_span`
// values, replacing the config-side estimates that first-paint packing
// runs on.
//
// Heights are observed on the .section-container divs (the block-level
// box wrapping each hui-section), NOT on the .section grid-item
// wrappers — a container's height is its content, independent of the
// section's own row_span, so measuring and re-spanning never
// oscillates regardless of how the view grid aligns its items. (Not on
// hui-section itself either: it renders inline, and ResizeObserver
// reports 0×0 for non-replaced inline boxes.)
//
// Perf posture (this codebase runs on wall tablets): sizes arrive
// push-based from a ResizeObserver — no polling, no layout reads in
// steady state. The MutationObserver that tracks section add/remove is
// childList-only on the sections container (NOT subtree), so per-card
// re-renders inside sections never wake it.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { writeMeasuredHeights } from '../utils/section-packing';

interface SectionMetricsConfig {
  type: string;
  /** Full localStorage key for this view's measurements (stamped by
   *  the strategy so both sides agree byte-for-byte). */
  store_key: string;
}

/** How long to keep polling for the ancestor sections view before
 *  giving up (covers slow chunk loads and editor previews where the
 *  ancestor never appears). */
const ATTACH_RETRY_MS = 500;
const ATTACH_RETRY_LIMIT = 20;

/** Quantize heights so sub-pixel/scrollbar jitter never causes writes. */
const QUANTIZE_PX = 8;

type SectionElement = Element & { config?: { oriel_section_key?: string } };

/** The measurement key of the hui-section inside a section container. */
function sectionKeyOfContainer(container: Element): string | undefined {
  const section = container.querySelector('hui-section') as SectionElement | null;
  return section?.config?.oriel_section_key;
}

class OrielSectionMetricsCard extends HTMLElement {
  private _config?: SectionMetricsConfig;
  private _resizeObserver?: ResizeObserver;
  private _mutationObserver?: MutationObserver;
  private _viewRoot?: ShadowRoot;
  private _attachTimer?: ReturnType<typeof setTimeout>;
  private _writeTimer?: ReturnType<typeof setTimeout>;
  private _attachAttempts = 0;
  private _heightByEl = new Map<Element, number>();
  private _lastWritten = '';

  public setConfig(config: SectionMetricsConfig): void {
    if (!config?.store_key || typeof config.store_key !== 'string') {
      throw new Error('oriel-section-metrics: `store_key` config required');
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
    // Hide the element AND flag it hidden so hui-card can collapse the
    // grid slot entirely (same mechanism conditional cards use) — no
    // ghost band in the host section.
    this.style.display = 'none';
    this.toggleAttribute('hidden', true);
    this.dispatchEvent(new Event('card-visibility-changed', { bubbles: true, composed: true }));
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
    this._heightByEl.clear();
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

    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const px = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        this._heightByEl.set(entry.target, px);
      }
      this._scheduleWrite();
    });

    // Sections are added/removed as direct children of the sections
    // container — childList-only (no subtree), so per-card re-renders
    // inside sections never wake this observer.
    this._mutationObserver = new MutationObserver(() => this._syncObserved());
    const container = root.querySelector('.content') ?? root.querySelector('.container') ?? root;
    this._mutationObserver.observe(container, { childList: true });
    this._syncObserved();
  }

  /** Observes newly-appeared sections, releases removed ones. */
  private _syncObserved(): void {
    if (!this._resizeObserver || !this._viewRoot) return;
    const current = new Set<Element>(this._viewRoot.querySelectorAll('.section-container'));
    for (const el of current) {
      if (!this._heightByEl.has(el)) {
        this._heightByEl.set(el, 0);
        this._resizeObserver.observe(el);
      }
    }
    for (const el of [...this._heightByEl.keys()]) {
      if (!current.has(el)) {
        this._resizeObserver.unobserve(el);
        this._heightByEl.delete(el);
      }
    }
  }

  private _scheduleWrite(): void {
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => this._store(), 300);
  }

  private _store(): void {
    const storeKey = this._config?.store_key;
    if (!storeKey) return;

    const heights: Record<string, number> = {};
    for (const [el, px] of this._heightByEl) {
      if (px <= 0 || !el.isConnected) continue;
      const key = sectionKeyOfContainer(el);
      if (!key) continue;
      heights[key] = Math.round(px / QUANTIZE_PX) * QUANTIZE_PX;
    }
    if (Object.keys(heights).length === 0) return;

    const serialized = JSON.stringify(heights);
    if (serialized === this._lastWritten) return;
    this._lastWritten = serialized;
    writeMeasuredHeights(storeKey, heights);
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
