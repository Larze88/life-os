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

## ADR-019 · Phase 2 zusammen mit dem Wasser-Modul (2026-11-24)

**Entscheidung:** Das Dashboard wurde direkt mit dem ersten echten Modul (Wasser) gebaut statt mit Platzhaltern.
**Begründung:** Ein Widget-System ohne echten Tracker lässt sich nicht sinnvoll testen. Wasser deckt mit Schnellaktion, Tagesziel und Summierung den häufigsten Fall ab und dient als Vorlage für alle weiteren Module.

## ADR-020 · Offline-Lesecache verschoben (2026-11-24)

**Entscheidung:** Das Persistieren des Query-Caches (IndexedDB) folgt später, zusammen mit der Schreib-Outbox.
**Begründung:** Beides betrifft dieselben Fragen (Datenschutz auf dem Gerät, Löschen beim Abmelden, Konflikte), und vor dem Deployment auf dem Pi ist der Server immer lokal erreichbar. Bis dahin: klare Fehlermeldung bei fehlender Verbindung, kein stiller Datenverlust (optimistische Anzeige wird zurückgerollt).

## ADR-021 · Gelöschte Einträge sind endgültig für den Client (2026-11-24)

**Entscheidung:** Ein `PUT` auf eine soft-gelöschte Eintrags-ID liefert 409, statt den Eintrag wiederzubeleben.
**Begründung:** Verhindert, dass ein verspäteter Wiederholungsversuch (z. B. aus einer späteren Offline-Outbox) einen per „Rückgängig“ entfernten Eintrag zurückbringt.

## ADR-022 · Zieländerungen gelten ab dem gewählten Tag (2026-11-24)

**Entscheidung:** `PUT /trackers/:id/goal` schließt das laufende Ziel am Vortag (`valid_to`) und legt ein neues ab `effectiveFrom` an. Am selben Tag mehrfach geändert, wird das Ziel nur korrigiert. Die UI ändert Ziele immer „ab heute“.
**Konsequenz:** Vergangene Tage werden immer gegen das damals gültige Ziel bewertet.

## ADR-023 · Übergangsbetrieb auf dem PC, Pi-Deployment vorgezogen (2026-11-24)

**Kontext:** Die App soll hauptsächlich auf dem Handy genutzt werden.
**Entscheidung:** Sofort-Lösung: `tailscale serve` auf dem Windows-PC vor dem lokalen Produktions-Build (gleicher Mechanismus wie später auf dem Pi, ADR-007). Das Pi-Deployment (Phase 5) wird vor die weiteren Module gezogen.
**Konsequenz:** Daten, die bis dahin auf dem PC entstehen, werden per Backup-Download/Restore auf den Pi übertragen. Die Restore-Funktion wird deshalb mit dem Deployment gebaut.

## ADR-024 · Öffentliches Container-Image (2026-11-24)

**Kontext:** Home Assistant muss das Image laden können. Private GHCR-Images bräuchten ein GitHub-Token in Home Assistant.
**Entscheidung:** Das Image `ghcr.io/larze88/lifeos-aarch64` ist öffentlich.
**Konsequenz:** Der Programmcode ist damit einsehbar, Daten nie (die liegen nur in `/data` auf dem Pi). Alternative bei Bedarf: Image privat und in Home Assistant unter App-Store → ⋮ → Registries ein GitHub-Token (`read:packages`) hinterlegen.

## ADR-025 · App-Definition in separatem öffentlichem Repository (2026-11-24)

**Entscheidung:** Home Assistant liest App-Repositories per Git; das Hauptrepository bleibt privat. Die App-Definition (`repository.yaml`, `lifeos/config.yaml`, Doku, Icons) liegt daher zusätzlich im öffentlichen Repo `life-os-ha`. Quelle der Wahrheit bleibt `deployment/home-assistant/app/` im Hauptrepository.

## ADR-026 · Nur arm64, Image ohne RUN in der Endstufe (2026-11-24)

**Entscheidung:** Es wird nur `linux/arm64` (Raspberry Pi 4) gebaut. JavaScript und `node_modules` entstehen auf der Build-Plattform; better-sqlite3 bringt Binärdateien für alle Plattformen mit (`npm ci --ignore-scripts`). Die Endstufe kopiert nur Dateien.
**Konsequenz:** Schneller, emulationsfreier Build. Eine amd64-Variante wäre nur eine zusätzliche Plattform in `release.yml`.

## ADR-027 · Wiederherstellung per Daten-Austausch in einer Transaktion (2026-11-24)

**Entscheidung:** Ein hochgeladenes Backup wird in einer temporären Kopie geprüft (`quick_check`, Tabellen, Schema-Version) und auf das aktuelle Schema migriert. Danach wird ein Snapshot des aktuellen Stands angelegt, und alle Daten-Tabellen werden per `ATTACH` in einer Transaktion ersetzt. Sitzungen werden nicht übernommen, das wiederherstellende Gerät bleibt angemeldet.
**Begründung:** Kein Austausch der Datenbankdatei im laufenden Betrieb nötig; Fehler hinterlassen den alten Stand unverändert.

## ADR-028 · Serverseitig abgeleitete Hauptwerte (2026-11-25)

**Entscheidung:** Der Modulvertrag hat optional `deriveValue`. Schlaf berechnet die Dauer daraus; der Client-Wert wird ignoriert.
**Begründung:** Eine Quelle der Wahrheit für abgeleitete Werte (keine Inkonsistenz zwischen Zeiten und Dauer). Gleiches Muster für Sport und Fokus.

## ADR-029 · Gewohnheiten als eigene Tracker, Widgets über mehrere Tracker (2026-11-25)

**Entscheidung:** Jede Gewohnheit ist ein Tracker des Moduls `habit` (`userTrackers: true`). Ein trackerloses Widget `habits.today` zeigt alle fälligen Gewohnheiten; Widgets erhalten dafür die ganze Tagesübersicht (`day`).
**Begründung:** Statistik, Ziele und Export funktionieren pro Gewohnheit ohne Sonderlogik; ohne Tabellenänderung.

## ADR-030 · Neue Standard-Tracker in bestehenden Installationen (2026-11-25)

**Entscheidung:** Neue Module legen ihre Standard-Tracker und Widgets beim nächsten Start per Seed an (hinten angehängt). Bestehende Tracker werden nicht verändert, auch nicht umbenannte oder archivierte.

## ADR-031 · Aktive Update-Prüfung der PWA (2026-11-25)
**Kontext:** Die installierte App auf Android bleibt oft im Hintergrund aktiv und wird nie neu geladen; neue Versionen kamen dadurch nicht an.
**Entscheidung:** Der Service Worker sucht beim Zurückkehren in den Vordergrund und alle 30 Minuten nach Updates (`registration.update()`); `autoUpdate` aktiviert und lädt dann neu. Zusätzlich vergleicht ein Hinweis-Banner die Build-Version des Frontends mit der Server-Version (`/health`) und bietet „Neu laden“ an.

