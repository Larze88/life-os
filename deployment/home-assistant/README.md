# Life OS auf dem Raspberry Pi (Home Assistant OS)

Life OS läuft als **eigene Home-Assistant-App** (früher „Add-on“) in einem separaten Container. Die App bringt einen eigenen Tailscale-Knoten mit und ist unter einer eigenen HTTPS-Adresse erreichbar, z. B. `https://lifeos.<tailnet>.ts.net` (ADR-007).

## Wie die Teile zusammenhängen

| Teil           | Wo                                                                       | Zweck                                                                    |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Programmcode   | privates Repo `Larze88/life-os`                                          | Quelle; GitHub Actions baut daraus das Image                             |
| Image          | `ghcr.io/larze88/lifeos-aarch64`                                         | fertiger Container für den Pi (öffentlich, enthält keine Daten, ADR-024) |
| App-Definition | öffentliches Repo `Larze88/life-os-ha` (Inhalt: `app/` in diesem Ordner) | sagt Home Assistant, welches Image mit welchen Optionen läuft (ADR-025)  |
| Daten          | `/data` der App auf dem Pi                                               | SQLite-Datenbank, lokale Snapshots, Tailscale-Zustand                    |

## Einmalige Einrichtung

### 1. Tailscale vorbereiten (Browser)

1. https://login.tailscale.com/admin/dns → **MagicDNS** und **HTTPS Certificates** aktivieren.
2. https://login.tailscale.com/admin/settings/keys → **Generate auth key** (Standardwerte) → Schlüssel kopieren (`tskey-auth-…`).

### 2. App in Home Assistant installieren

1. **Einstellungen → Apps** (bzw. Add-ons) **→ App-Store** → Menü **⋮** → **Repositories**.
2. `https://github.com/Larze88/life-os-ha` hinzufügen → schließen → Seite neu laden.
3. **Life OS** öffnen → **Installieren** (lädt das Image, dauert ein paar Minuten).
4. Reiter **Konfiguration** → `tailscale_auth_key` einfügen → **Speichern**.
5. Reiter **Info** → **Starten**; „Beim Booten starten“ aktiviert lassen.
6. Reiter **Protokoll** → Zeile `Life OS is available at https://lifeos.….ts.net`.

### 3. Abschluss in Tailscale

- Unter **Machines** beim Gerät `lifeos`: **⋯ → Disable key expiry**.
- Den Auth-Key in der App-Konfiguration wieder löschen (nicht mehr nötig).

### 4. Auf dem Handy

1. Tailscale aktiv → Adresse in **Chrome** öffnen.
2. Passwort festlegen (oder Daten vom PC übernehmen, siehe unten).
3. Chrome-Menü **⋮ → App installieren**.

## Daten vom PC übernehmen

1. Auf dem PC (`npm run dev` oder `npm run phone`): **Einstellungen → Datensicherung → Backup herunterladen**.
2. Auf dem Pi (neue Adresse, einmalig ein Passwort festlegen): **Einstellungen → Datensicherung → Backup wiederherstellen** → Datei wählen.
3. Danach gilt das Passwort aus dem PC-Backup.

## Updates

Neue Versionen erscheinen in Home Assistant als Update der App (ein Klick). Daten bleiben erhalten; vor Datenbank-Änderungen legt Life OS automatisch einen Snapshot an.

## Fehlersuche

| Protokoll-Meldung                                          | Lösung                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Tailscale is not logged in and no auth key is configured` | Auth-Key in der Konfiguration eintragen, App neu starten                           |
| `'tailscale serve' failed`                                 | MagicDNS und HTTPS Certificates in Tailscale aktivieren, App neu starten           |
| Installation schlägt fehl („pull access denied“ o. ä.)     | Image ist noch nicht öffentlich bzw. noch nicht gebaut (siehe CLAUDE.md „Release“) |
