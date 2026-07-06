// ============================================================================
// Tests — room views emit oriel-camera-card (on-demand live-stream wrapper)
// ============================================================================
// Room-view camera tiles previously emitted native picture-glance /
// picture-entity cards in 'auto' mode. They now emit the
// `custom:oriel-camera-card` wrapper, which renders the same native card
// plus a play/stop overlay — still image until the user starts the stream.
// The camera_hero per-area option is unchanged: the hero stays a native
// always-live picture-entity, remaining cameras get the wrapper.
// Ported from upstream simon42 #338 / community #326.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/RoomViewStrategy';
import '../../src/cards/CameraCard';

beforeEach(() => {
  Registry.resetForTesting();
});

function allCards(view: any): any[] {
  const out: any[] = [];
  const walk = (cards: any[]) => {
    for (const c of cards ?? []) {
      out.push(c);
      if (Array.isArray(c?.cards)) walk(c.cards);
    }
  };
  for (const s of view?.sections ?? []) walk(s?.cards);
  return out;
}

async function roomView(
  entities: any[],
  devices: any[] = [],
  dashboardConfig: Record<string, unknown> = {},
): Promise<any> {
  const hass = makeHass({
    areas: [{ area_id: 'area_test', name: 'Test Area' }],
    entities,
    devices,
  });
  const area = (hass.areas as Record<string, any>)['area_test'];
  const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
  return strategy.generate({ area, groups_options: {}, dashboardConfig }, hass);
}

describe('Room view — oriel-camera-card wrapper', () => {
  it('emits the wrapper for a plain camera (no companions)', async () => {
    const view = await roomView([
      { entity_id: 'camera.shed', area_id: 'area_test', state: 'idle' },
    ]);
    const card = allCards(view).find((c) => c.type === 'custom:oriel-camera-card');
    expect(card).toBeDefined();
    expect(card.entity).toBe('camera.shed');
    expect(card.entities).toBeUndefined();
    // No native picture-* cards remain for this camera.
    expect(
      allCards(view).filter(
        (c) => c.type === 'picture-entity' || c.type === 'picture-glance',
      ),
    ).toEqual([]);
  });

  it('passes companion entities through (renders as picture-glance inside)', async () => {
    const view = await roomView(
      [
        { entity_id: 'camera.door', area_id: 'area_test', state: 'idle', device_id: 'dev1' },
        {
          entity_id: 'binary_sensor.door_motion',
          area_id: 'area_test',
          state: 'off',
          device_id: 'dev1',
          attributes: { device_class: 'motion' },
        },
      ],
      [{ id: 'dev1', area_id: 'area_test' }],
    );
    const card = allCards(view).find((c) => c.type === 'custom:oriel-camera-card');
    expect(card).toBeDefined();
    expect(card.entities).toEqual([{ entity: 'binary_sensor.door_motion' }]);
  });

  it('keeps the camera_hero native and wraps only the remaining cameras', async () => {
    const view = await roomView(
      [
        { entity_id: 'camera.front', area_id: 'area_test', state: 'idle' },
        { entity_id: 'camera.back', area_id: 'area_test', state: 'idle' },
      ],
      [],
      { areas_options: { area_test: { camera_hero: true } } },
    );
    const cards = allCards(view);
    // Hero: always-live native picture-entity for the first camera.
    const hero = cards.find((c) => c.type === 'picture-entity');
    expect(hero).toBeDefined();
    expect(hero.camera_view).toBe('live');
    // The other camera gets the wrapper; the hero is not re-emitted.
    const wrapped = cards.filter((c) => c.type === 'custom:oriel-camera-card');
    expect(wrapped.map((c) => c.entity)).toEqual([
      expect.not.stringMatching(hero.entity as string),
    ]);
  });
});

describe('oriel-camera-card element', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('oriel-camera-card')).toBeDefined();
  });

  it('rejects a config without an entity', () => {
    const el = document.createElement('oriel-camera-card') as any;
    expect(() => el.setConfig({})).toThrow(/entity/i);
  });

  it('accepts a valid config and reports a default card size', () => {
    const el = document.createElement('oriel-camera-card') as any;
    el.setConfig({ entity: 'camera.door' });
    expect(el.getCardSize()).toBe(3);
  });
});
