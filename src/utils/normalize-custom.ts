// ====================================================================
// F3 — custom-* `card`/`config` render-time aliases
// ====================================================================
// The render path consumes only `parsed_config` (the editor's serialized
// output). A YAML-direct author hand-writing the strategy reaches for the
// natural `card:` / `config:` — which, pre-F3, was silently dropped (the
// card never mounted, no error). This normalizes each custom-* entry once
// at strategy entry: when `parsed_config` is absent, it is backfilled from
// `card ?? config`.
//
// Precedence: `parsed_config ?? card ?? config` — `parsed_config` (the
// editor's canonical output) ALWAYS wins, so this is purely additive and
// back-compat safe. The GUI editor still canonicalizes to `parsed_config`
// on save, so `card`/`config` are a pure-YAML-author convenience.
//
// Deliberately NOT handled here: a `yaml:` STRING input. Parsing YAML at
// render would pull `js-yaml` into the core chunk (it lives only in the
// editor chunk today) and blow the bundle budget — `yaml:` stays an
// editor-only input.
// ====================================================================

import type { OrielConfig, CustomView, CustomSection } from '../types/strategy';

// Shape shared by every custom-* entry for alias resolution. `card`/`config`
// may be a single card config or (for sections) an array of them.
type AliasFields = {
  parsed_config?: Record<string, any> | Record<string, any>[] | null;
  card?: Record<string, any> | Record<string, any>[] | null;
  config?: Record<string, any> | Record<string, any>[] | null;
};

function warnEmpty(kind: string, index: number): void {
  // Surface the previously-silent failure (matches the `[oriel] …` warn
  // convention, e.g. the floorplan-missing warning in oriel.ts).
  console.warn(
    `[oriel] custom ${kind} #${index + 1} has no card/config/parsed_config — ` +
      'nothing to render. Add a `card:` (or `config:`) object to this entry.'
  );
}

// Single-object entries: custom cards + custom badges.
function normalizeSingle<T extends AliasFields>(entry: T, kind: string, index: number): T {
  if (entry.parsed_config != null) return entry;
  const alias = entry.card ?? entry.config;
  if (alias != null) return { ...entry, parsed_config: alias };
  warnEmpty(kind, index);
  return entry;
}

// Custom sections: `parsed_config` is an ARRAY of card configs. A single
// aliased object is wrapped into an array (mirrors the editor's behaviour).
function normalizeSection(entry: CustomSection, index: number): CustomSection {
  const e = entry as CustomSection & AliasFields;
  if (e.parsed_config != null) return entry;
  const alias = e.card ?? e.config;
  if (alias != null) {
    const arr = Array.isArray(alias) ? alias : [alias];
    return { ...entry, parsed_config: arr as Record<string, any>[] };
  }
  warnEmpty('section', index);
  return entry;
}

// Custom views: reference-mode views (`ref_dashboard` + `ref_view`) resolve
// live with NO `parsed_config` — they are not empty entries, so skip them.
// Incomplete skeletons (no title/path) are dropped silently downstream, so
// only warn for a configured-but-empty view.
function normalizeView(entry: CustomView, index: number): CustomView {
  const e = entry as CustomView & AliasFields;
  if (e.parsed_config != null) return entry;
  if (entry.ref_dashboard && entry.ref_view) return entry;
  const alias = e.card ?? e.config;
  if (alias != null) return { ...entry, parsed_config: alias as Record<string, any> };
  if (entry.title && entry.path) warnEmpty('view', index);
  return entry;
}

/**
 * Normalize `card`/`config` aliases → `parsed_config` across all four
 * custom-* entry types, and warn on entries that resolve to nothing.
 * Returns a shallow-cloned config (the touched arrays are rebuilt; entries
 * that need a change are cloned) — the input is not mutated.
 */
export function normalizeCustomEntries(config: OrielConfig): OrielConfig {
  const out: OrielConfig = { ...config };
  if (Array.isArray(config.custom_cards)) {
    out.custom_cards = config.custom_cards.map((c, i) => normalizeSingle(c, 'card', i));
  }
  if (Array.isArray(config.custom_badges)) {
    out.custom_badges = config.custom_badges.map((b, i) => normalizeSingle(b, 'badge', i));
  }
  if (Array.isArray(config.custom_sections)) {
    out.custom_sections = config.custom_sections.map((s, i) => normalizeSection(s, i));
  }
  if (Array.isArray(config.custom_views)) {
    out.custom_views = config.custom_views.map((v, i) => normalizeView(v, i));
  }
  return out;
}
