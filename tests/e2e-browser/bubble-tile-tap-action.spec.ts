// ====================================================================
// E2E — Bubble Card tile tap_action rewiring (ROADMAP §2)
// ====================================================================
// On a live HA install with `use_bubble_drawers: true` AND the
// bubble-card HACS plugin installed, every emitted tile of an
// actionable domain (light/climate/cover/fan/media_player) carries
// `tap_action = { action: 'navigate', navigation_path:
// '#bubble-<entity-id>' }` — replacing HA's default more-info dialog.
//
// The spec verifies two layers:
//   1. The live tile's `_config.tap_action` matches the bubble hash
//      for its entity — the strategy-output check, robust to HA's
//      event-dispatch internals.
//   2. A real (forced) Playwright click on the tile sets
//      `window.location.hash` to that path — confirming HA's action
//      pipeline honours the rewritten action. The click is forced
//      because HA tiles live deep in shadow DOM and aren't "actionable"
//      by Playwright's heuristics; a forced click still dispatches the
//      real pointer events the action-handler needs.
//
// Bubble emission (and tile rewiring) is gated on `isBubbleCardInstalled()`
// at strategy generate() time, and bubble-card is an async HACS resource —
// so the first generate() can run before it registers. This spec therefore
// waits for bubble-card to register, then RELOADS so generate() emits the
// drawers + rewires the tiles (the same flow as bubble-drawer-exclusion).
// Bubble presence is detected from the EXPANDED config (`card_type:'pop-up'`),
// NOT `config.strategy.use_bubble_drawers` — on a rendered dashboard the
// config is already expanded, which is why the old precondition always read
// false and the spec silently skipped (KNOWN_ISSUES).
//
// Hard prerequisites — the test skips entirely when:
//   - HA_URL / HA_TOKEN env vars are missing
//   - bubble-card is not registered in the browser
//   - no bubble pop-ups are emitted after reload (use_bubble_drawers off)
// Per-domain soft skips:
//   - no entity of that domain rendered as a tile on the dashboard
// ====================================================================

import { test, expect, type Page } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'oriel-dashboard';

test.skip(!HA_URL || !HA_TOKEN, 'HA_URL and HA_TOKEN env vars are required');

test.beforeEach(async ({ context }) => {
  if (!HA_URL || !HA_TOKEN) return;
  await context.addInitScript(
    ({ token, url }: { token: string; url: string }) => {
      const clientId = url.replace(/\/$/, '') + '/';
      const tokens = {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 365 * 24 * 60 * 60,
        refresh_token: '',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        hassUrl: url.replace(/\/$/, ''),
        clientId,
      };
      localStorage.setItem('hassTokens', JSON.stringify(tokens));
    },
    { token: HA_TOKEN, url: HA_URL }
  );
});

const ACTIONABLE_DOMAINS = ['light', 'climate', 'cover', 'fan', 'media_player'] as const;
type ActionableDomain = (typeof ACTIONABLE_DOMAINS)[number];

interface TileProbe {
  entity: string;
  domain: ActionableDomain;
  tapAction: { action?: string; navigation_path?: string } | undefined;
}

function expectedHashFor(entityId: string): string {
  return `#bubble-${entityId.replace(/\./g, '-')}`;
}

/**
 * Walk the full shadow tree and return the first <hui-tile-card> seen
 * for each actionable domain, along with its rendered tap_action.
 */
async function probeActionableTiles(page: Page): Promise<Record<ActionableDomain, TileProbe | null>> {
  return await page.evaluate(
    (domains) => {
      function walk(root: Document | ShadowRoot, sel: string, into: Element[]): void {
        root.querySelectorAll(sel).forEach((el) => into.push(el));
        root.querySelectorAll('*').forEach((el) => {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr) walk(sr, sel, into);
        });
      }
      const tiles: Element[] = [];
      walk(document, 'hui-tile-card', tiles);
      const out: Record<string, TileProbe | null> = {};
      for (const d of domains as string[]) out[d] = null;
      for (const t of tiles as Array<
        HTMLElement & {
          _config?: { entity?: string; tap_action?: { action?: string; navigation_path?: string } };
        }
      >) {
        const entity = t._config?.entity;
        if (!entity || typeof entity !== 'string') continue;
        const domain = entity.split('.')[0];
        if (domain && (domains as string[]).includes(domain) && !out[domain]) {
          out[domain] = { entity, domain: domain as ActionableDomain, tapAction: t._config?.tap_action };
        }
      }
      return out as Record<ActionableDomain, TileProbe | null>;
    },
    ACTIONABLE_DOMAINS as unknown as string[]
  );
}

async function waitForHaReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const ha = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
      return !!ha?.hass && !!customElements.get('ll-strategy-dashboard-oriel');
    },
    { timeout: 60_000 }
  );
}

async function bubbleCardRegistered(page: Page): Promise<boolean> {
  return await page.evaluate(() => !!customElements.get('bubble-card'));
}

/**
 * Detect whether oriel emitted bubble-card pop-ups by scanning the
 * GENERATED/expanded lovelace config (`{ title, views }` on
 * `ha-panel-lovelace`) for a `card_type: 'pop-up'` entry. The old
 * precondition read `config.strategy.use_bubble_drawers`, but a *rendered*
 * dashboard's config is already expanded (no `strategy` key) — so it was
 * always false and this spec silently skipped (KNOWN_ISSUES). Reading the
 * expanded config matches the F6/Rung-0 spec and actually reflects whether
 * bubble drawers are active.
 */
async function dashboardEmitsBubbleDrawers(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    function walkOne(root: Document | ShadowRoot, sel: string): Element | null {
      const direct = root.querySelector(sel);
      if (direct) return direct;
      for (const el of root.querySelectorAll('*')) {
        const sr = (el as HTMLElement).shadowRoot;
        if (sr) {
          const inner = walkOne(sr, sel);
          if (inner) return inner;
        }
      }
      return null;
    }
    const panel = walkOne(document, 'ha-panel-lovelace') as (HTMLElement & { lovelace?: { config?: unknown } }) | null;
    return JSON.stringify(panel?.lovelace?.config ?? {}).includes('"card_type":"pop-up"');
  });
}

test.describe('Bubble tile tap_action rewiring', () => {
  test.setTimeout(120_000);

  test('every actionable-domain tile carries the bubble navigate action, and clicking navigates to its hash', async ({
    page,
  }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });

    // HA reloads the page once during bootstrap on CI (~9s in). Register the
    // wait up-front, finish the first bootstrap, then re-settle.
    const bootstrapReload = page
      .waitForEvent('load', { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await waitForHaReady(page);
    if (await bootstrapReload) {
      await page.waitForLoadState('networkidle', { timeout: 30_000 });
      await waitForHaReady(page);
    }

    // bubble-card is a HACS resource that loads async — oriel's first
    // generate() can run before it registers, in which case NO tiles get the
    // bubble tap_action and NO pop-ups are emitted. Wait until bubble-card is
    // registered, then reload so the next generate() sees it (same flow the
    // F6/Rung-0 spec uses).
    test.skip(
      !(await bubbleCardRegistered(page)),
      'bubble-card HACS plugin not registered in the browser — install it on the test HA or skip.'
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await waitForHaReady(page);

    // Now that generate() ran with bubble-card present, confirm bubble drawers
    // are actually emitted (detected from the EXPANDED config, not the raw
    // strategy). If not, the feature is off on this harness — skip.
    const emitsBubbles = await page
      .waitForFunction(
        () => {
          function walkOne(root: Document | ShadowRoot, sel: string): Element | null {
            const direct = root.querySelector(sel);
            if (direct) return direct;
            for (const el of root.querySelectorAll('*')) {
              const sr = (el as HTMLElement).shadowRoot;
              if (sr) {
                const inner = walkOne(sr, sel);
                if (inner) return inner;
              }
            }
            return null;
          }
          const panel = walkOne(document, 'ha-panel-lovelace') as
            | (HTMLElement & { lovelace?: { config?: unknown } })
            | null;
          return JSON.stringify(panel?.lovelace?.config ?? {}).includes('"card_type":"pop-up"');
        },
        { timeout: 30_000 }
      )
      .then(() => true)
      .catch(() => false);
    test.skip(!emitsBubbles, 'no bubble pop-ups emitted after reload — use_bubble_drawers off on this harness.');
    // Sanity: the detector and the registration check agree.
    expect(await dashboardEmitsBubbleDrawers(page)).toBe(true);

    // Tiles mount into the DOM shortly after generate(); poll until at least
    // one actionable-domain hui-tile-card is present so the found-count skip
    // below reflects "no such entities" rather than "not rendered yet".
    await page.waitForFunction(
      (domains: string[]) => {
        const tiles: Element[] = [];
        const walk = (root: Document | ShadowRoot): void => {
          root.querySelectorAll('hui-tile-card').forEach((el) => tiles.push(el));
          root.querySelectorAll('*').forEach((el) => {
            const sr = (el as HTMLElement).shadowRoot;
            if (sr) walk(sr);
          });
        };
        walk(document);
        return tiles.some((t) => {
          const e = (t as { _config?: { entity?: string } })._config?.entity;
          return typeof e === 'string' && domains.includes(e.split('.')[0] ?? '');
        });
      },
      ACTIONABLE_DOMAINS as unknown as string[],
      { timeout: 30_000 }
    );

    const probes = await probeActionableTiles(page);
    const found = (Object.values(probes) as Array<TileProbe | null>).filter((p): p is TileProbe => !!p);
    test.skip(
      found.length === 0,
      'No actionable-domain tiles rendered on the dashboard — add light/climate/cover/fan/media_player entities or skip.'
    );

    // eslint-disable-next-line no-console
    console.log('[bubble-tap-action] covering:', found.map((p) => `${p.domain}=${p.entity}`).join(', '));
    const missing = ACTIONABLE_DOMAINS.filter((d) => !probes[d]);
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[bubble-tap-action] no entity on this harness for:', missing.join(', '));
    }

    // Data-level pin: every found tile carries the bubble navigate
    // action for its entity. This is what the strategy is responsible
    // for; if this fails, the rewiring is broken regardless of how
    // HA's click pipeline behaves.
    for (const probe of found) {
      expect(probe.tapAction, `tile for ${probe.entity} missing rewritten tap_action`).toEqual({
        action: 'navigate',
        navigation_path: expectedHashFor(probe.entity),
      });
    }

    // Click-path observation: drive a REAL pointer click on each tile and
    // confirm the URL hash matches the bubble navigation_path. HA's tile
    // action-handler is pointer-based — a synthetic in-page `.click()` does
    // not trigger it, so we click via a Playwright ElementHandle (real
    // pointer events). HA dispatches navigate via history for hash-only
    // paths, so window.location.hash updates.
    for (const probe of found) {
      // Close any pop-up a previous iteration opened and clear the hash, so
      // each assertion measures THIS tile's navigation. Setting
      // `location.hash` fires `hashchange`, which bubble-card listens to in
      // order to close its pop-up (a `history.replaceState` would not — the
      // open overlay would then intercept the next tile's click).
      await page.evaluate(() => {
        if (window.location.hash) window.location.hash = '';
      });
      await page.waitForFunction(() => window.location.hash === '', undefined, { timeout: 5_000 });
      await page.waitForTimeout(400);
      // Resolve the specific tile (entity lives in `_config`, not the DOM)
      // to a real ElementHandle so Playwright can issue a genuine click.
      const handle = await page.evaluateHandle((entity) => {
        const tiles: Element[] = [];
        const walk = (root: Document | ShadowRoot): void => {
          root.querySelectorAll('hui-tile-card').forEach((el) => tiles.push(el));
          root.querySelectorAll('*').forEach((el) => {
            const sr = (el as HTMLElement).shadowRoot;
            if (sr) walk(sr);
          });
        };
        walk(document);
        return (
          (tiles as Array<HTMLElement & { _config?: { entity?: string } }>).find((t) => t._config?.entity === entity) ??
          null
        );
      }, probe.entity);
      const el = handle.asElement();
      expect(el, `tile for ${probe.entity} not found in DOM`).not.toBeNull();
      await el!.scrollIntoViewIfNeeded().catch(() => undefined);
      // force:true bypasses Playwright's actionability checks — HA tiles live
      // deep in shadow DOM and aren't "actionable" by those heuristics, but a
      // forced click still dispatches the real pointer events HA's
      // action-handler needs.
      await el!.click({ force: true, timeout: 10_000 });
      await handle.dispose();
      // Action dispatch + history update is async; poll briefly.
      await page
        .waitForFunction((h) => window.location.hash === h, expectedHashFor(probe.entity), {
          timeout: 5_000,
        })
        .catch(() => undefined);
      const finalHash = await page.evaluate(() => window.location.hash);
      expect(
        finalHash,
        `clicking ${probe.entity} tile should navigate to ${expectedHashFor(probe.entity)}, got "${finalHash}"`
      ).toBe(expectedHashFor(probe.entity));
    }
  });
});
