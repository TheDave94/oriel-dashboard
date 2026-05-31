// ====================================================================
// Editor tab — Floorplan view config (v4.4.0)
// ====================================================================
// `floorplan_view` was YAML-only. This editor exposes the view
// metadata (title, path, icon) as structured fields plus a YAML
// textarea for the inner `config` object — that's pass-through to
// `custom:floorplan-card` whose schema is upstream and rich enough
// that a fully visual editor isn't practical without weeks of work.
//
// Detects whether floorplan-card is installed; surfaces a HACS hint
// when missing (graceful per Principle 2).
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';
import yaml from 'js-yaml';

export interface FloorplanTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  onChange: (next: OrielConfig['floorplan_view']) => void;
}

export function renderFloorplanTab(ctx: FloorplanTabContext): TemplateResult {
  const installed =
    typeof customElements !== 'undefined' &&
    !!customElements.get('floorplan-card');
  const fp = ctx.config.floorplan_view;

  const title = fp?.title ?? '';
  const path = fp?.path ?? '';
  const icon = fp?.icon ?? '';
  const configYaml = fp?.config
    ? yaml.dump(fp.config, { noRefs: true, lineWidth: 100 })
    : '';

  const updateMeta = (field: 'title' | 'path' | 'icon', value: string) => {
    const next: NonNullable<OrielConfig['floorplan_view']> = fp
      ? { ...fp }
      : { config: {} as Record<string, unknown> };
    if (value) (next as Record<string, unknown>)[field] = value;
    else delete (next as Record<string, unknown>)[field];
    // Drop the whole floorplan_view when nothing meaningful is set
    if ((!next.config || Object.keys(next.config).length === 0) &&
        !next.title && !next.path && !next.icon) {
      ctx.onChange(undefined);
      return;
    }
    ctx.onChange(next);
  };

  const updateConfigYaml = (textarea: HTMLTextAreaElement) => {
    const text = textarea.value;
    let parsed: Record<string, unknown>;
    try {
      parsed = (yaml.load(text) as Record<string, unknown>) ?? {};
    } catch (e) {
      // Surface parse error inline; don't write bad YAML to config
      textarea.dataset.error = String(e).slice(0, 200);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    delete textarea.dataset.error;
    const next: NonNullable<OrielConfig['floorplan_view']> = fp
      ? { ...fp }
      : { config: {} as Record<string, unknown> };
    next.config = parsed;
    if (Object.keys(parsed).length === 0 && !next.title && !next.path && !next.icon) {
      ctx.onChange(undefined);
    } else {
      ctx.onChange(next);
    }
  };

  const enable = () => {
    ctx.onChange({ title: 'Floorplan', path: 'floorplan', icon: 'mdi:floor-plan', config: {} });
  };
  const disable = () => ctx.onChange(undefined);

  return html`
    <div class="section">
      <div class="section-title">
        ${localize('editor.floorplan_title') || 'Floorplan view'}
      </div>
      <div class="description" style="margin-bottom: 12px;">
        ${localize('editor.floorplan_desc') ||
          'Emit a dedicated view rendering an SVG floorplan with live entity overlays. Requires the floorplan-card HACS plugin.'}
      </div>

      ${!installed
        ? html`<div
            class="description"
            style="color: var(--warning-color); margin-bottom: 8px;"
          >
            ${localize('editor.floorplan_not_installed') ||
              'floorplan-card not installed. Install pkozul/ha-floorplan via HACS first.'}
            <a
              href="https://github.com/pkozul/ha-floorplan"
              target="_blank"
              rel="noopener noreferrer"
            >ha-floorplan ↗</a>
          </div>`
        : nothing}

      ${!fp
        ? html`<button class="btn-primary" @click=${enable}>
            ${localize('editor.floorplan_enable') || 'Enable floorplan view'}
          </button>`
        : html`
            <div class="form-row">
              <label style="min-width: 90px; font-size: 12px;">View title</label>
              <input
                type="text"
                style="flex: 1;"
                placeholder="Floorplan"
                .value=${title}
                @change=${(e: Event) => updateMeta('title', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-row">
              <label style="min-width: 90px; font-size: 12px;">URL path</label>
              <input
                type="text"
                style="flex: 1;"
                placeholder="floorplan"
                .value=${path}
                @change=${(e: Event) => updateMeta('path', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-row">
              <label style="min-width: 90px; font-size: 12px;">Icon</label>
              <input
                type="text"
                style="flex: 1;"
                placeholder="mdi:floor-plan"
                .value=${icon}
                @change=${(e: Event) => updateMeta('icon', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div style="margin-top: 12px;">
              <label style="display: block; font-size: 12px; margin-bottom: 4px;">
                ${localize('editor.floorplan_config') || 'floorplan-card config (YAML)'}
              </label>
              <textarea
                rows="14"
                style="width: 100%; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color); color: var(--primary-text-color);"
                placeholder=${`image:\n  location: /local/floorplan/home.svg\nrules:\n  - entity: light.living_room\n    tap_action:\n      action: toggle`}
                .value=${configYaml}
                @change=${(e: Event) => updateConfigYaml(e.target as HTMLTextAreaElement)}
              ></textarea>
              <small class="description" style="font-size: 11px;">
                ${localize('editor.floorplan_config_help') ||
                  'Anything floorplan-card accepts. See ha-floorplan docs for the full schema.'}
              </small>
            </div>

            <button
              class="btn-remove"
              style="margin-top: 10px;"
              @click=${disable}
            >
              ${localize('editor.floorplan_disable') || 'Disable floorplan view'}
            </button>
          `}
    </div>
  `;
}
