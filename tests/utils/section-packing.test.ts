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
  applySectionPacking,
  writeMeasuredHeights,
  readMeasuredHeights,
  SECTION_HEIGHTS_STORAGE_KEY,
} from '../../src/utils/section-packing';
import { densePlacement } from '../../src/utils/view-builder';
import type { LovelaceSectionConfig } from '../../src/types/lovelace';

beforeEach(() => {
  localStorage.removeItem(SECTION_HEIGHTS_STORAGE_KEY);
});

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

describe('applySectionPacking', () => {
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

  it('annotates every section with a key and an estimated row_span', () => {
    const sections = makeSections();
    applySectionPacking(sections, 'security');
    expect(sections[0].oriel_section_key).toBe('0:Locks');
    expect(sections[0].row_span).toBe(2);
    expect(sections[1].oriel_section_key).toBe('1:logbook');
    expect(sections[1].row_span).toBe(6);
  });

  it('preserves explicit row_span', () => {
    const sections = makeSections();
    sections[0].row_span = 9;
    applySectionPacking(sections, 'security');
    expect(sections[0].row_span).toBe(9);
  });

  it('prefers a stored measurement over the estimate', () => {
    writeMeasuredHeights('security', { '1:logbook': 200 });
    const sections = makeSections();
    applySectionPacking(sections, 'security');
    expect(sections[1].row_span).toBe(3); // 200px / 64 ≈ 3, not the estimated 6
    expect(sections[0].row_span).toBe(2); // unmeasured → estimate
  });

  it('scopes measurements per view key', () => {
    writeMeasuredHeights('overview', { '1:logbook': 200 });
    const sections = makeSections();
    applySectionPacking(sections, 'security');
    expect(sections[1].row_span).toBe(6);
  });

  it('plants the metrics card once, in the first section', () => {
    const sections = makeSections();
    applySectionPacking(sections, 'security');
    const metrics = sections
      .flatMap((s) => s.cards ?? [])
      .filter((c) => c.type === 'custom:oriel-section-metrics');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      view_key: 'security',
      grid_options: { columns: 'full', rows: 0 },
    });
    expect(sections[0].cards?.at(-1)?.type).toBe('custom:oriel-section-metrics');
  });
});

describe('measured heights store', () => {
  it('round-trips and replaces a view wholesale (stale keys drop out)', () => {
    writeMeasuredHeights('overview', { '0:Weather': 661, '1:Overview': 288 });
    writeMeasuredHeights('security', { '0:Locks': 120 });
    writeMeasuredHeights('overview', { '0:Weather': 500 });
    expect(readMeasuredHeights()).toEqual({
      'overview|0:Weather': 500,
      'security|0:Locks': 120,
    });
  });

  it('tolerates a corrupt store', () => {
    localStorage.setItem(SECTION_HEIGHTS_STORAGE_KEY, '{not json');
    expect(readMeasuredHeights()).toEqual({});
    writeMeasuredHeights('overview', { '0:A': 100 });
    expect(readMeasuredHeights()).toEqual({ 'overview|0:A': 100 });
  });
});

describe('densePlacement wiring', () => {
  it('packs sections only when the flag is on', () => {
    const on: LovelaceSectionConfig[] = [
      { type: 'grid', cards: [{ type: 'tile', entity: 'light.a' }] },
    ];
    expect(densePlacement({ dense_section_placement: true }, on, 'lights')).toEqual({
      dense_section_placement: true,
    });
    expect(typeof on[0].row_span).toBe('number');
    expect(on[0].oriel_section_key).toBeDefined();

    const off: LovelaceSectionConfig[] = [
      { type: 'grid', cards: [{ type: 'tile', entity: 'light.a' }] },
    ];
    expect(densePlacement({}, off, 'lights')).toEqual({});
    expect(off[0].row_span).toBeUndefined();
    expect(off[0].oriel_section_key).toBeUndefined();
  });
});
