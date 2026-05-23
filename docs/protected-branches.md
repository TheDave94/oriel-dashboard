# Protected branches — heads of open upstream PRs

This file is a **point-in-time snapshot** of every branch in `TheDave94/oriel-dashboard` that is currently the head of an **open** PR in `TheRealSimon42/simon42-dashboard-strategy`.

**Why it exists**: deleting any branch listed below auto-closes the upstream PR pointing at it. See `DEFERRED.md` → *"Branch deletion in this repo silently closes cross-fork PRs upstream"* for the history (49 PRs were silently closed by bulk branch deletion on 2026-05-19 and 2026-05-22 before this guard existed).

**Companion guard**: `.github/workflows/protect-upstream-pr-branches.yml` watches `delete` events on this repo and fails the run with a recovery command if a branch in the open-upstream-PR set is deleted. That's the smoke alarm; this file is the human-readable register.

## When to refresh this file

- Before any bulk branch deletion in this repo (manual or automated).
- When a PR in the upstream repo is opened from a branch here.
- When an upstream PR closes (the branch leaves the protected set; safe to delete).
- Pulse-check: any time the contents feel stale, regenerate.

## How to refresh

```sh
gh pr list --repo TheRealSimon42/simon42-dashboard-strategy --state open --limit 100 \
  --json number,title,headRefName,headRepositoryOwner \
  --jq '.[] | select(.headRepositoryOwner.login=="TheDave94") | "- `\(.headRefName)` — #\(.number) \(.title)"' \
  | sort
```

Paste the output below the `## Snapshot` heading and commit. The header above stays.

## Snapshot

*Captured 2026-05-23 — 17 branches.*

- `chore/auto-hide-audit` — #281 fix(areas): auto-hide section when no areas are visible + audit test
- `chore/release-please-and-eslint` — #284 chore(ci): release-please + release-build + ESLint enforcement
- `chore/translation-lint-ci` — #277 chore(ci): lint translation files (invalid JSON, dup keys, en/de parity)
- `feat/auto-detect-humidifier-valve` — #279 feat(rooms): auto-detect humidifier, valve, and water_heater entities
- `feat/custom-sections` — #283 feat: custom_sections — user-declared section blocks without forking
- `feat/editor-coverage` — #282 feat(editor): wire up show_window_contacts_in_rooms + show_door_contacts_in_rooms
- `feat/lights-sort-by-name` — #250 feat(lights): optional alphabetical sort + clarify Hue nesting (refs #168)
- `feat/snapshot-tests` — #278 test: section-builder + entity-filter unit tests + snapshots (builds on #226)
- `feat/target-section-editor` — #280 feat(editor): derive target_section dropdown from section meta map
- `fix/area-controls-order` — #249 fix(areas): return area-controls in canonical order, not entity-iteration order (closes #201)
- `grouped/battery-view-improvements` — #272 feat(batteries): area names, filter helpers, tightened binary_sensor logic + unavailable bucket
- `grouped/covers-weather` — #275 feat: weather presentation options, weather sensor row, configurable weather entity, awning icons, covers grouped by floors
- `grouped/live-overview-badges` — #271 feat(overview): five opt-in live header badges (power, unavailable count, now-playing, sun, updates)
- `grouped/optional-overview-sections` — #270 feat: six new optional overview sections (plants, agenda, todos, persons, vacuums, maintenance)
- `grouped/persons-overview-tweaks` — #276 feat: person badge controls + zone-aware presence + native search variant + Quick Lights row
- `grouped/room-view-features` — #273 feat(rooms): power-as-badge, PM1/soil-moisture detection, cameras toggle, hide-unavailable, per-room visibility
- `grouped/section-meta-security` — #274 feat: section visibility controls + Security view improvements (water leak, motorized windows, relay-opening filter, extra entities)
