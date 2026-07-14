// ====================================================================
// Section Packing — row_span sizing for dense sections views (#182)
// ====================================================================
// HA's sections view is a row-major CSS grid: every section occupies
// `row_span` grid rows (default 1), and each implicit row track grows
// to the tallest section placed in it. With all sections at span 1, a
// short section sitting next to a tall one leaves the full height
// difference as a vertical gap — and `dense_section_placement`
// (`grid-auto-flow: row dense`) cannot close it, because dense flow
// only backfills *empty cells*, which a span-1 grid rarely has (#182).
//
// The packing mechanism HA actually provides is per-section `row_span`
// (frontend PR #21742): a section spanning rows proportional to its
// content height turns the view grid into fine-grained tracks that
// short sections can stack beside. This module produces those spans,
// in two tiers:
//
//  1. MEASURED (exact): `oriel-section-metrics` (an invisible card the
//     strategy plants in packed views) records each section's real
//     rendered height into localStorage, sharded per dashboard + view.
//     The next strategy run converts pixels to spans. Heights are
//     taken from the hui-section content box, which doesn't depend on
//     the section's own row_span — so there is no feedback loop.
//     Storage is per device, which is right: heights are
//     viewport-dependent.
//
//  2. ESTIMATED (first paint / fallback): a config-side mirror of the
//     frontend's card sizing (hui-grid-section + compute-card-grid-size
//     + each card's getGridOptions defaults): a grid section is 12
//     columns wide (times its column_span), one row unit is 56px + 8px
//     gap, numeric `grid_options.rows` are exact, auto heights are
//     estimated per card type (constants calibrated against live
//     rendering, 2026-07-14). Estimates only need to be *proportional*
//     across sections — the view grid stretches its auto tracks to fit.
//
// packSections() is PURE with respect to its input: it returns new
// section objects and never mutates the ones passed in. That matters
// because room_view_overrides sections are user-config-owned — stamping
// them would leak bookkeeping into saved config (and throw on frozen
// config objects).
// ====================================================================

import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';

/** Columns in a HA grid section (hui-grid-section --base-column-count). */
const SECTION_COLUMNS = 12;

/** One section row unit in px: 56px row height + 8px row gap. */
export const SECTION_ROW_UNIT_PX = 64;

/** localStorage key prefix for measured section heights. Sharded per
 *  dashboard + view (one key per view) so dashboards on the same device
 *  can't clobber each other and reads stay small. */
export const SECTION_HEIGHTS_STORAGE_PREFIX = 'oriel:section-heights:v1';

export interface EstimatedGridSize {
  columns: number | 'full';
  /** Estimated height in section row units. Fractional values are
   *  allowed for auto-height cards; sums are rounded per section. */
  rows: number;
}

/** Height of a heading card relative to one row unit (26px measured). */
const HEADING_ROWS = 0.5;

/** Fallback for card types we can't model (user YAML, HACS cards).
 *  Live-calibrated: arbitrary custom cards measured 196–353px (3–5.5
 *  units), so 3 errs low without dwarfing known small cards. */
const UNKNOWN_CARD: EstimatedGridSize = { columns: SECTION_COLUMNS, rows: 3 };

/**
 * Size estimates for card types whose frontend default is
 * `rows: 'auto'` — types where the config alone can't tell the height.
 * Calibrated against live rendering where noted. Oriel-card entries
 * mirror each card's own getGridOptions() defaults (columns) — keep
 * them in sync when a card's sizing changes.
 */
const AUTO_SIZE_BY_TYPE: Record<string, EstimatedGridSize> = {
  'energy-distribution': { columns: 12, rows: 6 },
  'todo-list': { columns: 12, rows: 4 },
  calendar: { columns: 12, rows: 5 },
  clock: { columns: 6, rows: 1 }, // 56px measured
  'custom:search-card': { columns: 12, rows: 1 },
  // ZonePresenceCard.getGridOptions(): columns 6 (half-section by design)
  'custom:oriel-zone-presence-card': { columns: 6, rows: 1 },
  'custom:oriel-pollen-card': { columns: 12, rows: 1.5 }, // 92px measured
  'custom:oriel-air-quality-card': { columns: 12, rows: 2.5 }, // 146px measured
  'custom:oriel-notification-card': { columns: 12, rows: 1 },
  'custom:oriel-camera-card': { columns: 12, rows: 4 },
  'custom:oriel-covers-group-card': { columns: 12, rows: 4 },
};

/**
 * Default grid size per card type, mirroring the frontend's per-card
 * `getGridOptions()` implementations. Explicit `grid_options` in the
 * config override these (applied by `estimateCardGridSize`).
 */
function defaultSizeForType(card: LovelaceCardConfig): EstimatedGridSize {
  const type = card.type ?? '';

  switch (type) {
    case 'heading':
      return { columns: 'full', rows: HEADING_ROWS };

    case 'tile': {
      // hui-tile-card: 6 columns; features add a row each unless inline.
      let rows = 1;
      const features = Array.isArray(card.features) ? card.features.length : 0;
      if (features > 0 && card.features_position !== 'inline') rows += features;
      if (card.vertical) rows += 1;
      return { columns: 6, rows };
    }

    case 'area': {
      // hui-area-card: as tile, plus +2 rows (+3 with inline features)
      // for the non-compact picture display.
      let rows = 1;
      const features = Array.isArray(card.features) ? card.features.length : 0;
      const inline = card.features_position === 'inline';
      if (features > 0 && !inline) rows += features;
      if (card.vertical) rows += 1;
      if ((card.display_type ?? 'picture') !== 'compact') {
        rows += inline && features > 0 ? 3 : 2;
      }
      return { columns: 6, rows };
    }

    case 'weather-forecast': {
      // hui-weather-forecast-card: 1 + current + forecast (+1 if daily).
      let rows = 1;
      if (card.show_current !== false) rows += 1;
      if (card.show_forecast !== false) {
        rows += 1;
        if (card.forecast_type === 'daily') rows += 1;
      }
      return { columns: SECTION_COLUMNS, rows };
    }

    case 'logbook':
      return { columns: SECTION_COLUMNS, rows: 6 };

    case 'map':
      return { columns: 'full', rows: 4 };

    case 'markdown': {
      // Height follows the text. One rendered line ≈ 28px (0.55 units)
      // measured; headings/margins push longer content toward 0.35/line.
      const lines =
        typeof card.content === 'string'
          ? card.content.split('\n').filter((l) => l.trim() !== '').length
          : 1;
      return {
        columns: SECTION_COLUMNS,
        rows: Math.min(6, Math.max(0.5, 0.2 + 0.35 * lines)),
      };
    }

    case 'vertical-stack': {
      // Children stack vertically: heights add up.
      const cards = Array.isArray(card.cards) ? (card.cards as LovelaceCardConfig[]) : [];
      const rows = cards.reduce((sum, c) => sum + estimateCardGridSize(c).rows, 0);
      return { columns: SECTION_COLUMNS, rows: Math.max(rows, 1) };
    }

    case 'horizontal-stack': {
      // Children share the row: height is the tallest child.
      const cards = Array.isArray(card.cards) ? (card.cards as LovelaceCardConfig[]) : [];
      const rows = cards.reduce((max, c) => Math.max(max, estimateCardGridSize(c).rows), 0);
      return { columns: SECTION_COLUMNS, rows: Math.max(rows, 1) };
    }

    case 'custom:oriel-summary-card':
    case 'custom:oriel-sparkline-card':
      // Mirrors SummaryCard/SparklineCard.getGridOptions().
      return { columns: 6, rows: 1 };

    case 'custom:oriel-routines-card': {
      // Chip list, ~2 chips per row; 8 chips measured 307px (~4.8 units).
      const max = typeof card.max === 'number' ? card.max : 8;
      return { columns: 'full', rows: 0.5 + 0.55 * max };
    }

    case 'custom:oriel-lights-group-card': {
      // Content-measured card: roughly one header row plus internal
      // tile rows (~3 tiles per row at section width).
      const count = Array.isArray(card.entities) ? card.entities.length : 9;
      return { columns: 'full', rows: 1 + Math.ceil(count / 3) };
    }

    case 'custom:oriel-voice-fab':
    case 'custom:oriel-screensaver-card':
    case 'custom:oriel-section-metrics':
      // Overlay / bookkeeping cards — the section slot is 0-height.
      return { columns: 'full', rows: 0 };

    case 'custom:bubble-card':
      // Pop-up drawers are invisible until their URL hash is active.
      if (card.card_type === 'pop-up') return { columns: 'full', rows: 0 };
      return UNKNOWN_CARD;

    default:
      return AUTO_SIZE_BY_TYPE[type] ?? UNKNOWN_CARD;
  }
}

/**
 * Estimated grid size of a single card config: the per-type frontend
 * default, overridden by any explicit `grid_options` — same precedence
 * as hui-card ({...element, ...config}). `oriel-lazy-card` wrappers are
 * unwrapped so lazy-mounted sections size like eager ones.
 */
export function estimateCardGridSize(card: LovelaceCardConfig): EstimatedGridSize {
  if (card.type === 'custom:oriel-lazy-card' && card.card && typeof card.card === 'object') {
    const inner = estimateCardGridSize(card.card as LovelaceCardConfig);
    return applyGridOptions(inner, card.grid_options);
  }
  return applyGridOptions(defaultSizeForType(card), card.grid_options);
}

function applyGridOptions(
  base: EstimatedGridSize,
  gridOptions: LovelaceCardConfig['grid_options'],
): EstimatedGridSize {
  if (!gridOptions || typeof gridOptions !== 'object') return base;
  const opts = gridOptions as { columns?: number | 'full'; rows?: number | 'auto' };
  const columns =
    opts.columns === 'full'
      ? 'full'
      : typeof opts.columns === 'number'
        ? Math.min(Math.max(opts.columns, 1), SECTION_COLUMNS)
        : base.columns;
  const rows = typeof opts.rows === 'number' ? opts.rows : base.rows;
  return { columns, rows };
}

/**
 * Estimated height of a whole section in row units: simulates the
 * section's internal row-major flow (a full-width card or an
 * overflowing card starts a new band; a band is as tall as its tallest
 * card) and sums the bands. A section spanning multiple view columns
 * (`column_span`) multiplies the internal column count the same way
 * hui-grid-section does.
 */
export function estimateSectionRowSpan(section: LovelaceSectionConfig): number {
  const width = SECTION_COLUMNS * Math.max(1, section.column_span ?? 1);
  let total = 0;
  let usedColumns = 0;
  let bandRows = 0;

  const flush = () => {
    total += bandRows;
    usedColumns = 0;
    bandRows = 0;
  };

  for (const card of section.cards ?? []) {
    const { columns, rows } = estimateCardGridSize(card);
    const span = columns === 'full' ? width : Math.min(columns, width);
    if (usedColumns > 0 && usedColumns + span > width) flush();
    bandRows = Math.max(bandRows, rows);
    usedColumns += span;
    if (usedColumns >= width) flush();
  }
  flush();

  return Math.max(1, Math.round(total));
}

// -- Section identity --------------------------------------------------

/**
 * Stable identities for a view's sections, used to match stored
 * measurements to regenerated sections. Content-derived (first heading
 * text, else first card type) plus an occurrence counter per label —
 * so reordering or conditionally inserting sections doesn't invalidate
 * the measurements of unrelated ones. When a section's label genuinely
 * changes, its key misses and the estimator takes over, which is the
 * right degradation.
 */
export function sectionKeysFor(sections: LovelaceSectionConfig[]): string[] {
  const seen = new Map<string, number>();
  return sections.map((section) => {
    let label = '';
    for (const card of section?.cards ?? []) {
      if (card.type === 'heading' && typeof card.heading === 'string') {
        label = card.heading;
        break;
      }
    }
    if (!label) label = section?.cards?.[0]?.type ?? 'empty';
    const n = seen.get(label) ?? 0;
    seen.set(label, n + 1);
    return `${label}#${n}`;
  });
}

// -- Measured heights (written by oriel-section-metrics) --------------

/**
 * The localStorage key holding one view's measurements. Namespaced by
 * the dashboard's URL path so two Oriel dashboards on one device don't
 * clobber each other. Strategy generation and the metrics card run in
 * the same page, so both sides resolve the same key (the strategy
 * stamps it into the planted card's config).
 */
export function measurementStoreKey(viewKey: string): string {
  const dashboard =
    (typeof location !== 'undefined' && location.pathname.split('/').filter(Boolean)[0]) ||
    'default';
  return `${SECTION_HEIGHTS_STORAGE_PREFIX}:${dashboard}/${viewKey}`;
}

/** Reads one view's measured heights; {} when absent/corrupt/no DOM. */
export function readMeasuredHeights(storeKey: string): Record<string, number> {
  try {
    const raw = globalThis.localStorage?.getItem(storeKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Persists one view's measured heights. A snapshot covering at least as
 * many sections as the stored one replaces it (stale keys from renamed
 * sections drop out); a smaller snapshot — sections still streaming in
 * on a slow device — merges, so a partial early write can't destroy
 * good measurements. Failures (quota, private mode) are silently
 * ignored: the estimator covers for missing data.
 */
export function writeMeasuredHeights(storeKey: string, heights: Record<string, number>): void {
  try {
    const fresh: Record<string, number> = {};
    for (const [key, px] of Object.entries(heights)) {
      if (px > 0) fresh[key] = Math.round(px);
    }
    if (Object.keys(fresh).length === 0) return;
    const existing = readMeasuredHeights(storeKey);
    const next =
      Object.keys(fresh).length >= Object.keys(existing).length
        ? fresh
        : { ...existing, ...fresh };
    globalThis.localStorage?.setItem(storeKey, JSON.stringify(next));
  } catch {
    /* storage unavailable — estimator remains the source */
  }
}

// -- Entry point -------------------------------------------------------

/**
 * Returns the packed counterpart of a view's sections for dense
 * placement — or the input array untouched when the flag is off. Each
 * packed section is a shallow copy carrying:
 *  - `oriel_section_key`: its measurement identity,
 *  - `row_span`: from a stored measurement when one exists, otherwise
 *    from the config-side estimate (a row_span already present on the
 *    input — i.e. user-authored — is kept).
 * One section (the first unconditionally-visible one) additionally
 * hosts the invisible `oriel-section-metrics` card that keeps the
 * measurements fresh for the next run. Input sections and their card
 * arrays are never mutated.
 */
export function packSections(
  config: { dense_section_placement?: boolean } | undefined,
  sections: LovelaceSectionConfig[],
  viewKey: string,
): LovelaceSectionConfig[] {
  if (config?.dense_section_placement !== true) return sections;

  const storeKey = measurementStoreKey(viewKey);
  const measured = readMeasuredHeights(storeKey);
  const keys = sectionKeysFor(sections);

  const packed = sections.map((section, index) => {
    if (!section) return section;
    const copy: LovelaceSectionConfig = {
      ...section,
      ...(Array.isArray(section.cards) ? { cards: [...section.cards] } : {}),
    };
    const key = keys[index] ?? `#${index}`;
    copy.oriel_section_key = key;
    if (copy.row_span === undefined) {
      const px = measured[key];
      copy.row_span =
        typeof px === 'number' && px > 0
          ? Math.max(1, Math.round(px / SECTION_ROW_UNIT_PX))
          : estimateSectionRowSpan(copy);
    }
    return copy;
  });

  // Host must be unconditionally visible — a `visibility`-gated section
  // (e.g. the notification banner) may never mount its cards.
  const host = packed.find((s) => Array.isArray(s?.cards) && !s.visibility);
  host?.cards?.push({
    type: 'custom:oriel-section-metrics',
    store_key: storeKey,
    grid_options: { columns: 'full', rows: 0 },
  });

  return packed;
}
