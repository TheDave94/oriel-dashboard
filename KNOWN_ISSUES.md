# Known Issues

> **⚠️ NEW FILE — pending David's approval.** Drafted by a CC session
> (2026-06-02) to capture confirmed bugs surfaced when oriel was exercised inside
> a fully-populated demo HA. It is **not yet committed**. If you'd rather these
> live in `ROADMAP.md §2` (near-term plan) than a separate doc, say so and they'll
> be moved — but these are *confirmed bugs*, not roadmap features, so a dedicated
> known-issues queue is the cleaner home.

A live queue of confirmed defects to fix, with file location, severity, and
acceptance. This is **not** a wishlist (`ROADMAP.md` holds intended feature work)
and **not** a deferral log (`DEFERRED.md` holds explicitly-held-back items).
Entries leave this file when the fix ships (note the version in `CHANGELOG.md`).

**Provenance:** these were surfaced on 2026-06-02 by building oriel into a
populated demo HA (the `ha-demo-harness` project) and exercising the full render
surface — overview sections, the sparkline, bubble drawers, the pollen card, i18n
fallbacks. The immutable "what was caught and when" record is in
`ha-demo-harness/FINDINGS.md` (§ "Demo-exercise findings"). This file is the
actionable half.

---

## Open

### F7 — bubble emission races bubble-card registration  · severity: low-medium · CONFIRMED — cold-cache/first-visit only · self-healing on reload · fix deliberately DEFERRED

- **Status:** CONFIRMED — affects **cold-cache / first-visit only**, is
  **self-healing on any reload**, and the fix is **deliberately DEFERRED**
  (rationale below).
- **Where:** `src/views/OverviewViewStrategy.ts` bubble-drawer emission (the
  `isBubbleCardInstalled()` gate evaluated at strategy `generate()` time), the
  per-view strategies (lights/covers/climate/room — each evaluates the same gate
  independently), and the asynchronous load of the `bubble-card` HACS resource.
- **Mechanism (confirmed):** `bubble-card` is an **async HACS resource**; every
  bubble surface gates on a synchronous `customElements.get('bubble-card')` at
  strategy `generate()` time. HA **never re-invokes `generate()`** on resource
  load, and HA's `whenDefined`→`ll-rebuild` rescue net lives **below** strategies
  — it upgrades emitted-but-undefined cards, but **cannot rescue configs a
  strategy never emitted**. Per-view strategies each evaluate the gate
  independently and their output is **cached for the session**; the overview
  pop-up emission does an `await import()` first, giving `bubble-card`
  asymmetrically more time to register than the per-view paths.
- **Evidence — demo (cold, harness v0.1.4):** on a fresh-cache load, after HA's
  ~9s bootstrap auto-reload, drawers were absent **4/4 runs** even though
  `bubble-card` registered ~400ms into the document; **one explicit reload
  recovers fully (35 pop-ups)**. Resource registration itself is clean and fast
  every time.
- **Evidence — production (warm, 2026-06-07):** read-only diagnostic confirmed
  `bubble-card` registered (`/hacsfiles/Bubble-Card/bubble-card.js`, 200) and
  `use_bubble_drawers: true`; browser-console tile audit on a warm session:
  Lights view **19/19** actionable tiles carry `#bubble-`, room view **20/20**,
  non-actionable tiles correctly lack it. **Warm / steady-state sessions are
  unaffected.**
- **Affected population:** first-ever visit, new device, cleared cache,
  kiosk-after-cache-purge. **Zero field reports to date.**
- **Fix shape (recorded, NOT built):** *Option 1* — when `use_bubble_drawers` is
  true **AND** `bubble-card` is present in the lovelace resource list but not yet
  registered, `customElements.whenDefined('bubble-card')` → trigger **one**
  guarded re-generation so drawers appear without a manual reload. Must cover the
  overview **and** the per-view strategies (asymmetric timing); must be
  loop/flash-guarded; must **not** regress genuinely-not-installed users (the
  resource-list gate ensures `whenDefined` is never awaited for them). Medium
  regression risk (render timing).
- **Why deferred:** self-heals on any reload; steady-state users unaffected; zero
  reports; medium-risk render-timing change for a first-load-only wart. Revisit
  if a user reports it or when next touching the bubble emission code.
- **Linked latent race (same root, no separate F-number):** the `floorplan_view`
  gate (`src/oriel.ts`, `customElements.get('floorplan-card')` at `generate()`
  time) has the **identical** latent race — any F7 fix should treat both, and any
  reclassification covers both.

### F4 — ApexCharts sparkline renders invisible (0×0)  · severity: medium · USER-FACING · ✅ FIXED v4.17.1 (#114)

- **Where:** `src/cards/SparklineCard.ts` (the `use_apexcharts: true` render
  path).
- **Bug (root cause):** the apex render path bound config via the lit `.config=`
  **property**, but `apexcharts-card` (RomRider) has **no `set config()`
  accessor** — it configures only via its **`setConfig()` method**. The property
  bind was a silent no-op, so the delegate was never configured and rendered an
  empty **0×0** shadow, leaving the chart **invisible** to any user who enables
  `use_apexcharts`. (The earlier "missing `<ha-card>` wrapper" diagnosis was
  **wrong** — `apexcharts-card` renders its own `ha-card` once configured.)
- **Fix (shipped v4.17.1, #114):** configure the delegate imperatively via
  `setConfig()`, cache + reuse the element, and update `.hass` per render.
  Regression-guarded by `tests/cards/SparklineCard.test.ts` (required gate) +
  `tests/e2e-browser/sparkline-apex.spec.ts` (e2e — asserts a nonzero bounding
  box on the live demo).

### F2 — `localize()` miss-semantics return the key (root fix)  · severity: medium · ⚠️ partially addressed

- **Symptom already fixed (v4.17.1, #114):** raw localization keys no longer leak
  into the rendered UI, and that's guarded by
  `tests/e2e-browser/no-raw-localization-keys.spec.ts`. The concrete leak (F1's
  missing `sections.routines`) is closed.
- **What remains open:** the underlying `localize()` miss-semantics. On a missing
  key, `localize()` still returns the key-string (truthy), so the
  `localize(...) || 'fallback'` idiom never fires — every defensive fallback is
  silently bypassed. This root change was **deferred** because it touches every
  `localize()` callsite (`src/utils/localize.ts`; representative callsite
  `src/views/OverviewViewStrategy.ts:391`).
- **Fix shape:** decide miss-semantics — either return empty/`undefined` on a miss
  so `||` fallbacks fire, or sweep callsites to an explicit default param. Audit
  all callsites either way. Medium.
- **Done when:** a missing key yields the intended fallback (or an explicit
  default) rather than the key-string. (The "no raw key in DOM" guarantee is
  already enforced by the e2e guard above.)

### F3 — custom-card schema field is `parsed_config`, not `card`/`config`  · severity: medium

- **Where:** `src/types/strategy.ts` (CustomCard schema).
- **Bug:** the field is named `parsed_config`. YAML-direct users hand-writing the
  strategy reach for the natural `card:`/`config:`, which is ignored — the card
  **silently doesn't render**. Editor-internal terminology has leaked into the
  user-facing contract.
- **Fix shape:** accept `card`/`config` as the user-facing alias (keep
  `parsed_config` for back-compat / editor output), or at minimum document the
  required field loudly and warn on the common mistake. Medium.
- **Done when:** a hand-written custom card using the documented field renders,
  and the previously-silent failure is either accepted or surfaced with a warning.

### F1 — `sections.routines` translation key missing  · severity: minor (i18n) · ✅ FIXED v4.17.1 (#114)

- **Where:** `src/translations/en.json`, `src/translations/de.json`.
- **Bug:** `sections.routines` was absent, so the Routines section header rendered
  the literal key string instead of "Routines". (Only *visible* because F2
  swallowed the fallback.)
- **Fix (shipped v4.17.1, #114):** added `sections.routines` to **both** locales
  (`en.json` → "Routines", `de.json` → "Routinen"); translation-lint enforces
  parity. The Routines header now renders its translated label in all shipped
  locales.

---

## Enhancement (not a defect)

### F6 — no knob to scope bubble-drawer pop-up emission  · enhancement

- **Where:** bubble-drawer emission path, active under `use_bubble_drawers: true`.
- **Observation:** oriel emits pop-ups for **all** actionable entities (35 in the
  demo) with no way to scope (e.g. favorites-only). Heavy DOM on entity-rich
  homes. Not a bug — by design — but worth a scoping option or a doc note about
  the cost.
- **Shape / done when:** either a config knob to limit which entities get drawers,
  or a `ROADMAP`/doc note recording the trade-off. David's call on whether it's
  worth shipping.

---

## Not an issue (recorded so it isn't rediscovered)

- **F5 — "bubble-card elements not emitted" was a test artifact.** An early DOM
  walk reported 0 emitted; a clean re-test found all 35. The walker bailed at a
  shadow-DOM boundary. **No oriel bug.** Lesson for the e2e suite: verify the DOM
  walker pierces shadow roots before concluding non-emission. Full context:
  `ha-demo-harness/FINDINGS.md`.

- **Test-coverage gap — `bubble-tile-tap-action.spec.ts` silently skips on the
  demo. ✅ FIXED in #125.** `tests/e2e-browser/bubble-tile-tap-action.spec.ts`
  gated on a precondition reading `panel.lovelace.config.strategy.use_bubble_drawers`,
  but on a *rendered* demo the panel config is already **expanded** to
  `{ title, views }` (no `strategy` key), so the precondition was always false and
  the spec **skipped** rather than ran — coverage masquerading as a pass.
  **Not a product bug.** Resolved in **PR #125**: the spec now detects bubble
  state from the *expanded* config (`card_type: 'pop-up'`) and runs via a
  reload-after-registration flow (mirroring the F6/Rung-0 spec), so it actually
  exercises a tap-action → `#bubble-` hash navigation instead of skipping.
  Surfaced while building the F6/Rung-0 e2e.
