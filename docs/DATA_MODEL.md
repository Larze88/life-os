# Life OS – Datenmodell

> Status: Entwurf v0.1 (Phase 0) · Stand: 2026-11-23
> Datenbank: SQLite (WAL), Zugriff über Drizzle ORM, Migrationen in `database/migrations/`

## 1. Grundsätze

1. **Hybridmodell**: Gemeinsame, typisierte Kernspalten für alles, was generisch ausgewertet wird (Zeit, Tag, Hauptwert) + validiertes JSON (`data`) für modul-spezifische Details.
2. **IDs**: UUIDv7 als `TEXT`, **vom Client erzeugt** (zeitlich sortierbar, idempotente Writes, offline-fähig).
3. **Zeit**: Zeitpunkte in UTC (ISO 8601, `TEXT`), zusätzlich der **logische Tag** (`local_date`, `YYYY-MM-DD`) und der UTC-Offset zum Erfassungszeitpunkt. Auswertungen laufen über `local_date` – das ist robust gegenüber Zeitzonen- und Sommerzeitwechseln.
4. **Nichts wird überschrieben, was Historie bedeutet**: Ziele sind zeitlich gültig, Tracker werden archiviert statt gelöscht, Einträge soft-gelöscht.
5. **Schemaevolution ohne Bruch**: Feld-Keys sind unveränderlich; neue Felder sind optional; Strukturänderungen über `data_version` + Upgrade-Funktionen.

## 2. Tabellen

### `settings`

| Spalte       | Typ         | Hinweis                                          |
| ------------ | ----------- | ------------------------------------------------ |
| `key`        | TEXT PK     | z. B. `timezone`, `day_start_time`, `week_start` |
| `value`      | TEXT (JSON) | Zod-validiert pro Key                            |
| `updated_at` | TEXT        |                                                  |

Standardwerte: `timezone = Europe/Berlin`, `day_start_time = 00:00`, `week_start = monday`.

### `auth_credentials`

| Spalte          | Typ        | Hinweis                  |
| --------------- | ---------- | ------------------------ |
| `id`            | INTEGER PK | immer `1` (Single-User)  |
| `password_hash` | TEXT       | `scrypt$N$r$p$salt$hash` |
| `updated_at`    | TEXT       |                          |

### `sessions`

| Spalte                                     | Typ       | Hinweis                                           |
| ------------------------------------------ | --------- | ------------------------------------------------- |
| `id`                                       | TEXT PK   | SHA-256 des Tokens (Token selbst nie gespeichert) |
| `created_at`, `last_seen_at`, `expires_at` | TEXT      | gleitende Laufzeit                                |
| `device_label`                             | TEXT NULL | grob aus User-Agent („iPhone · Safari“)           |

### `trackers`

| Spalte                     | Typ         | Hinweis                                                                                                                        |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`                       | TEXT PK     | UUIDv7                                                                                                                         |
| `key`                      | TEXT UNIQUE | stabiler Slug, z. B. `water`, `weight`, `habit-meditation`; **unveränderlich**                                                 |
| `module`                   | TEXT        | Modul-ID aus der Registry (`water`, `sleep`, `mood`, `habit`, `activity`, `meal`, `measurement`, `symptom`, `focus`, `custom`) |
| `name`                     | TEXT        | Anzeigename (änderbar)                                                                                                         |
| `icon`, `color`            | TEXT NULL   |                                                                                                                                |
| `config`                   | TEXT (JSON) | validiert mit `module.configSchema`                                                                                            |
| `config_version`           | INTEGER     |                                                                                                                                |
| `sort_order`               | INTEGER     |                                                                                                                                |
| `archived_at`              | TEXT NULL   | Archiv statt Löschen                                                                                                           |
| `created_at`, `updated_at` | TEXT        |                                                                                                                                |

### `entries` (zentrale Tabelle)

| Spalte                     | Typ                | Hinweis                                                                         |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `id`                       | TEXT PK            | UUIDv7 vom Client                                                               |
| `tracker_id`               | TEXT FK → trackers |                                                                                 |
| `occurred_at`              | TEXT               | UTC; bei Zeiträumen der Start                                                   |
| `ends_at`                  | TEXT NULL          | UTC; nur bei `entryKind = span` (Schlaf, Sport, Fokus)                          |
| `local_date`               | TEXT               | logischer Tag `YYYY-MM-DD` (Server berechnet, Regeln s. u.)                     |
| `tz_offset_min`            | INTEGER            | Offset bei Erfassung, z. B. `60`                                                |
| `value`                    | REAL NULL          | **Hauptwert** für generische Aggregation (ml, Minuten, Skalenwert, kg …)        |
| `data`                     | TEXT (JSON)        | modul-spezifischer Payload, validiert mit `module.dataSchema`                   |
| `data_version`             | INTEGER            | Version des Payload-Schemas                                                     |
| `note`                     | TEXT NULL          | Freitext                                                                        |
| `source`                   | TEXT               | `manual`, `quick_action`, `import`, später `home_assistant`, `health_connect` … |
| `source_ref`               | TEXT NULL          | externe ID zur Deduplizierung                                                   |
| `created_at`, `updated_at` | TEXT               |                                                                                 |
| `deleted_at`               | TEXT NULL          | Soft Delete (wichtig für spätere Sync)                                          |

Indizes:

- `(tracker_id, local_date)` – Tages-/Zeitraumabfragen pro Tracker
- `(local_date)` – Tagesübersicht
- `(tracker_id, occurred_at)` – Verläufe
- `UNIQUE (source, source_ref) WHERE source_ref IS NOT NULL` – Import-Deduplizierung
- bei Bedarf Ausdrucksindizes auf `json_extract(data, '$.…')` (z. B. Symptomname)

### `goals`

Ziele sind **zeitlich gültig**, damit eine Zieländerung vergangene Tage nicht umbewertet.

| Spalte                 | Typ              | Hinweis                                   |
| ---------------------- | ---------------- | ----------------------------------------- |
| `id`                   | TEXT PK          |                                           |
| `tracker_id`           | TEXT FK          |                                           |
| `metric`               | TEXT             | `sum`, `count`, `avg`, `last`, `duration` |
| `period`               | TEXT             | `day`, `week`, `month`                    |
| `comparator`           | TEXT             | `gte`, `lte`, `between`                   |
| `target`, `target_max` | REAL / REAL NULL |                                           |
| `valid_from`           | TEXT             | `local_date`                              |
| `valid_to`             | TEXT NULL        | `NULL` = aktuell gültig                   |

Beispiele: Wasser `sum ≥ 2000 / day`; Gewohnheit „Sport“ `count ≥ 3 / week`; Schlaf `duration between 420–540 / day`.

### `dashboard_widgets`

| Spalte        | Typ         | Hinweis                                                                     |
| ------------- | ----------- | --------------------------------------------------------------------------- |
| `id`          | TEXT PK     |                                                                             |
| `widget_type` | TEXT        | z. B. `water.progress`, `sleep.last_night`, `habits.today`, `overview.week` |
| `tracker_id`  | TEXT NULL   | falls trackergebunden                                                       |
| `position`    | INTEGER     | Reihenfolge                                                                 |
| `size`        | TEXT        | `sm`, `md`, `lg`                                                            |
| `config`      | TEXT (JSON) | widget-spezifisch                                                           |

### Migrationstabelle

Von Drizzle verwaltet (`__drizzle_migrations`).

## 3. Logischer Tag (`local_date`)

- Berechnung serverseitig aus `occurred_at` (bzw. `ends_at`) + `tz_offset_min` des Geräts + `day_start_time`.
- Module mit `dayAssignment = 'end'` (Schlaf) verwenden `ends_at` → „Letzte Nacht“ gehört zum Aufwachtag.
- Ändert sich `day_start_time`, gibt es ein explizites Neuberechnungsskript (kein stiller Seiteneffekt).

## 4. Modul-Payloads (`data`) und Hauptwert (`value`)

| Modul         | Art               | `value`                     | `data` (Auszug)                                                                          |
| ------------- | ----------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `water`       | instant           | Menge in ml                 | `{ beverage?: 'water'│'tea'│… }`                                                         |
| `sleep`       | span (Tag = Ende) | Dauer in Minuten            | `{ quality: 1–5, rested?: 1–5, latencyMin?, awakenings? }`                               |
| `mood`        | instant           | Stimmung 1–5                | `{ energy?: 1–5, stress?: 1–5, wellbeing?: 1–5, tags?: string[] }`                       |
| `habit`       | instant           | Anzahl (meist 1)            | `{}`                                                                                     |
| `activity`    | span oder Dauer   | Dauer in Minuten            | `{ type: string, intensity: 1–3, distanceKm?, rpe?: 1–10 }`                              |
| `meal`        | instant           | `NULL`                      | `{ mealType: 'breakfast'│'lunch'│'dinner'│'snack', description?, tags?, satiety?: 1–5 }` |
| `measurement` | instant           | Messwert in Tracker-Einheit | `{ secondary?: number }` (z. B. diastolisch)                                             |
| `symptom`     | instant           | Intensität 0–10             | `{ symptom: string, location? }`                                                         |
| `focus`       | span oder Dauer   | Dauer in Minuten            | `{ concentration?: 1–5, productivity?: 1–5, task? }`                                     |
| `custom`      | instant           | Wert des `primaryField`     | `{ [fieldKey]: value }` gemäß Feldliste in `trackers.config`                             |

### Tracker-Konfiguration (`config`) – Beispiele

```jsonc
// water
{ "unit": "ml", "quickAmounts": [250, 500] }

// habit
{ "schedule": { "type": "weekdays", "days": [1, 3, 5] }, "targetPerDay": 1 }

// measurement (Gewicht)
{ "unit": "kg", "decimals": 1 }

// symptom
{ "catalog": ["Kopfschmerzen", "Rückenschmerzen", "Müdigkeit"] }

// custom (eigener Tracker „Koffein“)
{
  "fields": [
    { "key": "cups", "label": "Tassen", "type": "number", "min": 0, "step": 1, "required": true },
    { "key": "kind", "label": "Art", "type": "select", "options": ["Kaffee", "Espresso", "Tee"] }
  ],
  "primaryField": "cups",
  "aggregate": "sum"
}
```

### Validierung des Hauptwerts

Jedes Modul definiert ein `valueSchema` für `entries.value` (z. B. Wasser: ganze ml von 1 bis 5000; Module ohne Hauptwert: `null`). Der Server validiert `value` und `data` beim Schreiben über das Modul; Fehler kommen als `errors.value` bzw. `errors["data.<feld>"]` zurück.

### Seed

Module liefern `defaultTrackers` inkl. `goals` (gültig ab `2000-01-01`) und `widgets`. Beim Serverstart werden fehlende Tracker angelegt. Ein vorhandener Tracker-`key` wird nie erneut angefasst, auch wenn er umbenannt oder archiviert wurde.

## 5. Feldtypen (`FieldDefinition`)

Gemeinsam genutzt von eingebauten Modulen und eigenen Trackern; das Frontend rendert daraus Formulare, das Backend erzeugt daraus Zod-Schemas.

| Typ           | Optionen                          | Speicherung      |
| ------------- | --------------------------------- | ---------------- |
| `number`      | `min`, `max`, `step`, `unit`      | number           |
| `scale`       | `min`, `max`, `labels?`, `emoji?` | integer          |
| `boolean`     | –                                 | boolean          |
| `select`      | `options`                         | string           |
| `multiselect` | `options`                         | string[]         |
| `text`        | `maxLength`, `multiline`          | string           |
| `date`        | –                                 | `YYYY-MM-DD`     |
| `time`        | –                                 | `HH:mm`          |
| `duration`    | `unit: 'min'`                     | number (Minuten) |

Gemeinsame Optionen: `key` (unveränderlich), `label`, `required`, `help`, `deprecated` (ausblenden statt löschen).

## 6. Schemaevolution – Regeln

1. **Migrationen nur vorwärts**, generiert mit drizzle-kit, als SQL committed. Eine angewendete Migration wird nie verändert.
2. Migrationen laufen beim Serverstart in einer Transaktion; **vorher** wird automatisch ein DB-Snapshot erstellt.
3. Modul-ID, Tracker-`key` und Feld-`key` sind unveränderlich. Umbenennen = nur `label`/`name` ändern.
4. Payload-Änderungen: neue Felder optional hinzufügen (kein Versionssprung nötig). Strukturänderungen → `version` im Modul erhöhen + `upgrade[n]`-Funktion; alte Einträge werden beim Lesen hochgestuft (optional später per Skript dauerhaft).
5. Neue Module benötigen **keine** Tabellenänderung.

## 7. Auswertungen

- Generische Aggregation über `value` je `local_date` (`SUM`, `AVG`, `COUNT`, `MAX`, letzter Wert) → deckt Tages-/Wochen-/Monats-/Jahresansichten für alle Module ab.
- **Tagesmetriken** als einheitliche Zwischenform `(local_date, metric_key, value)` – Grundlage für Zeitraumvergleiche und Korrelationen. Metriken wie `sleep.duration`, `mood.avg`, `water.sum`, `activity.minutes`.
- Korrelation (Phase 4): Spearman-Rangkorrelation über gemeinsame Tage, optional mit Versatz (Schlaf der Nacht → Stimmung desselben Tages, Sport Tag t → Schlaf Nacht t+1). Ausgabe immer mit `n`, Zeitraum und neutralem Hinweistext. Mindest-`n` (z. B. 14) bevor ein Wert angezeigt wird.
- Bei der erwarteten Datenmenge (einige Tausend Einträge pro Jahr) reichen Ad-hoc-SQL-Abfragen; materialisierte Tageswerte erst bei Bedarf.

## 8. Export-Format

`GET /api/v1/export?format=json` liefert:

```jsonc
{
  "format": "lifeos-export",
  "formatVersion": 1,
  "exportedAt": "2026-11-23T18:00:00Z",
  "settings": { … },
  "trackers": [ … ],
  "goals": [ … ],
  "entries": [ … ]   // ohne gelöschte Einträge (optional mit ?includeDeleted=true)
}
```

CSV: eine Datei pro Tracker, `data`-Felder als Spalten ausgerollt. Sitzungs- und Auth-Daten werden nie exportiert.
