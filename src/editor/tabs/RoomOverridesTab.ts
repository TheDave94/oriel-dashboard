// ====================================================================
// Editor tab — Per-area room view overrides (v4.4.0)
// ====================================================================
// `areas_options.<area>.room_view_overrides` was YAML-only. This tab
// lists every area + offers an inline expander where users can paste
// a YAML sections-array. Plus an append/replace toggle.
//
// The override schema is `LovelaceSectionConfig[]`, which is rich
// enough (heading, grid, cards) that a fully visual editor would be
// a project on its own. YAML textarea is the pragmatic middle ground
// that gets it out of "only via the raw YAML editor" and into the
// strategy editor.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { OrielConfig } from '../../types/strategy';
import type { AreaRegistryEntry } from '../../types/registries';
import { localize } from '../../utils/localize';
import yaml from 'js-yaml';

export interface RoomOverridesTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  areas: AreaRegistryEntry[];
  onChange: (areasOptions: NonNullable<OrielConfig['areas_options']>) => void;
}

export function renderRoomOverridesTab(ctx: RoomOverridesTabContext): TemplateResult {
  const opts = (ctx.config.areas_options ?? {}) as NonNullable<OrielConfig['areas_options']>;
  const configuredAreas = Object.keys(opts).filter(
    (id) => (opts[id] as { room_view_overrides?: unknown })?.room_view_overrides,
  );

  return html`
    <div class="section">
      <div class="section-title">
        ${localize('editor.room_overrides_title') || 'Per-room view layout overrides'}
      </div>
      <div class="description" style="margin-bottom: 12px;">
        ${localize('editor.room_overrides_desc') ||
          'For specific areas where the auto-generated layout does not fit, paste a custom sections array (extends or replaces the default room view).'}
      </div>

      ${configuredAreas.length > 0
        ? html`<div class="description" style="font-size: 0.85rem; margin-bottom: 8px;">
            <strong>Configured:</strong> ${configuredAreas.join(', ')}
          </div>`
        : nothing}

      ${ctx.areas.map((area) => renderAreaOverride(area, opts, ctx))}
    </div>
  `;
}

function renderAreaOverride(
  area: AreaRegistryEntry,
  opts: NonNullable<OrielConfig['areas_options']>,
  ctx: RoomOverridesTabContext,
): TemplateResult {
  const areaOpts = (opts[area.area_id] ?? {}) as {
    room_view_overrides?: { sections?: unknown[]; append_default?: boolean };
  };
  const rvo = areaOpts.room_view_overrides;
  const hasOverride = !!rvo && Array.isArray(rvo.sections) && rvo.sections.length > 0;
  const sectionsYaml = rvo?.sections ? yaml.dump(rvo.sections, { noRefs: true, lineWidth: 100 }) : '';
  const appendDefault = rvo?.append_default !== false;

  const updateSections = (textarea: HTMLTextAreaElement): void => {
    const text = textarea.value;
    let parsed: unknown[];
    try {
      const result = yaml.load(text);
      if (!Array.isArray(result)) {
        textarea.dataset.error = 'YAML must be a list of sections';
        return;
      }
      parsed = result;
    } catch (e) {
      textarea.dataset.error = String(e).slice(0, 200);
      return;
    }
    delete textarea.dataset.error;
    const nextOpts: NonNullable<OrielConfig['areas_options']> = { ...opts };
    const nextArea = { ...areaOpts } as Record<string, unknown>;
    if (parsed.length === 0) {
      delete nextArea.room_view_overrides;
    } else {
      nextArea.room_view_overrides = {
        sections: parsed,
        ...(rvo?.append_default === false ? { append_default: false } : {}),
      };
    }
    if (Object.keys(nextArea).length === 0) {
      delete nextOpts[area.area_id];
    } else {
      nextOpts[area.area_id] = nextArea as NonNullable<OrielConfig['areas_options']>[string];
    }
    ctx.onChange(nextOpts);
  };

  const toggleAppend = (checked: boolean): void => {
    if (!rvo) return;
    const nextOpts: NonNullable<OrielConfig['areas_options']> = { ...opts };
    const nextArea = { ...areaOpts } as Record<string, unknown>;
    nextArea.room_view_overrides = {
      sections: rvo.sections ?? [],
      ...(checked ? {} : { append_default: false }),
    };
    nextOpts[area.area_id] = nextArea as NonNullable<OrielConfig['areas_options']>[string];
    ctx.onChange(nextOpts);
  };

  return html`
    <details
      style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;"
      ?open=${hasOverride}
    >
      <summary
        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
      >
        <span><strong>${area.name}</strong></span>
        <span style="color: var(--secondary-text-color); font-size: 0.85rem;">
          ${hasOverride
            ? `${(rvo!.sections as unknown[]).length} custom sections${appendDefault ? ' (appended)' : ' (replacing default)'}`
            : (localize('editor.room_overrides_unset') || 'no override')}
        </span>
      </summary>
      <div style="margin-top: 8px;">
        <textarea
          rows="8"
          style="width: 100%; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color); color: var(--primary-text-color);"
          placeholder=${`- type: heading\n  heading: Tools\n- type: grid\n  cards:\n    - type: tile\n      entity: switch.workshop_compressor`}
          .value=${sectionsYaml}
          @change=${(e: Event) => updateSections(e.target as HTMLTextAreaElement)}
        ></textarea>
        ${hasOverride
          ? html`
              <label
                style="display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px;"
              >
                <input
                  type="checkbox"
                  ?checked=${appendDefault}
                  @change=${(e: Event) =>
                    toggleAppend((e.target as HTMLInputElement).checked)}
                />
                ${localize('editor.room_overrides_append') ||
                  'Append to default room layout (uncheck to fully replace)'}
              </label>
            `
          : nothing}
        <small class="description" style="font-size: 11px; display: block; margin-top: 4px;">
          ${localize('editor.room_overrides_help') ||
            'YAML must be a list of Lovelace section configs (e.g. type: grid + cards: [...]).'}
        </small>
      </div>
    </details>
  `;
}
