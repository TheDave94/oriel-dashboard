# Oriel dashboard screenshot harness

Reusable, committed tooling that regenerates the dashboard screenshots embedded in
the project README. Re-run it after any visible change to the strategy or the custom
cards.

Unlike a single card, a dashboard *strategy* can only be rendered against a real HA
frontend, so this harness drives the disposable **[ha-demo-harness](../../../ha-demo-harness)**
— a synthetic, location-free demo HA preloaded with Oriel, the optional components,
and 48h of recorder history.

## One command

```bash
# from the repo root (needs Docker + the ha-demo-harness checkout as a sibling dir)
tools/screenshots/run.sh
```

First run builds the demo image (`cd ../ha-demo-harness && docker compose up --build`
once, or just let `run.sh` build it). Override the harness location with
`HA_DEMO_HARNESS_DIR=/path/to/ha-demo-harness`. Keep the demo running between runs
with `KEEP_UP=1 tools/screenshots/run.sh`.

Output → `docs/images/{dashboard-floor,dashboard-with,editor}.png`.

## The two tiers (FLOOR vs WITH)

The comparison is produced deterministically against **one** demo by adding/removing
the optional components Oriel auto-detects, via HA's own APIs:

- **WITH** — components present; Oriel detects each and lights up the matching surface.
- **FLOOR** — the same components **genuinely removed** (not hidden): HACS plugins are
  deleted as lovelace *resources* (WS API), PollenWatch is removed as an *integration*
  (config-entry REST API), and the harness verifies its entities have cleared before
  shooting. So the "without" tier really lacks the components.

The component set lives in `OPTIONAL` at the top of `shoot.mjs`.

### ApexCharts caveat (honest)

`apexcharts-card` never commits its first render in headless Chromium, so the harness
removes it even for the WITH tier and Oriel falls back to its built-in SVG sparkline
(its real fallback path) — the Trends panel renders rather than showing an empty box.
This is the *only* tier difference not visible in a static shot; install ApexCharts in
a live browser to see the richer chart. Documented here so nobody mistakes the SVG
sparkline for a bug.

## Extensibility — adding the AirWatch card later

When the Oriel ↔ AirWatch air-quality card ships, demonstrating it is a one-line
change: add an entry to `OPTIONAL` in `shoot.mjs`, e.g.

```js
{ key: 'airwatch', kind: 'integration', domain: 'airwatch' },
```

It is then present in the WITH tier and removed in FLOOR automatically — regenerate and
the new card appears in `dashboard-with.png`. **Until that card exists, no air-quality
card may appear in any shot** — `shoot.mjs` asserts this and fails if one is found.

## Honesty & privacy properties (keep these)

- **Synthetic, location-free demo.** The demo home has generic names and non-real
  coordinates; no location appears in any shot.
- **Genuine tiers.** FLOOR truly lacks the optional components; nothing is faked or hidden.
- **No nonexistent features.** The air-quality-card assertion guarantees the shots never
  imply a card that hasn't shipped.

## The demo token (intentionally not a secret)

`run.sh` reads the demo HA's admin token from
`ha-demo-harness/seed/.storage/.PUBLIC_TOKEN`. That token is a fixed, well-known value
baked into the **disposable** demo image on purpose — it controls nothing real. See
`ha-demo-harness/README.md` → "The public token" for the rationale. Never reuse that
pattern for a real HA.
