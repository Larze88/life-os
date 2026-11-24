# Life OS – Architekturentscheidungen (ADR-Log)

Kurzform: Kontext → Entscheidung → Konsequenz. Neue Entscheidungen unten anhängen, alte nicht löschen, sondern mit „Ersetzt durch ADR-xxx“ markieren. Alle ADRs unten: Stand 2026-11-23, Status „angenommen“ (ADR-007: „angenommen, Verifikation in Phase 5“).

## ADR-001 · Single-User als harte Annahme

**Entscheidung:** Keine Benutzer-/Rollentabelle, keine `user_id`-Spalten.
**Konsequenz:** Einfacheres Schema und Auth. Mehrbenutzerfähigkeit wäre ein bewusster, größerer Umbau.

## ADR-002 · Ein Container, ein Prozess

**Entscheidung:** Node.js-Backend liefert API und statisches Frontend aus; SQLite im selben Prozess.
**Konsequenz:** Minimaler Ressourcenbedarf, einfaches HA-App-Packaging. Keine horizontale Skalierung (nicht benötigt).

## ADR-003 · Hybrid-Datenmodell „Module sind Code, Tracker sind Daten“

**Entscheidung:** Eine generische `entries`-Tabelle mit Kernspalten (`occurred_at`, `ends_at`, `local_date`, `value`) + Zod-validiertem JSON-Payload; Module im Code registriert.
**Alternativen:** Tabelle pro Modul (zu starr), EAV (zu komplex).
**Konsequenz:** Neue Module ohne Schemaänderung; generische Statistik über `value`; modul-spezifische Abfragen über `json_extract`.

## ADR-004 · Client-generierte UUIDv7 + idempotentes PUT

**Entscheidung:** Einträge werden mit `PUT /entries/:id` angelegt/aktualisiert.
**Konsequenz:** Wiederholbare Requests, Grundlage für Offline-Outbox und Importe ohne Duplikate.

## ADR-005 · Hono statt Express/Fastify

**Entscheidung:** Hono + `@hono/node-server`.
**Begründung:** Klein, moderne Web-Standard-APIs, sehr gute TypeScript-Typen, Zod-Validator-Middleware.
**Konsequenz:** Bei Bedarf leicht auf andere Runtimes portierbar.

## ADR-006 · better-sqlite3 + Drizzle ORM

**Entscheidung:** better-sqlite3 als Treiber, Drizzle für Schema/Queries/Migrationen.
**Konsequenz:** Native Abhängigkeit → Debian-slim-Basisimage, Multi-Arch-Build in CI. `node:sqlite` später neu bewerten.

## ADR-007 · HTTPS über eigenen Tailscale-Knoten in der Life-OS-App

**Entscheidung:** Die HA-App bringt `tailscaled` (userspace) mit und veröffentlicht Life OS per `tailscale serve` unter `https://lifeos.<tailnet>.ts.net`.
**Alternativen:** HA-Ingress (PWA ungeeignet, Kopplung an HA), HA-Tailscale-App (nur HA als Ziel), eigene CA (unpraktisch).
**Konsequenz:** ~40 MB zusätzlicher RAM, einmaliger Auth-Key. Volle Trennung von HA. Wird in Phase 5 praktisch verifiziert; Fallbacks: Zertifikat des bestehenden Knotens teilen (FEASIBILITY Option C3), Notzugang per HTTP über den bestehenden Knoten (ohne PWA-Funktionen). Vom Benutzer am 2026-11-24 bestätigt.

## ADR-008 · Vorgebaute Multi-Arch-Images

**Entscheidung:** Build in GitHub Actions, Ablage in GHCR; HA lädt nur das fertige Image.
**Konsequenz:** Kein Build auf dem Pi. Bei privatem Image müssen Registry-Zugangsdaten in HA hinterlegt werden.

## ADR-009 · Eigene Passwort-Auth mit Sitzungscookie

**Entscheidung:** scrypt-Hash (node:crypto), zufällige Sitzungstoken, gehasht gespeichert, HttpOnly-Cookie, 90 Tage gleitend.
**Konsequenz:** Keine externe Auth-Abhängigkeit. Tailscale ist die äußere Schutzschicht, das Passwort die innere.

## ADR-010 · Kein Service-Worker-Caching von API-Antworten

**Entscheidung:** SW cached nur die App-Shell; Daten-Offline-Fähigkeit über persistierten TanStack-Query-Cache.
**Konsequenz:** Kontrollierbares Verhalten, keine veralteten Gesundheitsdaten im SW-Cache.

## ADR-011 · Logischer Tag wird beim Schreiben gespeichert

**Entscheidung:** `local_date` + `tz_offset_min` werden pro Eintrag gespeichert; Schlaf zählt zum Aufwachtag.
**Konsequenz:** Auswertungen unabhängig von Zeitzonenwechseln; Änderung der Tagesgrenze erfordert explizite Neuberechnung.

## ADR-012 · Sprache

**Entscheidung:** UI-Texte Deutsch (zentral in `frontend/src/lib/i18n/de.ts`, i18n-fähig strukturiert, aber ohne i18n-Bibliothek); Code, Bezeichner, Commits Englisch; Dokumentation Deutsch.

## ADR-013 · Off-Device-Backup per manuellem Download (2026-11-24)

**Kontext:** Kein NAS/Netzwerkziel gewünscht; microSD kann ausfallen.
**Entscheidung:** Ein-Tap-Download eines konsistenten SQLite-Snapshots in der UI, Erinnerung nach 14 Tagen ohne Download, Restore per Upload. Lokale Snapshots und HA-Backups bleiben als zweite Ebene.
**Konsequenz:** Schutz vor Kartenausfall hängt von regelmäßigen Downloads ab – deshalb sichtbare Erinnerung im Dashboard. Restore-Pfad ist Pflichtbestandteil und wird getestet.

## ADR-014 · Entwicklung nativ unter Windows, Images in CI (2026-11-24)

**Kontext:** Entwicklungs-PC mit Windows, kein Docker Desktop.
**Entscheidung:** Lokale Entwicklung mit Node.js 24 direkt unter Windows. Docker-Images (arm64/amd64) baut ausschließlich GitHub Actions. Docker Compose bleibt optional.
**Konsequenz:** Code muss plattformneutral sein (`node:path`, LF-Zeilenenden via `.gitattributes`, Scripts ohne Bash-Abhängigkeit → Node-Scripts statt Shell). Container-spezifisches Verhalten (Tailscale, `/data`) wird erst auf dem Pi getestet; ein Testlauf auf einem amd64-Rechner ist über GitHub Actions möglich.

## ADR-015 · Zielplattform Android/Chrome (2026-11-24)

**Entscheidung:** Primärer Testfokus Chrome auf Android. Background Sync und Web Push können später genutzt werden; iOS-Sonderwege werden nicht vorab umgesetzt.

## ADR-016 · Werkzeugversionen (2026-11-24)

**Kontext:** Bei Projektstart sind TypeScript 7 (nativer Compiler), React Router 8, Vite 8, Vitest 5, Zod 4 und Tailwind 4 aktuell. typescript-eslint unterstützt TypeScript nur bis < 6.1.
**Entscheidung:** TypeScript auf `~6.0` pinnen; alle anderen Bibliotheken in der aktuellen Hauptversion verwenden.
**Konsequenz:** Upgrade auf TS 7, sobald typescript-eslint es unterstützt. Die CI prüft bei jedem Push Typen, Lint, Tests und Build.

## ADR-017 · Eigene statische Auslieferung statt Middleware (2026-11-24)

**Entscheidung:** Ein kleiner eigener Handler (`backend/src/lib/static-files.ts`) liefert das Frontend aus.
**Begründung:** Volle Kontrolle über die Cache-Header (gehashte Assets `immutable`; `index.html`, `sw.js` und das Manifest immer `no-cache`, damit PWA-Updates ankommen), SPA-Fallback und Schutz gegen Path Traversal, alles getestet.

## ADR-018 · Login-Rate-Limit global statt pro IP (2026-11-24)

**Entscheidung:** Fehlversuche werden global gezählt (5 pro 15 Minuten).
**Begründung:** Hinter `tailscale serve` kommen alle Anfragen von localhost, und es gibt nur einen legitimen Benutzer. Ein Angreifer im Tailnet könnte den Login dadurch kurz sperren. Das ist akzeptiert, weil das Tailnet privat ist.
