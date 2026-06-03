// ====================================================================
// E2E — No raw localization keys leak into the UI (F1/F2, live HA)
// ====================================================================
// F2: localize() returns the KEY when a translation is missing, so a
// missing key surfaces verbatim in the rendered DOM (e.g. the Routines
// section heading showed "sections.routines" — the F1 missing key). The
// `|| 'fallback'` guards at callsites never fire because the returned
// key is truthy.
//
// This spec scans the rendered overview's visible text across all shadow
// roots and fails if any leaf text node is exactly an Oriel translation
// key — a namespace-anchored match, so entity ids (sensor.*, light.*)
// and ordinary dotted text don't false-positive.
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

// Top-level namespaces in src/translations/*.json. A visible text token
// of the form `<namespace>.<dotted-key>` means a raw key leaked.
const NAMESPACES = [
  'dashboard', 'card', 'views', 'sections', 'summary', 'lights', 'covers',
  'security', 'batteries', 'climate', 'camera', 'humidity', 'room',
  'zone_presence', 'sticky_lock', 'editor',
];

test.describe('no raw localization keys (F1/F2)', () => {
  test.setTimeout(120_000);

  test('overview renders no verbatim translation keys', async ({ page }) => {
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
    // Let the dashboard settle so all sections (incl. Routines) render.
    await page.waitForTimeout(2_500);

    const leaked = await page.evaluate((namespaces: string[]) => {
      const re = new RegExp(`^(${namespaces.join('|')})\\.[a-z0-9_.]+$`);
      const hits: string[] = [];

      // Walk text nodes across the document + every shadow root.
      function walk(root: Document | ShadowRoot): void {
        const tw = document.createTreeWalker(
          root as unknown as Node,
          NodeFilter.SHOW_TEXT,
        );
        let n: Node | null = tw.nextNode();
        while (n) {
          const text = (n.textContent || '').trim();
          if (text) {
            for (const token of text.split(/\s+/)) {
              if (re.test(token)) hits.push(token);
            }
          }
          n = tw.nextNode();
        }
        // Recurse into shadow roots of every element under this root.
        const host = (root as ShadowRoot).host ?? (root as Document).documentElement;
        const scope = (root as Document).querySelectorAll
          ? (root as Document)
          : ((root as ShadowRoot) as unknown as Document);
        scope.querySelectorAll('*').forEach((el) => {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr) walk(sr);
        });
        void host;
      }

      walk(document);
      return Array.from(new Set(hits));
    }, NAMESPACES);

    // eslint-disable-next-line no-console
    if (leaked.length) console.log(`[f2] leaked raw keys: ${JSON.stringify(leaked)}`);
    expect(leaked, `raw localization keys visible in the UI: ${JSON.stringify(leaked)}`).toEqual([]);
  });
});
