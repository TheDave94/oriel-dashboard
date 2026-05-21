// ====================================================================
// Viewport class detection (v3.5.5)
// ====================================================================
// Categorises the current viewport into 'phone' | 'tablet' | 'wall'
// based on innerWidth. Used to pick per-device favorite lists.
//
// Boundaries match HA's own breakpoints for the sections-view layout
// to keep behaviour consistent across the dashboard.
// ====================================================================

export type ViewportClass = 'phone' | 'tablet' | 'wall';

export function detectViewportClass(): ViewportClass {
  if (typeof window === 'undefined') return 'tablet';
  const w = window.innerWidth;
  if (w < 640) return 'phone';
  if (w < 1280) return 'tablet';
  return 'wall';
}

/**
 * Resolve a `favorite_entities` config value to the actual list for
 * the current viewport. Accepts the legacy `string[]` shape and the
 * new `Record<ViewportClass, string[]>` shape with a `default`
 * fallback. Returns an empty array when nothing matches.
 */
export function resolveFavorites(
  config:
    | string[]
    | Partial<Record<ViewportClass | 'default', string[]>>
    | undefined,
): string[] {
  if (!config) return [];
  if (Array.isArray(config)) return config;
  const vp = detectViewportClass();
  return config[vp] ?? config.default ?? [];
}
