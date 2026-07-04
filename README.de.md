# Oriel Dashboard

**Englisch** · [Deutsch](README.de.md) *(kommt bald – Beiträge willkommen, siehe [TRANSLATING.md](TRANSLATING.md))*

Eine Lovelace-Strategie für Home Assistant. Sie generiert dein Dashboard aus deinen Bereichen, Geräten und Entitäten und ermöglicht es dir, jede Komponente über einen visuellen Editor anzupassen, statt YAML zu bearbeiten.

Aufgebaut auf dem Fundament der [simon42-dashboard-strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy) (automatisch generierte Raumansichten, Übersichts-Kacheln, Bereichs-Grid). Simon42 bleibt die fokussierte, meinungsstarke Option; Oriel ist für Nutzer, die sich mehr Stellschrauben wünschen. Der Wechsel erfolgt über eine einmalige YAML-Anpassung – siehe [MIGRATION.md](MIGRATION.md).

![Oriel Dashboard](docs/images/oriel-overview.png)

*Oriels automatisch generierte Übersicht, gerendert mit Demo-Daten.*

---

## Installation

Über HACS (Custom Repository):

1. HACS → Frontend → ⋮ → Custom repositories  
2. `https://github.com/TheDave94/oriel-dashboard` hinzufügen, Kategorie **Dashboard**  
3. **Oriel Dashboard** installieren  
4. Home Assistant neu laden, sobald HACS dich dazu auffordert  

Minimale Home-Assistant-Version: **2025.5**.




## Fehlerbehebung

### „Custom element existiert nicht: custom:oriel-something-card“

Wahrscheinlich gibt es noch einen alten Verweis in deinem YAML.

Wenn du von simon42 kommst und dein Dashboard-YAML manuell bearbeitet hast, suche in der Rohkonfiguration nach `simon42-` und ersetze jeden Treffer durch `oriel-`. Siehe [MIGRATION.md](MIGRATION.md) für die vollständige Zuordnungstabelle.

Wenn du Oriel manuell installiert hast, bevor HACS unterstützt wurde (vor 2025), können sowohl die alten Dateien in `www/` als auch die alte Resource-URL weiterhin geladen werden. Entferne sie, führe einen Hard-Refresh im Browser aus und lade Home Assistant neu.

### Das Dashboard ändert sich nicht, nachdem ich die Konfiguration bearbeitet habe

Führe einen Hard-Refresh im Browser aus (Cmd+Shift+R auf macOS, Ctrl+Shift+R unter Windows / Linux). Home Assistant cached die Dashboard-Konfiguration sehr aggressiv.

Öffne die Browser-Konsole (F12). Bei einem frischen Laden gibt Oriel `Oriel Dashboard vX.Y.Z loaded` aus — prüfe, ob die Version mit der neuesten Release-Version übereinstimmt.

### Etwas anderes

Eröffne ein Issue — die [Bug-Report-Vorlage](.github/ISSUE_TEMPLATE/bug_report.md) führt dich durch die relevanten Felder für Version und Konsolenausgabe. Fehlermeldungen auf Deutsch sind möglich, Englisch ist nicht zwingend erforderlich.

---

---

## Origin

Forked from [@TheRealSimon42](https://github.com/TheRealSimon42)'s dashboard strategy — credit there for the auto-generation pattern. Oriel takes that core in a different direction: maximum configurability and integration surface, all reachable through the editor. Simon42 stays the focused, opinionated option; Oriel is for users who want the configurable one. See [MIGRATION.md](MIGRATION.md) to switch.

Built by [@TheDave94](https://github.com/TheDave94).

---

## Further reading

- [MIGRATION.md](MIGRATION.md) — moving from simon42 to Oriel
- [CHANGELOG.md](CHANGELOG.md) — what changed in each version
- [GitHub Releases](https://github.com/TheDave94/oriel-dashboard/releases) — full release notes with assets
- [TRANSLATING.md](TRANSLATING.md) — how to translate this README

---

## Related projects

Oriel works on its own, and is also deliberately built to work alongside two
multi-source Home Assistant integrations:

- **[PollenWatch](https://github.com/TheDave94/pollenwatch)** — a pollen
  integration that Oriel **auto-detects** and renders as a first-party pollen
  card + badges, with no manual card configuration.
- **[AirWatch](https://github.com/TheDave94/airwatch)** — a multi-source
  air-quality integration sharing PollenWatch's architecture. Oriel
  **auto-detects** it and renders a first-party air-quality card — worst
  sub-index, per-pollutant consensus, an N-of-M source badge, and explicit
  divergence — with no manual card configuration.

## License

[MIT](LICENSE) © Oriel Dashboard contributors.