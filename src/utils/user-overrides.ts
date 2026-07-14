// ====================================================================
// Per-user / per-role config overrides
// ====================================================================
// Resolves the strategy config for the currently-viewing HA user.
// HA exposes `hass.user.id` (UUID), `hass.user.is_admin` (boolean),
// and `hass.user.name` (display name). We use these to look up
// per-user / per-role overrides and deep-merge them on top of the
// base config.
//
// Addresses community pain point #1 (per-user / per-device default
// dashboards). The configuration shape is forward-compatible:
//   - `users`        — map keyed by user ID (UUID)
//   - `users_by_role`— map keyed by 'admin' / 'guest' / a label
// Both are optional; when both match a user, `users` wins.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig } from '../types/strategy';

/** Keys that must never be merged into target objects — they would
 * mutate the prototype chain (local-scope pollution). YAML parsers and
 * JSON.parse can both produce these as regular own properties when an
 * attacker supplies them, so the merge needs to skip them explicitly. */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep-merge two plain objects. Arrays are REPLACED (not concatenated)
 * — overrides commonly want to specify a fresh list, not append.
 * Returns a new object; inputs are not mutated.
 *
 * Prototype-pollution-safe: skips any `__proto__` / `constructor` /
 * `prototype` keys in the override. See review §S-2.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  if (!override || typeof override !== 'object') return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    const b = (base as Record<string, unknown>)[key];
    const o = (override as Record<string, unknown>)[key];
    if (
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b) &&
      o !== null &&
      typeof o === 'object' &&
      !Array.isArray(o)
    ) {
      out[key] = deepMerge(b as Record<string, unknown>, o as Record<string, unknown>);
    } else if (o !== undefined) {
      out[key] = o;
    }
  }
  return out as T;
}

interface HassUser {
  id?: string;
  name?: string;
  is_admin?: boolean;
  is_owner?: boolean;
  labels?: string[];
}

/**
 * Resolve the effective strategy config for the viewing user.
 * Reads `hass.user` and applies overrides:
 *
 *   1. Start with the base config (everything except `users` and
 *      `users_by_role`).
 *   2. If `users_by_role` is set, for each role this user matches
 *      (admin / labels), deep-merge that role's override.
 *   3. If `users` has a key matching `hass.user.id`, deep-merge
 *      that user's override last (user-specific wins over role).
 *
 * Returns the base config unchanged when no `users` /
 * `users_by_role` is configured. Forward-compatible: existing
 * dashboards aren't affected.
 */
export function resolveUserConfig(
  config: OrielConfig,
  hass: HomeAssistant,
): OrielConfig {
  const users = (config as { users?: Record<string, { override?: OrielConfig }> }).users;
  const usersByRole = (config as {
    users_by_role?: Record<string, { override?: OrielConfig }>;
  }).users_by_role;
  if (!users && !usersByRole) return config;

  // Strip the user-config keys so they don't leak into resolved
  // generated views.
  const { users: _u, users_by_role: _r, ...base } =
    config as OrielConfig & {
      users?: unknown;
      users_by_role?: unknown;
    };
  void _u;
  void _r;

  let resolved: OrielConfig = base as OrielConfig;

  const user = (hass as unknown as { user?: HassUser }).user;
  if (!user) return resolved;

  // Role-level overrides first (broadest)
  if (usersByRole) {
    if (user.is_admin === true && usersByRole.admin?.override) {
      resolved = deepMerge(
        resolved as Record<string, unknown>,
        usersByRole.admin.override as Record<string, unknown>,
      ) as OrielConfig;
    }
    // Case-insensitive on BOTH sides: HA labels are user-typed ('Guest')
    // and so are the YAML keys — visibility.ts's role matcher lowercases
    // both, and the two matchers must agree.
    const byRoleLower = new Map(
      Object.entries(usersByRole).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const labels = (user.labels ?? []).map((l) => l.toLowerCase());
    for (const label of labels) {
      const entry = byRoleLower.get(label);
      if (entry?.override) {
        resolved = deepMerge(
          resolved as Record<string, unknown>,
          entry.override as Record<string, unknown>,
        ) as OrielConfig;
      }
    }
  }

  // User-specific override (narrowest, applies last)
  if (users && user.id) {
    const entry = users[user.id];
    if (entry?.override) {
      resolved = deepMerge(
        resolved as Record<string, unknown>,
        entry.override as Record<string, unknown>,
      ) as OrielConfig;
    }
  }

  return resolved;
}
