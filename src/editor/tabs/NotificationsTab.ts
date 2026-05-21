// ====================================================================
// Editor tab — Notification triggers (v4.4.0)
// ====================================================================
// Structured editor for `notification_triggers` — previously YAML-only.
// Each row: entity picker + severity dropdown + title + optional
// active_state / icon. Backed by NotificationCard which the strategy
// emits at the top of the overview when any trigger fires.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

interface Trigger {
  entity: string;
  active_state?: string;
  title?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
  icon?: string;
}

export interface NotificationsTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  onChange: (triggers: Trigger[]) => void;
}

export function renderNotificationsTab(ctx: NotificationsTabContext): TemplateResult {
  const triggers: Trigger[] = Array.isArray(ctx.config.notification_triggers)
    ? [...(ctx.config.notification_triggers as Trigger[])]
    : [];

  const update = (next: Trigger[]) => {
    // Strip empty triggers (entity is required) and call onChange.
    ctx.onChange(next.filter((t) => typeof t.entity === 'string' && t.entity.length > 0));
  };

  return html`
    <div class="section">
      <div class="section-title">
        ${localize('editor.notification_triggers_title') || 'Notification banners'}
      </div>
      <div class="description" style="margin-bottom: 12px;">
        ${localize('editor.notification_triggers_desc') ||
          "Sticky banner at the top of the overview when an entity hits its 'active' state. Use for smoke alarms, water leak sensors, doorbells, intruder alerts — anything safety-critical."}
      </div>

      ${triggers.length === 0
        ? html`<div class="description" style="font-style: italic;">
            ${localize('editor.notification_triggers_empty') || 'No triggers configured yet.'}
          </div>`
        : nothing}

      ${triggers.map((t, idx) => renderTriggerRow(t, idx, triggers, update))}

      <button
        class="btn-primary"
        style="margin-top: 8px;"
        @click=${() => update([...triggers, { entity: '' } as Trigger])}
      >
        ${localize('editor.notification_triggers_add') || '+ Add trigger'}
      </button>
    </div>
  `;
}

function renderTriggerRow(
  t: Trigger,
  idx: number,
  all: Trigger[],
  update: (next: Trigger[]) => void,
): TemplateResult {
  const setField = <K extends keyof Trigger>(field: K, value: Trigger[K]): void => {
    const next = [...all];
    next[idx] = { ...t, [field]: value };
    if (value === '' || value === undefined) delete next[idx][field];
    update(next);
  };
  const remove = () => {
    update(all.filter((_, i) => i !== idx));
  };

  return html`
    <div
      style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 10px; margin-bottom: 8px;"
    >
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong>${t.title || t.entity || `Trigger #${idx + 1}`}</strong>
        <button
          class="btn-remove"
          style="background: transparent; border: 1px solid var(--divider-color); border-radius: 4px; padding: 2px 8px; cursor: pointer; color: var(--secondary-text-color);"
          @click=${remove}
        >
          ${localize('editor.remove') || 'Remove'}
        </button>
      </div>

      <div class="form-row">
        <label style="min-width: 90px; font-size: 12px;">Entity</label>
        <input
          type="text"
          style="flex: 1;"
          placeholder="binary_sensor.smoke_alarm"
          .value=${t.entity}
          @change=${(e: Event) => setField('entity', (e.target as HTMLInputElement).value.trim())}
        />
      </div>

      <div class="form-row">
        <label style="min-width: 90px; font-size: 12px;">Severity</label>
        <select
          style="flex: 1;"
          .value=${t.severity ?? 'info'}
          @change=${(e: Event) =>
            setField('severity', (e.target as HTMLSelectElement).value as Trigger['severity'])}
        >
          <option value="info" ?selected=${(t.severity ?? 'info') === 'info'}>Info (blue)</option>
          <option value="warning" ?selected=${t.severity === 'warning'}>Warning (orange)</option>
          <option value="critical" ?selected=${t.severity === 'critical'}>Critical (red, pulsing)</option>
        </select>
      </div>

      <div class="form-row">
        <label style="min-width: 90px; font-size: 12px;">Title</label>
        <input
          type="text"
          style="flex: 1;"
          placeholder="Smoke alarm"
          .value=${t.title || ''}
          @change=${(e: Event) => setField('title', (e.target as HTMLInputElement).value)}
        />
      </div>

      <details style="margin-top: 6px;">
        <summary style="cursor: pointer; font-size: 11px; color: var(--secondary-text-color);">
          ${localize('editor.notification_triggers_advanced') || 'Advanced (active state, message, icon)'}
        </summary>
        <div style="margin-left: 8px; margin-top: 4px;">
          <div class="form-row">
            <label style="min-width: 90px; font-size: 12px;">Active state</label>
            <input
              type="text"
              style="flex: 1;"
              placeholder="on (default)"
              .value=${t.active_state || ''}
              @change=${(e: Event) => setField('active_state', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-row">
            <label style="min-width: 90px; font-size: 12px;">Message</label>
            <input
              type="text"
              style="flex: 1;"
              placeholder="(optional — falls back to entity name)"
              .value=${t.message || ''}
              @change=${(e: Event) => setField('message', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="form-row">
            <label style="min-width: 90px; font-size: 12px;">Icon</label>
            <input
              type="text"
              style="flex: 1;"
              placeholder="mdi:fire"
              .value=${t.icon || ''}
              @change=${(e: Event) => setField('icon', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      </details>
    </div>
  `;
}
