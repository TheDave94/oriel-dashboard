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
import type { OrielConfig, RoomSectionKey } from '../../types/strategy';
import type { AreaRegistryEntry } from '../../types/registries';
import { localize } from '../../utils/localize';
import { swapAdjacentUp, swapAdjacentDown } from '../../utils/array-reorder';
import {
  ROOM_SECTION_LABEL,
  normalizeRoomSectionOrder,
  effectiveRoomSectionOrder,
} from './AreasTab';
import yaml from 'js-yaml';

export interface RoomOverridesTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  areas: AreaRegistryEntry[];
  onChange: (areasOptions: NonNullable<OrielConfig['areas_options']>) => void;
}

/**
 * Build a Set of area_ids that have at least one `camera.*` entity
 * assigned (either directly or via the entity's device). Camera-hero
 * is only meaningful for these areas — no point surfacing the knob
 * elsewhere. Iterates the hass entity + device registries once.
 */
export function getAreasWithCameras(hass: HomeAssistant): Set<string> {
  const out = new Set<string>();
  const devices = hass.devices ?? {};
  for (const entity of Object.values(hass.entities ?? {})) {
    if (!entity.entity_id.startsWith('camera.')) continue;
    let areaId: string | null | undefined = entity.area_id;
    if (!areaId && entity.device_id) {
      areaId = (devices[entity.device_id] as { area_id?: string | null } | undefined)?.area_id;
    }
    if (areaId) out.add(areaId);
  }
  return out;
}

/**
 * Pure mutator — produces the next `areas_options` for toggling
 * `camera_hero` on or off in a single area. Off (false) deletes the
 * key so the YAML stays at the manual-config baseline (presence-only,
 * matching the way the renderer reads `=== true`). When the area's
 * options become an empty object as a result, the area entry is
 * dropped too. Exported for unit tests.
 */
export function setCameraHero(
  opts: NonNullable<OrielConfig['areas_options']>,
  areaId: string,
  on: boolean,
): NonNullable<OrielConfig['areas_options']> {
  const nextOpts: NonNullable<OrielConfig['areas_options']> = { ...opts };
  const areaOpts = (opts[areaId] ?? {}) as Record<string, unknown>;
  const nextArea: Record<string, unknown> = { ...areaOpts };
  if (on) {
    nextArea.camera_hero = true;
  } else {
    delete nextArea.camera_hero;
  }
  if (Object.keys(nextArea).length === 0) {
    delete nextOpts[areaId];
  } else {
    nextOpts[areaId] = nextArea as NonNullable<OrielConfig['areas_options']>[string];
  }
  return nextOpts;
}

export function renderRoomOverridesTab(ctx: RoomOverridesTabContext): TemplateResult {
  const opts = (ctx.config.areas_options ?? {}) as NonNullable<OrielConfig['areas_options']>;
  const configuredAreas = Object.keys(opts).filter(
    (id) => (opts[id] as { room_view_overrides?: unknown })?.room_view_overrides,
  );
  const areasWithCameras = getAreasWithCameras(ctx.hass);

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

      ${ctx.areas.map((area) => renderAreaOverride(area, opts, areasWithCameras, ctx))}
    </div>
  `;
}

function renderAreaOverride(
  area: AreaRegistryEntry,
  opts: NonNullable<OrielConfig['areas_options']>,
  areasWithCameras: Set<string>,
  ctx: RoomOverridesTabContext,
): TemplateResult {
  const areaOpts = (opts[area.area_id] ?? {}) as {
    room_view_overrides?: { sections?: unknown[]; append_default?: boolean };
    camera_hero?: boolean;
    room_section_order?: RoomSectionKey[];
  };
  const rvo = areaOpts.room_view_overrides;
  const hasOverride = !!rvo && Array.isArray(rvo.sections) && rvo.sections.length > 0;
  const sectionsYaml = rvo?.sections ? yaml.dump(rvo.sections, { noRefs: true, lineWidth: 100 }) : '';
  const appendDefault = rvo?.append_default !== false;
  const cameraHero = areaOpts.camera_hero === true;
  const hasCamera = areasWithCameras.has(area.area_id);

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

  const toggleCameraHero = (checked: boolean): void => {
    ctx.onChange(setCameraHero(opts, area.area_id, checked));
  };

  // Per-area section order — overrides the global room_section_order for
  // this room only. Unset = inherit global; a move that lands back on the
  // global effective order deletes the key (keeps YAML sparse).
  const hasAreaOrder = Array.isArray(areaOpts.room_section_order);
  const globalOrder = effectiveRoomSectionOrder(ctx.config);
  const areaOrder = hasAreaOrder
    ? normalizeRoomSectionOrder(areaOpts.room_section_order)
    : globalOrder;

  const moveAreaSection = (idx: number, dir: 'up' | 'down'): void => {
    const next = (dir === 'up' ? swapAdjacentUp : swapAdjacentDown)(areaOrder, idx);
    if (next === areaOrder) return; // out-of-range — no-op
    const arr = next as RoomSectionKey[];
    const matchesGlobal =
      arr.length === globalOrder.length && arr.every((k, i) => k === globalOrder[i]);
    const nextOpts: NonNullable<OrielConfig['areas_options']> = { ...opts };
    const nextArea = { ...areaOpts } as Record<string, unknown>;
    if (matchesGlobal) delete nextArea.room_section_order;
    else nextArea.room_section_order = arr;
    if (Object.keys(nextArea).length === 0) {
      delete nextOpts[area.area_id];
    } else {
      nextOpts[area.area_id] = nextArea as NonNullable<OrielConfig['areas_options']>[string];
    }
    ctx.onChange(nextOpts);
  };

  const resetAreaOrder = (): void => {
    if (!hasAreaOrder) return;
    const nextOpts: NonNullable<OrielConfig['areas_options']> = { ...opts };
    const nextArea = { ...areaOpts } as Record<string, unknown>;
    delete nextArea.room_section_order;
    if (Object.keys(nextArea).length === 0) {
      delete nextOpts[area.area_id];
    } else {
      nextOpts[area.area_id] = nextArea as NonNullable<OrielConfig['areas_options']>[string];
    }
    ctx.onChange(nextOpts);
  };

  // Summary status — concatenate the override + camera-hero hints so the
  // user can scan the collapsed list and see what's configured per area.
  const summaryParts: string[] = [];
  if (hasOverride) {
    summaryParts.push(
      `${(rvo!.sections as unknown[]).length} custom sections${appendDefault ? ' (appended)' : ' (replacing default)'}`,
    );
  }
  if (cameraHero) {
    summaryParts.push(
      localize('editor.camera_hero_summary') || 'camera hero',
    );
  }
  if (hasAreaOrder) {
    summaryParts.push(
      localize('editor.area_section_order_summary') || 'custom section order',
    );
  }
  const summaryText =
    summaryParts.length > 0
      ? summaryParts.join(' · ')
      : (localize('editor.room_overrides_unset') || 'no override');

  return html`
    <details
      style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;"
      ?open=${hasOverride || cameraHero}
    >
      <summary
        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
      >
        <span><strong>${area.name}</strong></span>
        <span style="color: var(--secondary-text-color); font-size: 0.85rem;">
          ${summaryText}
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
        ${hasCamera
          ? html`
              <label
                class="camera-hero-toggle"
                data-area-id=${area.area_id}
                style="display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px;"
              >
                <input
                  type="checkbox"
                  ?checked=${cameraHero}
                  @change=${(e: Event) =>
                    toggleCameraHero((e.target as HTMLInputElement).checked)}
                />
                ${localize('editor.camera_hero') ||
                  'Camera hero (render the first area camera full-width at the top of the room view)'}
              </label>
            `
          : nothing}
        <details style="margin-top: 8px;" ?open=${hasAreaOrder}>
          <summary style="cursor: pointer; font-size: 12px;">
            ${localize('editor.area_section_order') || 'Section order (this room only)'}
            ${hasAreaOrder
              ? html`<button
                  type="button"
                  style="margin-left: 8px; font-size: 11px;"
                  @click=${(e: Event) => {
                    e.preventDefault();
                    resetAreaOrder();
                  }}
                >
                  ${localize('editor.area_section_order_reset') || 'Reset to global order'}
                </button>`
              : nothing}
          </summary>
          <div class="description" style="font-size: 11px; margin: 4px 0 6px;">
            ${localize('editor.area_section_order_desc') ||
              'Reorders the entity-group sections of this room view only. Unchanged rooms keep the global order from the Areas tab.'}
          </div>
          <div class="area-list">
            ${areaOrder.map((key, idx) => {
              const label = localize(ROOM_SECTION_LABEL[key]);
              return html`
                <div class="custom-item-header" data-area-section=${key}>
                  <strong>${label}</strong>
                  <button class="section-move-btn" type="button"
                    aria-label="${localize('editor.move_section_up') || 'Move up'}: ${label}"
                    title="${localize('editor.move_section_up') || 'Move up'}"
                    ?disabled=${idx === 0} @click=${() => moveAreaSection(idx, 'up')}>&#x2191;</button>
                  <button class="section-move-btn" type="button"
                    aria-label="${localize('editor.move_section_down') || 'Move down'}: ${label}"
                    title="${localize('editor.move_section_down') || 'Move down'}"
                    ?disabled=${idx === areaOrder.length - 1} @click=${() => moveAreaSection(idx, 'down')}>&#x2193;</button>
                </div>
              `;
            })}
          </div>
        </details>
        <small class="description" style="font-size: 11px; display: block; margin-top: 4px;">
          ${localize('editor.room_overrides_help') ||
            'YAML must be a list of Lovelace section configs (e.g. type: grid + cards: [...]).'}
        </small>
      </div>
    </details>
  `;
}
