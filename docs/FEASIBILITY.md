# Life OS – Technische Machbarkeitsprüfung

> Status: Phase 0 · Stand: 2026-11-23
> Legende: ✅ machbar · ⚠️ machbar mit Einschränkung/Maßnahme · ❌ nicht geeignet · 🔍 in Phase 5 praktisch zu verifizieren

## Zusammenfassung

Der geplante Stack ist auf einem Raspberry Pi 4 (4 GB) unter Home Assistant OS **machbar**. Die zwei kritischen Punkte sind nicht die Technik der App selbst, sondern der Betrieb:

1. **HTTPS für die PWA** – lösbar über einen eigenen Tailscale-Knoten innerhalb der Life-OS-App (Empfehlung) mit echtem `*.ts.net`-Zertifikat.
2. **microSD als einziger Speicher** – akzeptabel für die geringe Schreiblast, aber **Off-Device-Backups sind Pflicht**.

## 1. Home Assistant OS

| Frage                                    | Ergebnis                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Beliebige Docker-Container installieren? | ❌ Nein. HAOS erlaubt keine freien Container; Software läuft als **HA-App** (bis 2025 „Add-on“ genannt), verwaltet vom Supervisor                                                                      |
| Eigene Apps möglich?                     | ✅ Über ein eigenes **App-Repository** (GitHub-URL in der HA-Oberfläche hinzufügen) oder lokal im Ordner `/addons` (per Samba/SSH-App)                                                                 |
| Vorgebaute Images?                       | ✅ `config.yaml` → `image: ghcr.io/<user>/lifeos-{arch}`; `{arch}` wird ersetzt. Ohne `image` baut der Supervisor auf dem Pi – vermeiden (langsam, microSD-Schreiblast, native Module)                 |
| Architektur                              | ✅ Raspberry Pi 4 unter HAOS = `aarch64`. Image als `linux/arm64` bauen                                                                                                                                |
| Persistenter Speicher                    | ✅ `/data` im App-Container ist persistent und überlebt Updates. Alles außerhalb von `/data` geht verloren                                                                                             |
| Backups                                  | ✅ HA-Backups enthalten `/data` der App. Option `backup: cold` (App wird für Backup kurz gestoppt → konsistente SQLite-Datei) oder `hot` mit eigenem Snapshot. Empfehlung: **cold** + eigene Snapshots |
| Konfiguration                            | ✅ `options`/`schema` in `config.yaml` → Formular in der HA-Oberfläche (z. B. Tailscale-Auth-Key, Log-Level)                                                                                           |
| Ingress                                  | ✅ verfügbar (`ingress: true`), aber für PWA ungeeignet (siehe 4.)                                                                                                                                     |
| Watchdog/Autostart                       | ✅ `boot: auto`, `watchdog: http://[HOST]:[PORT:8080]/api/v1/health`                                                                                                                                   |
| Trennung von HA                          | ✅ Eigener Container, eigene Daten, kein Zugriff auf HA-Konfiguration nötig (`homeassistant_api: false`, keine `map`-Freigaben)                                                                        |

Prüfpunkte 🔍 Phase 5: aktuelles Schema von `config.yaml` (HA benennt Felder teils um), Ressourcenbegrenzung, Verhalten von `backup: cold` bei laufendem Tailscale.

## 2. Raspberry Pi 4 (4 GB)

| Ressource                    | Abschätzung                               | Bewertung              |
| ---------------------------- | ----------------------------------------- | ---------------------- |
| RAM Node.js-Server           | ~60–120 MB                                | ✅                     |
| RAM `tailscaled` (userspace) | ~30–60 MB                                 | ✅                     |
| CPU                          | Leerlauf nahezu 0; Requests im ms-Bereich | ✅                     |
| Image-Größe                  | ~150–250 MB (Node slim + App)             | ✅                     |
| Typische HA-Installation     | 1–2 GB belegt                             | ✅ ausreichend Reserve |

Maßnahmen: Node mit `--max-old-space-size=192` begrenzen; keine Hintergrundjobs außer nächtlichem Backup.

## 3. microSD-Karte

| Risiko                             | Bewertung                                                                           | Maßnahme                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Verschleiß durch Schreibzugriffe   | ⚠️ gering: ~50–200 kleine Writes/Tag (HA-Recorder schreibt um Größenordnungen mehr) | WAL-Modus, keine Logs in Dateien (stdout → HA-Journal), keine Request-Logs mit Bodies                 |
| Datenverlust bei Stromausfall      | ⚠️                                                                                  | `journal_mode=WAL`, `synchronous=FULL` (bei dieser Schreiblast ohne spürbaren Nachteil)               |
| Totalausfall der Karte             | ⚠️ **realistisch über Jahre**                                                       | **Backups müssen das Gerät verlassen** (HA-Backup auf Netzwerkspeicher/PC oder regelmäßiger Download) |
| Korruption bei unsauberem Snapshot | ✅                                                                                  | Snapshots über SQLite-Backup-API, nie per Dateikopie im laufenden Betrieb                             |

## 4. PWA, HTTPS und Tailscale

Service Worker und Installation („Zum Home-Bildschirm“ als echte App) erfordern einen **Secure Context**: HTTPS mit gültigem Zertifikat oder `localhost`. `http://100.x.y.z:8080` über Tailscale funktioniert im Browser, aber **ohne** Service Worker und ohne vollwertige Installation.

### Optionen

| Option                                                             | Beschreibung                                                                                                                                                                                                                                                                               | Bewertung                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A – Eigener Tailscale-Knoten in der Life-OS-App**                | Container startet `tailscaled --tun=userspace-networking` mit State in `/data/tailscale`, meldet sich per Auth-Key als Knoten `lifeos` an, `tailscale serve --bg 8080` → `https://lifeos.<tailnet>.ts.net` mit automatisch erneuertem Let's-Encrypt-Zertifikat                             | ✅ **Empfehlung.** Echte HTTPS-Origin nur für Life OS, PWA-tauglich, vollständig unabhängig von HA. Kosten: ~40 MB RAM, einmalig Auth-Key, MagicDNS + HTTPS-Zertifikate im Tailnet aktivieren                      |
| B – HA-Ingress                                                     | Life OS erscheint als Panel in HA, Zugriff über HA-Login                                                                                                                                                                                                                                   | ⚠️ Gut als **zusätzlicher** Komfortzugang, aber als PWA ungeeignet: Pfad `/api/hassio_ingress/<token>/` ändert sich, Manifest-/SW-Scope problematisch, koppelt an HA-Login (widerspricht der gewünschten Trennung) |
| C – Offizielle Tailscale-App von HA (`share_homeassistant: serve`) | Leitet nur auf HA (Port 8123) weiter; erlaubte Serve-Ports 443/8443/10000                                                                                                                                                                                                                  | ❌ Kein beliebiges Ziel konfigurierbar → nicht für Life OS nutzbar. Die bestehende Tailscale-App bleibt davon unberührt                                                                                            |
| C2 – Bestehender Knoten, HTTP                                      | `http://homeassistant.<tailnet>.ts.net:8080` – so funktionieren andere Apps heute                                                                                                                                                                                                          | ⚠️ Erreichbar und verschlüsselt (WireGuard), aber für Chrome **kein Secure Context** → kein Service Worker, keine Installation als App, kein Push. Gut als Notzugang                                               |
| C3 – Bestehender Knoten, Zertifikat teilen                         | Die Tailscale-App kopiert ihr `*.ts.net`-Zertifikat nach `/ssl` (in der Community-Variante von lmagyar als Option vorhanden, in der offiziellen App nicht dokumentiert); Life OS liest `/ssl` und spricht selbst HTTPS auf z. B. Port 8443 → `https://homeassistant.<tailnet>.ts.net:8443` | ⚠️ Möglich, aber abhängig von der verwendeten Tailscale-App, Zertifikatserneuerung muss von Life OS erkannt werden, Port in der URL. **Fallback**, falls Option A Probleme macht                                   |
| D – Eigene CA / selbstsigniert                                     |                                                                                                                                                                                                                                                                                            | ❌ Zertifikatsvertrauen auf iOS/Android mühsam, fehleranfällig                                                                                                                                                     |
| E – Öffentliche Domain / Funnel                                    |                                                                                                                                                                                                                                                                                            | ❌ Widerspricht „keine öffentliche Freigabe“                                                                                                                                                                       |

Voraussetzungen für A (einmalig in der Tailscale-Admin-Konsole):

- MagicDNS aktiviert
- HTTPS-Zertifikate aktiviert (Hinweis: Der Knotenname `lifeos.<tailnet>.ts.net` erscheint im öffentlichen Certificate-Transparency-Log – nur der Name, keine Inhalte)
- Auth-Key (wiederverwendbar nein, Ablauf beliebig; Key-Expiry für den Knoten deaktivieren)

Zusatznutzen von A: `tailscale serve` liefert Identitätsheader (`Tailscale-User-Login`), die später optional als zusätzlicher Authentifizierungsfaktor genutzt werden können.

🔍 Phase 5: `tailscaled` userspace + `serve` im HA-App-Container testen; Verhalten bei Container-Neustart (State-Persistenz) prüfen.

### Warum funktionieren andere HA-Apps über den bestehenden Knoten?

Die Tailscale-App von Home Assistant läuft im Host-Netzwerk des Pi. Damit ist **jeder Port** des Pi im Tailnet erreichbar – auch die Ports anderer Apps. Diese werden typischerweise über `http://…:<port>` oder über die HA-Seitenleiste (Ingress) geöffnet. Für normale Weboberflächen reicht das. Eine **installierbare PWA** braucht dagegen eine HTTPS-Adresse mit gültigem Zertifikat, und das Zertifikat des bestehenden Knotens wird von der Tailscale-App nur für Home Assistant genutzt. Ein eigener Knoten `lifeos` bekommt ein eigenes Zertifikat und eine eigene saubere Adresse ohne Port.

### Plattform-Hinweise PWA

| Thema             | iOS (Safari)                                                                                                          | Android (Chrome)     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Installation      | Manuell über „Teilen → Zum Home-Bildschirm“                                                                           | Installations-Prompt |
| Speicher          | Getrennter Speicher für installierte PWA; Safari kann Daten bei Nichtnutzung löschen → Server ist Quelle der Wahrheit | stabil               |
| Web Push (später) | nur für installierte PWAs (ab iOS 16.4)                                                                               | ✅                   |
| Background Sync   | ❌ nicht unterstützt → Outbox wird beim Öffnen der App abgearbeitet                                                   | ✅                   |

## 5. SQLite

| Frage                                | Bewertung                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datenmenge                           | ✅ Jahre an Daten < 50 MB                                                                                                                                                          |
| Nebenläufigkeit                      | ✅ ein Prozess, ein Benutzer; WAL erlaubt Lesen während Schreiben                                                                                                                  |
| JSON-Abfragen                        | ✅ `json_extract`, Ausdrucksindizes                                                                                                                                                |
| Native Abhängigkeit (better-sqlite3) | ⚠️ Prebuilds für linux-arm64 (glibc) verfügbar; Image daher auf **Debian slim** statt Alpine basieren (vermeidet musl-Sonderfälle). Multi-Arch-Build per QEMU in GitHub Actions 🔍 |
| Alternative `node:sqlite`            | Eingebaut, keine native Abhängigkeit, aber noch als „release candidate“ markiert → bei Stabilisierung neu bewerten                                                                 |
| Backups im Betrieb                   | ✅ Online-Backup-API                                                                                                                                                               |
| Migrationen                          | ✅ drizzle-kit, SQL im Repo                                                                                                                                                        |

## 6. Weitere Prüfpunkte

| Thema                                 | Ergebnis                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| shadcn/ui + Tailwind v4 + React 19    | ✅ offiziell unterstützte Kombination                                                                                                                                          |
| Bundle-Größe auf Mobilgeräten         | ✅ Ziel < 300 kB gzip initial; Diagramme per Lazy Loading                                                                                                                      |
| Entwicklung unter Windows ohne Docker | ✅ Node.js 24 nativ; better-sqlite3 hat Prebuilds für win-x64. Zeilenenden per `.gitattributes` auf LF fixieren, Pfade nur über `node:path`. Docker-Images baut GitHub Actions |
| Zeitzonen/Sommerzeit                  | ⚠️ gelöst über `local_date` + Offset (siehe DATA_MODEL)                                                                                                                        |
| Repository-Sichtbarkeit               | ⚠️ Code darf öffentlich sein, **Daten nie** – `database/data/`, `.env`, Backups sind gitignored. Empfohlen: eigenes privates Repo                                              |

## Quellen (Stand Phase 0)

- HA App-Konfiguration: https://developers.home-assistant.io/docs/apps/configuration
- HA Tailscale-App, Serve/Funnel: https://deepwiki.com/hassio-addons/app-tailscale/7.2-serve-and-funnel-features
- Tailscale + Home Assistant: https://www.tailscale.com/blog/remotely-access-home-assistant
- Tailscale-App (lmagyar), Zertifikat nach /ssl: https://github.com/lmagyar/homeassistant-addon-tailscale/blob/main/tailscale/DOCS.md
- Forum: Tailscale-Zertifikate für andere Dienste: https://community.home-assistant.io/t/using-tailscale-with-nginx-managing-ssl-certs/828062
