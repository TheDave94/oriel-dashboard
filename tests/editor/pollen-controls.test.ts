// ============================================================================
// Tests — pollen editor controls (PRINCIPLES §1: every runtime knob has UI)
// ============================================================================
// The pollen sub-group sits under the weather sub-editor in the
// Section-order tab. Its visibility is gated on detectPollenwatchInstalled
// — without the integration the controls are invisible. With it, the
// show_pollen toggle gates the rest of the surface; flipping it on
// reveals source, presentation, types and the badges toggle.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { render, html } from 'lit';

import {
  renderSectionOrderTab,
  type SectionOrderTabContext,
} from '../../src/editor/tabs/SectionOrderTab';
import { makeHass, type HassFixtureSpec } from '../fixtures/hass';
import type { OrielConfig, SectionKey } from '../../src/types/strategy';

const noop = (): void => undefined;

const POLLEN_HASS: HassFixtureSpec = {
  entities: [
    { entity_id: 'weather.forecast_home', state: 'sunny' },
    { entity_id: 'sensor.pollenwatch_analytics_grass_consensus', state: 'high' },
    { entity_id: 'sensor.pollenwatch_analytics_birch_consensus', state: 'low' },
    { entity_id: 'sensor.pollenwatch_open_meteo_grass', state: '32.8' },
  ],
};

const EMPTY_HASS: HassFixtureSpec = {
  entities: [{ entity_id: 'weather.forecast_home', state: 'sunny' }],
};

function renderTab(
  config: OrielConfig,
  hassSpec: HassFixtureSpec = POLLEN_HASS,
  overrides: Partial<SectionOrderTabContext> = {},
): HTMLDivElement {
  const host = document.createElement('div');
  const sectionMeta = new Map<SectionKey, { icon: string; labelKey: string }>([
    ['weather', { icon: 'mdi:weather-partly-cloudy', labelKey: 'sections.weather' }],
  ]);
  const ctx: SectionOrderTabContext = {
    hass: makeHass(hassSpec),
    config: { show_weather: true, ...config },
    order: ['weather'],
    sectionMeta,
    weatherEntities: [{ entity_id: 'weather.forecast_home', name: 'Forecast Home' }],
    powerSensorEntities: [],
    isSectionDisabled: () => false,
    isSectionToggleable: () => true,
    onToggleChange: noop,
    onSetWeatherPresentation: noop,
    onSetEnergyPresentation: noop,
    onSetPlantsPresentation: noop,
    onSetVacuumsPresentation: noop,
    onWeatherEntityChange: noop,
    onPowerBadgeEntityChange: noop,
    onToggleSectionVisibility: noop,
    onToggleHiddenHeading: noop,
    onStaleAfterChange: noop,
    onSetPollenSource: noop,
    onSetPollenPresentation: noop,
    onTogglePollenType: noop,
    onSectionVisibilityChange: noop,
    onDragStart: noop,
    onDragEnd: noop,
    onDragOver: noop,
    onDragLeave: noop,
    onDrop: noop,
    onMoveSectionUp: noop,
    onMoveSectionDown: noop,
    ...overrides,
  };
  render(html`${renderSectionOrderTab(ctx)}`, host);
  return host;
}

describe('pollen editor controls — Section-order tab', () => {
  it('renders no pollen controls when pollenwatch is not installed', () => {
    const host = renderTab({}, EMPTY_HASS);
    expect(host.querySelector('#show-pollen')).toBeNull();
    expect(host.querySelector('#pollen-source')).toBeNull();
  });

  it('always renders the show_pollen toggle when pollenwatch is installed', () => {
    const host = renderTab({});
    const toggle = host.querySelector<HTMLInputElement>('#show-pollen');
    expect(toggle).not.toBeNull();
    expect(toggle!.checked).toBe(false);
  });

  it('reveals source, layout, types, badges, show_inactive only after show_pollen is on', () => {
    const off = renderTab({});
    expect(off.querySelector('#pollen-source')).toBeNull();
    expect(off.querySelector('#pollen-presentation')).toBeNull();
    expect(off.querySelector('#show-pollen-badges')).toBeNull();
    expect(off.querySelector('#pollen-show-inactive')).toBeNull();

    const on = renderTab({ show_pollen: true });
    expect(on.querySelector('#pollen-source')).not.toBeNull();
    expect(on.querySelector('#pollen-presentation')).not.toBeNull();
    expect(on.querySelector('#show-pollen-badges')).not.toBeNull();
    expect(on.querySelector('#pollen-show-inactive')).not.toBeNull();
  });

  it('show_inactive toggle reflects the config flag and fires onToggleChange', () => {
    // Default: pollen_show_inactive unset → toggle unchecked (hide none-level
    // species, the v4.16 default).
    const off = renderTab({ show_pollen: true });
    const toggle = off.querySelector<HTMLInputElement>('#pollen-show-inactive')!;
    expect(toggle.checked).toBe(false);

    const on = renderTab({ show_pollen: true, pollen_show_inactive: true });
    const toggleOn = on.querySelector<HTMLInputElement>('#pollen-show-inactive')!;
    expect(toggleOn.checked).toBe(true);

    let captured: { k?: string; v?: boolean } = {};
    const host = renderTab(
      { show_pollen: true },
      POLLEN_HASS,
      { onToggleChange: (k, v) => (captured = { k, v: v as boolean }) },
    );
    const t = host.querySelector<HTMLInputElement>('#pollen-show-inactive')!;
    t.checked = true;
    t.dispatchEvent(new Event('change'));
    expect(captured).toEqual({ k: 'pollen_show_inactive', v: true });
  });

  it('source dropdown lists only sources with detected sensors', () => {
    const host = renderTab({ show_pollen: true });
    const select = host.querySelector<HTMLSelectElement>('#pollen-source')!;
    const values = Array.from(select.options).map((o) => o.value);
    // Fixture exposes analytics + open_meteo only.
    expect(values).toEqual(['analytics', 'open_meteo']);
  });

  it('type chips list only types the chosen source actually emits', () => {
    // Default source = analytics → fixture has grass + birch only.
    const host = renderTab({ show_pollen: true });
    const chipLabels = Array.from(host.querySelectorAll('.pollen-chip span')).map(
      (s) => s.textContent?.trim(),
    );
    // F2-root: localize() returns '' on a miss, so the chip's
    // `localize(...) || type` fallback fires → the bare type name (not the
    // leaked key id, which is exactly what F2-root stops).
    expect(chipLabels).toEqual(['birch', 'grass']);
  });

  it('type chips honour the configured pollen_types list', () => {
    const host = renderTab({ show_pollen: true, pollen_types: ['grass'] });
    const checks = Array.from(
      host.querySelectorAll<HTMLInputElement>('.pollen-chip input[type=checkbox]'),
    );
    // Two chips rendered (birch+grass available); only the grass chip is checked.
    expect(checks.length).toBe(2);
    const checkedCount = checks.filter((c) => c.checked).length;
    expect(checkedCount).toBe(1);
  });

  it('fires onTogglePollenType with the pollen + checked state', () => {
    let captured: { type?: string; enabled?: boolean } = {};
    const host = renderTab(
      { show_pollen: true, pollen_types: ['grass'] },
      POLLEN_HASS,
      {
        onTogglePollenType: (type, enabled) => {
          captured = { type, enabled };
        },
      },
    );
    const birchInput = Array.from(
      host.querySelectorAll<HTMLInputElement>('.pollen-chip input[type=checkbox]'),
    )[0];
    birchInput.checked = true;
    birchInput.dispatchEvent(new Event('change'));
    expect(captured).toEqual({ type: 'birch', enabled: true });
  });

  it('fires onSetPollenSource on dropdown change', () => {
    let captured: string | undefined;
    const host = renderTab(
      { show_pollen: true },
      POLLEN_HASS,
      { onSetPollenSource: (v) => (captured = v) },
    );
    const select = host.querySelector<HTMLSelectElement>('#pollen-source')!;
    select.value = 'open_meteo';
    select.dispatchEvent(new Event('change'));
    expect(captured).toBe('open_meteo');
  });

  it('fires onSetPollenPresentation on dropdown change', () => {
    let captured: string | undefined;
    const host = renderTab(
      { show_pollen: true },
      POLLEN_HASS,
      { onSetPollenPresentation: (v) => (captured = v) },
    );
    const select = host.querySelector<HTMLSelectElement>('#pollen-presentation')!;
    select.value = 'severity_chips';
    select.dispatchEvent(new Event('change'));
    expect(captured).toBe('severity_chips');
  });
});
