// ====================================================================
// LIGHTS GROUP CARD — Reactive card for on/off light groups
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { Registry } from '../Registry';
import { trackHassUpdate } from '../utils/debug';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
    cardTools?: unknown;
  }
}

interface LightsGroupConfig {
  config?: any;
  group_type: 'on' | 'off';
}

class Simon42LightsGroupCard extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config!: LightsGroupConfig;
  private _cachedFilteredIds: Set<string> | null = null;
  private _lastLightsList = '';

  // Stable DOM references (created once)
  private _initialized = false;
  private _headingCard: any = null;
  private _gridEl: HTMLElement | null = null;

  // Reusable tile card pool (keyed by entity_id)
  private _tileCards: Map<string, any> = new Map();

  setConfig(config: LightsGroupConfig): void {
    if (!config.group_type) throw new Error('You need to define group_type (on/off)');
    this._config = config;
  }

  set hass(hass: HomeAssistant) {
    trackHassUpdate('lights-group');
    const oldHass = this._hass;
    this._hass = hass;

    if (!oldHass || oldHass.entities !== hass.entities) {
      this._cachedFilteredIds = null;
    }

    // Skip if states unchanged — BUT only if we've successfully loaded once.
    // If _cachedFilteredIds is null, we still need to retry (Registry may now be ready).
    if (oldHass && oldHass.states === hass.states && this._cachedFilteredIds) return;

    // Fast path: only check light entities for changes
    if (oldHass && this._cachedFilteredIds) {
      let hasChange = false;
      for (const id of this._cachedFilteredIds) {
        if (oldHass.states[id] !== hass.states[id]) { hasChange = true; break; }
      }
      if (!hasChange) return;
    }

    if (!this._cachedFilteredIds) {
      // Don't cache if Registry isn't initialized yet — retry on next hass update
      if (!Registry.initialized) return;
      this._cachedFilteredIds = new Set(this._getFilteredLightEntities());
    }

    // Propagate hass to all existing cards (cheap — Lit handles diffing internally)
    if (this._headingCard) this._headingCard.hass = hass;
    for (const card of this._tileCards.values()) {
      card.hass = hass;
    }

    const currentLights = this._getRelevantLights();
    const lightsKey = currentLights.join(',');

    if (!oldHass || this._lastLightsList !== lightsKey) {
      this._lastLightsList = lightsKey;
      this._render(currentLights);
    }
  }

  get hass(): HomeAssistant | null { return this._hass; }

  private _getFilteredLightEntities(): string[] {
    if (!this._hass) return [];
    // Use pre-filtered Registry data: already excludes hidden/disabled/labeled entities
    return Registry.getVisibleEntityIdsForDomain('light')
      .filter(id => this._hass!.states[id] !== undefined);
  }

  private _getRelevantLights(): string[] {
    // Use cached set if available, otherwise build it
    if (!this._cachedFilteredIds) {
      this._cachedFilteredIds = new Set(this._getFilteredLightEntities());
    }
    const targetState = this._config.group_type === 'on' ? 'on' : 'off';

    const relevant: string[] = [];
    for (const id of this._cachedFilteredIds) {
      const state = this._hass!.states[id];
      if (state && state.state === targetState) relevant.push(id);
    }

    relevant.sort((a, b) => {
      const stateA = this._hass!.states[a];
      const stateB = this._hass!.states[b];
      if (!stateA || !stateB) return 0;
      return new Date(stateB.last_changed).getTime() - new Date(stateA.last_changed).getTime();
    });

    return relevant;
  }

  /** Create the stable DOM shell once. Called on first render. */
  private _initDom(): void {
    if (this._initialized) return;
    this._initialized = true;

    const style = document.createElement('style');
    style.textContent = `
      .lights-section { display: flex; flex-direction: column; gap: 8px; width: 100%; }
      .light-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 8px; }
    `;
    this.appendChild(style);

    const section = document.createElement('div');
    section.className = 'lights-section';

    // HA-native heading card with button badge for batch action
    this._headingCard = document.createElement('hui-heading-card');
    section.appendChild(this._headingCard);

    this._gridEl = document.createElement('div');
    this._gridEl.className = 'light-grid';
    section.appendChild(this._gridEl);

    this.appendChild(section);
  }

  /** Build heading card config with batch action badge targeting explicit entity IDs. */
  private _buildHeadingConfig(lights: string[]): any {
    const isOn = this._config.group_type === 'on';
    const icon = isOn ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-off';
    const title = isOn ? 'Eingeschaltete Lichter' : 'Ausgeschaltete Lichter';

    return {
      type: 'heading',
      heading: `${title} (${lights.length})`,
      icon: icon,
      badges: [
        {
          type: 'button',
          icon: isOn ? 'mdi:lightbulb-off' : 'mdi:lightbulb-on',
          text: isOn ? 'Alle aus' : 'Alle ein',
          tap_action: {
            action: 'perform-action',
            perform_action: isOn ? 'light.turn_off' : 'light.turn_on',
            target: {
              entity_id: lights,
            },
          },
        },
      ],
    };
  }

  /** Get or create a tile card for an entity. Cards are pooled and reused. */
  private _getOrCreateTileCard(entityId: string): any {
    let card = this._tileCards.get(entityId);
    if (card) return card;

    const isOn = this._config.group_type === 'on';
    card = document.createElement('hui-tile-card');
    card.hass = this._hass;
    const cardConfig: any = { type: 'tile', entity: entityId, vertical: false, state_content: 'last_changed' };
    if (isOn) {
      cardConfig.features = [{ type: 'light-brightness' }];
      cardConfig.features_position = 'inline';
    }
    card.setConfig(cardConfig);
    this._tileCards.set(entityId, card);
    return card;
  }

  private _render(lights: string[]): void {
    if (!this._hass) return;
    const isOn = this._config.group_type === 'on';

    if (lights.length === 0) {
      this.style.display = 'none';
      return;
    }
    this.style.display = 'block';

    // Create stable DOM shell on first render
    this._initDom();

    // Update heading card with current entity list (for batch action target)
    if (this._headingCard) {
      this._headingCard.hass = this._hass;
      this._headingCard.setConfig(this._buildHeadingConfig(lights));
    }

    // Reconcile tile cards in grid: reuse existing, add new, remove stale
    const grid = this._gridEl!;
    const activeIds = new Set(lights);

    // Remove cards for entities no longer in the list
    for (const [id, card] of this._tileCards) {
      if (!activeIds.has(id)) {
        if (card.parentNode === grid) grid.removeChild(card);
        this._tileCards.delete(id);
      }
    }

    // Add/reorder cards to match the desired order
    let prevNode: Node | null = null;
    for (const entityId of lights) {
      const card = this._getOrCreateTileCard(entityId);
      const nextSibling = prevNode ? prevNode.nextSibling : grid.firstChild;

      // Only move if not already in the right position
      if (card !== nextSibling) {
        grid.insertBefore(card, nextSibling);
      }
      prevNode = card;
    }

    // Remove any trailing DOM nodes that shouldn't be there
    while (prevNode && prevNode.nextSibling) {
      grid.removeChild(prevNode.nextSibling);
    }
  }

  getCardSize(): number {
    const lights = this._getRelevantLights();
    return Math.ceil(lights.length / 3) + 1;
  }
}

customElements.define('simon42-lights-group-card', Simon42LightsGroupCard);
