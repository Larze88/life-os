# Life OS – Roadmap

> Stand: 2026-11-23 · Jede Phase endet mit einem lauffähigen, getesteten Zustand und aktualisierter Dokumentation.

## Phase 0 – Konzeption & technische Prüfung ✅ (dieser Stand)

- [x] PRD, Architektur, Datenmodell, Machbarkeitsprüfung, ADR-Log, Roadmap, CLAUDE.md
- [x] Projektstruktur angelegt
- [x] Offene Fragen geklärt (siehe unten)
- [x] Umzug in eigenes privates Repository `life-os`

## Phase 1 – Technisches Grundgerüst ✅ (2026-11-24)

**Ziel:** Leere, aber vollständige App: anmelden, navigieren, als PWA installieren, Daten landen in SQLite.

- [x] npm Workspaces (`shared`, `backend`, `frontend`), TypeScript strict, ESLint + Prettier, Vitest, GitHub-Actions-CI
- [x] Backend: Hono-Server, Konfiguration über Umgebungsvariablen, pino-Logging mit Redaction, Problem-JSON-Fehler, Sicherheitsheader (CSP), `/health`, Auslieferung des Frontends
- [x] Datenbank: Drizzle-Schema für alle Kerntabellen, erste Migration, Migration beim Start mit vorherigem Snapshot, PRAGMAs (WAL, FULL, foreign_keys)
- [x] Auth: Ersteinrichtung, Login/Logout, Sitzungen (90 Tage gleitend) inkl. Geräteliste, Passwort ändern, Rate-Limit, Origin-Check
- [x] Frontend: Vite + React + Tailwind + shadcn/ui, Design-Tokens, Hell/Dunkel, Tab-Leiste mobil / Seitenleiste Desktop, Routen-Gerüst, Offline-Hinweis
- [x] PWA: Manifest, Icons (inkl. maskable), Service Worker (App-Shell)
- [x] Modulvertrag, Registries (shared/frontend) und Feldtyp-System, noch ohne fachliche Module
- [x] Lokaler Betrieb unter Windows: `npm run dev` (Node.js nativ)
- [ ] `docker-compose.yml` auf Phase 5 verschoben (Docker unter Windows nicht vorhanden, ADR-014)
- **Abnahme:** 72 Tests grün, Produktions-Build, End-to-End-Durchlauf in emuliertem Android-Chrome (Einrichtung → Dashboard → Einstellungen → Abmelden → Anmelden), Service Worker aktiv

## Phase 2 – Dashboard ✅ (2026-11-24, zusammen mit dem Wasser-Modul)

- [x] `GET /days/:date` (Tageszusammenfassung inkl. Ziele und Widgets), Widget-Registry, Standardlayout aus `dashboard_widgets` (per Seed)
- [x] Datumsnavigation (vor/zurück, „Heute“, `?tag=YYYY-MM-DD`, keine Zukunft)
- [x] Schnellerfassung: „+“-Button → Bottom Sheet mit den Schnellaktionen aller Tracker
- [x] Optimistische Updates mit Rollback, Rückgängig-Toast
- [x] Einträge: idempotentes `PUT /entries/:id`, Liste, Soft Delete; Tracker- und Einstellungs-API
- [ ] Persistierter Query-Cache (offline lesen) → verschoben, siehe ADR-020
- **Abnahme:** 101 Tests grün; End-to-End in emuliertem Android-Chrome (Schnellaktionen, Rückgängig, Bearbeiten, Ziel ändern, Rückdatieren, Reload)

## Zwischenschritt – Handy-Zugriff über den PC ✅ (2026-11-24)

- [x] `npm run phone`: Produktions-Build lokal auf einem Port (App + API), gleiche Datenbank wie `npm run dev`
- [x] Zugriff vom Handy per `tailscale serve` auf dem Windows-PC (HTTPS über `*.ts.net`, PWA installierbar)
- Ersetzt durch den Betrieb auf dem Pi (Phase 5, vorgezogen)

## Phase 3a – Erste Module ✅ (2026-11-25, Version 0.3.0)

In dieser Reihenfolge, jeweils mit Widget, Erfassung, Historienliste, Tests:

1. ✅ **Wasser** (Schnellmengen, Tagesziel mit Historie, eigene Menge, Einträge bearbeiten/löschen)
2. ✅ **Stimmung & Wohlbefinden** (Ein-Tipp-Erfassung, optional Energie/Stress/Wohlbefinden/Notiz, Tagesmittel)
3. ✅ **Gewohnheiten** (eigene Gewohnheiten, täglich oder an Wochentagen, mehrmals pro Tag, abhaken/zurücknehmen, archivieren). Serien (Streaks) folgen mit Phase 4.
4. ✅ **Schlaf** (Einschlaf-/Aufwachzeit, Dauer vom Server berechnet, Aufwachtag, Qualität, Ziel 7 h)

Ziele (`goals`) mit Gültigkeitszeitraum sind mit Wasser eingeführt.

## Phase 3b – Weitere Module ✅ (2026-11-25, Version 0.4.0, ohne eigene Tracker)

- [x] Bewegung (Sportart, Dauer, Intensität, Distanz; Ziel 30 min/Tag)
- [x] Körperwerte (Gewicht, Ruhepuls; eigene Messwerte mit Einheit und optionalem Zweitwert; Verlauf)
- [x] Beschwerden (erweiterbarer Katalog, Stärke 1–10, Notiz)
- [x] Ernährung (Mahlzeit per Tipp, Beschreibung, Merkmale)
- [x] Fokus (Timer oder manuell, Konzentration, Produktivität, Aufgabe)
- [x] Eigene Tracker (`custom`, Feld-Editor, Version 0.8.0)

## Phase 4 – Statistiken ✅ (2026-11-25, Version 0.5.0)

- [x] `GET /stats/series`: Tageswerte je Tracker (Modul-Aggregat), Ziel/Erledigung je Tag (historisierte Ziele), Kennzahlen, Serien
- [x] Statistik-Seite: Tracker- und Zeitraumwahl (7/30/90/365 Tage), Balken- bzw. Liniendiagramm mit Ziellinie und Antipp-Werteanzeige, Wochen-/Monatswerte bei langen Zeiträumen, Werte als Tabelle
- [x] Kennzahlen: Ø pro Tag, höchster/niedrigster Tag, Tage mit Einträgen, Ziel erreicht x von y, Serie (aktuell/beste), Vergleich mit dem vorherigen Zeitraum
- [x] Gewohnheits-Serien nur über fällige Tage; der laufende Tag zählt nicht als verpasst
- [x] Zusammenhänge: Spearman-Rangkorrelation zweier Tracker, optional mit Folgetag, Streudiagramm, beschreibender Text, Mindestens 14 gemeinsame Tage
- [x] Verlauf-Seite: Tage mit Einträgen (neueste zuerst), Tageszeile je Tracker, 14 Tage pro Seite, Tag öffnen → Dashboard (Version 0.7.0)
- [ ] Kalender-Heatmap für Gewohnheiten, Detailfelder (z. B. Energie) als eigene Metriken

## Phase 5 – Deployment auf dem Raspberry Pi (vorgezogen, ADR-023)

- [x] Dockerfile (Debian slim, Multi-Stage, ohne Emulation für arm64), `--ignore-scripts` für better-sqlite3-Prebuilds
- [x] Container lokal getestet: Migration, Seed, Auslieferung, sauberes Beenden (SIGTERM, WAL-Checkpoint), Fehlermeldung ohne Auth-Key; arm64-Build verifiziert
- [x] GitHub Actions: `release.yml` baut `ghcr.io/larze88/lifeos-aarch64:<version>` bei Tag `v<version>`
- [x] HA-App-Definition (`deployment/home-assistant/app/`) und Anleitung
- [x] Tailscale-Knoten im Container (userspace), `tailscale serve`, keine Log-Uploads zu Tailscale
- [x] Backup-Download, Wiederherstellung per Upload, Erinnerung nach 14 Tagen (ADR-013)
- [x] Öffentliches Repo `life-os-ha` anlegen und App-Definition hineinkopieren
- [x] Erstes Release (0.2.0) gebaut
- [x] Image auf „public“ stellen
- [x] Installation auf dem Pi, HTTPS-Prüfung, PWA-Installation auf dem Handy (2026-11-25)
- [ ] Tailscale: Key expiry für `lifeos` deaktivieren
- [ ] Ressourcenmessung auf dem Pi neben HA, Restore-Test mit echten Daten

## Danach (Backlog, priorisierbar)

- [x] Homescreen-Kurzbefehle: +250 ml Wasser, Stimmung, Schlaf, Schnell erfassen (Version 0.9.0)
- Schreib-Outbox (Offline-Erfassung)
- [x] Dashboard anpassen (Karten ein-/ausblenden, Reihenfolge) – Version 0.6.0
- ~~Erinnerungen (Web Push)~~ – vom Nutzer nicht gewünscht (2026-11-27)
- Home-Assistant-Integration (Sensoren → Einträge per Import-API mit Token; umgekehrt Life-OS-Werte als HA-Sensoren)
- Health Connect / Apple Health (Import über Export-Dateien oder Shortcuts)
- Tags über Module hinweg, Tagesnotiz/Journal
- KI-gestützte Zusammenfassungen (opt-in, bevorzugt lokal)

## Geklärte Fragen (Phase 0, 2026-11-24)

| #   | Frage                     | Antwort                          | Auswirkung                                                                             |
| --- | ------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | iPhone oder Android?      | **Android** (Chrome)             | Installations-Prompt, Background Sync und Web Push verfügbar; Testfokus Chrome Android |
| 2   | Eigenes Repository?       | **Ja, privat** (`life-os`)       | Inhalt von `life-os/` wird Repo-Root                                                   |
| 3   | Off-Device-Backups?       | **Manueller Download**           | Backup-Download + Erinnerung in der UI, Restore-Funktion (ADR-013)                     |
| 4   | Eigener Tailscale-Knoten? | **OK**                           | ADR-007 bleibt; Alternative über bestehenden Knoten dokumentiert                       |
| 5   | Entwicklungs-PC           | **Windows, ohne Docker Desktop** | Entwicklung nativ mit Node.js; Images baut GitHub Actions (ADR-014)                    |

## Getroffene Annahmen (änderbar)

- Skalen 1–5 für Stimmung, Energie, Stress, Wohlbefinden, Schlafqualität; Symptome 0–10
- Tagesgrenze 00:00 (konfigurierbar), Schlaf zählt zum Aufwachtag
- Wasser-Tagesziel 2 000 ml, Schnellmengen 250/500 ml
- Woche beginnt Montag, metrische Einheiten, Zeitzone Europe/Berlin
