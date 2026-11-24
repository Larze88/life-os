# @lifeos/frontend

React 19 + Vite 8 + Tailwind CSS 4 + shadcn/ui als PWA. Mobile-first.

| Pfad | Inhalt |
|---|---|
| `src/app/` | App, Router, Query-Client, Layout (Tab-Leiste mobil / Seitenleiste Desktop) |
| `src/features/` | Seiten: `auth`, `dashboard`, `history`, `stats`, `settings` |
| `src/modules/` | Frontend-Teil der Tracking-Module (Widgets, Schnellaktionen, Formulare) |
| `src/components/ui/` | shadcn/ui-Komponenten |
| `src/lib/` | API-Client, Query-Keys, Texte (`i18n/de.ts`), Hilfsfunktionen |
| `src/styles/index.css` | Tailwind und Design-Tokens (Farben je Modul, Hell/Dunkel) |
| `public/` | PWA-Icons |

Im Dev-Modus leitet Vite `/api` an das Backend auf Port 8080 weiter. Browser und API teilen sich so eine Origin.
