// ====================================================================
// E2E — F3: `card:`-alias custom card renders (live HA)
// ====================================================================
// The demo (ha-demo-harness v0.1.3) configures a second `custom_cards`
// entry written in the natural `card:` alias form (NOT the editor's
// `parsed_config`):
//
//   { target_section: custom_cards, title: "F3 alias check",
//     card: { type: markdown, content: "F3 custom-card alias OK" } }
//
// Before the F3 fix the render path read only `parsed_config`, so a
// `card:`-only entry was silently dropped — nothing mounted. This fix
// normalizes `card`/`config` → `parsed_config` at strategy entry, so the
// markdown card must now render. This spec asserts the marker content is
// present in the rendered DOM (piercing shadow roots). A regression to
// reading only `parsed_config` makes the marker disappear.
// ====================================================================

import { test, expect, type Page } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'oriel-dashboard';
const MARKER = 'F3 custom-card alias OK';

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

test.describe('custom-card `card:` alias (F3)', () => {
  test.setTimeout(120_000);

  test('a `card:`-alias custom card mounts and shows its marker content', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });

    // HA reloads the page once during bootstrap on CI (~9s in). Register the
    // wait up-front, finish the first bootstrap, then block until the reload
    // has landed and re-settle — so we assert on the stable post-reload page.
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

    // The markdown card renders asynchronously; poll until the marker text
    // appears anywhere in the rendered DOM (piercing shadow boundaries).
    const found = await page.waitForFunction(
      (marker: string) => {
        const seen = new Set<Node>();
        function deepText(root: Document | ShadowRoot): boolean {
          if (root.textContent && root.textContent.includes(marker)) {
            // textContent of the root includes shadow content only if it is
            // light DOM; walk shadow roots explicitly to be sure.
          }
          for (const el of root.querySelectorAll('*')) {
            if ((el as HTMLElement).shadowRoot && !seen.has(el)) {
              seen.add(el);
              const sr = (el as HTMLElement).shadowRoot as ShadowRoot;
              if (sr.textContent && sr.textContent.includes(marker)) return true;
              if (deepText(sr)) return true;
            }
          }
          return (root.textContent || '').includes(marker);
        }
        return deepText(document);
      },
      MARKER,
      { timeout: 45_000 }
    );

    expect(await found.jsonValue()).toBe(true);
    // eslint-disable-next-line no-console
    console.log(`[f3] custom-card alias marker present: ${JSON.stringify(MARKER)}`);
  });
});
