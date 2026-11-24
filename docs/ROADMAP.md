# Life OS – Roadmap

> Stand: 2026-11-23 · Jede Phase endet mit einem lauffähigen, getesteten Zustand und aktualisierter Dokumentation.

## Phase 0 – Konzeption & technische Prüfung ✅ (dieser Stand)
- [x] PRD, Architektur, Datenmodell, Machbarkeitsprüfung, ADR-Log, Roadmap, CLAUDE.md
- [x] Projektstruktur angelegt
- [x] Offene Fragen geklärt (siehe unten)
- [ ] Umzug in eigenes privates Repository `life-os`

## Phase 1 – Technisches Grundgerüst
**Ziel:** Leere, aber vollständige App: anmelden, navigieren, als PWA installieren, Daten landen in SQLite.
- npm Workspaces (`shared`, `backend`, `frontend`), TypeScript strict, ESLint + Prettier, Vitest
- Backend: Hono-Server, Konfiguration über Umgebungsvariablen (`DATA_DIR`, `PORT`, `LOG_LEVEL`), pino-Logging mit Redaction, Problem-JSON-Fehler, `/health`
- Datenbank: Drizzle-Schema für alle Kerntabellen, erste Migration, Migration beim Start mit vorherigem Snapshot, PRAGMAs (WAL, FULL, foreign_keys)
- Auth: Ersteinrichtung (Passwort setzen), Login/Logout, Sitzungen, Rate-Limit, Origin-Check
- Frontend: Vite + React + Tailwind + shadcn/ui, Design-Tokens, Hell/Dunkel, App-Layout (Tab-Leiste mobil / Seitenleiste Desktop), Routen-Gerüst
- PWA: Manifest, Icons, Service Worker (App-Shell)
- Modul-Registry (shared/backend/frontend) mit Feldtyp-System – noch ohne fachliche Module
- Lokaler Betrieb unter Windows: `npm run dev` (Node.js 24 nativ, kein Docker nötig); `docker-compose.yml` nur optional
- **Abnahme:** Login am Handy im LAN über `localhost`-Tunnel bzw. PC; Tests grün; Migration auf leerer DB reproduzierbar

## Phase 2 – Dashboard
- `GET /days/:date`, Widget-Registry, Standardlayout aus `dashboard_widgets`
- Tagesübersicht (Fortschrittsringe), Datumsnavigation (Heute/zurück)
- Schnellerfassung: „+“-Button → Bottom Sheet mit allen Trackern
- Optimistische Updates + Rückgängig-Toast, persistierter Query-Cache (Offline lesen)
- **Abnahme:** Dashboard mobil und Desktop, Lighthouse-PWA-Check bestanden

## Phase 3a – Erste Module
In dieser Reihenfolge, jeweils mit Widget, Erfassung, Historienliste, Tests:
1. **Wasser** (Schnellmengen, Tagesziel)
2. **Stimmung & Wohlbefinden**
3. **Gewohnheiten** (Zeitpläne, Serien)
4. **Schlaf** (Zeitraum, Aufwachtag)

Ziele (`goals`) mit Gültigkeitszeitraum werden mit Wasser eingeführt.

## Phase 3b – Weitere Module
5. Sport & Bewegung · 6. Körperwerte · 7. Gesundheit & Symptome · 8. Ernährung · 9. Produktivität & Fokus · 10. Eigene Tracker (`custom`, Feld-Editor)

## Phase 4 – Statistiken
- Detailseite je Tracker: Woche/Monat/Jahr, Durchschnitt, Min/Max, Zielerreichung
- Zeitraumvergleich
- Kalender-Heatmap für Gewohnheiten
- Tagesmetriken + Korrelationsansicht (Spearman, `n`, neutraler Hinweis)
- Export JSON/CSV in der UI
- Backup-Download (konsistenter SQLite-Snapshot) + Restore per Upload + Erinnerung „letzter Download vor X Tagen“ (wird ggf. schon in Phase 2 vorgezogen)

## Phase 5 – Deployment auf dem Raspberry Pi
- Dockerfile (Debian slim, Multi-Stage), GitHub Actions Multi-Arch → GHCR
- HA-App-Repository: `repository.yaml`, `lifeos/config.yaml`, `DOCS.md`, Icon
- Tailscale-Knoten im Container, `tailscale serve`, HTTPS-Prüfung
- Backup-Job + Rotation, HA-Backup-Verhalten (`cold`) prüfen, **Restore-Test**
- Ressourcenmessung auf dem Pi neben HA
- Funktionstest: Installation als PWA auf Smartphone, Desktop-Browser
- Betriebsdoku: Update, Restore, Passwort zurücksetzen

## Danach (Backlog, priorisierbar)
- Schreib-Outbox (Offline-Erfassung)
- Dashboard anpassen (Reihenfolge, Größe, Ein/Aus)
- Erinnerungen (Web Push)
- Home-Assistant-Integration (Sensoren → Einträge per Import-API mit Token; umgekehrt Life-OS-Werte als HA-Sensoren)
- Health Connect / Apple Health (Import über Export-Dateien oder Shortcuts)
- Tags über Module hinweg, Tagesnotiz/Journal
- KI-gestützte Zusammenfassungen (opt-in, bevorzugt lokal)

## Geklärte Fragen (Phase 0, 2026-11-24)
| # | Frage | Antwort | Auswirkung |
|---|---|---|---|
| 1 | iPhone oder Android? | **Android** (Chrome) | Installations-Prompt, Background Sync und Web Push verfügbar; Testfokus Chrome Android |
| 2 | Eigenes Repository? | **Ja, privat** (`life-os`) | Inhalt von `life-os/` wird Repo-Root |
| 3 | Off-Device-Backups? | **Manueller Download** | Backup-Download + Erinnerung in der UI, Restore-Funktion (ADR-013) |
| 4 | Eigener Tailscale-Knoten? | **OK** | ADR-007 bleibt; Alternative über bestehenden Knoten dokumentiert |
| 5 | Entwicklungs-PC | **Windows, ohne Docker Desktop** | Entwicklung nativ mit Node.js; Images baut GitHub Actions (ADR-014) |

## Getroffene Annahmen (änderbar)
- Skalen 1–5 für Stimmung, Energie, Stress, Wohlbefinden, Schlafqualität; Symptome 0–10
- Tagesgrenze 00:00 (konfigurierbar), Schlaf zählt zum Aufwachtag
- Wasser-Tagesziel 2 000 ml, Schnellmengen 250/500 ml
- Woche beginnt Montag, metrische Einheiten, Zeitzone Europe/Berlin
