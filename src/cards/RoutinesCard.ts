// ====================================================================
// ROUTINES CARD — usage-ranked scenes & scripts
// ====================================================================
// Auto-discovers `scene.*` and `script.*` entities and renders them
// as a single sortable list. Click invokes the scene/script. Sorts
// by last_changed (most-recently-used first) so frequently-run
// routines bubble to the top organically — no usage-tracking
// infrastructure needed, HA already records `last_changed`.
//
// Configurable: max items, filter by label, sort mode.
// ====================================================================

import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';

interface RoutinesCardConfig {
  type: string;
  /** Card title. Default 'Routines'. */
  name?: string;
  /** Max routines to show. Default 8. */
  max?: number;
  /** Sort order. Default 'last_used'. */
  sort?: 'last_used' | 'name';
  /** Domains to include. Default ['scene', 'script']. */
  domains?: string[];
  /** Only include entities with one of these labels. Empty = all. */
  include_labels?: string[];
  /** Exclude entities with one of these labels. Default ['no_dboard']. */
  exclude_labels?: string[];
}

/**
 * Throttle for the full hass.states rescan. State-only scenes/scripts
 * (e.g. YAML scenes without unique_id) never appear in hass.entities,
 * so a registry-identity check alone can't detect them appearing —
 * a bounded periodic rescan covers that gap without paying the
 * O(all states) scan on every hass push.
 */
const RESCAN_INTERVAL_MS = 30_000;

interface Routine {
  entity_id: string;
  name: string;
  icon: string;
  lastUsedMs: number;
}

class OrielRoutinesCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  private _config!: RoutinesCardConfig;
  /** Displayed routines (sorted + sliced), recomputed only in shouldUpdate. */
  private _routines: Routine[] = [];
  /** ALL matched scene/script ids (pre-slice) — the change-watch set.
   *  Must include non-displayed matches too: any of their state changes
   *  can re-rank an entity into the visible top-N. */
  private _watchedIds: string[] = [];
  private _lastScanMs = 0;

  static styles = css`
    :host { display: block; }
    ha-card {
      padding: var(--ha-space-3, 12px);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2, 8px);
    }
    .title {
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--primary-text-color);
      margin: 0 0 var(--ha-space-1, 4px);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: var(--ha-space-2, 8px);
    }
    .item {
      all: unset;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-1, 4px);
      padding: var(--ha-space-2, 10px);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--secondary-background-color);
      cursor: pointer;
      transition: transform 120ms ease, background-color 120ms ease;
      text-align: center;
    }
    .item:hover {
      background: color-mix(in srgb, var(--primary-color) 15%, var(--secondary-background-color));
    }
    .item:active {
      transform: scale(0.97);
    }
    .item:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    ha-icon {
      --mdc-icon-size: 28px;
      color: var(--state-active-color, var(--primary-color));
    }
    .name {
      font-size: var(--ha-font-size-s, 13px);
      color: var(--primary-text-color);
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .empty {
      color: var(--secondary-text-color);
      text-align: center;
      padding: var(--ha-space-3, 12px);
      font-size: var(--ha-font-size-s, 13px);
    }
  `;

  public setConfig(config: RoutinesCardConfig): void {
    this._config = config ?? { type: 'custom:oriel-routines-card' };
    // _config isn't reactive — force an update cycle so shouldUpdate's
    // non-hass branch recollects with the new config (editor/preview
    // re-calls setConfig on the same element).
    this._lastScanMs = 0;
    this.requestUpdate();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): {
    columns: number | 'full';
    rows: number | 'auto';
    min_columns?: number;
    min_rows?: number;
  } {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  // Render gating — HA re-sets `hass` on EVERY state change system-wide,
  // and the full states scan is O(all entities). Steady-state cost per
  // push is O(watched scene/script ids). A full rescan only runs when:
  //   - first hass arrives, or config changed (setConfig → requestUpdate),
  //   - the entity-registry reference changed (scene/script added/removed
  //     via UI — hass.entities is replaced on registry updates),
  //   - a watched entity's state object changed (covers re-ranking, rename,
  //     icon change, removal — all replace the state object),
  //   - at most once per RESCAN_INTERVAL_MS, to catch state-only entities
  //     that never touch hass.entities (see RESCAN_INTERVAL_MS docs).
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass')) {
      this._recollect();
      return true;
    }
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    if (!oldHass || !this.hass || oldHass.entities !== this.hass.entities) {
      this._recollect();
      return true;
    }
    for (const id of this._watchedIds) {
      if (oldHass.states[id] !== this.hass.states[id]) {
        this._recollect();
        return true;
      }
    }
    if (Date.now() - this._lastScanMs >= RESCAN_INTERVAL_MS) {
      const before = this._routines;
      this._recollect();
      return !this._sameRoutines(before, this._routines);
    }
    return false;
  }

  private _sameRoutines(a: Routine[], b: Routine[]): boolean {
    // Displayed ids in order are sufficient: name/icon changes replace
    // the state object of a watched id, which re-renders before ever
    // reaching the throttled-rescan path.
    return a.length === b.length && a.every((r, i) => r.entity_id === b[i]!.entity_id);
  }

  private _recollect(): void {
    this._lastScanMs = Date.now();
    if (!this.hass || !this._config) {
      this._routines = [];
      this._watchedIds = [];
      return;
    }
    const cfg = this._config;
    const domains = new Set(cfg.domains ?? ['scene', 'script']);
    const include = cfg.include_labels && cfg.include_labels.length > 0
      ? new Set(cfg.include_labels.map((l) => l.toLowerCase()))
      : null;
    const exclude = new Set((cfg.exclude_labels ?? ['no_dboard']).map((l) => l.toLowerCase()));

    const out: Routine[] = [];
    const watched: string[] = [];
    for (const [eid, state] of Object.entries(this.hass.states)) {
      const dot = eid.indexOf('.');
      if (dot < 0) continue;
      const domain = eid.substring(0, dot);
      if (!domains.has(domain)) continue;

      // Labels live ONLY in the entity registry (hass.entities), never in
      // state attributes. State-only entities (no registry entry) have no
      // labels: they pass the exclude filter but fail a non-empty include.
      const registryEntry = this.hass.entities?.[eid] as
        | { labels?: string[]; hidden?: boolean }
        | undefined;
      // Same visibility pipeline as every other Oriel surface: entities
      // hidden in the registry stay hidden here too.
      if (registryEntry?.hidden) continue;
      const labels = registryEntry?.labels ?? [];
      if (labels.some((l) => exclude.has(l.toLowerCase()))) continue;
      if (include && !labels.some((l) => include.has(l.toLowerCase()))) continue;

      watched.push(eid);
      const attrs = state.attributes ?? {};
      const friendly = (attrs.friendly_name as string | undefined) ?? eid.substring(dot + 1).replace(/_/g, ' ');
      const icon =
        (attrs.icon as string | undefined) ??
        (domain === 'scene' ? 'mdi:palette' : 'mdi:script-text-play');
      const lastUsedMs = state.last_changed ? new Date(state.last_changed).getTime() : 0;
      out.push({ entity_id: eid, name: friendly, icon, lastUsedMs });
    }

    const sort = cfg.sort ?? 'last_used';
    if (sort === 'name') {
      out.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      out.sort((a, b) => b.lastUsedMs - a.lastUsedMs);
    }

    const max = cfg.max ?? 8;
    this._watchedIds = watched;
    this._routines = out.slice(0, max);
  }

  private _trigger = (entityId: string): void => {
    if (!this.hass) return;
    const [domain] = entityId.split('.');
    // scene.turn_on / script.turn_on both fire the corresponding routine.
    this.hass.callService(domain as string, 'turn_on', { entity_id: entityId });
  };

  protected render(): TemplateResult {
    const routines = this._routines;
    const title = this._config.name ?? 'Routines';

    if (routines.length === 0) {
      return html`
        <ha-card>
          <h3 class="title">${title}</h3>
          <div class="empty">No scenes or scripts configured.</div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        <h3 class="title">${title}</h3>
        <div class="grid">
          ${routines.map(
            (r) => html`
              <button
                class="item"
                aria-label=${r.name}
                tabindex="0"
                @click=${() => this._trigger(r.entity_id)}
                @keydown=${(ev: KeyboardEvent) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    this._trigger(r.entity_id);
                  }
                }}
              >
                <ha-icon icon=${r.icon}></ha-icon>
                <span class="name">${r.name}</span>
              </button>
            `,
          )}
        </div>
      </ha-card>
    `;
  }

  public static getStubConfig(): RoutinesCardConfig {
    return { type: 'custom:oriel-routines-card' };
  }
}

customElements.define('oriel-routines-card', OrielRoutinesCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-routines-card')) {
  window.customCards.push({
    type: 'oriel-routines-card',
    name: 'Oriel Routines',
    description: 'Auto-collected scenes & scripts, ranked by last-used. One-tap trigger.',
    preview: true,
  } as { type: string; name: string; description: string });
}
