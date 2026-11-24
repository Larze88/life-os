# @lifeos/shared

Code, der von Backend und Frontend gemeinsam genutzt wird. Wird nicht gebaut, sondern als TypeScript-Quelle eingebunden (Vite bzw. tsx/tsup übernehmen die Übersetzung).

| Ordner        | Inhalt                                                           |
| ------------- | ---------------------------------------------------------------- |
| `src/time`    | Logischer Tag (`local_date`), Zeitzonen-Offset, Datumsarithmetik |
| `src/ids`     | UUIDv7-Erzeugung (Client-IDs für Einträge)                       |
| `src/fields`  | Feldtyp-System (`FieldDefinition`) → Zod-Schemas                 |
| `src/modules` | Modulvertrag (`ModuleDefinition`) und Registry                   |
| `src/api`     | Request/Response-Schemas der REST-API                            |
