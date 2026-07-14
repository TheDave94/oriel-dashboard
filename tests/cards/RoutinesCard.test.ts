// ====================================================================
// RoutinesCard — unit tests
// ====================================================================
// Focus: the registry-label filtering (include_labels / exclude_labels,
// default exclude ['no_dboard']) and the shouldUpdate render gating
// (steady-state cost must stay O(routines), not O(all states) — see
// the CLAUDE.md willUpdate/shouldUpdate perf pattern).
//
// Labels are read from hass.entities[id].labels (entity REGISTRY),
// never from state attributes — state-only entities carry no labels.
// ====================================================================

import { describe, it, expect, afterEach, vi } from 'vitest';

import '../../src/cards/RoutinesCard';

type RoutinesEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  hass: unknown;
  updateComplete: Promise<boolean>;
};

const _mounted: RoutinesEl[] = [];
function mount(): RoutinesEl {
  const el = document.createElement('oriel-routines-card') as RoutinesEl;
  document.body.appendChild(el);
  _mounted.push(el);
  return el;
}

afterEach(() => {
  while (_mounted.length) _mounted.pop()!.remove();
});

function stateObj(name: string, lastChanged: string) {
  return {
    state: 'off',
    attributes: { friendly_name: name },
    last_changed: lastChanged,
  };
}

function fakeHass() {
  return {
    states: {
      'scene.movie_night': stateObj('Movie night', '2026-07-14T10:00:00Z'),
      'script.good_morning': stateObj('Good morning', '2026-07-14T09:00:00Z'),
      'script.internal_helper': stateObj('Internal helper', '2026-07-14T11:00:00Z'),
      'light.kitchen': { state: 'on', attributes: {} },
    },
    entities: {
      'scene.movie_night': { entity_id: 'scene.movie_night', labels: ['favorite'] },
      'script.good_morning': { entity_id: 'script.good_morning', labels: [] },
      'script.internal_helper': {
        entity_id: 'script.internal_helper',
        labels: ['no_dboard'],
      },
    },
    locale: { language: 'en' },
    callService: () => {},
  };
}

function itemNames(el: RoutinesEl): string[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.item')).map(
    (b) => b.getAttribute('aria-label') ?? '',
  );
}

describe('oriel-routines-card — label filtering', () => {
  it('excludes no_dboard-labeled entities by default (registry labels, not attributes)', async () => {
    const el = mount();
    el.setConfig({ type: 'custom:oriel-routines-card' });
    el.hass = fakeHass();
    await el.updateComplete;

    const names = itemNames(el);
    expect(names).toContain('Movie night');
    expect(names).toContain('Good morning');
    // no_dboard-labeled script must be filtered even though it has the
    // most recent last_changed (would otherwise rank first).
    expect(names).not.toContain('Internal helper');
  });

  it('include_labels keeps only entities carrying one of the labels', async () => {
    const el = mount();
    el.setConfig({ type: 'custom:oriel-routines-card', include_labels: ['favorite'] });
    el.hass = fakeHass();
    await el.updateComplete;

    expect(itemNames(el)).toEqual(['Movie night']);
  });

  it('a custom exclude_labels overrides the no_dboard default', async () => {
    const el = mount();
    el.setConfig({ type: 'custom:oriel-routines-card', exclude_labels: ['favorite'] });
    el.hass = fakeHass();
    await el.updateComplete;

    const names = itemNames(el);
    expect(names).not.toContain('Movie night');
    // no_dboard no longer excluded once the default is overridden.
    expect(names).toContain('Internal helper');
  });
});

describe('oriel-routines-card — render gating (shouldUpdate)', () => {
  it('skips re-render on a hass push where no scene/script changed', async () => {
    const el = mount();
    el.setConfig({ type: 'custom:oriel-routines-card' });
    const hass1 = fakeHass();
    el.hass = hass1;
    await el.updateComplete;

    const spy = vi.spyOn(
      Object.getPrototypeOf(el) as { render(): unknown },
      'render',
    );

    // Irrelevant entity changed (same registry object, same routine state
    // objects) — must NOT re-render.
    el.hass = {
      ...hass1,
      states: {
        ...hass1.states,
        'light.kitchen': { state: 'off', attributes: {} },
      },
    };
    await el.updateComplete;
    expect(spy).not.toHaveBeenCalled();

    // A watched scene's state object moves (e.g. it was activated → new
    // last_changed) — must re-render with the new ranking.
    el.hass = {
      ...hass1,
      states: {
        ...hass1.states,
        'scene.movie_night': stateObj('Movie night', '2026-07-14T12:00:00Z'),
      },
    };
    await el.updateComplete;
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('recollects when the entity registry reference changes (new script added)', async () => {
    const el = mount();
    el.setConfig({ type: 'custom:oriel-routines-card' });
    const hass1 = fakeHass();
    el.hass = hass1;
    await el.updateComplete;
    expect(itemNames(el)).not.toContain('Party mode');

    // Registry identity change (new entities object) + the new script.
    el.hass = {
      ...hass1,
      states: {
        ...hass1.states,
        'script.party_mode': stateObj('Party mode', '2026-07-14T12:00:00Z'),
      },
      entities: {
        ...hass1.entities,
        'script.party_mode': { entity_id: 'script.party_mode', labels: [] },
      },
    };
    await el.updateComplete;
    expect(itemNames(el)).toContain('Party mode');
  });
});
