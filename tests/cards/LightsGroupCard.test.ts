// ====================================================================
// LightsGroupCard — unit tests
// ====================================================================
// Coverage focus: setConfig validation, getStubConfig shape, picker
// registration, and the Bubble Card tile tap_action rewiring (ROADMAP §2).
// ====================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import '../../src/cards/LightsGroupCard';
import { bubbleHashFor } from '../../src/utils/bubble-integration';
import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

type LightsGroupCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getGridOptions(): Record<string, unknown>;
};

function mount(): LightsGroupCardEl {
  return document.createElement('oriel-lights-group-card') as LightsGroupCardEl;
}

// Shim for HA's <hui-tile-card>: records the config passed to setConfig
// so tests can interrogate what the LightsGroupCard would have rendered.
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

// Shim for HA's <hui-heading-card>: the card's updated() pass creates and
// configures heading cards, which need a setConfig method.
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

// Internal surface the DOM-level tests reach into (pool maps + Lit's
// updateComplete). Kept in one cast type so the tests read cleanly.
interface LightsCardInternals {
  hass: unknown;
  updateComplete: Promise<boolean>;
  _tileCards: Map<string, HTMLElement>;
  _floorHeadingCards: Map<string, HuiHeadingCardShim>;
}

describe('oriel-lights-group-card', () => {
  describe('setConfig', () => {
    let el: LightsGroupCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('throws when group_type is missing', () => {
      expect(() => el.setConfig({})).toThrow(/group_type/);
    });

    it('throws on invalid group_type', () => {
      expect(() => el.setConfig({ group_type: 'middle' })).toThrow(/group_type/);
    });

    it('accepts on / off / all', () => {
      for (const t of ['on', 'off', 'all']) {
        expect(() => el.setConfig({ group_type: t })).not.toThrow();
      }
    });

    it('reflects density="compact" to host attribute', () => {
      el.setConfig({ group_type: 'all', density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });
  });

  describe('LovelaceCard contract', () => {
    it('getGridOptions is half-width (2-up), content-measured, uncapped (no overlap)', () => {
      const el = mount();
      el.setConfig({ group_type: 'all' });
      const opts = el.getGridOptions();
      // Half-width so groups sit side-by-side; NO max_rows cap so a tall
      // group sizes to content instead of overflowing onto its neighbour.
      expect(opts.columns).toBe('full');
      expect(opts.rows).toBe('auto');
      expect(opts.max_rows).toBeUndefined();
    });
  });

  describe('bubble_drawers tile rewiring (ROADMAP §2)', () => {
    function makeHassWithLight(entityId: string): unknown {
      return {
        states: {
          [entityId]: {
            entity_id: entityId,
            state: 'on',
            attributes: { supported_color_modes: ['brightness'] },
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
      const entityId = 'light.living_room';
      const el = mount();
      el.setConfig({ group_type: 'all', entities: [entityId], bubble_drawers: true });
      (el as unknown as { hass: unknown }).hass = makeHassWithLight(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig?.tap_action).toEqual({
        action: 'navigate',
        navigation_path: bubbleHashFor(entityId),
      });
    });

    it('emits without tap_action when bubble_drawers omitted', () => {
      const entityId = 'light.bedroom';
      const el = mount();
      el.setConfig({ group_type: 'all', entities: [entityId] });
      (el as unknown as { hass: unknown }).hass = makeHassWithLight(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig).not.toHaveProperty('tap_action');
    });

    it('emits without tap_action when bubble_drawers:false', () => {
      const entityId = 'light.kitchen';
      const el = mount();
      el.setConfig({ group_type: 'all', entities: [entityId], bubble_drawers: false });
      (el as unknown as { hass: unknown }).hass = makeHassWithLight(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig).not.toHaveProperty('tap_action');
    });
  });

  describe('picker integration', () => {
    it('is deliberately absent from window.customCards (Registry-coupled, renders nothing standalone)', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'oriel-lights-group-card',
      );
      expect(entry).toBeUndefined();
    });

    it('getStubConfig returns group_type=all', () => {
      const ctor = customElements.get('oriel-lights-group-card') as
        | (typeof HTMLElement & { getStubConfig?: () => { group_type: string } })
        | undefined;
      expect(ctor!.getStubConfig?.().group_type).toBe('all');
    });
  });

  describe('tile pooling and reconciliation (review wave)', () => {
    let el: LightsGroupCardEl;
    let internals: LightsCardInternals;

    beforeEach(() => {
      Registry.resetForTesting();
      el = mount();
      internals = el as unknown as LightsCardInternals;
      document.body.appendChild(el);
    });

    afterEach(() => {
      el.remove();
    });

    function makeAreaHass(friendlyName: string): ReturnType<typeof makeHass> {
      return makeHass({
        entities: [
          {
            entity_id: 'light.kitchen_lamp',
            state: 'on',
            attributes: { friendly_name: friendlyName },
            area_id: 'kitchen',
          },
        ],
        areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      });
    }

    it('reuses pooled tiles on state-only hass pushes, rebuilds them on registry changes (rename reflected)', async () => {
      el.setConfig({
        group_type: 'all',
        entities: ['light.kitchen_lamp'],
        area: { area_id: 'kitchen', name: 'Kitchen' },
      });
      const hass1 = makeAreaHass('Kitchen Lamp');
      Registry.initialize(hass1, {});
      internals.hass = hass1;
      await internals.updateComplete;

      const tile1 = el.shadowRoot?.querySelector('hui-tile-card') as HuiTileCardShim;
      expect(tile1).toBeTruthy();
      expect(tile1.lastConfig?.name).toBe('Lamp');

      // State-only push (same hass.entities identity) → tile is REUSED.
      internals.hass = { ...hass1, states: { ...hass1.states } };
      await internals.updateComplete;
      expect(el.shadowRoot?.querySelector('hui-tile-card')).toBe(tile1);

      // Registry change (new hass.entities identity) with a renamed
      // entity → pool invalidated, fresh tile carries the new name.
      const hass2 = makeAreaHass('Kitchen Spot');
      Registry.initialize(hass2, {});
      internals.hass = hass2;
      await internals.updateComplete;

      const tile2 = el.shadowRoot?.querySelector('hui-tile-card') as HuiTileCardShim;
      expect(tile2).toBeTruthy();
      expect(tile2).not.toBe(tile1);
      expect(tile2.lastConfig?.name).toBe('Spot');
    });

    it('floor mode: nested children not in the relevant-lights list survive pool cleanup', async () => {
      const hass = makeHass({
        entities: [
          {
            entity_id: 'light.group_all',
            state: 'on',
            attributes: { friendly_name: 'All Lights', entity_id: ['light.hidden_member'] },
          },
          // Opposite state → NOT in the card's relevant-lights list, but
          // rendered as a nested child under its parent group.
          { entity_id: 'light.hidden_member', state: 'off' },
        ],
      });
      Registry.initialize(hass, {});
      el.setConfig({
        group_type: 'on',
        group_by_floors: true,
        nested_groups: true,
        entities: ['light.group_all'],
      });
      internals.hass = hass;
      await internals.updateComplete;

      const nestedTile = el.shadowRoot?.querySelector(
        'hui-tile-card[data-entity-id="light.hidden_member"]',
      );
      expect(nestedTile, 'nested child tile must stay in the DOM after cleanup').toBeTruthy();
      expect(nestedTile?.isConnected).toBe(true);
      expect(internals._tileCards.has('light.hidden_member')).toBe(true);
    });

    it('floor mode: forwards hass to pooled floor heading cards on every push', async () => {
      const hass1 = makeHass({
        entities: [{ entity_id: 'light.kitchen_lamp', state: 'on' }],
      });
      Registry.initialize(hass1, {});
      el.setConfig({ group_type: 'on', group_by_floors: true, entities: ['light.kitchen_lamp'] });
      internals.hass = hass1;
      await internals.updateComplete;

      const floorHeading = internals._floorHeadingCards.get('_none');
      expect(floorHeading).toBeTruthy();
      expect(floorHeading?.hass).toBe(hass1);

      // Membership unchanged (updated() dedups on the lights key) — the
      // heading's state-based badges still need the fresh hass.
      const hass2 = { ...hass1, states: { ...hass1.states } };
      internals.hass = hass2;
      await internals.updateComplete;
      expect(floorHeading?.hass).toBe(hass2);
    });
  });
});
