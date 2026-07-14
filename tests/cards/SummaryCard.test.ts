// ====================================================================
// SummaryCard — unit tests
// ====================================================================
// Covers setConfig validation, getCardSize / getGridOptions contract,
// host-attribute reflection for density, and the action dispatcher's
// config-shape per `detail.action`.
// ====================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import for side effect (registers the custom element).
import '../../src/cards/SummaryCard';
import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

type SummaryCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getCardSize(): number;
  getGridOptions(): Record<string, unknown>;
};

// Internal surface the counting/delta tests reach into.
interface SummaryCardInternals {
  hass: unknown;
  updateComplete: Promise<boolean>;
  _count: number;
  _relevantEntityIds: Set<string> | null;
  _calculateCount(): number;
  _isStateActive(state: string, entityId?: string): boolean;
  _yesterdayFetched: boolean;
  _deltaRefreshTimer?: number;
}

function mount(): SummaryCardEl {
  return document.createElement('oriel-summary-card') as SummaryCardEl;
}

describe('oriel-summary-card', () => {
  describe('setConfig', () => {
    let el: SummaryCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('throws when summary_type is missing', () => {
      expect(() => el.setConfig({})).toThrow(/summary_type must be one of/);
    });

    it('throws on unknown summary_type', () => {
      expect(() => el.setConfig({ summary_type: 'made_up' })).toThrow(
        /summary_type must be one of/,
      );
    });

    it('accepts every valid summary_type', () => {
      for (const t of ['lights', 'covers', 'security', 'batteries', 'climate']) {
        expect(() => el.setConfig({ summary_type: t })).not.toThrow();
      }
    });

    it('reflects density="compact" to a host attribute', () => {
      el.setConfig({ summary_type: 'lights', density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });

    it('reflects density="comfortable" to a host attribute', () => {
      el.setConfig({ summary_type: 'lights', density: 'comfortable' });
      expect(el.getAttribute('density')).toBe('comfortable');
    });

    it('clears the density attribute when unset', () => {
      el.setConfig({ summary_type: 'lights', density: 'compact' });
      el.setConfig({ summary_type: 'lights' });
      expect(el.hasAttribute('density')).toBe(false);
    });
  });

  describe('LovelaceCard contract', () => {
    it('getCardSize returns 1', () => {
      const el = mount();
      el.setConfig({ summary_type: 'lights' });
      expect(el.getCardSize()).toBe(1);
    });

    it('getGridOptions returns the half-section tile shape', () => {
      const el = mount();
      el.setConfig({ summary_type: 'lights' });
      const opts = el.getGridOptions();
      expect(opts).toMatchObject({
        columns: 6,
        rows: 1,
        min_columns: 3,
        min_rows: 1,
      });
    });
  });

  describe('picker integration', () => {
    it('is deliberately absent from window.customCards (Registry-coupled, renders nothing standalone)', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'oriel-summary-card',
      );
      expect(entry).toBeUndefined();
    });

    it('getStubConfig returns a valid summary_type', () => {
      const ctor = customElements.get('oriel-summary-card') as
        | (typeof HTMLElement & { getStubConfig?: () => { summary_type: string } })
        | undefined;
      expect(ctor).toBeDefined();
      const stub = ctor!.getStubConfig?.();
      expect(stub?.summary_type).toBe('lights');
    });
  });

  describe('batteries count — unavailable bucket alignment (review wave)', () => {
    let el: SummaryCardEl;
    let internals: SummaryCardInternals;

    const batteryHass = (): ReturnType<typeof makeHass> =>
      makeHass({
        entities: [
          {
            entity_id: 'sensor.critical_battery',
            state: '5',
            attributes: { device_class: 'battery', unit_of_measurement: '%' },
          },
          {
            entity_id: 'sensor.offline_battery',
            state: 'unavailable',
            attributes: { device_class: 'battery', unit_of_measurement: '%' },
          },
          {
            entity_id: 'binary_sensor.offline_binary_battery',
            state: 'unavailable',
            attributes: { device_class: 'battery' },
          },
        ],
      });

    beforeEach(() => {
      Registry.resetForTesting();
      el = mount();
      internals = el as unknown as SummaryCardInternals;
    });

    it('buckets unavailable batteries as good by default (matches BatteriesViewStrategy)', () => {
      const hass = batteryHass();
      Registry.initialize(hass, {});
      el.setConfig({ summary_type: 'batteries' });
      internals.hass = hass;
      expect(internals._calculateCount()).toBe(1);
    });

    it("counts unavailable batteries as critical when unavailable_batteries_bucket: 'critical'", () => {
      const hass = batteryHass();
      Registry.initialize(hass, {});
      el.setConfig({ summary_type: 'batteries', unavailable_batteries_bucket: 'critical' });
      internals.hass = hass;
      expect(internals._calculateCount()).toBe(3);
    });

    it('setConfig recounts immediately with hass already set (editor preview)', () => {
      const hass = batteryHass();
      Registry.initialize(hass, {});
      el.setConfig({ summary_type: 'batteries' });
      internals.hass = hass;
      internals._count = internals._calculateCount();
      expect(internals._count).toBe(1);
      // Config change alone (no hass push) must recount.
      el.setConfig({ summary_type: 'batteries', unavailable_batteries_bucket: 'critical' });
      expect(internals._count).toBe(3);
    });

    it('_isStateActive (yesterday baseline) matches the live batteries semantics', () => {
      const hass = batteryHass();
      (hass.states as Record<string, { attributes: Record<string, unknown> }>)['sensor.voltage_battery'] = {
        attributes: { device_class: 'battery', unit_of_measurement: 'V' },
      } as never;
      Registry.initialize(hass, {});
      el.setConfig({ summary_type: 'batteries' });
      internals.hass = hass;

      // Strict `<` threshold (live count semantics, not `<=`).
      expect(internals._isStateActive('19', 'sensor.critical_battery')).toBe(true);
      expect(internals._isStateActive('20', 'sensor.critical_battery')).toBe(false);
      // binary_sensor battery: low reported as 'on'.
      expect(internals._isStateActive('on', 'binary_sensor.offline_binary_battery')).toBe(true);
      // Non-% sensors are skipped, like the live count.
      expect(internals._isStateActive('2', 'sensor.voltage_battery')).toBe(false);
      // Unavailable follows the configured bucket (default good).
      expect(internals._isStateActive('unavailable', 'sensor.offline_battery')).toBe(false);
      expect(internals._isStateActive('unavailable', 'binary_sensor.offline_binary_battery')).toBe(false);

      el.setConfig({ summary_type: 'batteries', unavailable_batteries_bucket: 'critical' });
      expect(internals._isStateActive('unavailable', 'sensor.offline_battery')).toBe(true);
      expect(internals._isStateActive('unavailable', 'binary_sensor.offline_binary_battery')).toBe(true);
    });
  });

  describe('security count — extra entities (review wave)', () => {
    beforeEach(() => {
      Registry.resetForTesting();
    });

    it('counts security_extra_entities in state on and watches them reactively', () => {
      const hass = makeHass({
        entities: [
          { entity_id: 'lock.front', state: 'locked' },
          { entity_id: 'switch.oven', state: 'on' },
          { entity_id: 'switch.iron', state: 'off' },
        ],
      });
      Registry.initialize(hass, {});
      const el = mount();
      const internals = el as unknown as SummaryCardInternals;
      el.setConfig({
        summary_type: 'security',
        security_extra_entities: ['switch.oven', 'switch.iron', 'switch.missing'],
      });
      internals.hass = hass;

      // Only the extra entity in state 'on' counts (lock is locked).
      expect(internals._calculateCount()).toBe(1);
      // Extras join the relevant-id cache so their state changes trigger
      // recounts; missing entities are dropped.
      expect(internals._relevantEntityIds?.has('switch.oven')).toBe(true);
      expect(internals._relevantEntityIds?.has('switch.iron')).toBe(true);
      expect(internals._relevantEntityIds?.has('switch.missing')).toBe(false);
    });
  });

  describe('show_delta lifecycle (review wave)', () => {
    beforeEach(() => {
      Registry.resetForTesting();
    });

    it('re-arms the yesterday baseline cycle after detach/reattach', async () => {
      const hass = makeHass({ entities: [{ entity_id: 'light.a', state: 'on' }] });
      (hass as unknown as { callApi: unknown }).callApi = vi.fn().mockResolvedValue([]);
      Registry.initialize(hass, {});

      const el = mount();
      const internals = el as unknown as SummaryCardInternals;
      el.setConfig({ summary_type: 'lights', show_delta: true });
      document.body.appendChild(el);
      internals.hass = hass;
      await internals.updateComplete;

      expect(internals._yesterdayFetched).toBe(true);
      expect(internals._deltaRefreshTimer).toBeDefined();

      // Detach clears the refresh timer …
      el.remove();
      expect(internals._deltaRefreshTimer).toBeUndefined();

      // … and reattach + next hass push must restore the cycle.
      document.body.appendChild(el);
      expect(internals._yesterdayFetched).toBe(false);
      internals.hass = { ...hass };
      await internals.updateComplete;
      expect(internals._yesterdayFetched).toBe(true);
      expect(internals._deltaRefreshTimer).toBeDefined();

      el.remove();
    });
  });
});
