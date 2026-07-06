# Protected branches — heads of open upstream PRs

This file is a **point-in-time snapshot** of every branch in `TheDave94/oriel-dashboard` that is currently the head of an **open** PR in `TheRealSimon42/simon42-dashboard-strategy`.

**Why it exists**: deleting any branch listed below auto-closes the upstream PR pointing at it. See `DEFERRED.md` → *"Branch deletion in this repo silently closes cross-fork PRs upstream"* for the history (49 PRs were silently closed by bulk branch deletion on 2026-05-19 and 2026-05-22 before this guard existed).

**Companion guard**: `.github/workflows/protect-upstream-pr-branches.yml` watches `delete` events on this repo and fails the run with a recovery command if a branch in the open-upstream-PR set is deleted. That's the smoke alarm; this file is the human-readable register.

## Extending protection to additional upstreams

This file and `.github/workflows/protect-upstream-pr-branches.yml` are **currently scoped to `TheRealSimon42/simon42-dashboard-strategy` only**. If you start submitting PRs from this repo to a new upstream:

1. Add the upstream's `owner/repo` to the snapshot procedure in the *"How to refresh"* block below — either extend the `gh pr list --repo <new-upstream>` query alongside the existing one, or factor the query into a loop over a list of upstreams.
2. Update the workflow's upstream query (search for the hard-coded `TheRealSimon42/simon42-dashboard-strategy` string in `.github/workflows/protect-upstream-pr-branches.yml`) — either iterate over a list or convert the job to a matrix.
3. Refresh this snapshot file to include any branches that are heads of open PRs in the new upstream.
4. Update [`CLAUDE.md`](../CLAUDE.md)'s *"Cross-fork PR safety"* section to name the new upstream alongside simon42.

**The protection does not fail-open.** A branch that's the head of a PR in an upstream this file hasn't been extended to is invisible to the workflow and gets the same silent-cascade hazard the simon42 incident demonstrated — just pointed at a different repo. Don't assume a future upstream is covered until all four steps above have landed.

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

*Captured 2026-07-06 — 0 branches. The protected set is currently empty.*

No branch in this repo is presently the head of an open PR in
`TheRealSimon42/simon42-dashboard-strategy` (verified live via the *How to
refresh* query).

All 17 branches from the previous (2026-05-23) snapshot left the protected set
when their upstream PRs closed — Simon42 merged the work into simon42 itself
(rebuilt on the new section-registry / squash-merged via upstream #310, with
Co-Authored-By credit), 1–5 July 2026. The now-stale head branches were deleted
from this repo (both `github` and Gitea `origin`) on 2026-07-06.

> **Note on the delete guard.** Deleting those already-closed-PR branches tripped
> `protect-upstream-pr-branches.yml` (it matches any deleted branch that ever had
> an upstream PR head, open *or* closed, and can't tell a pre-existing close from
> a cascade). It was a **false alarm**: every matched PR's `closed_at` predated the
> deletion by 1–5 days, so no open PR was cascade-closed. The recovery commands it
> printed were intentionally **not** run — running them would have reopened
> legitimately-merged PRs and resurrected the branches.
