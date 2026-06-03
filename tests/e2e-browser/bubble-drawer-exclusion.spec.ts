// ====================================================================
// E2E — F6/Rung-0: bubble drawers respect excluded entities (live HA)
// ====================================================================
// The demo (ha-demo-harness v0.1.4) labels `light.kitchen_lights` with
// oriel's `no_dboard` exclusion label. Before the F6/Rung-0 fix,
// `collectBubbleCandidates` filtered bubble pop-ups by DOMAIN only and
// bypassed `Registry.isEntityExcluded()`, so the excluded light STILL got
// a pop-up drawer (hash `#bubble-light-kitchen_lights`). The fix routes
// candidate selection through the exclusion pipeline, so the excluded
// entity must get NO drawer — consistent with every other oriel surface.
//
// Assertion strategy: read the EMITTED bubble-card pop-up configs from
// oriel's GENERATED lovelace config (the expanded views on
// `ha-panel-lovelace`) and assert on the SPECIFIC entity's hash being
// absent — not a fragile total count (the live count differs from the
// registry count). Config, not rendered elements: pop-ups are invisible and
// may be lazy-wrapped (never mounting a <bubble-card>). An anchor assertion
// confirms pop-ups are emitted at all, so an empty read can't pass falsely.
//
// Note: bubble-card (a HACS resource) loads async; the strategy's first
// generate() can run before it registers (emitting zero bubbles), so the
// spec reloads once bubble-card is registered before asserting.
// ====================================================================

import { test, expect, type Page } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'oriel-dashboard';

// The excluded entity (labelled no_dboard in the v0.1.4 fixture).
const EXCLUDED_ENTITY = 'light.kitchen_lights';
const EXCLUDED_HASH = '#bubble-light-kitchen_lights';

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
 * Read the bubble-card pop-up hashes from oriel's GENERATED lovelace config
 * (the expanded `{ title, views }` on `ha-panel-lovelace`). Reading the
 * config — not rendered elements — is robust: bubble pop-ups are invisible
 * and may be lazy-wrapped (never mounting an actual <bubble-card>), but the
 * emitted card config is always present in the generated views.
 */
async function readPopupHashes(page: Page): Promise<string[]> {
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
    const cfg = panel?.lovelace?.config;
    const hashes = new Set<string>();
    const stack: unknown[] = [cfg];
    let guard = 0;
    while (stack.length && guard < 500_000) {
      guard++;
      const n = stack.pop();
      if (!n || typeof n !== 'object') continue;
      const obj = n as Record<string, unknown>;
      if (obj.card_type === 'pop-up' && typeof obj.hash === 'string') {
        hashes.add(obj.hash);
      }
      for (const k in obj) {
        const v = obj[k];
        if (v && typeof v === 'object') stack.push(v);
      }
    }
    return [...hashes];
  });
}

test.describe('bubble drawers respect excluded entities (F6/Rung-0)', () => {
  test.setTimeout(120_000);

  test(`no bubble drawer is emitted for the no_dboard-excluded ${EXCLUDED_ENTITY}`, async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });

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

    // bubble-card is a HACS resource that loads async — the strategy's first
    // generate() can run before it registers, in which case NO bubble cards
    // are emitted at all. Wait until bubble-card is registered, then reload
    // so the next generate() sees it and emits the pop-ups.
    test.skip(!(await bubbleCardRegistered(page)), 'bubble-card not registered in the browser');
    await page.reload({ waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await waitForHaReady(page);

    // Poll the generated config until bubble pop-ups appear (generate ran
    // with bubble-card present).
    await page.waitForFunction(
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
      { timeout: 45_000 }
    );

    const hashes = await readPopupHashes(page);
    // eslint-disable-next-line no-console
    console.log(`[f6] emitted ${hashes.length} bubble pop-ups; sample: ${JSON.stringify(hashes.slice(0, 6))}`);

    // Anchor: pop-ups ARE emitted (so an absent kitchen_lights is a real
    // exclusion, not a broken/empty read).
    expect(hashes.length, 'expected at least one bubble pop-up to be emitted').toBeGreaterThan(0);

    // The fix: the no_dboard-excluded entity must NOT have a drawer.
    expect(hashes, `${EXCLUDED_ENTITY} is no_dboard-excluded and must not get a bubble drawer`).not.toContain(
      EXCLUDED_HASH
    );

    // eslint-disable-next-line no-console
    console.log(`[f6] confirmed: no drawer for ${EXCLUDED_ENTITY} (${EXCLUDED_HASH})`);
  });
});
