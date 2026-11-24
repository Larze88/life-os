# @lifeos/backend

Node.js + Hono REST-API unter `/api/v1`, SQLite über better-sqlite3 und Drizzle. Im Produktivbetrieb liefert der Server auch das gebaute Frontend aus.

| Pfad              | Inhalt                                                            |
| ----------------- | ----------------------------------------------------------------- |
| `src/server.ts`   | Einstieg: Konfiguration, Migration, HTTP-Server, sauberes Beenden |
| `src/app.ts`      | Hono-App (Middleware, Routen, statische Dateien)                  |
| `src/config.ts`   | Umgebungsvariablen (siehe unten)                                  |
| `src/db/`         | Schema, Verbindung, Migrationen, Snapshots                        |
| `src/auth/`       | Passwort-Hashing, Sitzungen, Rate-Limit                           |
| `src/middleware/` | Auth, Origin-Prüfung, Request-Log                                 |
| `src/routes/`     | API-Routen                                                        |

## Umgebungsvariablen

| Variable         | Standard              | Bedeutung                           |
| ---------------- | --------------------- | ----------------------------------- |
| `PORT`           | `8080`                | HTTP-Port                           |
| `HOST`           | `127.0.0.1`           | Bind-Adresse (Container: `0.0.0.0`) |
| `DATA_DIR`       | `database/data`       | SQLite-Datei und Snapshots          |
| `MIGRATIONS_DIR` | `database/migrations` | SQL-Migrationen                     |
| `STATIC_DIR`     | –                     | Gebautes Frontend; leer = nur API   |
| `COOKIE_SECURE`  | `true` in Produktion  | `Secure`-Flag des Sitzungscookies   |
| `LOG_LEVEL`      | `info`                | `debug`, `info`, `warn`, `error`    |
| `NODE_ENV`       | `development`         | `production` im Container           |
