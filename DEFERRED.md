# Deferred Decisions

Decisions explicitly held back, with the reasoning recorded so the choice survives staff turnover. Each entry: **what** the deferral covers, **why deferred** at the time, **trigger to revisit** — the concrete condition that would make it worth acting on.

Companion to [ROADMAP.md](ROADMAP.md). The Roadmap's §3 covers product-side deferrals; this file covers everything else (infrastructure, tooling, CI, ops).

## CI / Infrastructure

### Bundle size budget post-merge checkout flake — monitor for N=3

**Decision**: Monitor the "Bundle size budget" job in `.github/workflows/validate.yml` for further `actions/checkout` auth failures on post-merge `main` runs. Configuration is byte-for-byte identical to passing sibling jobs (ESLint, Unit tests, audit); the auth header is correctly configured per logs before the fetch. The failure is environmental — immediate server-side auth rejection ~200-300ms after fetch despite the `AUTHORIZATION` header being set. Two occurrences so far: PR #54 merge (run `26337726699`), PR #56 merge (run `26340521941`). At N=3, the case shifts toward something specific to this job's runner pool placement and a retry wrapper becomes justified.

**Why deferred**: No config fix is appropriate at N=2 — there's no config difference to "fix". A retry wrapper at this point would be speculative cargo. Rerun unblocks the immediate branch; the pattern is what's worth tracking.

**Trigger to revisit**: Third identical occurrence on a future merge. If it happens, the response is: (a) add `ACTIONS_RUNNER_DEBUG=true` as a repo secret to capture HTTP request headers and confirm whether the `extraheader` is being dropped at request time, then (b) decide between a retry wrapper (`if: failure()` step that re-runs checkout) or accepting the flake.

**Reasoning**: Diagnostic ran 2026-05-23, verdict (b) — *"config identical to siblings; failure is environmental"*. Bundle-size is the last job in the workflow file and may land on a different runner pool segment than its siblings; that's the most plausible structural hypothesis but unfalsifiable at N=2.
