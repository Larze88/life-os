# Life OS – Architektur

> Status: Entwurf v0.1 (Phase 0) · Stand: 2026-11-23
> Ergänzend: [DATA_MODEL.md](DATA_MODEL.md), [FEASIBILITY.md](FEASIBILITY.md), [DECISIONS.md](DECISIONS.md)

## 1. Überblick

```
 Smartphone / PC (Browser, PWA)
        │  HTTPS (Tailscale-Zertifikat, *.ts.net)
        ▼
 ┌─────────────────────── Raspberry Pi 4 · Home Assistant OS ───────────────────────┐
 │                                                                                   │
 │  ┌──────────── Life OS App (HA-App / früher „Add-on“, eigener Container) ──────┐ │
 │  │  tailscaled (userspace) ── tailscale serve :443 ──► Node.js :8080            │ │
 │  │                                                    ├─ REST API /api/v1/*     │ │
 │  │                                                    └─ statisches Frontend    │ │
 │  │  /data  (persistent, Teil der HA-Backups)                                    │ │
 │  │    ├─ lifeos.db (SQLite, WAL)                                                │ │
 │  │    ├─ backups/                                                               │ │
 │  │    └─ tailscale/ (Node-State)                                                │ │
 │  └──────────────────────────────────────────────────────────────────────────────┘ │
 │  Home Assistant Core, weitere Apps (unberührt)                                    │
 └───────────────────────────────────────────────────────────────────────────────────┘
```

**Ein Container, ein Node-Prozess, eine Datenbankdatei.** Das Backend liefert API und gebautes Frontend aus. Keine separaten Dienste (kein Reverse Proxy, kein DB-Server, kein Redis).

## 2. Technologie-Stack

| Schicht           | Wahl                                                        | Begründung                                                                                       |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Runtime           | **Node.js 24 LTS**                                          | Aktuelle LTS, ARM64 offiziell unterstützt                                                        |
| Sprache           | **TypeScript (strict)** überall                             | Gemeinsame Typen Frontend/Backend                                                                |
| Monorepo          | **npm Workspaces** (`shared`, `backend`, `frontend`)        | Keine zusätzliche Tooling-Abhängigkeit (pnpm/turbo unnötig bei 3 Paketen)                        |
| Validierung       | **Zod** (in `shared`)                                       | Eine Schemaquelle für API, Formulare und DB-JSON                                                 |
| Backend-Framework | **Hono** + `@hono/node-server`                              | Klein, schnell, Web-Standards, gute TS-Typen, Zod-Validator                                      |
| Datenbank         | **SQLite** via **better-sqlite3**                           | Synchron, sehr schnell, bewährt; Prebuilds für linux-arm64                                       |
| ORM / Migrationen | **Drizzle ORM** + drizzle-kit                               | Typsichere Queries, SQL-nahe, generiert lesbare SQL-Migrationen                                  |
| Logging           | **pino** mit Redaction                                      | Strukturiert, ressourcenschonend                                                                 |
| Frontend          | **React 19 + Vite**                                         | Vorgabe; schnelle Builds                                                                         |
| Styling / UI      | **Tailwind CSS v4 + shadcn/ui** (Radix)                     | Komponenten liegen im Repo, anpassbar, kein Laufzeit-Lock-in                                     |
| Routing           | **React Router** (Library-Modus)                            | Verbreitet, ausreichend                                                                          |
| Server-State      | **TanStack Query**                                          | Caching, optimistische Updates, Persistenz für Offline-Lesen                                     |
| Formulare         | **react-hook-form** + Zod-Resolver                          | Passt zu shadcn/ui-Formularen                                                                    |
| Diagramme         | **Eigene SVG-Komponenten** (`frontend/src/features/stats/`) | Klein (statt ~100 KB Recharts), volle Kontrolle über Touch-Bedienung und Design-Tokens (ADR-037) |
| Datum/Zeit        | **date-fns** (+ `@date-fns/tz`)                             | Modular, tree-shakeable                                                                          |
| Icons             | **lucide-react**                                            | Standard bei shadcn                                                                              |
| PWA               | **vite-plugin-pwa** (Workbox)                               | Manifest + Service Worker                                                                        |
| Tests             | **Vitest** (Unit/Integration), **Playwright** (E2E, später) | Einheitlich, schnell                                                                             |
| Container         | Docker (Multi-Arch amd64/arm64), Docker Compose lokal       |                                                                                                  |

Bewusst **nicht** verwendet: PostgreSQL, Redis, Next.js/SSR (unnötig für private SPA), GraphQL, externe Auth-Provider, CSS-in-JS.

## 3. Repository-Struktur

```
life-os/
├─ CLAUDE.md                 Arbeitsanweisungen für Claude Code
├─ README.md
├─ package.json              npm Workspaces, zentrale Scripts
├─ docs/                     PRD, Architektur, Datenmodell, Roadmap, Entscheidungen
├─ shared/                   @lifeos/shared – Zod-Schemas, Feldtypen, Modul-Definitionen, Datumslogik
│  └─ src/
│     ├─ fields/             Feldtyp-System (number, scale, select, …)
│     ├─ modules/<modul>/    deklarative Moduldefinition (Config-/Daten-Schema, Defaults)
│     ├─ api/                Request/Response-Schemas
│     └─ time/               logischer Tag, Zeitzonen
├─ backend/                  @lifeos/backend – Hono-Server
│  └─ src/
│     ├─ app.ts / server.ts
│     ├─ db/                 Drizzle-Schema, Client, Migrator
│     ├─ auth/
│     ├─ core/               trackers, entries, goals, days, export, backup
│     ├─ modules/<modul>/    optionale modul-spezifische Auswertungen/Routen
│     └─ lib/                Fehler, Logging, Config
├─ frontend/                 @lifeos/frontend – React-SPA/PWA
│  └─ src/
│     ├─ app/                Routing, Layout, Provider
│     ├─ components/ui/      shadcn/ui-Komponenten
│     ├─ features/           dashboard, history, stats, settings, auth
│     ├─ modules/<modul>/    Widget, Erfassung, Detailansicht, Schnellaktionen
│     └─ lib/                API-Client, Query-Keys, Hilfsfunktionen
├─ database/
│  ├─ migrations/            generierte SQL-Migrationen (versioniert, nie nachträglich ändern)
│  └─ data/                  lokale Entwicklungsdatenbank (gitignored)
└─ deployment/
   ├─ docker/                Dockerfile, docker-compose.yml
   └─ home-assistant/        HA-App-Repository (repository.yaml, lifeos/config.yaml, DOCS.md)
```

Anpassung gegenüber der Vorgabe: zusätzlicher Ordner **`shared/`** (gemeinsame Typen/Schemas – zentral für die Modularität), `database/` enthält Migrationen statt Code, `deployment/docker/` für generische Container-Dateien.

## 4. Modulsystem (Kern der Erweiterbarkeit)

**Grundsatz: „Module sind Code, Tracker sind Daten.“**

- Ein **Modul** (z. B. `water`, `sleep`, `measurement`, `custom`) ist im Code definiert: welche Felder ein Eintrag hat, wie er validiert, dargestellt und ausgewertet wird.
- Ein **Tracker** ist eine konfigurierte Instanz eines Moduls in der Datenbank (z. B. Tracker „Gewicht“ vom Modul `measurement` mit Einheit kg). Manche Module haben genau einen Tracker (Wasser), andere beliebig viele (Gewohnheiten, Körperwerte, eigene Tracker).
- Alle Einträge liegen in **einer** generischen Tabelle `entries` mit typisierten Kernspalten und einem modul-spezifischen JSON-Payload, das per Zod validiert wird (Details: [DATA_MODEL.md](DATA_MODEL.md)).

### Modulvertrag

```ts
// shared/src/modules/types.ts (vereinfacht)
interface ModuleDefinition<Config, Data> {
  id: string; // stabil, nie umbenennen: 'water'
  version: number; // Version des Daten-Schemas
  configSchema: ZodType<Config>; // Tracker-Konfiguration (Einheit, Schnellmengen …)
  dataSchema: ZodType<Data>; // Payload eines Eintrags
  fields: FieldDefinition[]; // deklarative Felder → generische Formulare
  entryKind: 'instant' | 'span'; // Zeitpunkt vs. Zeitraum (Schlaf, Sport, Fokus)
  primaryValue: {
    label: string;
    unit?: string;
    aggregate: 'sum' | 'avg' | 'last' | 'count' | 'max';
  };
  dayAssignment?: 'start' | 'end'; // Schlaf: Aufwachtag
  upgrade?: Record<number, (old: unknown) => unknown>; // Daten-Migration beim Lesen
  defaultTrackers?: TrackerSeed[];
}
```

Frontend-Ergänzung pro Modul (`frontend/src/modules/<id>/index.ts`): `Widget`, `EntryForm` (optional – sonst generisches Formular aus `fields`), `QuickActions`, `DetailView`. Backend-Ergänzung nur, wenn generische Aggregationen nicht reichen.

Module werden in je einer **Registry-Datei** pro Paket registriert. Ein neues Modul = neue Ordner + je eine Zeile in der Registry; **keine Änderung an bestehenden Tabellen**. Checkliste: [CLAUDE.md](../CLAUDE.md#neues-modul-hinzufügen).

### Warum nicht voll generisch (EAV) und nicht eine Tabelle pro Modul?

| Ansatz                                  | Problem                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tabelle pro Modul                       | Jede Erweiterung = Schemamigration + neue Endpunkte; Dashboard/Export/Statistik müssen jedes Modul kennen              |
| Voll generisches EAV (Feld-Wert-Zeilen) | Komplexe Queries, schlechte Typisierung, schwer wartbar                                                                |
| **Hybrid (gewählt)**                    | Gemeinsame Kernspalten (Zeit, Tag, Hauptwert) für schnelle generische Auswertungen + validiertes JSON für Moduldetails |

## 5. API-Design

REST, JSON, versioniert unter `/api/v1`. Fehler im Format **RFC 9457** (`application/problem+json`).

| Endpunkt                                                     | Zweck                                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `POST /auth/login`, `POST /auth/logout`, `GET /auth/session` | Anmeldung                                                                  |
| `GET /health`                                                | Healthcheck (ohne Auth, ohne Daten)                                        |
| `GET/POST/PATCH /trackers`, `POST /trackers/:id/archive`     | Tracker-Verwaltung                                                         |
| `GET /entries?tracker=&from=&to=`                            | Einträge abfragen                                                          |
| `PUT /entries/:id`                                           | Eintrag anlegen **oder** aktualisieren (idempotent, ID vom Client, UUIDv7) |
| `DELETE /entries/:id`                                        | Soft Delete                                                                |
| `GET /days/:date`                                            | Tageszusammenfassung aller Tracker (Dashboard)                             |
| `GET /stats/:trackerId?period=week&from=&to=`                | Aggregationen                                                              |
| `GET /stats/correlation?a=&b=&from=&to=`                     | Beschreibende Korrelation (Phase 4)                                        |
| `GET/PUT /goals`, `GET/PUT /settings`, `GET/PUT /dashboard`  | Konfiguration                                                              |
| `GET /export?format=json                                     | csv`                                                                       | Datenexport |
| `POST /backups`, `GET /backups`                              | Manuelles Backup / Liste                                                   |
| `GET /backups/download`                                      | Frischer konsistenter Snapshot als Datei-Download                          |
| `POST /backups/restore`                                      | Wiederherstellung aus hochgeladener `.db`                                  |

**Idempotente Schreibvorgänge mit Client-IDs** sind die zentrale Vorbereitung auf Offline-Sync: Ein späterer Outbox-Mechanismus kann Requests beliebig oft wiederholen, ohne Duplikate zu erzeugen.

## 6. Frontend-Architektur

- SPA, Mobile-first; Layout-Wechsel bei `md` (Tab-Leiste unten ↔ Seitennavigation)
- **Server-State nur über TanStack Query**; Query-Keys zentral; Schnellaktionen mit optimistischem Update + Rollback + „Rückgängig“-Toast
- **Widget-System**: Registry `widgetType → Komponente`; Dashboard-Layout kommt als Daten (`dashboard_widgets`) vom Server. MVP liefert ein Standardlayout; Anordnen/Konfigurieren ist später reine UI-Arbeit
- Generischer **Formular-Renderer** aus `FieldDefinition[]` (Skala, Auswahl, Zahl, …) – eigene Tracker und einfache Module brauchen keinen eigenen Formularcode
- Design-Tokens (Farben je Modul, Radius, Abstände) als CSS-Variablen; Hell/Dunkel über `prefers-color-scheme`
- Schriftarten lokal ausgeliefert (keine Google-Fonts-Requests)

## 7. PWA & Offline-Strategie

| Stufe | Inhalt                                                                                                    | Phase  |
| ----- | --------------------------------------------------------------------------------------------------------- | ------ |
| 1     | Manifest, Icons, Service Worker; App-Shell precached; Installierbarkeit                                   | 1      |
| 2     | Lesecache: TanStack-Query-Cache in IndexedDB persistiert → Dashboard zeigt letzte bekannte Daten offline  | 2      |
| 3     | Schreib-Outbox: fehlgeschlagene `PUT /entries/:id` in IndexedDB, automatische Wiederholung bei Verbindung | später |

API-Antworten werden **nicht** vom Service Worker gecacht (vermeidet veraltete Gesundheitsdaten im SW-Cache und Auth-Probleme); das übernimmt Stufe 2 kontrolliert.

Service Worker und Installation erfordern einen **Secure Context** (HTTPS oder `localhost`). Lokal genügt `localhost`; produktiv siehe Abschnitt 9.

## 8. Sicherheit

| Thema             | Maßnahme                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Netzwerk          | Kein Port-Forwarding, kein Tailscale Funnel. Erreichbar nur im Tailnet (und optional LAN)                                                                                                        |
| Authentifizierung | Ein Passwort, gehasht mit `scrypt` (node:crypto, keine Zusatzabhängigkeit). Initiales Passwort über App-Konfiguration bzw. Ersteinrichtungs-Bildschirm                                           |
| Sitzungen         | Zufälliges Token (256 bit), in DB nur als SHA-256-Hash; Cookie `HttpOnly; Secure; SameSite=Lax`; gleitende Laufzeit 90 Tage; Liste aktiver Sitzungen mit Widerruf                                |
| CSRF              | SameSite-Cookie + Prüfung des `Origin`-Headers bei schreibenden Requests                                                                                                                         |
| Brute Force       | Rate-Limit + Verzögerung auf `/auth/login` (In-Memory reicht bei Single-Instance)                                                                                                                |
| Header            | CSP ohne Fremd-Origins, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy`                                                                                           |
| Logging           | Keine Request-Bodies, keine Eintragsinhalte, keine Cookies/Tokens; pino-Redaction als Sicherheitsnetz                                                                                            |
| Speicherung       | DB-Datei im Container-`/data`, nur für die App zugänglich. Keine Verschlüsselung at rest im MVP (Bedrohungsmodell: Gerät im eigenen Haushalt); HA-Backups sind verschlüsselt (siehe FEASIBILITY) |
| Optional später   | Tailscale-Identitätsheader (`Tailscale-User-Login`) als komfortabler Zweitfaktor/Auto-Login                                                                                                      |

## 9. Deployment (Zielbild, Detailprüfung in Phase 5)

1. **Build**: GitHub Actions baut ein Multi-Arch-Image (`linux/arm64`, `linux/amd64`) und legt es in GHCR ab. Kein Kompilieren auf dem Pi (schont microSD und CPU).
2. **Bereitstellung**: Öffentliches **HA-App-Repository** `life-os-ha` (Quelle: `deployment/home-assistant/app/`) mit `config.yaml` (`image: ghcr.io/larze88/lifeos-{arch}`, `arch: [aarch64]`). Installation über die HA-Oberfläche, Updates per Klick (ADR-024 bis ADR-026). Anleitung: `deployment/home-assistant/README.md`.
3. **Persistenz**: `/data` der App → SQLite, Backups, Tailscale-State.
4. **HTTPS/Zugriff**: Die App startet einen eigenen `tailscaled` (userspace networking) als **separaten Tailnet-Knoten** `lifeos` und veröffentlicht den Node-Server mit `tailscale serve` unter `https://lifeos.<tailnet>.ts.net` (echtes Let's-Encrypt-Zertifikat über Tailscale). Begründung und Alternativen: [FEASIBILITY.md](FEASIBILITY.md#4-pwa-https-und-tailscale).
5. **Lokal (Windows)**: `npm run dev` mit nativ installiertem Node.js 24 (Vite + API auf `localhost`, dort funktionieren Service Worker auch ohne HTTPS). Docker ist für die Entwicklung **nicht** nötig; das Produktiv-Image baut GitHub Actions. `docker compose` bleibt optional.

**Warum ein eigener Tailscale-Knoten und nicht der bestehende?** Der bestehende Knoten (Tailscale-App von HA) macht den ganzen Pi im Tailnet erreichbar. Jede App mit freigegebenem Port ist daher schon unter `http://homeassistant.<tailnet>.ts.net:<port>` erreichbar – aber nur per **HTTP**. Ein gültiges HTTPS-Zertifikat stellt die Tailscale-App nur für Home Assistant selbst bereit (`share_homeassistant` → Port 8123). Chrome behandelt eine HTTP-Adresse als unsicher: kein Service Worker, keine echte Installation. Details und Alternative: [FEASIBILITY.md §4](FEASIBILITY.md#4-pwa-https-und-tailscale).

## 10. Backups

Gewählte Strategie: **Off-Device-Sicherung per manuellem Download** (ADR-013).

| Ebene | Mechanismus                                                                                                                                     | Ort                        | Schützt vor                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------- |
| 1     | Nächtlicher SQLite-Snapshot (Online-Backup-API), Rotation 14 täglich / 8 wöchentlich / 12 monatlich; zusätzlich automatisch vor jeder Migration | `/data/backups` (microSD)  | Bedienfehler, fehlerhafte Updates |
| 2     | Home-Assistant-Backups enthalten `/data` der App                                                                                                | microSD (Standard)         | wie Ebene 1                       |
| 3     | **Backup-Download in der UI**: konsistenter Snapshot als `lifeos-YYYY-MM-DD.db` (+ optional JSON-Export)                                        | PC / Smartphone / beliebig | **Kartenausfall**                 |

Da Ebene 3 manuell ist, unterstützt die App aktiv:

- Dashboard-Hinweis, wenn der letzte Download älter als **14 Tage** ist (Intervall einstellbar); Zeitpunkt wird in `settings` (`last_backup_download_at`) gespeichert
- Ein Tap → Download (auf Android landet die Datei in „Downloads“)
- **Restore** in den Einstellungen: `.db`-Datei hochladen → Prüfung (Integrität, Schemaversion, ggf. Migration) → vorher automatischer Snapshot des aktuellen Stands → Austausch
- Die heruntergeladene Datei ist **unverschlüsselt** und enthält Gesundheitsdaten → Hinweis in der UI; optional später passwortgeschützte Variante

## 11. Erweiterungspunkte für die Zukunft

| Erweiterung                             | Vorbereitung im Design                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Home Assistant / automatische Erfassung | `entries.source` + `source_ref` (Deduplizierung); Import-Endpunkt mit API-Token; HA-Sensoren können über REST pushen |
| Apple Health / Health Connect           | Gleicher Import-Pfad; Mapping externer Typen auf Tracker                                                             |
| Erinnerungen / Push                     | Web Push (VAPID) ist selbst-hostbar; auf iOS nur für installierte PWAs. Scheduler im Node-Prozess                    |
| KI-Auswertungen                         | Export-/Aggregations-API als Datenbasis; nur nach expliziter Zustimmung, bevorzugt lokal                             |
| Dashboard-Konfiguration                 | `dashboard_widgets` existiert ab Phase 2                                                                             |
| Offline-Sync                            | Client-UUIDs, idempotentes PUT, `updated_at`, Soft Delete                                                            |
| Neue Tracker                            | Modulvertrag + `custom`-Modul                                                                                        |
