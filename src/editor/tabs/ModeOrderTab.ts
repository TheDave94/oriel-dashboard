// ====================================================================
// Editor tab — Sections order by mode (v4.4.0)
// ====================================================================
// `sections_order_by_mode` — previously YAML-only. Per-mode editor:
// detects available modes from `input_select.house_mode` options
// (or any user-specified house_mode_entity), then offers an
// ordered checklist per mode. Drag-drop reorder is overkill for the
// effort budget — the simpler "ranked list + up/down arrows"
// approach is shipped here.
//
// When no house_mode_entity is detected, surfaces a hint pointing
// the user at the relevant config field. The tab still shows so
// users can pre-author per-mode orders before adding the entity.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { OrielConfig, SectionKey } from '../../types/strategy';
import { DEFAULT_SECTIONS_ORDER } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface ModeOrderTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  onChange: (next: Record<string, string[]>) => void;
}

const ALL_SECTION_KEYS: SectionKey[] = [
  'overview', 'custom_cards', 'areas', 'weather', 'energy',
  'plants', 'agenda', 'todos', 'persons', 'vacuums', 'maintenance', 'presence',
];

function detectModes(ctx: ModeOrderTabContext): string[] {
  const entityId = ctx.config.house_mode_entity || 'input_select.house_mode';
  const state = ctx.hass.states[entityId];
  const options = state?.attributes?.options as string[] | undefined;
  if (Array.isArray(options) && options.length > 0) {
    return options.map((opt) => opt.toLowerCase().replace(/[\s-]+/g, '_'));
  }
  // Fallback: common default modes — gives users something to start
  // editing even without a configured input_select.
  return ['morning', 'evening', 'night', 'away'];
}

export function renderModeOrderTab(ctx: ModeOrderTabContext): TemplateResult {
  const modes = detectModes(ctx);
  const current = (ctx.config.sections_order_by_mode || {}) as Record<string, string[]>;
  const entityId = ctx.config.house_mode_entity || 'input_select.house_mode';
  const entityExists = !!ctx.hass.states[entityId];

  const updateMode = (mode: string, order: string[]) => {
    const next: Record<string, string[]> = { ...current };
    if (order.length === 0) delete next[mode];
    else next[mode] = order;
    ctx.onChange(next);
  };

  return html`
    <div class="section">
      <div class="section-title">
        ${localize('editor.mode_order_title') || 'Section order per house mode'}
      </div>
      <div class="description" style="margin-bottom: 8px;">
        ${localize('editor.mode_order_desc') ||
          'Reshuffle sections based on house_mode. Strategy reads the configured mode entity at generate() time and picks the matching order. Fallback: sections_order when no mode matches.'}
      </div>
      ${!entityExists
        ? html`<div class="description" style="color: var(--warning-color); margin-bottom: 8px;">
            ${localize('editor.mode_order_no_entity') ||
              `No "${entityId}" found in HA. Configure house_mode_entity or create an input_select.house_mode to activate per-mode ordering.`}
          </div>`
        : nothing}

      ${modes.map((mode) => renderModeEditor(mode, current[mode] || [], updateMode))}
    </div>
  `;
}

function renderModeEditor(
  mode: string,
  order: string[],
  onChange: (mode: string, next: string[]) => void,
): TemplateResult {
  const inOrder = new Set(order);
  // Sections not yet in the per-mode order — surfaced as "available"
  const available = ALL_SECTION_KEYS.filter((k) => !inOrder.has(k));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    onChange(mode, next);
  };
  const moveDown = (idx: number) => {
    if (idx >= order.length - 1) return;
    const next = [...order];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    onChange(mode, next);
  };
  const remove = (idx: number) => {
    onChange(mode, order.filter((_, i) => i !== idx));
  };
  const add = (key: string) => {
    if (!key) return;
    onChange(mode, [...order, key]);
  };
  const useDefault = () => {
    onChange(mode, [...DEFAULT_SECTIONS_ORDER]);
  };
  const clear = () => onChange(mode, []);

  return html`
    <details
      style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 10px; margin-bottom: 8px;"
      ?open=${order.length > 0}
    >
      <summary
        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
      >
        <span><strong>${mode}</strong></span>
        <span style="color: var(--secondary-text-color); font-size: 0.85rem;">
          ${order.length > 0
            ? `${order.length} sections ordered`
            : localize('editor.mode_order_unset') || '(uses default sections_order)'}
        </span>
      </summary>
      <div style="margin-top: 10px;">
        ${order.length === 0
          ? html`<button class="btn-primary" @click=${useDefault} style="margin-right: 6px;">
                ${localize('editor.mode_order_use_default') || 'Start with default order'}
              </button>`
          : html`
              <ol style="padding-left: 0; list-style: none; margin: 0 0 8px 0;">
                ${order.map(
                  (key, idx) => html`
                    <li
                      style="display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 50%, transparent);"
                    >
                      <span style="font-family: monospace; min-width: 24px;">${idx + 1}.</span>
                      <span style="flex: 1;">${key}</span>
                      <button
                        title="Move up"
                        ?disabled=${idx === 0}
                        @click=${() => moveUp(idx)}
                        style="background: transparent; border: 1px solid var(--divider-color); border-radius: 4px; padding: 2px 6px; cursor: pointer;"
                      >↑</button>
                      <button
                        title="Move down"
                        ?disabled=${idx === order.length - 1}
                        @click=${() => moveDown(idx)}
                        style="background: transparent; border: 1px solid var(--divider-color); border-radius: 4px; padding: 2px 6px; cursor: pointer;"
                      >↓</button>
                      <button
                        title="Remove"
                        @click=${() => remove(idx)}
                        style="background: transparent; border: 1px solid var(--divider-color); border-radius: 4px; padding: 2px 6px; cursor: pointer;"
                      >×</button>
                    </li>
                  `,
                )}
              </ol>
              <button class="btn-remove" @click=${clear} style="margin-right: 6px;">
                ${localize('editor.mode_order_clear') || 'Clear (fall back to default)'}
              </button>
            `}
        ${available.length > 0
          ? html`
              <div style="margin-top: 6px;">
                <select
                  @change=${(e: Event) => {
                    const v = (e.target as HTMLSelectElement).value;
                    if (v) {
                      add(v);
                      (e.target as HTMLSelectElement).value = '';
                    }
                  }}
                >
                  <option value="">+ Add section…</option>
                  ${available.map(
                    (key) => html`<option value=${key}>${key}</option>`,
                  )}
                </select>
              </div>
            `
          : nothing}
      </div>
    </details>
  `;
}
