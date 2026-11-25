# CLAUDE.md – Arbeitsanweisungen für Life OS

Life OS ist eine private Single-User-PWA zum Alltags-Tracking (React/Vite/Tailwind/shadcn · Node/Hono · SQLite/Drizzle), betrieben als Home-Assistant-App auf einem Raspberry Pi 4, erreichbar nur über Tailscale.

**Vor jeder größeren Änderung lesen:** `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`. Aktueller Fortschritt: `docs/ROADMAP.md`.

## Projektstand

Phasen 1, 2, 3a, 3b, 4 (Statistiken), anpassbares Dashboard, Verlauf und das Pi-Deployment sind abgeschlossen (Version 0.7.0, läuft auf dem Raspberry Pi). Module: Wasser, Stimmung, Schlaf, Gewohnheiten, Bewegung, Ernährung, Körperwerte, Beschwerden, Fokus. Vorlagen: `water` (Schnellmengen, Ziel), `sleep` (Zeitraum, `deriveValue`), `habit`/`measurement` (eigene Tracker, trackerübergreifendes Widget), `focus` (Timer). Gemeinsame UI-Bausteine: `frontend/src/components/tracking/` (ModuleSheet, EntryList, WidgetHeader, DurationPicker), `ChipGroup`, `ScalePicker`. Statistik: `backend/src/core/stats.ts`, `frontend/src/features/stats/` (eigene SVG-Diagramme). Offen: eigene Tracker (`custom`), Offline-Erfassung, Erinnerungen.

## Befehle

```bash
npm install                 # alle Workspaces
npm run dev                 # Backend (:8080) + Vite (:5173, Proxy auf /api)
npm test                    # Vitest in allen Paketen
npm run typecheck
npm run lint
npm run check               # typecheck + lint + test (vor jedem Commit)
npm run build
npm run db:generate -- --name=<name>   # Drizzle-Migration aus Schema-Änderung erzeugen
npm run db:migrate          # Migrationen lokal anwenden
docker compose -f deployment/docker/docker-compose.yml up --build   # optional, Docker nicht vorausgesetzt
```

## Entwicklungsumgebung

- Entwickelt wird unter **Windows ohne Docker** (Node.js 24 nativ). Alle npm-Scripts müssen unter Windows (PowerShell) laufen: keine Bash-Syntax in `package.json`, Hilfsskripte als Node-Scripts, Pfade über `node:path`.
- Docker-Images (arm64/amd64) baut nur GitHub Actions.
- Zielgerät ist **Android/Chrome** – UI-Tests und PWA-Prüfungen darauf ausrichten.

## Wichtige Versionen / Fallstricke

- **TypeScript ist auf 6.0 gepinnt**, weil typescript-eslint TS 7 noch nicht unterstützt (ADR-016).
- **React Router 8** (Library-Modus, `createBrowserRouter` aus `react-router`), **Zod 4**, **Vite 8**, **Vitest 5**, **Tailwind 4** (CSS-Konfiguration in `frontend/src/styles/index.css`, keine `tailwind.config`).
- `@lifeos/shared` wird **nicht gebaut**: Importe zeigen auf TS-Quellen, relative Importe mit `.ts`-Endung. Das Backend wird mit tsup gebündelt.
- Backend-Tests nutzen `createTestContext()` aus `backend/src/test/test-app.ts` (In-Memory-SQLite mit echten Migrationen).
- Frontend-Tests mocken `fetch` mit `mockApi()` (`frontend/src/test/mock-api.ts`, Wildcards wie `GET /api/v1/days/*`) und rendern die komplette App über `renderApp()` aus `frontend/src/test/render.tsx`.
- Backend-Tests für geschützte Routen: `signedIn(ctx)` liefert ein Sitzungscookie. Der Seed läuft im Testkontext automatisch.

## Release (neue Version auf den Pi bringen)

1. Version in `package.json` **und** `deployment/home-assistant/app/lifeos/config.yaml` gleich erhöhen (SemVer). Achtung: Prettier schreibt `version: '0.x.y'` mit einfachen Anführungszeichen – danach mit `grep` prüfen, dass die Änderung wirklich drin ist.
2. Committen, auf `main` pushen, dann `release.yml` starten: per Tag `v<version>` oder manuell (GitHub → Actions → „Release image“ → „Run workflow“ bzw. GitHub-API `run_workflow`; aus der Cloud-Sandbox sind Tag-Pushes blockiert). Ergebnis: `ghcr.io/larze88/lifeos-aarch64:<version>` und `:latest`.
3. Den Inhalt von `deployment/home-assistant/app/` in das öffentliche Repo `Larze88/life-os-ha` übernehmen (dort ändert sich v. a. `version`). Home Assistant zeigt dann das Update an.
4. Datenbank-Änderungen sind sicher: Migration beim Start mit vorherigem Snapshot.

Docker-Builds in der Cloud-Sandbox: Proxy-Zertifikat nur in einer temporären Dockerfile-Kopie einbinden, nie ins Repository.

## Upgrade-Tests

Bei Schema-Änderungen das Upgrade realistisch prüfen: alte Version (Git-Worktree von `main`, `@lifeos/shared` dort auf den Worktree verlinken!) legt Daten an, neue Version startet auf derselben DB. Server mit `exec node …` starten und per PID beenden – `pkill` mit relativen Pfaden trifft nicht zuverlässig.

## Arbeitsweise bei Textersetzungen

Prettier formatiert Dateien um (Zeilenumbrüche, Anführungszeichen). Skriptbasierte Ersetzungen deshalb immer mit Prüfung (`assert old in s`) – stille Fehlschläge sind hier mehrfach passiert.

## Nicht verhandelbare Regeln

1. **Keine sensiblen Daten in Logs** – keine Request-Bodies, Eintragsinhalte, Notizen, Tokens, Cookies.
2. **Keine externen Requests** zur Laufzeit (keine CDNs, Fonts, Analytics, Telemetrie). Neue Abhängigkeiten nur mit Begründung.
3. **Migrationen nur vorwärts.** Angewendete Migrationen nie ändern. Schemaänderung = `src/db/schema.ts` anpassen + `npm run db:generate` + generierte SQL committen.
4. **Unveränderliche Schlüssel:** Modul-IDs, Tracker-`key`, Feld-`key` werden nie umbenannt oder wiederverwendet. Felder werden `deprecated`, nicht gelöscht.
5. **Einträge:** IDs erzeugt der Client (UUIDv7); Schreiben über idempotentes `PUT /api/v1/entries/:id`; Löschen ist Soft Delete.
6. **Zeit:** UTC speichern, Auswertungen über `local_date`. Nie mit `new Date().toISOString().slice(0,10)` einen Tag bestimmen – immer die Helfer aus `shared/src/time`.
7. **Validierung** ausschließlich über Zod-Schemas aus `@lifeos/shared`; keine doppelten Typdefinitionen im Frontend/Backend.
8. **Keine medizinischen Schlussfolgerungen** in Texten oder Auswertungen – nur beschreibend.
9. Bestehende Module dürfen durch Erweiterungen nicht verändert werden müssen. Wenn doch nötig: erst Architektur hinterfragen, Entscheidung in `docs/DECISIONS.md` dokumentieren.
10. Daten (`database/data/`, `*.db`, Backups, `.env`) niemals committen.

## Konventionen

- TypeScript `strict`, kein `any` ohne Kommentar. ES-Module.
- Code, Bezeichner, Commits: Englisch. UI-Texte: Deutsch, zentral in `frontend/src/lib/i18n/de.ts`. Doku: Deutsch.
- Dateinamen `kebab-case.ts`, React-Komponenten `PascalCase.tsx`.
- API unter `/api/v1`, Fehler als `application/problem+json`.
- Server-State im Frontend nur über TanStack Query; Query-Keys aus `frontend/src/lib/query-keys.ts`.
- UI-Komponenten: zuerst shadcn/ui, Styling über Tailwind + Design-Tokens (CSS-Variablen). Touch-Ziele ≥ 44 px, Mobile-first.
- Commits klein und thematisch (`feat(water): add quick amounts`).

## Neues Modul hinzufügen

1. `shared/src/modules/<id>/definition.ts` – `ModuleDefinition` (configSchema, dataSchema, valueSchema, fields, entryKind, dayAssignment, primaryValue, optional deriveValue/userTrackers/defaultWidgets, defaultTrackers inkl. goals/widgets); in `shared/src/modules/registry.ts` eintragen und in `shared/src/modules/index.ts` exportieren.
2. Optional `backend/src/modules/<id>/` für spezielle Auswertungen; in `backend/src/modules/registry.ts` eintragen.
3. `frontend/src/modules/<id>/index.ts` – `FrontendModule` mit `widgets` (Widget-Typ → Komponente, z. B. `'<id>.progress'`), `QuickActions`, `DetailSheet`; in `frontend/src/modules/registry.ts` eintragen. Schreiben über `useQuickAdd()` / Hooks aus `frontend/src/features/tracking/tracking-api.ts`.
4. Default-Tracker/-Widgets über Seed-Logik (idempotent) – **keine Tabellenmigration** nötig.
5. Tests: Schema-Validierung (gültig/ungültig), Aggregation, `local_date`-Zuordnung, Widget-Rendering.
6. `docs/DATA_MODEL.md` (Payload-Tabelle) und `docs/ROADMAP.md` aktualisieren.

## Tests – Mindestumfang

- Zod-Schemas aller Module, Upgrade-Funktionen
- `local_date`-Berechnung inkl. Sommerzeit, Tagesgrenze, Schlaf über Mitternacht
- Auth (Hashing, Sitzungsablauf, Rate-Limit, Origin-Check)
- Migrationen auf leerer DB und auf DB mit Vorgängerschema
- Aggregationen/Ziele (inkl. historisierter Ziele)
- Export-Format

## Dokumentationspflicht

Langfristig wirksame Entscheidungen → neuer Eintrag in `docs/DECISIONS.md`. Datenmodell-Änderungen → `docs/DATA_MODEL.md`. Abgeschlossene Schritte → `docs/ROADMAP.md` abhaken.
