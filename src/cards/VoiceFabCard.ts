// ====================================================================
// oriel-voice-fab — floating voice-command button (v3.2.4)
// ====================================================================
// Anchors a voice-assist trigger to the viewport's bottom-right corner
// so it's reachable on every emitted view.
//
// Primary path: HA's real `<ha-voice-command-button>` is laid
// transparently over our FAB visual with `.hass` bound. Its click
// handler lives on a button inside ITS shadow root, so a programmatic
// host `.click()` can never reach it — but genuine pointer/keyboard
// events on the overlay do, and the element then drives the whole
// Assist pipeline (dialog chunk import, pipeline selection, WS
// handshake) with HA's own code. We can't do that ourselves from a
// custom card: HA opens the dialog via
//   fireEvent('show-dialog', { dialogTag: 'ha-voice-command-dialog',
//     dialogImport, dialogParams: { pipeline_id: 'last_used' } })
// where dialogImport is a dynamic import INSIDE the HA bundle that a
// custom card cannot replicate. Riding the real button is therefore
// the only fully-robust trigger.
//
// Fallback (button element not registered): dispatch the same
// bubbling composed `show-dialog` event with a dialogImport that
// resolves via customElements.whenDefined — best-effort, works when
// something else in the session has loaded the dialog chunk.
// ====================================================================

import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

import type { HomeAssistant } from '../types/homeassistant';

interface VoiceFabConfig {
  type: string;
  /** Override the default mic icon. */
  icon?: string;
  /** Position offset from viewport edges (CSS length). Default 16px. */
  offset?: string;
}

class OrielVoiceFab extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _config: VoiceFabConfig | undefined;

  static styles = css`
    :host {
      display: block;
    }
    .fab {
      position: fixed;
      bottom: var(--oriel-voice-fab-offset, 16px);
      right: var(--oriel-voice-fab-offset, 16px);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999;
      transition: transform 0.15s ease, box-shadow 0.2s ease;
      border: none;
      padding: 0;
    }
    .fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    .fab:active {
      transform: scale(0.95);
    }
    .fab ha-icon {
      --mdc-icon-size: 26px;
    }
    /* The real ha-voice-command-button rides invisibly on top of the FAB
       visual: full-size + transparent, so real pointer events land on the
       button inside ITS shadow root while our icon/config styling stays
       authoritative. --mdc-icon-button-size makes its internal button
       fill the whole 56px hit area. */
    .overlay {
      position: absolute;
      inset: 0;
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      --mdc-icon-button-size: 56px;
      --mdc-icon-size: 26px;
    }
    .fab:focus-within {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `;

  public setConfig(config: VoiceFabConfig): void {
    this._config = config;
    if (config.offset) {
      this.style.setProperty('--oriel-voice-fab-offset', config.offset);
    }
  }

  public getCardSize(): number {
    return 0; // FAB doesn't occupy layout space
  }

  public getGridOptions(): { columns: number | 'full'; rows: number | 'auto' } {
    return { columns: 'full', rows: 0 };
  }

  private _onClick(): void {
    if (!this.hass) return;
    // Fallback path only (real button not registered): fire HA's actual
    // dialog event — the dialog-manager mixin on the home-assistant root
    // listens for the bubbling composed `show-dialog` name (there is no
    // 'hass-show-dialog' listener in HA). dialogImport must resolve
    // before the manager creates the element; from outside the HA bundle
    // the closest we can get is customElements.whenDefined, which
    // resolves as soon as any other code path loads the dialog chunk.
    this.dispatchEvent(
      new CustomEvent('show-dialog', {
        bubbles: true,
        composed: true,
        detail: {
          dialogTag: 'ha-voice-command-dialog',
          dialogImport: () => customElements.whenDefined('ha-voice-command-dialog'),
          dialogParams: { pipeline_id: 'last_used' },
        },
      }),
    );
  }

  protected render(): TemplateResult {
    if (!this.hass) return html``;
    const icon = this._config?.icon ?? 'mdi:microphone';
    // Primary path: overlay the REAL ha-voice-command-button (with .hass —
    // without it the element can't reach the Assist pipeline at all) on
    // top of our styled FAB. See header comment for why we don't
    // synthesize the click ourselves.
    if (customElements.get('ha-voice-command-button')) {
      return html`
        <div class="fab">
          <ha-icon icon=${icon}></ha-icon>
          <ha-voice-command-button
            class="overlay"
            .hass=${this.hass}
            aria-label="Voice assistant"
          ></ha-voice-command-button>
        </div>
      `;
    }
    return html`
      <button class="fab" @click=${this._onClick} aria-label="Voice assistant">
        <ha-icon icon=${icon}></ha-icon>
      </button>
    `;
  }

  public static getStubConfig(): VoiceFabConfig {
    return { type: 'custom:oriel-voice-fab' };
  }
}

customElements.define('oriel-voice-fab', OrielVoiceFab);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-voice-fab')) {
  window.customCards.push({
    type: 'oriel-voice-fab',
    name: 'Oriel Voice FAB',
    description: 'Floating voice-command button that calls HA Assist on tap.',
  });
}
