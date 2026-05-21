# Oriel Dashboard

A Home Assistant Lovelace strategy that **auto-generates a complete dashboard** from your areas, devices, and entities. No per-card YAML, no manual layout.

## Highlights

- **Setup wizard** in the editor — auto-detects installed HACS plugins (Bubble Card, ApexCharts, decluttering-card, floorplan-card) and surfaces each advanced feature with an install hint when missing.
- **Per-user / per-role dashboards** — different layouts per HA user or label.
- **Ten custom cards / features** — summary, zone-presence, lights group, covers group, sparkline, notification banners, routines, screensaver, voice FAB, sticky-lock + cost-overlay features.
- **Mode-driven section reorder** and **composable visibility rules** (role / time-of-day / mode).
- **Wall-panel mode** with screensaver, **lazy-mounting** for large installs, **per-area room view overrides**.
- **Plugin extension API** — third-party plugins can `window.oriel.registerSection(...)` to add sections.
- **Visual `<ha-form>` editor** for every config option, with migration assistants and usage-aware layout suggestions.
- **HA 2026.5+** baseline with modern design tokens, container queries, and code-split bundles.

## Installation

HACS custom repository → `TheDave94/oriel-dashboard`, category Dashboard.

Then create a dashboard with:

```yaml
strategy:
  type: custom:oriel
```

See [README](README.MD) for the full configuration surface.

## Origin

Built on the foundation [@TheRealSimon42](https://github.com/TheRealSimon42)'s dashboard strategy established — credit there for the auto-generation pattern. Oriel adds a setup wizard, plugin extension API, per-user dashboards, HACS-plugin awareness, and the rest of the surface above on top.

**Not a replacement for Simon42.** Different design point; both projects valid for different needs. Migrate over when you want one of the features Oriel layers on. See [MIGRATION.md](MIGRATION.md).

Built by [@TheDave94](https://github.com/TheDave94).
