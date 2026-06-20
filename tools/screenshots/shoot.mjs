// Oriel dashboard screenshot renderer (invoked by run.sh, which provides a ready
// ha-demo-harness on HA_URL with HA_TOKEN).
//
// Renders three images into docs/images/:
//   dashboard-floor.png  — optional components GENUINELY removed (not hidden)
//   dashboard-with.png    — optional components present (Oriel auto-detects them)
//   editor.png            — the strategy config editor (top, readable portion)
//
// The two tiers are produced by deterministically adding/removing the optional
// components Oriel detects, against one disposable demo, via HA's own APIs:
//   - HACS plugins (Bubble Card, ApexCharts) are lovelace *resources* (WS API)
//   - PollenWatch is an *integration* (config-entry REST API)
//
// Extensibility: to demonstrate a future component (e.g. the AirWatch card once it
// ships), add one entry to OPTIONAL below — it is then present in WITH and removed
// in FLOOR automatically. No other change needed.

import { chromium } from 'playwright';
import WebSocket from 'ws';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(resolve(HERE, '..', '..'), 'docs', 'images');
const URL = process.env.HA_URL || 'http://localhost:8127';
const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('HA_TOKEN not set (run via run.sh)'); process.exit(1); }
const WS_URL = URL.replace(/^http/, 'ws') + '/api/websocket';

// The optional components Oriel auto-detects. `headlessUnrenderable` marks a card
// that will not paint in headless Chromium (apexcharts-card never commits its first
// render); we remove it even for the WITH tier so Oriel falls back to its built-in
// SVG sparkline and the Trends panel renders. In a real browser, install ApexCharts
// to get the richer chart — that is the only tier difference not visible in a static shot.
const OPTIONAL = [
  { key: 'pollenwatch', kind: 'integration', domain: 'pollenwatch' },
  { key: 'bubble',      kind: 'resource',    urlIncludes: 'bubble-card' },
  { key: 'apexcharts',  kind: 'resource',    urlIncludes: 'apexcharts-card', headlessUnrenderable: true },
  // Future: { key: 'airwatch', kind: 'integration', domain: 'airwatch' },
];

// ---------- HA WebSocket (lovelace resources) ----------
function ws() {
  return new Promise((res, rej) => {
    const sock = new WebSocket(WS_URL);
    let id = 1; const pend = {};
    sock.on('message', (data) => {
      const m = JSON.parse(data);
      if (m.type === 'auth_required') return sock.send(JSON.stringify({ type: 'auth', access_token: TOKEN }));
      if (m.type === 'auth_ok') return res({
        call: (msg) => new Promise((r) => { const i = id++; pend[i] = r; sock.send(JSON.stringify({ id: i, ...msg })); }),
        close: () => sock.close(),
      });
      if (m.type === 'auth_invalid') return rej(new Error('auth_invalid'));
      if (m.type === 'result' && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    });
    sock.on('error', rej);
  });
}

async function removeResource(conn, urlIncludes) {
  const list = await conn.call({ type: 'lovelace/resources' });
  const hit = (list.result || []).find((r) => r.url.includes(urlIncludes));
  if (hit) { await conn.call({ type: 'lovelace/resources/delete', resource_id: hit.id }); return true; }
  return false;
}

// ---------- HA REST (config entries) ----------
const rest = (path, init = {}) =>
  fetch(URL + path, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', ...(init.headers || {}) } });

async function removeIntegration(domain) {
  const entries = await (await rest('/api/config/config_entries/entry')).json();
  const hit = (entries || []).find((e) => e.domain === domain);
  if (!hit) return false;
  await rest(`/api/config/config_entries/entry/${hit.entry_id}`, { method: 'DELETE' });
  return true;
}

async function entityCount(domainPrefix) {
  const states = await (await rest('/api/states')).json();
  return (states || []).filter((s) => s.entity_id.startsWith(domainPrefix)).length;
}

async function removeComponents(conn, comps) {
  for (const c of comps) {
    if (c.kind === 'resource') {
      const ok = await removeResource(conn, c.urlIncludes);
      console.log(`   - resource ${c.key}: ${ok ? 'removed' : 'absent'}`);
    } else if (c.kind === 'integration') {
      const ok = await removeIntegration(c.domain);
      // wait for the entities to actually clear from state
      for (let i = 0; i < 20 && (await entityCount(`sensor.${c.domain}_`)) > 0; i++) await sleep(1000);
      console.log(`   - integration ${c.key}: ${ok ? 'removed' : 'absent'} (sensor.${c.domain}_* left: ${await entityCount(`sensor.${c.domain}_`)})`);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Playwright rendering ----------
async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ deviceScaleFactor: 2, viewport, ignoreHTTPSErrors: true });
  await ctx.addInitScript(({ token, url }) => {
    localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1e9, refresh_token: '', expires: Date.now() + 1e12, hassUrl: url, clientId: url + '/' }));
    localStorage.setItem('selectedLanguage', '"en"');
  }, { token: TOKEN, url: URL });
  return ctx.newPage();
}

async function renderDashboard(browser, name) {
  const page = await newPage(browser, { width: 1100, height: 1400 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));
  await page.goto(`${URL}/oriel-demo/0`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(9000);
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}

  // audit: which oriel surfaces rendered + assert NO air-quality card (it doesn't exist yet)
  const audit = await page.evaluate(() => {
    const deep = (sel) => { const out = new Set(); const walk = (r) => { if (!r || !r.querySelectorAll) return; r.querySelectorAll(sel).forEach((e) => out.add(e.tagName.toLowerCase())); r.querySelectorAll('*').forEach((e) => e.shadowRoot && walk(e.shadowRoot)); }; walk(document); return [...out]; };
    return {
      pollen: deep('oriel-pollen-card').length,
      sparkSvg: deep('svg.spark').length,
      air: deep('oriel-air-quality-card, [class*="airwatch"], [class*="air-quality"]'),
    };
  });
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log(`   ${name}: pollen=${audit.pollen} sparkSvg=${audit.sparkSvg} air=${JSON.stringify(audit.air)} errs=${errs.length}`);
  if (audit.air.length) throw new Error(`air-quality card present in ${name} — must not exist yet!`);
  await page.close();
}

async function renderEditor(browser) {
  const page = await newPage(browser, { width: 820, height: 1300 });
  await page.goto(`${URL}/oriel-demo/0`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForFunction(() => {
    const r = document.querySelector('home-assistant');
    return r && r.hass && r.hass.states && Object.keys(r.hass.states).length > 20 && !!customElements.get('ll-strategy-dashboard-oriel');
  }, { timeout: 30000 });
  await page.evaluate(async () => {
    const hass = document.querySelector('home-assistant').hass;
    document.body.innerHTML = '';
    document.body.style.background = '#eef0f2';
    const host = document.createElement('div');
    host.id = 'host';
    host.style.cssText = 'width:760px;margin:20px auto;background:var(--card-background-color,#fff);padding:16px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.12)';
    document.body.appendChild(host);
    const editor = await customElements.get('ll-strategy-dashboard-oriel').getConfigElement(); // dynamic-imports the editor chunk
    editor.hass = hass;
    editor.setConfig({ type: 'custom:oriel' });
    host.appendChild(editor);
    if (editor.updateComplete) await editor.updateComplete;
    host.style.maxHeight = '1180px';     // editor is ~26000px tall; crop to the visual-config top
    host.style.overflow = 'hidden';
  });
  await page.waitForTimeout(2500);
  await (await page.$('#host')).screenshot({ path: join(OUT, 'editor.png') });
  console.log('   editor: rendered');
  await page.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const conn = await ws();
  const browser = await chromium.launch({ headless: true });

  // WITH tier: keep all detectable components; only drop the headless-unrenderable one
  console.log('==> WITH tier (optional components present)');
  await removeComponents(conn, OPTIONAL.filter((c) => c.headlessUnrenderable));
  await renderDashboard(browser, 'dashboard-with');

  // FLOOR tier: genuinely remove the remaining optional components
  console.log('==> FLOOR tier (optional components removed)');
  await removeComponents(conn, OPTIONAL.filter((c) => !c.headlessUnrenderable));
  await renderDashboard(browser, 'dashboard-floor');

  console.log('==> editor');
  await renderEditor(browser);

  await browser.close();
  conn.close();
}

main();
