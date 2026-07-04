
# Oriel Dashboard – Erweiterte Version des Simon42 Strategy Dashboards

Dieses Projekt stellt ein erweitertes **Home Assistant Dashboard** auf Basis des originalen *Simon42 Strategy Dashboards* dar. Es richtet sich an Nutzer, die sich mehr Konfigurationsmöglichkeiten wünschen, ohne vollständig in YAML einsteigen zu müssen.

> Hinweis: Dieses Dashboard ist als **zusätzliche Ansicht** in Home Assistant gedacht und ersetzt nicht die standardmäßige „Übersicht“ komplett. Die Bezeichnungen aus Home Assistant (z.B. *Dashboard*, *Bereich*, *Karte*, *Ansicht*) werden so weit wie sinnvoll beibehalten.

---

## Funktionen

- **Erweitertes Layout** für das Simon42-Strategie-Dashboard, optimiert für verschiedene Bildschirmgrößen.
- Nutzung der **Standard-Dashboard-Funktionen von Home Assistant**, sodass keine zusätzlichen Karten installiert werden müssen.
- Mehr **Konfigurationsoptionen** über das grafische Dashboard-Interface, ohne tiefgehende YAML-Kenntnisse.
- Unterstützt:
  - verschiedene **Bereiche** und **Ansichten** (Views),
  - **Karten** wie Kachelkarten, Statistik-Karten und Entitäten-Karten,
  - Statusanzeigen für **Sensoren**, **Schalter**, **Lichter** u. a.

---

## Voraussetzungen

Damit du das Oriel Dashboard nutzen kannst, benötigst du:

- Eine laufende **Home Assistant** Installation.
- Zugriff auf die **Dashboards-Konfiguration**:
  - In Home Assistant unter: `Einstellungen → Dashboards`.
- Die Möglichkeit, Dateien im `config`-Verzeichnis (z.B. `dashboard`, `yaml`) zu bearbeiten, falls du die YAML-Variante nutzt.
- Funktionierende **Entitäten** (z.B. Sensoren, Schalter, Szenen), die im Dashboard angezeigt werden sollen.

---

## Installation

Es gibt typischerweise zwei Wege, um das Dashboard zu nutzen – abhängig davon, wie das Originalprojekt aufgebaut ist. Im Folgenden wird eine übliche Vorgehensweise beschrieben.

### 1. Neues Dashboard in Home Assistant anlegen

1. Öffne Home Assistant.
2. Gehe zu **Einstellungen → Dashboards**.
3. Klicke auf **Dashboard hinzufügen**.
4. Vergib einen Namen, z.B. `Oriel Dashboard`.
5. Wähle ein passendes Symbol (Icon), wenn gewünscht.
6. Speichere das neue Dashboard.

Dieses leere Dashboard ist die Basis, in die die Oriel-Konfiguration integriert wird.

### 2. Konfigurationsdatei einbinden

Je nach Projektstruktur des GitHub-Repositories kann die Konfiguration auf unterschiedliche Weise bereitgestellt werden (z.B. eine YAML-Datei oder Beispiel-Konfiguration).

Typischer Ablauf:

- Lade die entsprechende **Konfigurationsdatei** aus dem GitHub-Repository herunter (z.B. `oriel-dashboard.yaml` oder eine Beispiel-View).
- Öffne dein Home Assistant **Konfigurationsverzeichnis** (oft `/config`).
- Lege die Datei im passenden Unterordner ab, z.B.:
  - `dashboards/oriel-dashboard.yaml`
- Verknüpfe die Datei mit deinem Dashboard:
  - In Home Assistant unter `Einstellungen → Dashboards`, das Oriel Dashboard auswählen.
  - Falls YAML-basierte Dashboards genutzt werden:
    - Im Dashboard-Eintrag eine Konfiguration ähnlich
      ```yaml
      title: Oriel Dashboard
      views:
        # hier werden die Views aus der YAML-Datei referenziert oder direkt eingetragen
      ```
      verwenden.
    - Alternativ kann die heruntergeladene Konfiguration direkt in die Dashboard-YAML eingefügt werden.

Wenn das Projekt eine reine **UI-basierte Vorlage** ist, kann stattdessen ein Import oder das manuelle Nachbauen der Beispiel-Sections nötig sein. In diesem Fall folgst du der Anleitung im GitHub-Repository, indem du die beschriebenen **Ansichten**, **Bereiche** und **Karten** über den Editor in Home Assistant nachbaust.

---

## Nutzung & Anpassung

Sobald das Oriel Dashboard eingebunden ist, kannst du es wie jedes andere Home Assistant Dashboard anpassen:

- Öffne das Dashboard und klicke oben rechts auf das **Stift-Symbol** (*Dashboard bearbeiten*).
- Passe folgende Elemente an:
  - **Bereiche/Abschnitte**: z.B. Räume, Funktionen oder Kategorien.
  - **Karten**: füge Karten für deine Entitäten hinzu oder entferne nicht benötigte.
  - **Spalten & Layout**: stelle die Anzahl der Spalten ein und passe das Grid an deine Bildschirmgröße an.
- Typische Home Assistant Karten, die genutzt werden können:
  - *Tile Card (Kachelkarte)*
  - *Entities Card (Entitätenkarte)*
  - *Statistics Card (Statistikkarte)*
  - *Gauge Card (Messinstrument)*

Du kannst außerdem:

- Favorisierte **Geräte** und **Automatisierungen** direkt platzieren.
- **Szenen** und **Skripte** über Kacheln oder Buttons ausführen.
- Wichtige **Statusinformationen** (z.B. Temperatur, Luftfeuchtigkeit, Anwesenheit) prominent anzeigen.

---

## Anpassung an deine Umgebung

Das Oriel Dashboard ist als **Vorlage** gedacht, die du an deine eigene Umgebung anpassst. Typische Schritte:

- Ersetze in der Konfiguration die **Beispieleinträge** (z.B. `sensor.temperature_wohnzimmer`) durch deine eigenen Entitäten.
- Passe die **Bereichsnamen** (z.B. „Wohnzimmer“, „Büro“, „Schlafzimmer“) an deine tatsächlichen Räume an.
- Entferne Bereiche, die du nicht benötigst, oder füge neue hinzu.
- Achte darauf, dass alle verwendeten Entitäten in Home Assistant tatsächlich existieren, sonst werden Karten als „nicht verfügbar“ angezeigt.

---

## Home Assistant Begriffe

Zur besseren Orientierung werden einige zentrale Home Assistant Begriffe kurz erläutert. Sie werden in dieser README nur so weit angepasst, wie es sinnvoll ist, um die offiziellen Konzepte beizubehalten:

- **Dashboard**: Eine Seite oder Sammlung von Ansichten, die du über `Einstellungen → Dashboards` verwaltest.
- **Ansicht (View)**: Ein Unterbereich eines Dashboards, oft mit eigenem Tab in der Oberfläche.
- **Bereich/Section**: Gruppierung von Karten innerhalb einer Ansicht (z.B. „Raum“, „Kategorie“).
- **Karte (Card)**: Einzelnes „Widget“ zur Anzeige oder Steuerung von Entitäten (z.B. Kachelkarte, Entitätenkarte).
- **Entität**: Ein einzelnes Objekt in Home Assistant, z.B. `light.wohnzimmer`, `sensor.temperatur_flur`, `switch.steckdose_tv`.

Diese Begriffe werden in der Oriel-Konfiguration verwendet und sollten dir aus der Home Assistant Oberfläche vertraut vorkommen.

---

## Tipps für eine saubere Konfiguration

- Teste Anpassungen zunächst mit **wenigen Karten**, bevor du das gesamte Layout übernimmst.
- Halte deine **Entitäten sinnvoll benannt**, damit du sie im Dashboard schnell wiederfindest.
- Nutze unterschiedliche **Ansichten**, um:
  - eine *Startseite* für häufig genutzte Funktionen,
  - *raumbezogene Ansichten*,
  - oder *thematische Ansichten* (z.B. Energie, Klima, Sicherheit) anzulegen.
- Wenn du viele Änderungen vornimmst, ist es sinnvoll, dir die Konfiguration gelegentlich zu sichern (z.B. durch Kopieren der YAML oder ein Backup deiner Home Assistant-Konfiguration).

---

## Fehlersuche

Wenn das Oriel Dashboard nicht wie erwartet funktioniert:

- Prüfe, ob alle **referenzierten Entitäten** in Home Assistant vorhanden sind.
- Kontrolliere die **YAML-Syntax**, falls du manuell Änderungen in YAML-Dateien vorgenommen hast:
  - Einrückungen (Spaces statt Tabs),
  - korrekte Namen von Feldern (z.B. `type`, `entity`, `name`).
- Stelle sicher, dass dein Dashboard richtig als **YAML- oder UI-Dashboard** eingerichtet ist:
  - Bei UI-Dashboards werden Änderungen über den Editor vorgenommen,
  - bei YAML-Dashboards über Dateien im `config`-Verzeichnis.

---

## Lizenz & Danksagung

Das Oriel Dashboard basiert auf dem ursprünglichen **Simon42 Strategy Dashboard**. Bitte beachte die im GitHub-Repository angegebene **Lizenz** und eventuelle Nutzungsbedingungen.

Vielen Dank an die ursprünglichen Autoren und die Home Assistant Community für die bereitgestellten Vorlagen, Ideen und Beispiele.
