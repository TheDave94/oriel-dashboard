// ============================================================================
// Tests — Security view: tile feature uniformity (#181)
// ============================================================================
// Every controllable tile in the security view must ride its feature inline,
// exactly like the room views do. #181: lock tiles carried `lock-commands`
// but not `features_position: 'inline'`, so locks rendered with a bottom
// feature row while garages/doors/windows around them were inline. All tiles
// now flow through one builder (securityTile) — these tests pin its contract.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass, type HassFixtureSpec } from '../fixtures/hass';

import '../../src/views/SecurityViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

const SPEC: HassFixtureSpec = {
  areas: [{ area_id: 'entry', name: 'Entry' }],
  entities: [
    { entity_id: 'lock.front', area_id: 'entry', state: 'locked' },
    { entity_id: 'lock.back', area_id: 'entry', state: 'unlocked' },
    {
      entity_id: 'cover.garage',
      area_id: 'entry',
      state: 'open',
      attributes: { device_class: 'garage' },
    },
    {
      entity_id: 'binary_sensor.front_window',
      area_id: 'entry',
      state: 'off',
      attributes: { device_class: 'window' },
    },
  ],
};

async function generate(config: Record<string, unknown> = {}): Promise<any> {
  const hass = makeHass(SPEC);
  const strategy = customElements.get('ll-strategy-view-oriel-security') as any;
  return strategy.generate({ config }, hass);
}

function tileFor(view: any, entityId: string): any {
  return (view.sections as any[])
    .flatMap((s) => s.cards ?? [])
    .find((c: any) => c.type === 'tile' && c.entity === entityId);
}

describe('Security view — tile features (#181)', () => {
  it('lock tiles carry lock-commands inline, in both state groups', async () => {
    const view = await generate();
    for (const entity of ['lock.front', 'lock.back']) {
      const tile = tileFor(view, entity);
      expect(tile, entity).toBeDefined();
      expect(tile.features, entity).toEqual([{ type: 'lock-commands' }]);
      expect(tile.features_position, entity).toBe('inline');
    }
  });

  it('cover tiles carry cover-open-close inline', async () => {
    const view = await generate();
    const tile = tileFor(view, 'cover.garage');
    expect(tile.features).toEqual([{ type: 'cover-open-close' }]);
    expect(tile.features_position).toBe('inline');
  });

  it('contact-sensor tiles stay plain state tiles', async () => {
    const view = await generate();
    const tile = tileFor(view, 'binary_sensor.front_window');
    expect(tile.features).toBeUndefined();
    expect(tile.features_position).toBeUndefined();
    expect(tile.state_content).toBe('last_changed');
  });

  it('extra entities keep their state + last_changed content and no feature', async () => {
    const view = await generate({ security_extra_entities: ['binary_sensor.front_window'] });
    const extras = (view.sections as any[])
      .flatMap((s) => s.cards ?? [])
      .filter((c: any) => c.type === 'tile' && c.state_content?.length === 2);
    expect(extras).toHaveLength(1);
    expect(extras[0]).toMatchObject({
      entity: 'binary_sensor.front_window',
      state_content: ['state', 'last_changed'],
    });
    expect(extras[0].features).toBeUndefined();
  });
});
