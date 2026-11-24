# Life OS

Private, selbst gehostete App zum Erfassen und Auswerten des eigenen Alltags – Wasser, Schlaf, Stimmung, Gewohnheiten, Bewegung, Ernährung, Körperwerte, Symptome, Fokus und eigene Tracker.

- **PWA** für Smartphone (primär) und Desktop
- **Daten bleiben zu Hause**: SQLite auf einem Raspberry Pi 4 als Home-Assistant-App
- **Zugriff nur privat** über Tailscale (HTTPS über `*.ts.net`)
- **Modular**: neue Tracker ohne Umbau bestehender Daten

## Status

Phase 0 (Konzeption) abgeschlossen. Noch kein lauffähiger Code.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Anforderungen, Module, Design, nicht-funktionale Anforderungen |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, Struktur, Modulsystem, API, PWA, Sicherheit, Deployment |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tabellen, Payloads, Feldtypen, Schemaevolution, Export |
| [docs/FEASIBILITY.md](docs/FEASIBILITY.md) | Machbarkeit: HAOS, Pi 4, microSD, Tailscale/HTTPS, SQLite |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architekturentscheidungen (ADR-Log) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phasen, offene Fragen, Annahmen |
| [CLAUDE.md](CLAUDE.md) | Arbeitsregeln für Claude Code |

## Struktur

```
shared/      gemeinsame Typen, Zod-Schemas, Moduldefinitionen
backend/     Node.js/Hono REST-API + Auslieferung des Frontends
frontend/    React/Vite PWA
database/    SQL-Migrationen (lokale Dev-DB in database/data/, gitignored)
deployment/  Docker und Home-Assistant-App
docs/        Projektdokumentation
```
