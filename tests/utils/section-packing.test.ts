// ============================================================================
// Tests — section packing: row_span estimation for dense sections views (#182)
// ============================================================================
// HA's sections view aligns every grid row to the tallest section in it, and
// `dense_section_placement` alone cannot close the resulting gaps — dense
// flow only backfills empty cells, which a grid of span-1 sections doesn't
// have. The estimator gives each section a `row_span` proportional to its
// content height so short sections can pack beside tall ones. These tests
// pin the card-size model (a config-side mirror of the frontend's
// getGridOptions defaults) and the band-packing arithmetic.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  estimateCardGridSize,
  estimateSectionRowSpan,
  packSections,
  sectionKeysFor,
  measurementStoreKey,
  writeMeasuredHeights,
  readMeasuredHeights,
} from '../../src/utils/section-packing';
import type { LovelaceSectionConfig } from '../../src/types/lovelace';

beforeEach(() => {
  localStorage.clear();
});

const DENSE = { dense_section_placement: true };

describe('estimateCardGridSize — frontend default mirror', () => {
  it('tile: half section, one row; bottom features add rows, inline does not', () => {
    expect(estimateCardGridSize({ type: 'tile', entity: 'light.a' })).toEqual({
      columns: 6,
      rows: 1,
    });
    expect(
      estimateCardGridSize({
        type: 'tile',
        entity: 'lock.a',
        features: [{ type: 'lock-commands' }],
        features_position: 'inline',
      }),
    ).toEqual({ columns: 6, rows: 1 });
    expect(
      estimateCardGridSize({
        type: 'tile',
        entity: 'cover.a',
        features: [{ type: 'cover-open-close' }, { type: 'cover-position' }],
      }),
    ).toEqual({ columns: 6, rows: 3 });
  });

  it('weather-forecast: 1 + current + forecast (+1 when daily)', () => {
    expect(estimateCardGridSize({ type: 'weather-forecast', entity: 'weather.home' }).rows).toBe(3);
    expect(
      estimateCardGridSize({
        type: 'weather-forecast',
        entity: 'weather.home',
        forecast_type: 'daily',
      }).rows,
    ).toBe(4);
    expect(
      estimateCardGridSize({
        type: 'weather-forecast',
        entity: 'weather.home',
        show_current: false,
        show_forecast: false,
      }).rows,
    ).toBe(1);
  });

  it('explicit grid_options override the type default', () => {
    expect(
      estimateCardGridSize({
        type: 'tile',
        entity: 'light.a',
        grid_options: { columns: 'full' },
      }),
    ).toEqual({ columns: 'full', rows: 1 });
    expect(
      estimateCardGridSize({
        type: 'picture-entity',
        entity: 'camera.a',
        grid_options: { columns: 6, rows: 2 },
      }),
    ).toEqual({ columns: 6, rows: 2 });
  });

  it("grid_options rows 'auto' keeps the estimated type default", () => {
    expect(
      estimateCardGridSize({
        type: 'clock',
        grid_options: { columns: 6, rows: 'auto' },
      }),
    ).toEqual({ columns: 6, rows: 1 });
  });

  it('stacks aggregate their children: vertical sums, horizontal maxes', () => {
    const children = [
      { type: 'tile', entity: 'light.a' },
      { type: 'custom:some-hacs-card' },
    ];
    expect(estimateCardGridSize({ type: 'vertical-stack', cards: children }).rows).toBe(4);
    expect(estimateCardGridSize({ type: 'horizontal-stack', cards: children }).rows).toBe(3);
  });

  it('markdown height follows the content line count', () => {
    const oneLine = estimateCardGridSize({ type: 'markdown', content: 'hi' });
    const manyLines = estimateCardGridSize({
      type: 'markdown',
      content: '### Title\n\nline\nline\nline\nline',
    });
    expect(oneLine.rows).toBeLessThan(1);
    expect(manyLines.rows).toBeGreaterThan(1.5);
  });

  it('bubble-card pop-up drawers are height 0 (hash-gated overlays)', () => {
    expect(estimateCardGridSize({ type: 'custom:bubble-card', card_type: 'pop-up' }).rows).toBe(0);
  });

  it('unwraps oriel-lazy-card to the inner card', () => {
    expect(
      estimateCardGridSize({
        type: 'custom:oriel-lazy-card',
        card: { type: 'tile', entity: 'light.a' },
      }),
    ).toEqual({ columns: 6, rows: 1 });
  });

  it('unknown custom cards get the conservative full-width default', () => {
    expect(estimateCardGridSize({ type: 'custom:some-hacs-card' })).toEqual({
      columns: 12,
      rows: 3,
    });
  });
});

describe('estimateSectionRowSpan — band packing', () => {
  it('pairs half-width tiles into shared bands', () => {
    // heading (0.6) + 4 tiles in 2 bands (2) → 2.6 → round 3
    const section: LovelaceSectionConfig = {
      type: 'grid',
      cards: [
        { type: 'heading', heading: 'Lights' },
        { type: 'tile', entity: 'light.a' },
        { type: 'tile', entity: 'light.b' },
        { type: 'tile', entity: 'light.c' },
        { type: 'tile', entity: 'light.d' },
      ],
    };
    expect(estimateSectionRowSpan(section)).toBe(3);
  });

  it('full-width cards occupy their own band', () => {
    // heading (0.6) + tile (1, band flushed by the full card) + full tile (1)
    // → 2.6 → 3
    const section: LovelaceSectionConfig = {
      type: 'grid',
      cards: [
        { type: 'heading', heading: 'Areas' },
        { type: 'tile', entity: 'light.a' },
        { type: 'tile', entity: 'light.b', grid_options: { columns: 'full' } },
      ],
    };
    expect(estimateSectionRowSpan(section)).toBe(3);
  });

  it('scales with content: a 10-area section dwarfs a summary block', () => {
    const areas: LovelaceSectionConfig = {
      type: 'grid',
      cards: [
        { type: 'heading', heading: 'Haus' },
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'area',
          area: `room_${i}`,
          display_type: 'compact',
          features_position: 'inline',
          features: [{ type: 'area-controls' }],
          grid_options: { columns: 'full' as const },
        })),
      ],
    };
    const summaries: LovelaceSectionConfig = {
      type: 'grid',
      cards: [
        { type: 'heading', heading: 'Zusammenfassungen' },
        { type: 'custom:oriel-summary-card', summary: 'lights' },
        { type: 'custom:oriel-summary-card', summary: 'covers' },
      ],
    };
    const tall = estimateSectionRowSpan(areas);
    const short = estimateSectionRowSpan(summaries);
    expect(tall).toBeGreaterThanOrEqual(10);
    expect(short).toBeLessThanOrEqual(2);
  });

  it('never returns less than one row', () => {
    expect(estimateSectionRowSpan({ type: 'grid', cards: [] })).toBe(1);
    expect(
      estimateSectionRowSpan({
        type: 'grid',
        cards: [{ type: 'custom:oriel-voice-fab', grid_options: { columns: 'full', rows: 0 } }],
      }),
    ).toBe(1);
  });
});

describe('estimateSectionRowSpan — column_span scaling', () => {
  it('a section spanning two view columns packs twice as many tiles per band', () => {
    const cards = [
      { type: 'tile', entity: 'light.a' },
      { type: 'tile', entity: 'light.b' },
      { type: 'tile', entity: 'light.c' },
      { type: 'tile', entity: 'light.d' },
    ];
    expect(estimateSectionRowSpan({ type: 'grid', cards })).toBe(2);
    expect(estimateSectionRowSpan({ type: 'grid', column_span: 2, cards })).toBe(1);
  });
});

describe('sectionKeysFor', () => {
  it('keys by heading with occurrence counters, independent of position', () => {
    const sections: LovelaceSectionConfig[] = [
      { type: 'grid', cards: [{ type: 'heading', heading: 'Lights' }] },
      { type: 'grid', cards: [{ type: 'tile', entity: 'a' }] },
      { type: 'grid', cards: [{ type: 'heading', heading: 'Lights' }] },
    ];
    expect(sectionKeysFor(sections)).toEqual(['Lights#0', 'tile#0', 'Lights#1']);
    // Reordering unrelated sections keeps each section's key.
    expect(sectionKeysFor([sections[1], sections[0], sections[2]])).toEqual([
      'tile#0',
      'Lights#0',
      'Lights#1',
    ]);
  });
});

describe('packSections', () => {
  const makeSections = (): LovelaceSectionConfig[] => [
    {
      type: 'grid',
      cards: [{ type: 'heading', heading: 'Locks' }, { type: 'tile', entity: 'lock.a' }],
    },
    {
      type: 'grid',
      cards: [{ type: 'logbook', target: { entity_id: ['lock.a'] } }],
    },
  ];
  const STORE = measurementStoreKey('security');

  it('returns the input untouched when the flag is off', () => {
    const sections = makeSections();
    expect(packSections({}, sections, 'security')).toBe(sections);
    expect(packSections(undefined, sections, 'security')).toBe(sections);
    expect(sections[0].row_span).toBeUndefined();
  });

  it('annotates copies with key + estimated row_span, never mutating the input', () => {
    const sections = makeSections();
    const inputCards = sections.map((s) => s.cards);
    const packed = packSections(DENSE, sections, 'security');

    expect(packed).not.toBe(sections);
    expect(packed[0].oriel_section_key).toBe('Locks#0');
    expect(packed[0].row_span).toBe(2);
    expect(packed[1].oriel_section_key).toBe('logbook#0');
    expect(packed[1].row_span).toBe(6);

    // Input objects stay pristine — they may be user-config-owned
    // (room_view_overrides) and must never carry our bookkeeping.
    expect(sections[0].row_span).toBeUndefined();
    expect(sections[0].oriel_section_key).toBeUndefined();
    expect(sections[0].cards).toBe(inputCards[0]);
    expect(sections[0].cards).toHaveLength(2);

    // Repeated packing of the same input never accumulates anything.
    const packedAgain = packSections(DENSE, sections, 'security');
    expect(packedAgain[0].cards?.filter((c) => c.type === 'custom:oriel-section-metrics')).toHaveLength(1);
  });

  it('keeps a user-authored row_span', () => {
    const sections = makeSections();
    sections[0].row_span = 9;
    const packed = packSections(DENSE, sections, 'security');
    expect(packed[0].row_span).toBe(9);
  });

  it('prefers a stored measurement over the estimate', () => {
    writeMeasuredHeights(STORE, { 'logbook#0': 200 });
    const packed = packSections(DENSE, makeSections(), 'security');
    expect(packed[1].row_span).toBe(3); // 200px / 64 ≈ 3, not the estimated 6
    expect(packed[0].row_span).toBe(2); // unmeasured → estimate
  });

  it('scopes measurements per view', () => {
    writeMeasuredHeights(measurementStoreKey('overview'), { 'logbook#0': 200 });
    const packed = packSections(DENSE, makeSections(), 'security');
    expect(packed[1].row_span).toBe(6);
  });

  it('plants the metrics card once, in the first unconditionally-visible section', () => {
    const sections: LovelaceSectionConfig[] = [
      {
        type: 'grid',
        visibility: [{ condition: 'state', entity: 'binary_sensor.alert', state: 'on' }],
        cards: [{ type: 'custom:oriel-notification-card' }],
      },
      ...makeSections(),
    ];
    const packed = packSections(DENSE, sections, 'security');
    const hosts = packed.map((s) =>
      (s.cards ?? []).filter((c) => c.type === 'custom:oriel-section-metrics').length,
    );
    // Not in the visibility-gated banner; exactly once, in the next section.
    expect(hosts).toEqual([0, 1, 0]);
    const metrics = packed[1].cards?.at(-1);
    expect(metrics).toMatchObject({
      store_key: STORE,
      grid_options: { columns: 'full', rows: 0 },
    });
  });
});

describe('measured heights store', () => {
  const STORE = measurementStoreKey('overview');

  it('namespaces keys per dashboard and view', () => {
    // jsdom URL is http://localhost/ → dashboard segment falls back.
    expect(STORE).toBe('oriel:section-heights:v1:default/overview');
  });

  it('round-trips; a same-or-fuller snapshot replaces (stale keys drop out)', () => {
    writeMeasuredHeights(STORE, { 'Weather#0': 661, 'Overview#0': 288 });
    writeMeasuredHeights(STORE, { 'Weather#0': 500, 'Areas#0': 410 });
    expect(readMeasuredHeights(STORE)).toEqual({ 'Weather#0': 500, 'Areas#0': 410 });
  });

  it('merges a partial snapshot instead of destroying good measurements', () => {
    writeMeasuredHeights(STORE, { 'Weather#0': 661, 'Overview#0': 288, 'Areas#0': 410 });
    // Slow device: an early write sees only one section laid out.
    writeMeasuredHeights(STORE, { 'Weather#0': 700 });
    expect(readMeasuredHeights(STORE)).toEqual({
      'Weather#0': 700,
      'Overview#0': 288,
      'Areas#0': 410,
    });
  });

  it('tolerates a corrupt store', () => {
    localStorage.setItem(STORE, '{not json');
    expect(readMeasuredHeights(STORE)).toEqual({});
    writeMeasuredHeights(STORE, { 'A#0': 100 });
    expect(readMeasuredHeights(STORE)).toEqual({ 'A#0': 100 });
  });
});
