// ====================================================================
// Plugin extension API (v4.6.0 — apiVersion: 2)
// ====================================================================
// Third-party HACS plugins can extend the strategy at load time by
// calling `window.oriel.registerSection(spec)` or
// `registerBadge(spec)`. The strategy reads both registries at
// generate() and merges plugin contributions alongside built-ins.
//
// ## Trust model
//
// **The ctx passed to a plugin's build() is the full hass object.**
// Plugins have the same authority any HACS card has on the page —
// they can read every state, call every service, and observe the
// active user's identity. This is the standard HA frontend model and
// the strategy doesn't (and can't, from the client side) sandbox it.
//
// What we DO enforce at the plugin boundary:
//   1. apiVersion gate — plugins declare an apiVersion; strategy
//      rejects anything newer than EXTENSION_API_VERSION.
//   2. Per-build 2-second wall-clock timeout (review §S-4).
//   3. Try/catch — thrown errors are logged + skipped, never break
//      generate().
//   4. v2+: return-shape validation — built configs must be plain
//      objects with a `type: string`. Malformed return values are
//      rejected at our boundary instead of at HA's downstream render.
//   5. v2+: attribution footer — every plugin-rendered section emits
//      a small "via <plugin-key>" marker so users can identify the
//      origin of every piece of their dashboard.
//
// What we DON'T do:
//   - Sandbox ctx.hass — by design (would break the API's usefulness).
//   - Restrict which entities a plugin can read — same.
//   - Verify plugin authorship / signature — HACS handles plugin
//     distribution + install; Oriel trusts whatever the user has
//     loaded via HACS.
//
// Plugin authors building against this API: assume ctx.hass is the
// real hass object. Don't store it, don't ship it off-device, and
// document any service calls or write operations clearly in your
// plugin README.
//
// ## v1 ↔ v2 compatibility
//
// v1 plugins keep working unchanged. The strategy:
//   - Accepts apiVersion: 1 and apiVersion: 2
//   - Skips return-shape validation for v1 plugins (lenient: their
//     return shape was never specified)
//   - Still applies the attribution footer to v1 outputs (uniform
//     user-visible signal across all plugins)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type {
  LovelaceSectionConfig,
  LovelaceBadgeConfig,
  LovelaceCardConfig,
} from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';

/** Highest API version this strategy understands. Bumped to 2 in v4.6.0. */
export const EXTENSION_API_VERSION = 2;

export interface ExtensionContext {
  hass: HomeAssistant;
  dashboardConfig: OrielConfig;
}

export interface SectionExtensionSpec {
  apiVersion: number;
  /** Stable id; must be unique across plugins. */
  key: string;
  /** Display label for the section heading + editor. */
  label: string;
  /** Optional MDI icon used in the editor. */
  icon?: string;
  /** Build the section content. Return `null` to skip (e.g. no entities). */
  build: (ctx: ExtensionContext) =>
    | LovelaceSectionConfig
    | null
    | Promise<LovelaceSectionConfig | null>;
}

export interface BadgeExtensionSpec {
  apiVersion: number;
  key: string;
  build: (ctx: ExtensionContext) =>
    | LovelaceBadgeConfig
    | null
    | Promise<LovelaceBadgeConfig | null>;
}

const sectionRegistry = new Map<string, SectionExtensionSpec>();
const badgeRegistry = new Map<string, BadgeExtensionSpec>();

function isCompatible(apiVersion: number, key: string): boolean {
  if (apiVersion > EXTENSION_API_VERSION) {
    console.warn(
      `[oriel] extension "${key}" requires apiVersion ${apiVersion} but strategy supports max ${EXTENSION_API_VERSION}. Skipping.`,
    );
    return false;
  }
  return true;
}

function registerSection(spec: SectionExtensionSpec): void {
  if (!spec || !spec.key || typeof spec.build !== 'function') {
    console.warn('[oriel] registerSection: invalid spec', spec);
    return;
  }
  if (!isCompatible(spec.apiVersion, spec.key)) return;
  if (sectionRegistry.has(spec.key)) {
    console.warn(
      `[oriel] extension section "${spec.key}" is already registered; ignoring duplicate.`,
    );
    return;
  }
  sectionRegistry.set(spec.key, spec);
}

function registerBadge(spec: BadgeExtensionSpec): void {
  if (!spec || !spec.key || typeof spec.build !== 'function') {
    console.warn('[oriel] registerBadge: invalid spec', spec);
    return;
  }
  if (!isCompatible(spec.apiVersion, spec.key)) return;
  if (badgeRegistry.has(spec.key)) {
    console.warn(
      `[oriel] extension badge "${spec.key}" is already registered; ignoring duplicate.`,
    );
    return;
  }
  badgeRegistry.set(spec.key, spec);
}

export function listSections(): SectionExtensionSpec[] {
  return [...sectionRegistry.values()];
}

export function listBadges(): BadgeExtensionSpec[] {
  return [...badgeRegistry.values()];
}

/** Reset both registries — for tests. */
export function _resetExtensionRegistries(): void {
  sectionRegistry.clear();
  badgeRegistry.clear();
}

/** Max wall-clock per plugin build() call. A buggy or hostile plugin that
 *  hangs (returns `await new Promise(() => {})`, fetches a slow endpoint,
 *  etc.) must not stall the whole dashboard generate(). Closes review §S-4. */
const EXTENSION_BUILD_TIMEOUT_MS = 2000;

/** Race a promise against a timeout that rejects with a tagged error. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([p, timeoutPromise]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/**
 * v2 return-shape validation for section configs. A valid section must
 * be a plain object with a string `type` field. We intentionally don't
 * deep-validate the `cards` array — HA does that downstream and
 * forwards card-level errors to its own placeholder UI. Our gate
 * exists to catch the obvious cases (build returned a string, a number,
 * an array directly, or an object missing `type`) at our boundary so
 * the failure surfaces with the plugin key for diagnosis.
 */
function isValidSectionShape(value: unknown): value is LovelaceSectionConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const t = (value as Record<string, unknown>).type;
  return typeof t === 'string' && t.length > 0;
}

function isValidBadgeShape(value: unknown): value is LovelaceBadgeConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const t = (value as Record<string, unknown>).type;
  return typeof t === 'string' && t.length > 0;
}

/**
 * HTML-escape a string for safe interpolation into the markdown card's
 * `content` field. The pluginKey is attacker-controlled under the v2
 * trust model (anyone can register a key like `<img onerror=...>`),
 * and HA's markdown card renders the content through a sanitizer we
 * don't own. Defense-in-depth: escape at our boundary so the safety
 * claim doesn't depend on a downstream sanitizer's behaviour.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wrap a section config with an attribution footer card. The footer is
 * a tiny markdown card emitted at the bottom of the plugin's section,
 * styled as text_only with a small "via <key>" marker. Gives users a
 * visible signal that the contents come from a specific plugin —
 * trust + provenance for the hostile-plugin case.
 *
 * Plugin keys are HTML-escaped before interpolation (see escapeHtml).
 */
function withAttribution(
  section: LovelaceSectionConfig,
  pluginKey: string,
): LovelaceSectionConfig {
  const existingCards = Array.isArray(section.cards) ? section.cards : [];
  const safeKey = escapeHtml(pluginKey);
  const footer: LovelaceCardConfig = {
    type: 'markdown',
    text_only: true,
    content: `<span style="font-size: 0.72em; opacity: 0.55;">via ${safeKey}</span>`,
  };
  return {
    ...section,
    cards: [...existingCards, footer],
  };
}

/**
 * Build every registered section in registry-insertion order. Failed
 * builds (rejected promises, thrown sync errors, timeouts, OR invalid
 * return shapes for v2 plugins) are logged + skipped — a buggy plugin
 * must not break the dashboard. Every successful build is annotated
 * with the plugin's attribution footer.
 */
export async function buildExtensionSections(
  ctx: ExtensionContext,
): Promise<LovelaceSectionConfig[]> {
  const out: LovelaceSectionConfig[] = [];
  for (const spec of sectionRegistry.values()) {
    try {
      const result = await withTimeout(
        Promise.resolve(spec.build(ctx)),
        EXTENSION_BUILD_TIMEOUT_MS,
        `extension section "${spec.key}"`,
      );
      if (result == null) continue;
      // v2 plugins: validate the return shape. v1 plugins kept as-is
      // for backwards-compat (their return contract was never specified
      // formally, so retroactively rejecting them would break installs).
      // Shape-validate unless the plugin EXPLICITLY declares apiVersion 1
      // (documented lenient-compat contract). A plugin that omits
      // apiVersion must not bypass the gate — `undefined >= 2` is false,
      // which used to feed malformed configs straight into HA's renderer.
      if (spec.apiVersion !== 1 && !isValidSectionShape(result)) {
        console.warn(
          `[oriel] extension section "${spec.key}" returned an invalid shape (missing or non-string \`type\`); skipping.`,
          result,
        );
        continue;
      }
      out.push(withAttribution(result as LovelaceSectionConfig, spec.key));
    } catch (err) {
      console.warn(`[oriel] extension section "${spec.key}" failed:`, err);
    }
  }
  return out;
}

export async function buildExtensionBadges(
  ctx: ExtensionContext,
): Promise<LovelaceBadgeConfig[]> {
  const out: LovelaceBadgeConfig[] = [];
  for (const spec of badgeRegistry.values()) {
    try {
      const result = await withTimeout(
        Promise.resolve(spec.build(ctx)),
        EXTENSION_BUILD_TIMEOUT_MS,
        `extension badge "${spec.key}"`,
      );
      if (result == null) continue;
      if (spec.apiVersion >= 2 && !isValidBadgeShape(result)) {
        console.warn(
          `[oriel] extension badge "${spec.key}" returned an invalid shape (missing or non-string \`type\`); skipping.`,
          result,
        );
        continue;
      }
      out.push(result as LovelaceBadgeConfig);
    } catch (err) {
      console.warn(`[oriel] extension badge "${spec.key}" failed:`, err);
    }
  }
  return out;
}

/**
 * Install the global registration entry point. Called once at strategy
 * module load. After this, plugins can call `window.oriel.*`
 * from their own scripts.
 */
export function installExtensionEntryPoint(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as {
    oriel?: {
      apiVersion: number;
      registerSection: (spec: SectionExtensionSpec) => void;
      registerBadge: (spec: BadgeExtensionSpec) => void;
    };
  }).oriel = {
    apiVersion: EXTENSION_API_VERSION,
    registerSection,
    registerBadge,
  };
}
