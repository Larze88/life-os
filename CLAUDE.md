# CLAUDE.md – Arbeitsanweisungen für Life OS

Life OS ist eine private Single-User-PWA zum Alltags-Tracking (React/Vite/Tailwind/shadcn · Node/Hono · SQLite/Drizzle), betrieben als Home-Assistant-App auf einem Raspberry Pi 4, erreichbar nur über Tailscale.

**Vor jeder größeren Änderung lesen:** `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`. Aktueller Fortschritt: `docs/ROADMAP.md`.

## Projektstand

Phase 1 abgeschlossen: Monorepo (npm Workspaces), Auth, Navigation, PWA, DB-Schema + erste Migration, Tests. Modul-Registries existieren, sind aber noch leer. Nächster Schritt: Phase 2 (Dashboard).

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
- Frontend-Tests mocken `fetch` und rendern die komplette App über `renderApp()` aus `frontend/src/test/render.tsx`.

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

1. `shared/src/modules/<id>/definition.ts` – `ModuleDefinition` (configSchema, dataSchema, fields, entryKind, primaryValue, defaultTrackers); in `shared/src/modules/registry.ts` eintragen.
2. Optional `backend/src/modules/<id>/` für spezielle Auswertungen; in `backend/src/modules/registry.ts` eintragen.
3. `frontend/src/modules/<id>/` – `Widget`, `QuickActions`, optional `EntryForm` (sonst generisches Formular), `DetailView`; in `frontend/src/modules/registry.ts` eintragen.
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
