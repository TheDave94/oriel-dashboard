# Translating Oriel's README

Oriel's user-facing README is translated as separate files named `README.<lang>.md` — e.g. `README.de.md`, `README.fr.md`. The English `README.md` is the **canonical source of truth**: when content drifts between languages, the English version wins.

## Scope

Only the **user-facing** README needs translating. Maintainer documentation (`CLAUDE.md`, `DEFERRED.md`, `ROADMAP.md`, `PRINCIPLES.md`, `docs/*`, `EXTERNAL_COUPLING.md`, `MIGRATION.md`, the GitHub issue / PR templates) stays in its original language. Those docs are for contributors who can read the project's working language.

## How to add a translation

1. Copy `README.md` to `README.<lang>.md` — use the ISO 639-1 two-letter code (`de`, `fr`, `es`, …).
2. Translate the prose. Keep code blocks, file paths, `yaml` examples, command lines, and external links unchanged.
3. Update the language switcher line at the top of every README file (English and every translation) so it lists every available language with a working link. The active language is bold and unlinked; the others are linked.

   Example with English, German, and French present:

   ```markdown
   [English](README.md) · **Deutsch** · [Français](README.fr.md)
   ```

4. Open a PR. Translations are reviewed for readability and faithfulness — not for word-for-word identity.

## When the English README changes

Every translation should be updated in the same PR if the change is content-meaningful (added a section, changed install instructions, corrected a fact). Cosmetic English-only edits (typo fixes, link reformatting) don't require touching translations.

If a translation falls behind and you don't have time to update it, the maintainer can mark it stale in the switcher line — e.g. `[Deutsch (outdated)](README.de.md)` — so readers know to fall back to English.

## Conventions for translators

- Keep sentences short and self-contained. The English README is written in plain language for exactly this reason.
- Don't translate technical identifiers — `custom:oriel`, `oriel-summary-card`, `house_mode`, `HACS`, `Lovelace`, file paths, YAML keys all stay verbatim.
- Translate the German-welcome line (if your language isn't German). For example, in a French translation it might become a French-welcome line; in any non-German translation, you can drop the German welcome entirely — it's specific to the existing community.
- Preserve the link to `MIGRATION.md` and `CHANGELOG.md`. Those files aren't translated; the English README's links still resolve.

## What not to translate

- `MIGRATION.md` — user-facing, but historically English; revisit if a real signal asks for translation.
- `info.md` — the HACS landing card. Short by design; HACS displays whichever language ships in the release. Open an issue if you want to discuss a German `info.md` variant.
- Everything in `.github/`, `docs/`, and root-level maintainer files.
