# Release infrastructure

How Oriel ships releases, why the setup is shaped the way it is, and how to recreate or rotate it. Read this before touching `.github/workflows/release-please.yml` or anything in the release-build chain.

## Why a GitHub App (and not GITHUB_TOKEN or a PAT)

`release-please` opens the release PR, merges create a tag, and the tag fires a `release: published` event. We want that event to trigger `release-build.yml` so dist artifacts get attached automatically.

GitHub **intentionally suppresses downstream workflow triggers from events that originated via `GITHUB_TOKEN`**. This is a documented anti-loop guarantee — it prevents an action from triggering itself and burning CI minutes in a runaway loop. The consequence for us: when `release-please` runs under the default `GITHUB_TOKEN` and creates a release, `release-build.yml` does NOT fire. v4.6.0 and v4.7.0 both needed a manual `gh workflow run release-build.yml` dispatch as a result.

The fix is to make `release-please` run under a token whose actor isn't `github-actions[bot]`, so the resulting `release: published` event isn't suppressed. Options:

| Option | Why we didn't pick it |
|---|---|
| **PAT (personal access token)** | Tied to a human account, broader default scope, rotation falls on that person, leaves the org if the human leaves. |
| **`workflow_dispatch` glue** | Works but obscures intent and doesn't generalize. Hides the fact that release-please's output isn't a "real" release event. Future maintainers would re-discover the suppression rule. |
| **GitHub App** ✅ | Tightest scope, repo-only install, machine identity that survives team changes, GitHub's documented recommendation for this exact case. |

We use **a small private GitHub App named `oriel-release-bot`**, installed only on `TheDave94/oriel-dashboard`. The App's only job is minting short-lived tokens for `release-please`. Nothing else uses it.

## One-time setup (manual — needs hands on the GitHub UI)

Recreate the App when:
- Bootstrapping a fork of this repo
- Rotating the App's private key
- Replacing the App entirely (e.g. after a security incident)

Steps:

1. **Open the GitHub Apps settings.** GitHub avatar → **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. **Name**: `oriel-release-bot` (or any globally-unique name). The bot identity that authors release-PR commits will be `<name>[bot]`.
3. **Homepage URL**: the repo URL — `https://github.com/TheDave94/oriel-dashboard`.
4. **Webhook**: **disabled**. We use the App only for token exchange; we don't need event delivery.
5. **Repository permissions** (every one matters — set exactly these, nothing more):

   | Permission | Level | Why |
   |---|---|---|
   | Contents | **Read and write** | Create tags, create releases, push the release-please version-bump commit |
   | Pull requests | **Read and write** | Open + maintain the release PR |
   | Actions | **Read and write** | The new release-build trigger (the whole point of the App) |
   | Metadata | Read | Always required, automatic |
   | _Everything else_ | **No access** | Minimum-blast-radius principle |

6. **Where can this GitHub App be installed**: **Only on this account**. Not org-wide.
7. **Create the App.** On the App's settings page, note the **Client ID** — looks like `Iv23li...` rather than a plain integer. (There's also an App ID — an integer — but we no longer use it; v3.x of `create-github-app-token` deprecated the `app-id` input in favour of `client-id`.)
8. **Generate a private key**: scroll to **Private keys** → **Generate a private key**. A `.pem` file downloads to your machine. **Save it securely — it cannot be re-downloaded.** Anyone with this key can mint tokens that act as the App.
9. **Install the App on `TheDave94/oriel-dashboard` only.** Sidebar → **Install App** → pick the account → **Only select repositories** → check `oriel-dashboard`.
10. **Add two repo secrets** to `oriel-dashboard` — Settings → Secrets and variables → Actions → **New repository secret**:

    | Secret name | Value |
    |---|---|
    | `RELEASE_APP_CLIENT_ID` | The Client ID from step 7 (`Iv23li...`). |
    | `RELEASE_APP_PRIVATE_KEY` | Full contents of the `.pem` from step 8, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines. |

After step 10, the workflow change in `.github/workflows/release-please.yml` (committed alongside this doc) will pick up the App identity automatically on the next push to `main`.

## How the workflow uses the App

`.github/workflows/release-please.yml` mints a short-lived installation token before invoking release-please:

```yaml
- name: Mint release-bot token
  id: app-token
  uses: actions/create-github-app-token@<pinned SHA>
  with:
    client-id: ${{ secrets.RELEASE_APP_CLIENT_ID }}
    private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}

- name: Release Please
  uses: googleapis/release-please-action@<pinned SHA>
  with:
    token: ${{ steps.app-token.outputs.token }}
    release-type: node
```

The minted token lasts one hour, scoped to the installed repo, with the permissions configured in step 5. release-please uses it to push the version-bump commit + open the PR + (when the PR merges) tag + create the release — every one of those actions now appears to GitHub as initiated by the App, not `GITHUB_TOKEN`, so the downstream `release: published` event fires `release-build.yml` automatically.

## Acceptance test

A release after this setup ships should land entirely hands-off — the post-PR-#111 flow is fully autonomous from a `feat:`/`fix:` commit through to the published release:

1. Merge any PR with a `feat:` / `fix:` / `feat!:` commit to `main`.
2. Confirm `Release Please` workflow run succeeds. The release PR it opens should show `oriel-release-bot[bot]` as the commit author (not `github-actions[bot]`).
3. The same workflow run arms GitHub's native auto-merge on the release PR via the "Arm native auto-merge on release PR" step (see `release-please.yml`). The 6 required branch-protection checks are the sole gate — no human merge required.
4. Once the required checks pass, GitHub auto-merges the release PR under the App actor. Release-please then tags the version and publishes the GitHub Release on the post-merge run.
5. Confirm:
   - Tag created automatically — already worked under `GITHUB_TOKEN`.
   - **`release-build.yml` auto-fires** from the `release: published` event. This is the regression the App setup is fixing — it still has to work after the auto-merge changes.
   - Dist assets land on the GitHub release without a manual dispatch.
   - The `verify-install` job in the same run goes green — the HACS install replay found every runtime chunk (see [Post-release install-verification gate](#post-release-install-verification-gate)).
6. Install on live HA via HACS — picks up the new version normally.

If step 5's auto-fire fails, **do not** paper over with a fallback `gh workflow run` step. That masks whether the App approach actually works. Read the CI logs, then see Troubleshooting below.

## Post-release install-verification gate

`release-build.yml` has a second job, `verify-install`, that runs after the asset upload on the same tag. It runs `tools/hacs-install-sim.py`, which replays the HACS plugin install path against the published release rather than trusting that the upload worked:

1. Fetches `hacs.json` at the tag and the release's asset list.
2. Replays the HACS branch decisions (`update_filenames`, `download_content`, the `content_in_root` filter) with the `hacs/integration` file:line each step reproduces printed beside it.
3. Downloads exactly what HACS would download into a staged `www/community/oriel-dashboard/` tree.
4. Parses webpack's `publicPath` and chunk map out of the delivered `oriel.js` and checks every async chunk is on disk under the served path.

The script has a four-value exit-code contract, and every path prints one verdict line:

| Exit | Meaning | Gate behaviour |
|---|---|---|
| 0 | `PASS:` every runtime chunk resolves | job succeeds |
| 1 | `FAIL:` a runtime chunk is absent (real installs 404) | fail fast, no retry |
| 2 | `FAIL:` structural: no asset matches `hacs.json` `filename`, no `hacs.json` at the tag, entry never landed | ambiguous, see below |
| 3 | `RETRY:` transport fault talking to GitHub | retry, asset list not consulted |

The job is a hard gate: a release whose `verify-install` job is red has shipped a broken install and needs the missing asset uploaded (rerun the workflow via `gh workflow run release-build.yml -f tag=<tag>`; `--clobber` makes the upload idempotent).

**Retry semantics.** Up to 3 attempts, 20 s apart. Exit 3 always retries: the fault is between the runner and GitHub, not in the release. Exit 1 never retries: the release lists what the bundle needs and it is still not there. Exit 2 is the ambiguous case: a genuinely non-compliant release looks identical to one whose assets have not propagated yet. The step compares the release's asset list against the `dist/` manifest the build job recorded. If the list is already complete, the failure is structural and the job fails immediately. If it still lags, that is propagation lag and the step retries. Any exit outside 0-3 is a hard failure.

The verify job checks out the workflow's own commit, not the tag under test. The simulator is CI tooling: on a `release: published` event the two commits are the same, and on `workflow_dispatch` this is what lets the gate run against a tag that predates the script. The build job still checks out the tag, so the assets under test are the tag's.

**Running it locally.** Stdlib only, no token required (a `GITHUB_TOKEN` env var raises the API rate limit if set):

```
python3 tools/hacs-install-sim.py --repo TheDave94/oriel-dashboard --tag v4.29.1
python3 tools/hacs-install-sim.py --keep   # latest release, keep the staged tree for inspection
```

**Re-testing the gate itself (disposable prerelease).** The gate is exercised end-to-end by publishing a throwaway prerelease, because neither obvious route works here: `release: published` only runs workflows from the **default branch**, so the gate cannot be tested from a PR branch, and the repo PAT has no `Actions: write`, so `workflow_dispatch` returns `HTTP 403: Resource not accessible by personal access token`. Merge to `main` first, then:

1. Publish a prerelease on a throwaway tag (e.g. `gate-test`) pointing at `main`'s current sha. That fires `release: published` and runs `release-build.yml` from `main`.
2. The build job uploads `dist/` to the **throwaway** release — `gh release upload` targets `github.event.release.tag_name`, so production releases are never written to. `verify-install` then replays a HACS install against the throwaway tag, which is a genuine end-to-end run: real `hacs.json` at that sha, real uploaded assets.
3. Confirm the run's conclusion and the `verify-install` verdict.
4. Diff the newest production release's asset list against a pre-run baseline to prove nothing else was touched.
5. Delete the throwaway release **and** its tag.

**Verification history.**

| Date | Method | Run | Result |
|---|---|---|---|
| 2026-09-08 | Disposable `gate-test` prerelease at `main` `8124623` | [run 34228399633](https://github.com/TheDave94/oriel-dashboard/actions/runs/34228399633) | success. `verify-install` PASS, all 5 runtime chunks resolve, 8 s. `v4.29.1` assets unchanged (baseline diff empty). `gate-test` release and tag confirmed removed. |

**Coverage caveat — only the pass path has run on real infrastructure.** The 2026-09-08 run exercised exit 0 against a genuinely good release. The exit 1 (missing chunk), 2 (structural) and 3 (transport) branches are **stub-tested only**: verified by substituting a fake simulator that returns each code and asserting the step takes the intended branch. The classifier itself was additionally confirmed on live data (`v4.29.1` → 0, `v1.0.0` → 2), but the *workflow's* handling of 1, 2 and 3 has never run in CI. Treat a first real failure as also being the first live test of that branch, and read the step log rather than assuming the routing was right.

**Keeping it honest.** The script pins the `hacs/integration` commit it mirrors in `HACS_REF`. When HACS changes its download path, bump the ref, re-read the cited lines, and fix the annotations in the same PR. The line references are the point: they let anyone diff the simulation against the source by hand. See [CONVENTIONS.md §1](../CONVENTIONS.md#1-packaging-claims-about-hacs-are-verified-against-hacsintegration-source-never-asserted) for why packaging claims about HACS get cited, not asserted.

## How to pause the autonomous flow

Two options, both documented inline in `.github/workflows/release-please.yml`:

1. **Repo setting**: Settings → General → Pull Requests → untick "Allow auto-merge". The arm step then fails-soft on subsequent runs and the release PR sits open for manual merge. Already-armed PRs continue to merge when their checks pass — to stop those too, cancel auto-merge on each via the PR UI.
2. **Workflow edit**: comment out the "Arm native auto-merge on release PR" step. New release PRs stay open for manual merge; already-armed PRs are unaffected.

## Troubleshooting

### Symptom: `actions/create-github-app-token` step fails

Most common causes:

- **App not installed on this repo.** Error mentions `Installation not found` or `404 Not Found` resolving the installation. Fix: go through step 9 of the setup above.
- **`RELEASE_APP_CLIENT_ID` secret missing.** Error mentions `client-id is required` or the App-token step fails immediately. Fix: confirm the secret exists in repo Settings → Secrets → Actions and matches the Client ID (`Iv23li...`) on the App's settings page.
- **`RELEASE_APP_PRIVATE_KEY` malformed.** Error mentions `invalid PEM` or `PKCS#1 format expected`. Fix: re-copy the full `.pem` including the `-----BEGIN` / `-----END` lines and the newlines between them. GitHub secrets preserve newlines if you paste with them.

### Symptom: release-please runs but doesn't open a PR

Most likely the App's **Pull requests** permission is missing or wasn't accepted on install. Re-check the permissions table in step 5; if you change permissions after install, GitHub prompts you to approve the new permissions on the installation — until you approve, the App still has the old permission set.

### Symptom: release created but `release-build.yml` still doesn't fire

This is the failure mode the whole App setup is designed to prevent. If it happens after the App is correctly wired, something material changed:

1. GitHub may have widened the suppression rule to also block App-token-initiated events. Read the [current GitHub Actions docs on event triggering](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow) — if so, an updated mitigation is needed.
2. The workflow file may have lost the App-token step in a refactor. Diff `release-please.yml` against the commit that introduced the App pattern (search the log for `ci(release): use GitHub App token`).

**Do not** add a `workflow_dispatch` fallback as a quick fix. The fallback obscures whether the App approach works at all. Either fix the root cause or open an issue documenting the regression so the next maintainer doesn't inherit a silent workaround.

### Symptom: `verify-install` job fails after a green `build` job

Read `sim.log` in the step output (stderr is folded in). The `::error::` line names the simulator exit code and the branch the gate took:

- **Exit 1, "a runtime chunk is missing".** The release lists every `dist/` file yet a chunk the entry bundle requests is not among them. Almost always a build/asset naming drift: compare the chunk names the simulator printed under `[7]` against `ls dist/` from the build job's log. Fix the packaging, then rerun the workflow on the same tag.
- **Exit 2, "already lists every dist/ file".** Structural: `hacs.json` `filename` does not match any uploaded asset, or the entry bundle never landed. Check `hacs.json` at the tag against the asset names.
- **Exit 2 or 3, retried 3× and still failing.** Either GitHub asset propagation took longer than 60 s or GitHub was unreachable from the runner. Rerun the workflow; the upload is idempotent. If it recurs, check the upload step's log for per-file errors.

### Symptom: release PR author is `github-actions[bot]` instead of `oriel-release-bot[bot]`

The App token isn't being used. Check that:
- The workflow has the `Mint release-bot token` step before `Release Please`.
- The release-please step has `token: ${{ steps.app-token.outputs.token }}` set.
- Both secrets resolve (the workflow log shows `***` for both names, not blanks).

## Local environment notes

### `git fetch` against the Forgejo remote returns 403 from an interactive shell

**Found 2026-09-08 on `claudebox`.** This repo has two remotes: `origin` (self-hosted Forgejo, `git.flamingistan.com`) and `github` (GitHub, where CI, issues and releases live). From an interactive login shell, `git fetch origin` fails with HTTP 403, while the same operation from a Claude Code session succeeds — CC pushes and fetches against both remotes without trouble.

That asymmetry points at a **credential-helper gap** rather than a permissions problem on the Forgejo side: the two contexts resolve different helpers (or the interactive shell resolves none), so the interactive shell sends no usable credential.

Not fixed here — it does not block the release path, which runs entirely against the `github` remote. Recorded so the next person who hits it does not re-diagnose it as a Forgejo ACL or token-expiry problem. The fix belongs in the shell/credential-helper configuration, in its own change.

## Key rotation

Annually, or after any security incident:

1. Open the App's settings page on GitHub.
2. **Private keys** section → **Generate a private key**. A new `.pem` downloads.
3. **Don't delete the old key yet.** Both keys are valid simultaneously during the rollover.
4. Replace `RELEASE_APP_PRIVATE_KEY` in the repo's Actions secrets with the new `.pem` contents.
5. Trigger a release-please run to confirm the new key works (push any small `chore:` commit to main, or use `gh workflow run release-please.yml`). If the workflow succeeds, the new key is in use.
6. Now go back to the App's settings and **delete the old key**. Two-key window closes.

## Out of scope

The release-bot App is for `release-please` only. Don't migrate other workflows to it.

- **Why**: only `release-please` needs the "trigger downstream events from a release" property. Everything else can stay on `GITHUB_TOKEN` — minimum-blast-radius.
- **If a future workflow legitimately needs the same property**: that's a deliberate scope expansion and gets its own PR + a new section in this doc covering why the broader use is justified.

The App also does not:

- Have webhook events enabled (we only use it for token exchange).
- Have any permission beyond the four listed in step 5.
- Get installed on any other repo.

Any change to those defaults is a security-relevant decision that deserves its own PR + rationale.
