// ====================================================================
// E2E — Sparkline apexcharts delegation renders (F4 regression, live HA)
// ====================================================================
// The demo dashboard configures a Trends sparkline with
// `use_apexcharts: true` (sensor.living_room_temperature). Before the
// F4 fix the card bound `.config=` on apexcharts-card — a no-op, since
// apexcharts-card configures via setConfig() — so the delegate rendered
// an empty 0×0 shadow and the chart was invisible.
//
// This spec proves the delegate actually renders: it pierces to the
// oriel-sparkline-card, finds the ha-card that apexcharts-card mounts
// inside its own shadow root, and asserts a non-zero bounding box.
// A regression to property binding collapses that box back to 0×0.
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
    { token: HA_TOKEN, url: HA_URL },
  );
});

async function waitForHaReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const ha = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
      return !!ha?.hass && !!customElements.get('ll-strategy-dashboard-oriel');
    },
    { timeout: 60_000 },
  );
}

test.describe('sparkline apexcharts delegation (F4)', () => {
  test.setTimeout(120_000);

  test('apexcharts-delegated sparkline renders an ha-card with a non-zero box', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });

    // HA reloads the page once during bootstrap on CI (~9s in). Register the
    // wait up-front, finish the first bootstrap, then block until the reload
    // has landed and re-settle — so we measure on the stable post-reload page.
    // If no reload comes (locally) the wait times out and we proceed.
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

    // apexcharts-card mounts its chart asynchronously after it receives hass;
    // poll until the delegated ha-card has a non-zero box (bounded).
    const box = await page.waitForFunction(
      () => {
        function deepFind(root: Document | ShadowRoot, sel: string): Element | null {
          const direct = root.querySelector(sel);
          if (direct) return direct;
          for (const el of root.querySelectorAll('*')) {
            const sr = (el as HTMLElement).shadowRoot;
            if (sr) {
              const found = deepFind(sr, sel);
              if (found) return found;
            }
          }
          return null;
        }
        const card = deepFind(document, 'oriel-sparkline-card');
        if (!card) return false;
        // apexcharts-card renders its own ha-card inside its shadow root;
        // search the card's subtree (piercing shadow boundaries) for it.
        const haCard = card.shadowRoot
          ? deepFind(card.shadowRoot, 'ha-card')
          : null;
        if (!haCard) return false;
        const r = haCard.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        return { width: r.width, height: r.height };
      },
      { timeout: 30_000 },
    );

    const dims = (await box.jsonValue()) as { width: number; height: number };
    // eslint-disable-next-line no-console
    console.log(`[f4] sparkline apex ha-card box: ${dims.width}×${dims.height}`);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });
});
