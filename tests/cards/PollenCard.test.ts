// ====================================================================
// PollenCard — unit tests
// ====================================================================
// Focus: the threshold-provenance marker (v4.17 / stage-3 mirror of
// PollenWatch's bundled-card marker). Exercises both render paths:
// the dense-tile dot (consensus_tiles + raw_grid) and the chip-layout
// info-glyph (severity_chips).
//
// What the marker rule is:
//   threshold_basis "species" or null/absent -> no marker
//   threshold_basis "family" / "estimated"  -> marker visible
//
// Mounts via happy-dom + the tests/setup.ts HA-element shims. Awaits
// Lit's `updateComplete` before querying the shadow DOM because the
// marker is rendered, not attribute-reflected.
// ====================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import '../../src/cards/PollenCard';
import { setupLocalize } from '../../src/utils/localize';

type PollenCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  hass: unknown;
  updateComplete: Promise<boolean>;
};

// Mount + connect — LitElement's first update only fires once the
// element is in the DOM (connectedCallback). Without appending,
// updateComplete never resolves and tests time out.
const _mounted: PollenCardEl[] = [];
function mount(): PollenCardEl {
  const el = document.createElement('oriel-pollen-card') as PollenCardEl;
  document.body.appendChild(el);
  _mounted.push(el);
  return el;
}

// Localize must be initialised once so the marker can resolve its
// i18n keys. English is the default; we don't depend on language for
// the marker presence/absence test, only for the tooltip string text
// assertions.
beforeEach(() => {
  setupLocalize();
});

afterEach(() => {
  while (_mounted.length) _mounted.pop()!.remove();
});

// Minimal fake hass: one consensus entity + (where the card reads it)
// the matching raw entity for raw_grid. threshold_basis lives in the
// attributes of whichever entity the card looks at; for analytics
// (consensus_tiles + severity_chips) that's the *_consensus entity;
// for raw_grid (source: open_meteo) that's the per-source entity.
function consensusState(species: string, basis: string | undefined) {
  const attrs: Record<string, unknown> = {
    source_levels: { open_meteo: 2, polleninformation: 2 },
    source_count: 2,
    max_possible_sources: 3,
    level_label: 'high',
  };
  if (basis !== undefined) attrs.threshold_basis = basis;
  return { state: 'high', attributes: attrs };
}

function rawState(basis: string | undefined) {
  const attrs: Record<string, unknown> = {
    unit_of_measurement: 'grains/m³',
    level_label: 'high',
  };
  if (basis !== undefined) attrs.threshold_basis = basis;
  return { state: '45.2', attributes: attrs };
}

function fakeHass(species: string, basis: string | undefined, source = 'analytics') {
  const id =
    source === 'analytics'
      ? `sensor.pollenwatch_analytics_${species}_consensus`
      : `sensor.pollenwatch_${source}_${species}`;
  return {
    states: {
      [id]: source === 'analytics' ? consensusState(species, basis) : rawState(basis),
    },
    locale: { language: 'en' },
  };
}

async function renderMarker(
  presentation: 'consensus_tiles' | 'severity_chips' | 'raw_grid',
  species: string,
  basis: string | undefined,
  source: 'analytics' | 'open_meteo' = 'analytics',
): Promise<{ root: ShadowRoot; el: PollenCardEl }> {
  const el = mount();
  el.setConfig({ source, types: [species], presentation, show_inactive: true });
  el.hass = fakeHass(species, basis, source);
  await el.updateComplete;
  return { root: el.shadowRoot!, el };
}

describe('oriel-pollen-card — threshold provenance marker', () => {
  describe('consensus_tiles (dense-tile dot)', () => {
    it('renders the dot for basis="family"', async () => {
      const { root } = await renderMarker('consensus_tiles', 'oak', 'family');
      const marker = root.querySelector('.provenance-marker');
      expect(marker).not.toBeNull();
      expect(marker?.getAttribute('aria-label')).toBe(
        "Threshold inherited from EAACI's defined family group, not species-specific.",
      );
      expect(marker?.getAttribute('title')).toBe(
        marker?.getAttribute('aria-label'),
      );
      expect(marker?.getAttribute('role')).toBe('img');
      expect(marker?.getAttribute('tabindex')).toBe('0');
    });

    it('renders the dot for basis="estimated"', async () => {
      const { root } = await renderMarker('consensus_tiles', 'elm', 'estimated');
      const marker = root.querySelector('.provenance-marker');
      expect(marker).not.toBeNull();
      expect(marker?.getAttribute('aria-label')).toBe(
        'Estimated bracket; no per-species threshold published.',
      );
    });

    it('renders NO dot for basis="species"', async () => {
      const { root } = await renderMarker('consensus_tiles', 'birch', 'species');
      expect(root.querySelector('.provenance-marker')).toBeNull();
    });

    it('renders NO dot when threshold_basis attribute is missing', async () => {
      const { root } = await renderMarker('consensus_tiles', 'birch', undefined);
      expect(root.querySelector('.provenance-marker')).toBeNull();
    });
  });

  describe('severity_chips (info-glyph)', () => {
    it('renders the info glyph for basis="family"', async () => {
      const { root } = await renderMarker('severity_chips', 'oak', 'family');
      const marker = root.querySelector('.provenance-marker-chip');
      expect(marker).not.toBeNull();
      expect(marker?.getAttribute('icon')).toBe('mdi:information-outline');
      expect(marker?.getAttribute('aria-label')).toBe(
        "Threshold inherited from EAACI's defined family group, not species-specific.",
      );
      expect(marker?.getAttribute('title')).toBe(
        marker?.getAttribute('aria-label'),
      );
      expect(marker?.getAttribute('role')).toBe('img');
      expect(marker?.getAttribute('tabindex')).toBe('0');
    });

    it('renders the info glyph for basis="estimated"', async () => {
      const { root } = await renderMarker('severity_chips', 'elm', 'estimated');
      const marker = root.querySelector('.provenance-marker-chip');
      expect(marker).not.toBeNull();
      expect(marker?.getAttribute('aria-label')).toBe(
        'Estimated bracket; no per-species threshold published.',
      );
    });

    it('renders NO info glyph for basis="species"', async () => {
      const { root } = await renderMarker('severity_chips', 'birch', 'species');
      expect(root.querySelector('.provenance-marker-chip')).toBeNull();
    });

    it('renders NO info glyph when threshold_basis is missing', async () => {
      const { root } = await renderMarker('severity_chips', 'birch', undefined);
      expect(root.querySelector('.provenance-marker-chip')).toBeNull();
    });
  });

  describe('raw_grid (dense-tile dot, reads from raw source)', () => {
    it('renders the dot for basis="family" on the raw entity', async () => {
      const { root } = await renderMarker('raw_grid', 'oak', 'family', 'open_meteo');
      const marker = root.querySelector('.provenance-marker');
      expect(marker).not.toBeNull();
      expect(marker?.getAttribute('aria-label')).toBe(
        "Threshold inherited from EAACI's defined family group, not species-specific.",
      );
    });

    it('renders NO dot for basis="species" on the raw entity', async () => {
      const { root } = await renderMarker('raw_grid', 'birch', 'species', 'open_meteo');
      expect(root.querySelector('.provenance-marker')).toBeNull();
    });
  });

  describe('a11y + visual orthogonality', () => {
    it('marker color is var(--secondary-text-color), never a severity token', async () => {
      const { root } = await renderMarker('consensus_tiles', 'oak', 'family');
      // The CSS rule lives in the component's stylesheet, not inline.
      // Assert that NO severity-colour CSS variable appears on the
      // marker's computed/inline style — if a future refactor wires
      // the marker to a severity colour, this fails loudly.
      const marker = root.querySelector('.provenance-marker') as HTMLElement;
      const inline = marker.getAttribute('style') ?? '';
      for (const token of [
        '--red-color',
        '--orange-color',
        '--yellow-color',
        '--green-color',
        '--success-color',
        '--disabled-color',
      ]) {
        expect(inline).not.toContain(token);
      }
    });

    it('marker has both title and aria-label set to the same string (belt-and-braces)', async () => {
      const { root } = await renderMarker('consensus_tiles', 'oak', 'family');
      const marker = root.querySelector('.provenance-marker');
      expect(marker?.getAttribute('title')).toBe(marker?.getAttribute('aria-label'));
      expect((marker?.getAttribute('title') ?? '').length).toBeGreaterThan(10);
    });
  });
});

describe('oriel-pollen-card — N of M source badge (#131 audit)', () => {
  async function renderBadge(
    source: 'analytics' | 'open_meteo',
    attrs: Record<string, unknown>,
  ): Promise<ShadowRoot> {
    const el = mount();
    el.setConfig({
      source,
      types: ['grass'],
      presentation: 'consensus_tiles',
      show_inactive: true,
    });
    const id =
      source === 'analytics'
        ? 'sensor.pollenwatch_analytics_grass_consensus'
        : `sensor.pollenwatch_${source}_grass`;
    el.hass = { states: { [id]: { state: 'high', attributes: attrs } }, locale: { language: 'en' } };
    await el.updateComplete;
    return el.shadowRoot!;
  }

  it('renders N/M from the analytics consensus attributes', async () => {
    const root = await renderBadge('analytics', {
      source_count: 2,
      max_possible_sources: 3,
      source_levels: { open_meteo: 2, dwd: 0 },
    });
    const badge = root.querySelector('.tile-sources');
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe('2/3');
    // which-sources-disagree detail (Finding 2b) on the title
    expect(badge!.getAttribute('title')).toContain('open meteo: high');
    expect(badge!.getAttribute('title')).toContain('dwd: none');
  });

  it('surfaces a single-source reading as 1/3 (honesty signal)', async () => {
    const root = await renderBadge('analytics', {
      source_count: 1,
      max_possible_sources: 3,
      source_levels: { open_meteo: 2 },
    });
    expect(root.querySelector('.tile-sources')!.textContent?.trim()).toBe('1/3');
  });

  it('omits the badge gracefully when the consensus carries no source counts', async () => {
    const root = await renderBadge('analytics', { level_label: 'high' });
    expect(root.querySelector('.tile-sources')).toBeNull();
  });

  it('omits the badge for a raw source (no consensus to count)', async () => {
    const root = await renderBadge('open_meteo', {
      level_label: 'high',
      source_count: 2,
      max_possible_sources: 3,
    });
    expect(root.querySelector('.tile-sources')).toBeNull();
  });
});
