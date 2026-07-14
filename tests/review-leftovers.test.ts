// ============================================================================
// Tests — review leftovers wave (final findings from the full-code review)
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../src/Registry';
import { evaluateVisibility } from '../src/utils/visibility';
import { makeHass } from './fixtures/hass';

import '../src/views/ClimateViewStrategy';
import '../src/views/RoomViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

describe('Registry — query-time state gate (startup race)', () => {
  it('entities whose state arrives after the build appear without a registry event', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'light.ready', state: 'on' },
        { entity_id: 'light.slow_integration', state: 'on' },
      ],
    });
    // Simulate the startup race: the slow integration's entity is
    // registered but its state hasn't arrived when the Registry builds.
    const statesLate = hass.states as Record<string, unknown>;
    const slowState = statesLate['light.slow_integration'];
    delete statesLate['light.slow_integration'];

    Registry.initialize(hass, {});
    expect(Registry.getVisibleEntityIdsForDomain('light')).toEqual(['light.ready']);

    // State arrives — registry identities unchanged, no rebuild happens,
    // but the query now includes the entity.
    statesLate['light.slow_integration'] = slowState;
    Registry.initialize(hass, {});
    expect(Registry.getVisibleEntityIdsForDomain('light')).toEqual([
      'light.ready',
      'light.slow_integration',
    ]);
  });
});

describe('Climate view — heat-pump action buckets', () => {
  it('preheating and defrosting count as Heating, not Idle', async () => {
    const hass = makeHass({
      entities: [
        {
          entity_id: 'climate.heat_pump',
          state: 'heat',
          attributes: { hvac_action: 'defrosting' },
        },
        {
          entity_id: 'climate.pre',
          state: 'heat',
          attributes: { hvac_action: 'preheating' },
        },
      ],
    });
    const strategy = customElements.get('ll-strategy-view-oriel-climate') as any;
    const view = await strategy.generate({ config: {} }, hass);
    const headings = (view.sections as any[])
      .map((s) => s.cards?.[0]?.heading as string)
      .filter(Boolean);
    const heatingHeading = headings.find((h) => /heating|heiz/i.test(h));
    expect(heatingHeading).toMatch(/\(2\)/);
  });
});

describe('Room views — water-leak sensors', () => {
  it('binary_sensor moisture (leak) gets a room badge', async () => {
    const hass = makeHass({
      areas: [{ area_id: 'bath', name: 'Bath' }],
      entities: [
        { entity_id: 'light.bath', area_id: 'bath', state: 'on' },
        {
          entity_id: 'binary_sensor.washer_leak',
          area_id: 'bath',
          state: 'on',
          attributes: { device_class: 'moisture' },
        },
      ],
    });
    const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
    const view = await strategy.generate({ area: hass.areas['bath'], config: {} }, hass);
    const badgeEntities = (view.badges ?? []).map((b: any) => b.entity);
    expect(badgeEntities).toContain('binary_sensor.washer_leak');
  });
});

describe('Visibility — entity rule with missing state means "on"', () => {
  it('shows while on, hides while off, instead of hiding forever', () => {
    const hass = makeHass({ entities: [{ entity_id: 'input_boolean.x', state: 'on' }] });
    expect(evaluateVisibility({ entity: 'input_boolean.x' }, hass)).toBe(true);
    (hass.states as any)['input_boolean.x'].state = 'off';
    expect(evaluateVisibility({ entity: 'input_boolean.x' }, hass)).toBe(false);
  });

  it('any: ANDs with sibling predicates', () => {
    const hass = makeHass({ entities: [{ entity_id: 'input_boolean.x', state: 'on' }] });
    // any matches, but the role sibling must still be evaluated (no user
    // in the fixture → role never matches → rule fails).
    expect(
      evaluateVisibility(
        { role: 'admin', any: [{ entity: 'input_boolean.x', state: 'on' }] },
        hass,
      ),
    ).toBe(false);
  });
});
