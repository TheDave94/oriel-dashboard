// ====================================================================
// oriel-area-card — thin wrapper around HA's native `area` card that
// adds a long-press → scene menu (#150). HA's area card has no
// hold_action, so we own the gesture: the native card renders inside
// (created via loadCardHelpers, so all its pre-filtered controls /
// sensors / alerts keep working), and a hold anywhere on the card
// opens a small scene overlay. Tap / controls / navigation pass
// straight through to the inner card.
//
// PERFORMANCE-CRITICAL path (one per area). Follows the reactive
// willUpdate contract: hass is forwarded to the inner card only when
// it actually changes; the scene overlay re-renders only while open.
// ====================================================================

import { LitElement, html, css, type PropertyValues, type TemplateResult, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import { bindActionHandler, type ActionHandlerEvent } from '../utils/action-handler';

interface AreaCardWrapperConfig {
  type: string;
  area_card_config: Record<string, unknown>;
  scenes: string[];
  navigation_path?: string;
}

class OrielAreaCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _showScenes = false;
  private _config?: AreaCardWrapperConfig;
  private _inner?: HTMLElement & { hass?: HomeAssistant };
  private _bound = false;

  setConfig(config: AreaCardWrapperConfig): void {
    if (!config || !config.area_card_config) {
      throw new Error('oriel-area-card: area_card_config is required');
    }
    this._config = config;
    void this._ensureInner();
  }

  private async _ensureInner(): Promise<void> {
    if (!this._config) return;
    const helpers = await (
      window as unknown as { loadCardHelpers: () => Promise<{ createCardElement: (c: unknown) => HTMLElement }> }
    ).loadCardHelpers();
    const el = helpers.createCardElement(this._config.area_card_config) as HTMLElement & { hass?: HomeAssistant };
    if (this.hass) el.hass = this.hass;
    this._inner = el;
    this.requestUpdate();
  }

  protected willUpdate(changed: PropertyValues): void {
    // Forward hass to the inner native card only when it actually
    // changed — the inner card runs its own reactive diffing.
    if (changed.has('hass') && this._inner && this.hass) {
      this._inner.hass = this.hass;
    }
  }

  protected firstUpdated(): void {
    const target = this.renderRoot.querySelector('.wrap') as HTMLElement | null;
    if (target && !this._bound) {
      bindActionHandler(target, { hasHold: true });
      target.addEventListener('action', (ev: Event) => {
        const action = (ev as ActionHandlerEvent).detail?.action;
        if (action === 'hold') {
          // Only meaningful when the area actually has scenes.
          if (this._config && this._config.scenes.length > 0) this._showScenes = true;
        } else if (action === 'tap') {
          // The inner card's own tap is disabled (tap_action: none) so the
          // gesture reaches us; replicate its navigate-to-area behaviour.
          this._navigate();
        }
      });
      this._bound = true;
    }
  }

  private _navigate(): void {
    const path = this._config?.navigation_path;
    if (!path) return;
    // Resolve relative to the current dashboard (mirrors the area card's
    // own navigation_path semantics: <dashboard>/<area_id>).
    const dashboard = window.location.pathname.split('/').filter(Boolean)[0] ?? 'lovelace';
    window.history.pushState(null, '', `/${dashboard}/${path}`);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
  }

  private _activate(sceneId: string): void {
    this.hass?.callService('scene', 'turn_on', { entity_id: sceneId });
    this._showScenes = false;
  }

  private _sceneName(sceneId: string): string {
    return (this.hass?.states[sceneId]?.attributes?.friendly_name as string | undefined) || sceneId;
  }

  protected render(): TemplateResult {
    return html`
      <div class="wrap" tabindex="0">${this._inner ?? nothing}</div>
      ${this._showScenes ? this._renderSceneOverlay() : nothing}
    `;
  }

  private _renderSceneOverlay(): TemplateResult {
    const scenes = this._config?.scenes ?? [];
    return html`
      <button class="backdrop" aria-label="Close" @click=${() => { this._showScenes = false; }}></button>
      <div class="scene-menu" role="menu">
        ${scenes.map(
          (s) => html`
            <button class="scene-item" role="menuitem" @click=${() => this._activate(s)}>
              <ha-icon icon="mdi:palette"></ha-icon><span>${this._sceneName(s)}</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  getCardSize(): number {
    const inner = this._inner as (HTMLElement & { getCardSize?: () => number }) | undefined;
    return inner?.getCardSize?.() ?? 1;
  }

  static styles = css`
    :host { position: relative; display: block; }
    .wrap { display: block; }
    .backdrop { position: fixed; inset: 0; z-index: 5; border: none; background: none; padding: 0; cursor: default; }
    .scene-menu {
      position: absolute; z-index: 6; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: var(--card-background-color);
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(--ha-card-box-shadow, 0 2px 12px rgba(0, 0, 0, 0.3));
      padding: 8px; min-width: 160px; max-width: 90%;
      display: flex; flex-direction: column; gap: 4px;
    }
    .scene-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border: none; border-radius: 8px;
      background: none; color: var(--primary-text-color); cursor: pointer;
      font-size: var(--ha-font-size-m, 14px); text-align: left; width: 100%;
    }
    .scene-item:hover { background: var(--secondary-background-color, rgba(0, 0, 0, 0.06)); }
    .scene-item ha-icon { color: var(--state-icon-color, var(--primary-color)); }
  `;
}

customElements.define('oriel-area-card', OrielAreaCard);
