// ====================================================================
// SparklineCard — apexcharts delegation unit tests (F4 regression gate)
// ====================================================================
// Guards the F4 bug: when `use_apexcharts: true` and an `apexcharts-card`
// element is registered, OrielSparklineCard must CONFIGURE the delegate
// via its setConfig() METHOD — not by binding a `.config` property.
//
// apexcharts-card (RomRider) has no `set config()` accessor; it reads
// config exclusively through setConfig(). The original code bound
// `.config=${apexConfig}` on the lit template, which was a silent no-op:
// the delegate never received a config, rendered an empty 0×0 shadow, and
// the chart was invisible. The fix creates the element imperatively and
// calls setConfig(). This test fails loudly if anyone reverts to property
// binding (setConfig would never be called).
//
// We register a stub `apexcharts-card` that records every setConfig() call
// and the last `.hass` assignment, then assert the card drives it.
// ====================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import '../../src/cards/SparklineCard';

// ---- Stub apexcharts-card delegate -------------------------------------
// Records setConfig() invocations + hass assignments so the test can prove
// the host configured it via the method, not a property bind.
const _setConfigCalls: Array<Record<string, unknown>> = [];
let _lastHass: unknown;

class ApexStub extends HTMLElement {
  setConfig(cfg: Record<string, unknown>): void {
    _setConfigCalls.push(cfg);
  }
  set hass(h: unknown) {
    _lastHass = h;
  }
}
if (!customElements.get('apexcharts-card')) {
  customElements.define('apexcharts-card', ApexStub);
}

type SparklineEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  hass: unknown;
  updateComplete: Promise<boolean>;
};

const _mounted: SparklineEl[] = [];
function mount(): SparklineEl {
  const el = document.createElement('oriel-sparkline-card') as SparklineEl;
  document.body.appendChild(el);
  _mounted.push(el);
  return el;
}

// Minimal hass: one numeric sensor + a callApi stub so the card's
// hourly-history fetch resolves quietly (the apex branch returns before
// reading states, but the first hass triggers _fetchHistory()).
function fakeHass() {
  return {
    states: {
      'sensor.living_room_temperature': {
        state: '21.4',
        attributes: { friendly_name: 'Living room', unit_of_measurement: '°C' },
      },
    },
    locale: { language: 'en' },
    callApi: async () => [],
  };
}

beforeEach(() => {
  _setConfigCalls.length = 0;
  _lastHass = undefined;
});

afterEach(() => {
  while (_mounted.length) _mounted.pop()!.remove();
});

describe('oriel-sparkline-card — apexcharts delegation (F4)', () => {
  it('configures the apexcharts-card delegate via setConfig() (not a .config property)', async () => {
    const el = mount();
    el.setConfig({
      type: 'custom:oriel-sparkline-card',
      entity: 'sensor.living_room_temperature',
      name: 'Living room',
      hours: 24,
      use_apexcharts: true,
    });
    el.hass = fakeHass();
    await el.updateComplete;

    // (a) setConfig was CALLED — the direct guard against `.config=` binding.
    expect(_setConfigCalls.length).toBeGreaterThanOrEqual(1);
    const cfg = _setConfigCalls[0]!;
    expect(cfg.type).toBe('custom:apexcharts-card');
    expect(cfg.graph_span).toBe('24h');
    expect(Array.isArray(cfg.series)).toBe(true);
    expect((cfg.series as Array<{ entity: string }>)[0]!.entity).toBe(
      'sensor.living_room_temperature',
    );

    // (b) the delegate element is in the shadow output.
    const apex = el.shadowRoot!.querySelector('apexcharts-card');
    expect(apex).not.toBeNull();

    // and hass was forwarded to it.
    expect(_lastHass).toBeDefined();
  });

  it('does NOT create an apexcharts-card when use_apexcharts is absent (SVG fallback)', async () => {
    const el = mount();
    el.setConfig({
      type: 'custom:oriel-sparkline-card',
      entity: 'sensor.living_room_temperature',
    });
    el.hass = fakeHass();
    await el.updateComplete;

    expect(_setConfigCalls.length).toBe(0);
    expect(el.shadowRoot!.querySelector('apexcharts-card')).toBeNull();
    // SVG sparkline is rendered inside the built-in ha-card instead.
    expect(el.shadowRoot!.querySelector('ha-card svg.spark')).not.toBeNull();
  });

  it('re-applies setConfig on a live config change (cached delegate is not left stale)', async () => {
    const el = mount();
    el.setConfig({
      type: 'custom:oriel-sparkline-card',
      entity: 'sensor.living_room_temperature',
      use_apexcharts: true,
    });
    el.hass = fakeHass();
    await el.updateComplete;
    expect(_setConfigCalls.length).toBe(1);

    // Simulate the editor/preview path: setConfig re-called on the SAME
    // element with a new entity. The cached delegate must be reconfigured.
    el.setConfig({
      type: 'custom:oriel-sparkline-card',
      entity: 'sensor.kitchen_temperature',
      use_apexcharts: true,
    });
    await el.updateComplete;

    expect(_setConfigCalls.length).toBe(2);
    expect(
      (_setConfigCalls[1]!.series as Array<{ entity: string }>)[0]!.entity,
    ).toBe('sensor.kitchen_temperature');

    // Still a single delegate instance in the shadow (reused, not duplicated).
    expect(el.shadowRoot!.querySelectorAll('apexcharts-card').length).toBe(1);
  });
});
