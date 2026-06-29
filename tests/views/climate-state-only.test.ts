// ============================================================================
// Tests — Climate view surfaces state-only climate entities (#155)
// ============================================================================
// MQTT thermostats configured via YAML without a `unique_id` never get an
// entity-registry entry — they live only in hass.states. The Registry builds
// its domain maps from the registry, so these were invisible to the Climate
// view, which rendered empty. The view now merges in state-only climate
// entities via Registry.getStateOnlyEntityIdsForDomain('climate').
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';

import '../../src/views/ClimateViewStrategy';

beforeEach(() => {
  Registry.resetForTesting();
});

function tileEntities(view: any): string[] {
  const out: string[] = [];
  for (const s of view?.sections ?? [])
    for (const c of s?.cards ?? []) if (c.type === 'tile' && c.entity) out.push(c.entity);
  return out;
}

async function generate(spec: Parameters<typeof makeHass>[0]): Promise<any> {
  const hass = makeHass(spec);
  const strategy = customElements.get('ll-strategy-view-oriel-climate') as any;
  return strategy.generate({ config: {} }, hass);
}

describe('Climate view — state-only climate entities', () => {
  it('renders a state-only MQTT thermostat that has no registry entry', async () => {
    const view = await generate({
      entities: [
        // YAML/MQTT thermostat: present in states, absent from the registry.
        { entity_id: 'climate.mqtt_bedroom', stateOnly: true, state: 'heat',
          attributes: { hvac_action: 'heating', current_temperature: 21 } },
      ],
    });
    expect(tileEntities(view)).toContain('climate.mqtt_bedroom');
  });

  it('shows both registry and state-only climate entities together', async () => {
    const view = await generate({
      entities: [
        { entity_id: 'climate.registry_living', state: 'cool',
          attributes: { hvac_action: 'cooling' } },
        { entity_id: 'climate.mqtt_office', stateOnly: true, state: 'off' },
      ],
    });
    const tiles = tileEntities(view);
    expect(tiles).toContain('climate.registry_living');
    expect(tiles).toContain('climate.mqtt_office');
  });

  it('does not surface a state-only entity carrying the no_dboard label exclusion', async () => {
    // A state-only entity can't carry a label (labels live in the registry),
    // so the realistic exclusion path is config/diagnostic via state attributes.
    const view = await generate({
      entities: [
        { entity_id: 'climate.diag', stateOnly: true, state: 'heat',
          attributes: { entity_category: 'diagnostic' } },
      ],
    });
    expect(tileEntities(view)).not.toContain('climate.diag');
  });
});
