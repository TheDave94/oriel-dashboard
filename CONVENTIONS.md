# Conventions

Rules earned by a specific failure in this repo. Each one names the failure so the rule stays arguable instead of becoming ritual. If the reason stops applying, change the rule and say why in the same PR.

Product-level guidance lives in [PRINCIPLES.md](PRINCIPLES.md). This file is narrower: how we work, where a habit has already cost us.

## 1. Packaging claims about HACS are verified against `hacs/integration` source, never asserted

**Earned 2026-09-08.** The header comment in `.github/workflows/release-build.yml` stated for months that HACS "never extracts `zip_release` for the plugin category" and that this was why Oriel ships loose release assets. It was wrong on the mechanism: HACS does extract `zip_release` for plugins (`custom_components/hacs/repositories/base.py:555-614` @ `adb7d83`). The loose-asset layout is correct for two entirely different reasons, both visible only by reading the source:

- `content_in_root: false` makes HACS download **every** release asset, not just `filename` (`base.py:645-649` gates the narrowing filter on `content_in_root` being true).
- A `.zip` in `filename` would be registered verbatim as the Lovelace module resource URL (`plugin.py:150-159`), which does not load.

The comment survived because it was plausible, nobody had to act on it, and the layout it justified happened to work. It surfaced only when an upstream reviewer challenged the packaging and the defence had to be built from the actual install path.

**The rule.** Any statement about what HACS does with this repo's release — which assets it downloads, where it writes them, what URL it registers, how `hacs.json` keys interact — cites the `hacs/integration` file and line range at a named commit, or it is not written. "HACS does X" without a `file.py:NN-MM @ sha` beside it is an assumption wearing a fact's clothes.

**The instrument.** `tools/hacs-install-sim.py` replays the HACS plugin install path against a published release, with every branch annotated by the source line it reproduces. It runs as the `verify-install` job in `release-build.yml` after every asset upload. When HACS moves, bump `HACS_REF` in the script, re-read the cited lines, and update the annotations in the same change. A green run of the simulator is the evidence that a packaging claim holds; a comment is not.

**What this rule does not do.** It does not require re-deriving HACS behaviour for every release. The simulator does that. It binds only new or changed *claims* about HACS packaging: in code comments, in docs, in replies to upstream reviewers, and in `hacs.json` edits.
