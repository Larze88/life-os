# Life OS

Private, selbst gehostete App zum Erfassen und Auswerten des eigenen Alltags: Wasser, Schlaf, Stimmung, Gewohnheiten, Bewegung, Ernährung, Körperwerte, Symptome, Fokus und eigene Tracker.

- **PWA** für Smartphone (Android, primär) und Desktop
- **Daten bleiben zu Hause**: SQLite auf einem Raspberry Pi 4 als Home-Assistant-App
- **Zugriff nur privat** über Tailscale (HTTPS über `*.ts.net`)
- **Modular**: neue Tracker ohne Umbau bestehender Daten

## Status

Phase 1 (technisches Grundgerüst) ist abgeschlossen: Anmeldung, Navigation, PWA, Datenbank mit Migrationen und Tests. Die Tracking-Module folgen ab Phase 2/3, siehe [docs/ROADMAP.md](docs/ROADMAP.md).

## Lokal starten (Windows)

Voraussetzungen: **Node.js 24 LTS** (https://nodejs.org) und **Git**. Docker ist nicht nötig.

```powershell
node -v          # muss v24.x (mindestens v22.12) anzeigen
git clone https://github.com/Larze88/life-os.git
cd life-os
npm install
npm run dev
```

Dann im Browser **http://localhost:5173** öffnen. Beim ersten Start legst du dein Passwort fest.

- Die lokale Datenbank liegt in `database/data/lifeos.db` und wird nie committet.
- Zum Zurücksetzen den Server stoppen (Strg+C) und den Ordner `database/data` löschen.
- Vom Handy aus kannst du lokal noch nicht testen. Das klappt erst mit HTTPS in Phase 5.

## Befehle

| Befehl                                 | Zweck                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                          | Backend (:8080) und Frontend (:5173) mit Auto-Reload                    |
| `npm test`                             | Alle Tests (Vitest)                                                     |
| `npm run check`                        | Typprüfung, Lint und Tests                                              |
| `npm run build`                        | Produktions-Build (`frontend/dist`, `backend/dist`)                     |
| `npm start`                            | Gebauten Server starten (mit `STATIC_DIR=frontend/dist` inkl. Frontend) |
| `npm run db:generate -- --name=<name>` | Migration aus Schema-Änderung erzeugen                                  |
| `npm run db:migrate`                   | Migrationen anwenden, ohne den Server zu starten                        |

## Dokumentation

| Dokument                                     | Inhalt                                                         |
| -------------------------------------------- | -------------------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                   | Anforderungen, Module, Design, nicht-funktionale Anforderungen |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, Struktur, Modulsystem, API, PWA, Sicherheit, Deployment |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)     | Tabellen, Payloads, Feldtypen, Schemaevolution, Export         |
| [docs/FEASIBILITY.md](docs/FEASIBILITY.md)   | Machbarkeit: HAOS, Pi 4, microSD, Tailscale/HTTPS, SQLite      |
| [docs/DECISIONS.md](docs/DECISIONS.md)       | Architekturentscheidungen (ADR-Log)                            |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | Phasen, Fortschritt, Annahmen                                  |
| [CLAUDE.md](CLAUDE.md)                       | Arbeitsregeln für Claude Code                                  |

## Struktur

```
shared/      gemeinsame Typen, Zod-Schemas, Feldtypen, Modulvertrag, Zeitlogik
backend/     Node.js/Hono REST-API + Auslieferung des Frontends
frontend/    React/Vite PWA
database/    SQL-Migrationen (lokale Dev-DB in database/data/, gitignored)
deployment/  Docker und Home-Assistant-App (Phase 5)
docs/        Projektdokumentation
```
