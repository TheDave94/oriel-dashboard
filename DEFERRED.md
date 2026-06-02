# Deferred Decisions

Decisions explicitly held back, with the reasoning recorded so the choice survives staff turnover. Each entry: **what** the deferral covers, **why deferred** at the time, **trigger to revisit** — the concrete condition that would make it worth acting on.

Companion to [ROADMAP.md](ROADMAP.md). The Roadmap's §3 covers product-side deferrals; this file covers everything else (infrastructure, tooling, CI, ops).

## CI / Infrastructure

### Live-HA e2e stays local-manual / `workflow_dispatch`-only — no `HA_URL`/`HA_TOKEN` in repo secrets

**Decision**: `tests/e2e/strategy-api.test.ts` (vitest API smoke) and `tests/e2e-browser/*.spec.ts` (Playwright) run **only** locally via `.env.local`, or manually via `.github/workflows/e2e.yml`'s `workflow_dispatch` trigger using a token supplied at dispatch time. `HA_URL` and `HA_TOKEN` are **deliberately not** added to GitHub Actions repository secrets. Unit tests (vitest 4, 391 tests across 36 files) remain the load-bearing CI gate.

**Why deferred**: oriel-dashboard is a **public repo**. HA 2026.5.x has no fine-grained access tokens — `HA_TOKEN` is **full admin scope** by construction (documented at `CLAUDE.md` → *Credentials and HA API access* → "Token scope"). The only HA target on this network with the configuration the tests need (oriel deployed as a Lovelace resource, a `strategy: custom:oriel` dashboard, a representative entity set) is **production Graz**. A production-admin token in a public-repo CI secret is unacceptable surface even when the tests are read-only — a leaked admin token can do anything the user can do; "read-only tests" doesn't constrain what an attacker does with the secret. Concrete exposure vectors: fork-originated PR workflows (mitigated by GitHub's secrets-on-fork-PR rules but not eliminated for the `pull_request_target` family of events), poisoned transitive deps in the e2e toolchain (Playwright + ~50 Babel transitives + vitest), and ordinary CI-log leakage from a misbehaving step. The cost of getting this wrong (rotating the same token in three other holder files: `~/.hermes/.env`, `/opt/repos/homeassistant-config/.env.local`, oriel `.env.local`) is high enough that the deferral is worth it for the coverage we'd gain (the API smoke validates one assertion that's already validated when you actually open the dashboard).

**Trigger to revisit**: A non-production HA throwaway is stood up for oriel — purpose-built HA container with oriel deployed + a representative entity fixture (areas + lights/covers/zones/climate/security/batteries) + a `strategy: custom:oriel` dashboard. At that point, e2e moves to CI **against that throwaway**, never against Graz, with the throwaway's token (still admin-scope, but bounded to a disposable HA whose `.storage` can be regenerated). The other potential trigger is HA gaining fine-grained access tokens upstream — `CLAUDE.md` notes oriel's tests only need entity-state reads + dashboard-render; when scoping lands, the same token can become read-only and the CI calculus changes.

**Reasoning**: Scoping investigation 2026-06-02 confirmed the e2e suite is provably read-only (zero `callService`/`/api/services`/toggle-click in any spec — including `live-preview.spec.ts`, which mutates editor-local state only, never round-tripping to HA's `lovelace/save_config`). The PollenWatch throwaway at `127.0.0.1:8124` was assessed and rejected — 8 integrations (`backup`, `go2rtc`, `google_translate`, `met`, `pollenwatch`, `radio_browser`, `shopping_list`, `sun`), zero lights/covers/zones/climate, default `Overview` dashboard with no strategy — making it suitable would mean rebuilding it from scratch and would break PollenWatch's CI. The self-hosted runner on this box (`claudebox-pollenwatch`) is repo-scoped to `TheDave94/pollenwatch`, so even runner-side reuse would need a second runner registration. Net effort to wire to production Graz was ~1-2 hours; net effort to do it safely (with a throwaway) was 1-2 days plus ongoing maintenance. The right call now is to document the dormancy as deliberate and revisit when the throwaway path has a forcing reason.

**How to run locally** (the documented path): set `HA_URL` + `HA_TOKEN` in `.env.local` (already in place per `CLAUDE.md` → *Credentials and HA API access*), then `source .env.local && npm run e2e:api` for the API layer or `npm run e2e:browser` for the Playwright suite. Convention is to run before cutting a release; the unit-test gate catches almost everything before this layer would.

### Bundle size budget post-merge checkout flake — monitor for N=3

**Decision**: Monitor the "Bundle size budget" job in `.github/workflows/validate.yml` for further `actions/checkout` auth failures on post-merge `main` runs. Configuration is byte-for-byte identical to passing sibling jobs (ESLint, Unit tests, audit); the auth header is correctly configured per logs before the fetch. The failure is environmental — immediate server-side auth rejection ~200-300ms after fetch despite the `AUTHORIZATION` header being set. Two occurrences so far: PR #54 merge (run `26337726699`), PR #56 merge (run `26340521941`). At N=3, the case shifts toward something specific to this job's runner pool placement and a retry wrapper becomes justified.

**Why deferred**: No config fix is appropriate at N=2 — there's no config difference to "fix". A retry wrapper at this point would be speculative cargo. Rerun unblocks the immediate branch; the pattern is what's worth tracking.

**Trigger to revisit**: Third identical occurrence on a future merge. If it happens, the response is: (a) add `ACTIONS_RUNNER_DEBUG=true` as a repo secret to capture HTTP request headers and confirm whether the `extraheader` is being dropped at request time, then (b) decide between a retry wrapper (`if: failure()` step that re-runs checkout) or accepting the flake.

**Reasoning**: Diagnostic ran 2026-05-23, verdict (b) — *"config identical to siblings; failure is environmental"*. Bundle-size is the last job in the workflow file and may land on a different runner pool segment than its siblings; that's the most plausible structural hypothesis but unfalsifiable at N=2.

## Closed / historical record

Entries that have since been resolved. Kept for context — useful when future work touches the same area and someone wants the "why" thread.

### Branch deletion in this repo silently closes cross-fork PRs upstream — establish a safety check

**Status**: Closed 2026-05-23. Protection landed in #59 (L1 `docs/protected-branches.md` snapshot + L3 `CLAUDE.md` discipline rule) and #60 (L2 delete-event CI guard at `.github/workflows/protect-upstream-pr-branches.yml`). Smoke alarm on accidental deletion — not a lock, since GitHub doesn't expose pre-delete hooks on standard repos. The guard fails the run with a pre-formed recovery command (read from the upstream PR's `head.sha`) so the next cascade surfaces immediately instead of being discovered days later.

**Original decision** (when this was Open): Before any bulk branch-deletion automation runs in `TheDave94/oriel-dashboard`, check whether any of the target branches are the head of an open PR in a forked-to upstream repo (currently: `TheRealSimon42/simon42-dashboard-strategy`). If yes, refuse to delete and surface for review. Mechanism likely: `gh api "repos/{upstream}/pulls?head=TheDave94:{branch}&state=open"` per branch — fast enough for any reasonable cleanup batch size.

**Why deferred at the time**: No automation today is queued to run; the safety check matters before the next bulk cleanup, not retroactively. The damage from the previous cleanups has been fully recovered (49 PRs reopened across Cluster C + #250).

**Trigger that had been recorded**: When any branch-deletion automation is added or modified in this repo, or before any manual bulk branch-deletion. Whichever comes first.

**Reasoning**: Bulk branch deletion on 2026-05-19 and 2026-05-22 silently closed 49 cross-fork PRs upstream. Pattern confirmed twice. Mechanism: GitHub auto-closes a PR when its head branch is deleted, recording the deleting account as the close actor — looks like manual closure to the maintainer, isn't.
