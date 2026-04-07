// ====================================================================
// SUMMARY CARD — Reactive summary tile for lights/covers/security/batteries
// ====================================================================

import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { Registry } from '../Registry';
import { trackHassUpdate, debugLog, timeStart, timeEnd } from '../utils/debug';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

type SummaryType = 'lights' | 'covers' | 'security' | 'batteries';

interface SummaryCardConfig {
  summary_type: SummaryType;
  hide_mobile_app_batteries?: boolean;
}

interface DisplayConfig {
  icon: string;
  name: string;
  color: string;
  path: string;
}

const COVER_DEVICE_CLASSES = new Set(['awning', 'blind', 'curtain', 'shade', 'shutter', 'window']);

const SECURITY_COVER_CLASSES = new Set(['door', 'garage', 'gate']);
const SECURITY_BINARY_SENSOR_CLASSES = new Set(['door', 'window', 'garage_door', 'opening']);

class Simon42SummaryCard extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config!: SummaryCardConfig;
  private _count = 0;
  private _relevantEntityIds: Set<string> | null = null;

  // Stable DOM references
  private _initialized = false;
  private _cardEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _nameEl: HTMLElement | null = null;

  setConfig(config: SummaryCardConfig): void {
    if (!config.summary_type) {
      throw new Error('You need to define a summary_type');
    }
    this._config = config;
    this._relevantEntityIds = null;
  }

  set hass(hass: HomeAssistant) {
    trackHassUpdate(`summary-${this._config?.summary_type || 'unknown'}`);
    const oldHass = this._hass;
    this._hass = hass;

    // Invalidate entity set cache only when registry changes (entities added/removed).
    // State changes don't affect WHICH entities are relevant — only the count changes.
    if (!oldHass || oldHass.entities !== hass.entities) {
      this._relevantEntityIds = null;
      debugLog(`summary-${this._config?.summary_type}: cache invalidated (registry changed)`);
    }

    // Recalculate count (uses cached entity set, just recounts based on current states)
    const newCount = this._calculateCount();

    // Only render when count changed or first render
    if (oldHass === null || this._count !== newCount) {
      this._count = newCount;
      this._render();
    }
  }

  get hass(): HomeAssistant | null {
    return this._hass;
  }

  private _isEntityRelevant(id: string, _state: HassEntity): boolean {
    // Single Registry call: no_dboard label + config hidden + hidden +
    // entity_category (registry + state attribute fallback)
    return !Registry.isEntityExcludedWithStateCategory(id);
  }

  private _getRelevantEntities(): void {
    if (!this._hass || this._relevantEntityIds) return;
    // Don't cache if Registry isn't initialized yet — retry on next hass update
    if (!Registry.initialized) return;

    const type = this._config.summary_type;
    timeStart(`summary-getRelevant-${type}`);
    const hass = this._hass;
    let result: string[];

    switch (this._config.summary_type) {
      case 'lights':
        // Use pre-filtered Registry instead of iterating all ~4270 states
        result = Registry.getVisibleEntityIdsForDomain('light')
          .filter(id => hass.states[id] && this._isEntityRelevant(id, hass.states[id]));
        break;

      case 'covers':
        result = Registry.getVisibleEntityIdsForDomain('cover')
          .filter(id => {
            const state = hass.states[id];
            if (!state) return false;
            if (!this._isEntityRelevant(id, state)) return false;
            const coverDeviceClass = state.attributes?.device_class;
            if (coverDeviceClass && !COVER_DEVICE_CLASSES.has(coverDeviceClass)) return false;
            return true;
          });
        break;

      case 'security': {
        // Combine lock + cover + binary_sensor domains from Registry
        const lockIds = Registry.getVisibleEntityIdsForDomain('lock');
        const coverIds = Registry.getVisibleEntityIdsForDomain('cover');
        const binarySensorIds = Registry.getVisibleEntityIdsForDomain('binary_sensor');

        result = [];
        for (const id of lockIds) {
          if (hass.states[id] && this._isEntityRelevant(id, hass.states[id])) {
            result.push(id);
          }
        }
        for (const id of coverIds) {
          const state = hass.states[id];
          if (!state || !this._isEntityRelevant(id, state)) continue;
          const deviceClass = state.attributes?.device_class;
          if (deviceClass !== undefined && SECURITY_COVER_CLASSES.has(deviceClass)) {
            result.push(id);
          }
        }
        for (const id of binarySensorIds) {
          const state = hass.states[id];
          if (!state || !this._isEntityRelevant(id, state)) continue;
          const deviceClass = state.attributes?.device_class;
          if (deviceClass !== undefined && SECURITY_BINARY_SENSOR_CLASSES.has(deviceClass)) {
            result.push(id);
          }
        }
        break;
      }

      case 'batteries': {
        // Use raw domain maps — battery sensors are often entity_category "diagnostic"
        // which getVisibleEntityIdsForDomain() would exclude
        const sensorIds = Registry.getEntityIdsForDomain('sensor');
        const bsIds = Registry.getEntityIdsForDomain('binary_sensor');
        const allDomainIds = [...sensorIds, ...bsIds];

        const batteryEntities = allDomainIds.filter(id => {
          const state = hass.states[id];
          if (!state) return false;
          const isBatterySensor =
            (id.includes('battery') || state.attributes?.device_class === 'battery');
          if (!isBatterySensor) return false;
          // Exclude hidden/no_dboard but keep diagnostic (batteries are often diagnostic)
          if (Registry.isExcludedByLabel(id)) return false;
          if (Registry.isHiddenByConfig(id)) return false;
          const entry = Registry.getEntity(id);
          if (entry?.hidden) return false;
          if (this._config.hide_mobile_app_batteries && entry?.platform === 'mobile_app') return false;
          return true;
        });

        // Deduplication: remove binary_sensor if a %-sensor from the same device exists
        const sensorDeviceIds = new Set<string>();
        for (const id of batteryEntities) {
          if (id.startsWith('sensor.')) {
            const deviceId = hass.entities?.[id]?.device_id;
            if (deviceId) sensorDeviceIds.add(deviceId);
          }
        }

        result = batteryEntities.filter(id => {
          if (!id.startsWith('binary_sensor.')) return true;
          const deviceId = hass.entities?.[id]?.device_id;
          return !deviceId || !sensorDeviceIds.has(deviceId);
        });
        break;
      }

      default:
        result = [];
    }

    this._relevantEntityIds = new Set(result);
    debugLog(`summary-${type}: ${result.length} relevant entities`);
    timeEnd(`summary-getRelevant-${type}`);
  }

  private _calculateCount(): number {
    if (!this._hass) return 0;

    // Ensure cached entity set exists
    this._getRelevantEntities();
    if (!this._relevantEntityIds || this._relevantEntityIds.size === 0) return 0;

    const hass = this._hass;
    let count = 0;

    switch (this._config.summary_type) {
      case 'lights':
        for (const id of this._relevantEntityIds) {
          if (hass.states[id]?.state === 'on') count++;
        }
        return count;

      case 'covers':
        for (const id of this._relevantEntityIds) {
          const s = hass.states[id]?.state;
          if (s === 'open' || s === 'opening') count++;
        }
        return count;

      case 'security':
        for (const id of this._relevantEntityIds) {
          const state = hass.states[id];
          if (!state) continue;
          if (id.startsWith('lock.') && state.state === 'unlocked') count++;
          else if (id.startsWith('cover.') && state.state === 'open') count++;
          else if (id.startsWith('binary_sensor.') && state.state === 'on') count++;
        }
        return count;

      case 'batteries':
        for (const id of this._relevantEntityIds) {
          const state = hass.states[id];
          if (!state) continue;
          if (id.startsWith('binary_sensor.')) {
            if (state.state === 'on') count++;
          } else {
            const value = parseFloat(state.state);
            if (!isNaN(value) && value < 20) count++;
          }
        }
        return count;

      default:
        return 0;
    }
  }

  private _getDisplayConfig(): DisplayConfig {
    const count = this._count;
    const hasItems = count > 0;

    const configs: Record<SummaryType, DisplayConfig> = {
      lights: {
        icon: 'mdi:lamps',
        name: hasItems ? `${count} ${count === 1 ? 'Licht an' : 'Lichter an'}` : 'Alle Lichter aus',
        color: hasItems ? 'orange' : 'grey',
        path: 'lights',
      },
      covers: {
        icon: 'mdi:blinds-horizontal',
        name: hasItems ? `${count} ${count === 1 ? 'Rollo offen' : 'Rollos offen'}` : 'Alle Rollos geschlossen',
        color: hasItems ? 'purple' : 'grey',
        path: 'covers',
      },
      security: {
        icon: 'mdi:security',
        name: hasItems ? `${count} unsicher` : 'Alles gesichert',
        color: hasItems ? 'yellow' : 'grey',
        path: 'security',
      },
      batteries: {
        icon: hasItems ? 'mdi:battery-alert' : 'mdi:battery-charging',
        name: hasItems ? `${count} ${count === 1 ? 'Batterie' : 'Batterien'} kritisch` : 'Alle Batterien OK',
        color: hasItems ? 'red' : 'grey',
        path: 'batteries',
      },
    };

    return configs[this._config.summary_type];
  }

  /** Map color names to HA CSS custom properties */
  private _getColorCss(color: string): string {
    const colorMap: Record<string, string> = {
      orange: 'var(--orange-color, #ff9800)',
      purple: 'var(--purple-color, #9c27b0)',
      yellow: 'var(--yellow-color, #ffc107)',
      red: 'var(--red-color, #f44336)',
      grey: 'var(--disabled-color, #bdbdbd)',
    };
    return colorMap[color] || colorMap.grey;
  }

  /** Create the stable DOM shell once. */
  private _initDom(): void {
    if (this._initialized) return;
    this._initialized = true;

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        cursor: pointer;
      }
      ha-card {
        padding: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 8px;
        height: 100%;
        box-sizing: border-box;
        --ha-card-border-width: 0;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border-radius: var(--ha-card-border-radius, 12px);
      }
      ha-card:active {
        transform: scale(0.97);
        transition: transform 0.1s;
      }
      .icon {
        --mdc-icon-size: 28px;
        transition: color 0.3s;
      }
      .name {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--primary-text-color);
      }
    `;
    shadow.appendChild(style);

    this._cardEl = document.createElement('ha-card');

    this._iconEl = document.createElement('ha-icon') as HTMLElement;
    this._iconEl.className = 'icon';
    this._cardEl.appendChild(this._iconEl);

    this._nameEl = document.createElement('div');
    this._nameEl.className = 'name';
    this._cardEl.appendChild(this._nameEl);

    this._cardEl.addEventListener('click', () => {
      if (!this._hass || !this._config) return;
      const displayConfig = this._getDisplayConfig();
      const event = new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: {
          config: {
            tap_action: {
              action: 'navigate',
              navigation_path: displayConfig.path,
            },
          },
          action: 'tap',
        },
      });
      this.dispatchEvent(event);
    });

    shadow.appendChild(this._cardEl);
  }

  private _render(): void {
    if (!this._hass || !this._config) return;
    timeStart(`summary-render-${this._config.summary_type}`);

    this._initDom();

    const displayConfig = this._getDisplayConfig();
    const colorCss = this._getColorCss(displayConfig.color);

    if (this._iconEl) {
      (this._iconEl as any).icon = displayConfig.icon;
      this._iconEl.style.color = colorCss;
    }

    if (this._nameEl) {
      this._nameEl.textContent = displayConfig.name;
    }

    timeEnd(`summary-render-${this._config.summary_type}`);
  }

  getCardSize(): number {
    return 1;
  }
}

customElements.define('simon42-summary-card', Simon42SummaryCard);

// Register for card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'simon42-summary-card',
  name: 'Simon42 Summary Card',
  description: 'Reactive summary card that counts entities dynamically',
});
