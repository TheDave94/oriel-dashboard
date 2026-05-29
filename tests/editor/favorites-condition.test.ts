// ============================================================================
// Tests — favorites state-gating editor surface (simon42#131, PRINCIPLES §1/§3)
// ============================================================================
// Two pins:
//   1. Pure mutators (favoriteEntryId / favoriteShowWhenText /
//      favoriteHasAdvancedVisibility / setFavoriteShowWhen) — the
//      string↔object conversion the editor relies on, kept sparse.
//   2. Render — conditional favorites show their NAME (not [object Object]),
//      a bare favorite gets an empty condition input, a show_when favorite
//      reflects its value, and a raw-visibility favorite shows the
//      non-editable "advanced" chip instead of an input.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { render, html } from 'lit';

import {
  renderFavoritesTab,
  favoriteEntryId,
  favoriteShowWhenText,
  favoriteHasAdvancedVisibility,
  setFavoriteShowWhen,
  type FavoritesTabContext,
} from '../../src/editor/tabs/FavoritesTab';
import type { OrielConfig, FavoriteEntityEntry } from '../../src/types/strategy';

describe('favorites entry pure helpers', () => {
  it('favoriteEntryId reads both string and object forms', () => {
    expect(favoriteEntryId('light.a')).toBe('light.a');
    expect(favoriteEntryId({ entity: 'light.b', show_when: 'on' })).toBe('light.b');
  });

  it('favoriteShowWhenText renders the condition for display', () => {
    expect(favoriteShowWhenText('light.a')).toBe('');
    expect(favoriteShowWhenText({ entity: 'x', show_when: 'on' })).toBe('on');
    expect(favoriteShowWhenText({ entity: 'x', show_when: ['on', 'auto'] })).toBe('on, auto');
    expect(favoriteShowWhenText({ entity: 'x' })).toBe('');
  });

  it('favoriteHasAdvancedVisibility detects raw visibility arrays only', () => {
    expect(favoriteHasAdvancedVisibility('light.a')).toBe(false);
    expect(favoriteHasAdvancedVisibility({ entity: 'x', show_when: 'on' })).toBe(false);
    expect(favoriteHasAdvancedVisibility({ entity: 'x', visibility: [] })).toBe(false);
    expect(
      favoriteHasAdvancedVisibility({ entity: 'x', visibility: [{ condition: 'state' }] }),
    ).toBe(true);
  });

  describe('setFavoriteShowWhen', () => {
    const entries: FavoriteEntityEntry[] = [
      'light.a',
      { entity: 'switch.b', show_when: 'on' },
      { entity: 'climate.c', visibility: [{ condition: 'state', entity: 'input_select.mode', state: 'night' }] },
    ];

    it('sets a single state → object with string show_when', () => {
      const next = setFavoriteShowWhen(entries, 'light.a', 'on');
      expect(next[0]).toEqual({ entity: 'light.a', show_when: 'on' });
    });

    it('splits comma-separated input into an any-of array', () => {
      const next = setFavoriteShowWhen(entries, 'light.a', 'on, auto');
      expect(next[0]).toEqual({ entity: 'light.a', show_when: ['on', 'auto'] });
    });

    it('clears the condition back to a bare string when emptied', () => {
      const next = setFavoriteShowWhen(entries, 'switch.b', '   ');
      expect(next[1]).toBe('switch.b');
    });

    it('leaves a raw-visibility (advanced) entry untouched', () => {
      const next = setFavoriteShowWhen(entries, 'climate.c', 'on');
      expect(next[2]).toEqual(entries[2]);
    });

    it('does not mutate the input array', () => {
      const snapshot = JSON.parse(JSON.stringify(entries));
      setFavoriteShowWhen(entries, 'light.a', 'on');
      expect(entries).toEqual(snapshot);
    });
  });
});

describe('renderFavoritesTab — condition surface', () => {
  function renderTab(
    favorite_entities: OrielConfig['favorite_entities'],
    overrides: Partial<FavoritesTabContext> = {},
  ): HTMLDivElement {
    const host = document.createElement('div');
    const ctx: FavoritesTabContext = {
      config: { favorite_entities } as OrielConfig,
      search: '',
      entityNameMap: new Map([
        ['light.a', 'Lamp A'],
        ['switch.b', 'Switch B'],
        ['climate.c', 'Thermostat C'],
      ]),
      filteredEntities: [],
      activeViewport: 'default',
      renderCheckbox: (id, label, checked) =>
        html`<input type="checkbox" id=${id} ?checked=${checked} aria-label=${label} />`,
      onSearchChange: () => undefined,
      onAddEntity: () => undefined,
      onRemoveEntity: () => undefined,
      onSetShowWhen: () => undefined,
      onToggleChange: () => undefined,
      onDragStart: () => undefined,
      onDragEnd: () => undefined,
      onDragOver: () => undefined,
      onDragLeave: () => undefined,
      onDrop: () => undefined,
      onViewportChange: () => undefined,
      onSplitByViewport: () => undefined,
      onMergeViewports: () => undefined,
      ...overrides,
    };
    render(html`${renderFavoritesTab(ctx)}`, host);
    return host;
  }

  it('renders the friendly name for a conditional favorite (no [object Object])', () => {
    const host = renderTab([{ entity: 'switch.b', show_when: 'on' }]);
    const row = host.querySelector('[data-entity-id="switch.b"]');
    expect(row).not.toBeNull();
    expect(row!.querySelector('.item-name')!.textContent).toBe('Switch B');
    expect(host.textContent).not.toContain('[object Object]');
  });

  it('bare favorite → empty condition input', () => {
    const host = renderTab(['light.a']);
    const input = host.querySelector<HTMLInputElement>('[data-entity-id="light.a"] input.fav-show-when');
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
  });

  it('show_when favorite → input reflects the condition', () => {
    const host = renderTab([{ entity: 'switch.b', show_when: ['on', 'auto'] }]);
    const input = host.querySelector<HTMLInputElement>('[data-entity-id="switch.b"] input.fav-show-when');
    expect(input!.value).toBe('on, auto');
  });

  it('raw-visibility favorite → advanced chip, no editable input', () => {
    const host = renderTab([
      { entity: 'climate.c', visibility: [{ condition: 'state', entity: 'input_select.mode', state: 'night' }] },
    ]);
    const row = host.querySelector('[data-entity-id="climate.c"]')!;
    expect(row.querySelector('.fav-advanced-chip')).not.toBeNull();
    expect(row.querySelector('input.fav-show-when')).toBeNull();
  });

  it('fires onSetShowWhen with the typed value', () => {
    let captured: [string, string] | undefined;
    const host = renderTab(['light.a'], { onSetShowWhen: (id, raw) => (captured = [id, raw]) });
    const input = host.querySelector<HTMLInputElement>('[data-entity-id="light.a"] input.fav-show-when')!;
    input.value = 'on';
    input.dispatchEvent(new Event('change'));
    expect(captured).toEqual(['light.a', 'on']);
  });
});
