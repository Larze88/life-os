# Life OS

Private, selbst gehostete App zum Erfassen und Auswerten des eigenen Alltags: Wasser, Schlaf, Stimmung, Gewohnheiten, Bewegung, Ernährung, Körperwerte, Symptome, Fokus und eigene Tracker.

- **PWA** für Smartphone (Android, primär) und Desktop
- **Daten bleiben zu Hause**: SQLite auf einem Raspberry Pi 4 als Home-Assistant-App
- **Zugriff nur privat** über Tailscale (HTTPS über `*.ts.net`)
- **Modular**: neue Tracker ohne Umbau bestehender Daten

## Status

Grundgerüst und Dashboard stehen; das erste Modul **Wasser** ist nutzbar (Schnellbuttons, Tagesziel, Rückgängig, Bearbeiten, Rückblick auf vergangene Tage). Weitere Module folgen, siehe [docs/ROADMAP.md](docs/ROADMAP.md).

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

## Auf dem Handy nutzen (übergangsweise über den PC)

Bis Life OS auf dem Raspberry Pi läuft, kann das Handy über Tailscale auf den PC zugreifen. Der PC muss dafür eingeschaltet sein.

1. Einmalig in der Tailscale-Verwaltung (https://login.tailscale.com/admin/dns) **MagicDNS** und **HTTPS Certificates** aktivieren.
2. Life OS starten (statt `npm run dev`):
   ```powershell
   cd $HOME\life-os
   npm run phone
   ```
3. In einem **zweiten** PowerShell-Fenster einmalig:
   ```powershell
   tailscale serve --bg 8080
   ```
   Die Ausgabe zeigt die Adresse, z. B. `https://desktop-xxxx.<tailnet>.ts.net`. Die Freigabe bleibt bestehen, auch nach Neustarts; beenden mit `tailscale serve reset`.
4. Auf dem Handy (Tailscale aktiv) die Adresse in **Chrome** öffnen → Menü ⋮ → **„App installieren“** bzw. „Zum Startbildschirm hinzufügen“.

`npm run phone` und `npm run dev` nutzen dieselbe Datenbank, aber nicht gleichzeitig (beide brauchen Port 8080).

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
