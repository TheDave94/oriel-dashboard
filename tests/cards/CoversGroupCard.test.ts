// ====================================================================
// CoversGroupCard — unit tests
// ====================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import '../../src/cards/CoversGroupCard';
import { bubbleHashFor } from '../../src/utils/bubble-integration';
import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

type CoversGroupCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getGridOptions(): Record<string, unknown>;
};

function mount(): CoversGroupCardEl {
  return document.createElement('oriel-covers-group-card') as CoversGroupCardEl;
}

// <hui-tile-card> shim — records setConfig calls so tests can assert on
// what the CoversGroupCard would have rendered.
class HuiTileCardShim extends HTMLElement {
  public lastConfig: Record<string, unknown> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hass: any;
  setConfig(cfg: Record<string, unknown>): void {
    this.lastConfig = cfg;
  }
}
if (!customElements.get('hui-tile-card')) {
  customElements.define('hui-tile-card', HuiTileCardShim);
}

// <hui-heading-card> shim — the card's updated() pass configures heading
// cards, which need a setConfig method.
class HuiHeadingCardShim extends HTMLElement {
  public lastConfig: Record<string, unknown> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hass: any;
  setConfig(cfg: Record<string, unknown>): void {
    this.lastConfig = cfg;
  }
}
if (!customElements.get('hui-heading-card')) {
  customElements.define('hui-heading-card', HuiHeadingCardShim);
}

interface CoversCardInternals {
  hass: unknown;
  updateComplete: Promise<boolean>;
  _tileCards: Map<string, HTMLElement>;
  _floorHeadingCards: Map<string, HuiHeadingCardShim>;
}

describe('oriel-covers-group-card', () => {
  describe('setConfig', () => {
    let el: CoversGroupCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('accepts open / closed / partially_open', () => {
      for (const t of ['open', 'closed', 'partially_open']) {
        expect(() => el.setConfig({ group_type: t })).not.toThrow();
      }
    });

    it('reflects density="compact" to host attribute', () => {
      el.setConfig({ group_type: 'open', density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });
  });

  describe('LovelaceCard contract', () => {
    it('getGridOptions is half-width (2-up), content-measured, uncapped (no overlap)', () => {
      const el = mount();
      el.setConfig({ group_type: 'open' });
      const opts = el.getGridOptions();
      expect(opts.columns).toBe('full');
      expect(opts.rows).toBe('auto');
      expect(opts.max_rows).toBeUndefined();
    });
  });

  describe('bubble_drawers tile rewiring (ROADMAP §2)', () => {
    function makeHassWithCover(entityId: string): unknown {
      return {
        states: {
          [entityId]: {
            entity_id: entityId,
            state: 'open',
            attributes: { current_position: 100, device_class: 'shutter' },
            last_changed: '2026-01-01T00:00:00+00:00',
            last_updated: '2026-01-01T00:00:00+00:00',
          },
        },
        entities: {},
        devices: {},
        areas: {},
        language: 'en',
        locale: { language: 'en' },
      };
    }

    it('applies navigate tap_action to emitted tile when bubble_drawers:true', () => {
      const entityId = 'cover.kitchen';
      const el = mount();
      el.setConfig({ group_type: 'open', bubble_drawers: true });
      (el as unknown as { hass: unknown }).hass = makeHassWithCover(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig?.tap_action).toEqual({
        action: 'navigate',
        navigation_path: bubbleHashFor(entityId),
      });
    });

    it('emits without tap_action when bubble_drawers omitted', () => {
      const entityId = 'cover.bedroom';
      const el = mount();
      el.setConfig({ group_type: 'open' });
      (el as unknown as { hass: unknown }).hass = makeHassWithCover(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig).not.toHaveProperty('tap_action');
    });
  });

  describe('picker integration', () => {
    it('is deliberately absent from window.customCards (Registry-coupled, renders nothing standalone)', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'oriel-covers-group-card',
      );
      expect(entry).toBeUndefined();
    });

    it('getStubConfig returns group_type=open', () => {
      const ctor = customElements.get('oriel-covers-group-card') as
        | (typeof HTMLElement & { getStubConfig?: () => { group_type: string } })
        | undefined;
      expect(ctor!.getStubConfig?.().group_type).toBe('open');
    });
  });

  describe('tile pooling and hass propagation (review wave)', () => {
    let el: CoversGroupCardEl;
    let internals: CoversCardInternals;

    beforeEach(() => {
      Registry.resetForTesting();
      el = mount();
      internals = el as unknown as CoversCardInternals;
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    function makeCoverHass(friendlyName: string): ReturnType<typeof makeHass> {
      return makeHass({
        entities: [
          {
            entity_id: 'cover.kitchen',
            state: 'open',
            attributes: {
              friendly_name: friendlyName,
              device_class: 'shutter',
              current_position: 100,
            },
          },
        ],
      });
    }

    it('reuses pooled tiles on state-only hass pushes, rebuilds them on registry changes (rename reflected)', async () => {
      el.setConfig({ group_type: 'open' });
      const hass1 = makeCoverHass('Kitchen Blind');
      Registry.initialize(hass1, {});
      internals.hass = hass1;
      await internals.updateComplete;

      const tile1 = el.shadowRoot?.querySelector('hui-tile-card') as HuiTileCardShim;
      expect(tile1).toBeTruthy();
      expect(tile1.lastConfig?.name).toBe('Kitchen');

      // State-only push (same hass.entities identity) → tile is REUSED.
      internals.hass = { ...hass1, states: { ...hass1.states } };
      await internals.updateComplete;
      expect(el.shadowRoot?.querySelector('hui-tile-card')).toBe(tile1);

      // Registry change with a renamed entity → pool invalidated,
      // fresh tile carries the new name.
      const hass2 = makeCoverHass('Bedroom Blind');
      Registry.initialize(hass2, {});
      internals.hass = hass2;
      await internals.updateComplete;

      const tile2 = el.shadowRoot?.querySelector('hui-tile-card') as HuiTileCardShim;
      expect(tile2).toBeTruthy();
      expect(tile2).not.toBe(tile1);
      expect(tile2.lastConfig?.name).toBe('Bedroom');
    });

    it('floor mode: forwards hass to pooled floor heading cards on every push', async () => {
      const hass1 = makeCoverHass('Kitchen Blind');
      Registry.initialize(hass1, {});
      el.setConfig({ group_type: 'open', group_by_floors: true });
      internals.hass = hass1;
      await internals.updateComplete;

      const floorHeading = internals._floorHeadingCards.get('_none');
      expect(floorHeading).toBeTruthy();
      expect(floorHeading?.hass).toBe(hass1);

      // Render key unchanged (updated() dedups) — the heading still
      // needs the fresh hass for its state-based behaviour.
      const hass2 = { ...hass1, states: { ...hass1.states } };
      internals.hass = hass2;
      await internals.updateComplete;
      expect(floorHeading?.hass).toBe(hass2);
    });
  });
});
