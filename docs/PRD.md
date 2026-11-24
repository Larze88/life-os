# Life OS – Product Requirements Document

> Status: Entwurf v0.1 (Phase 0) · Stand: 2026-11-23

## 1. Vision

Life OS ist eine private, selbst gehostete Anwendung, mit der ein einzelner Benutzer seinen Alltag mit **minimalem Aufwand** erfasst und Entwicklungen und Zusammenhänge **beschreibend** auswertet. Die Daten bleiben vollständig unter eigener Kontrolle (Raspberry Pi im Heimnetz, Zugriff nur über Tailscale).

Leitsatz: **Erfassen in Sekunden, Verstehen über Wochen.**

## 2. Zielgruppe

Genau ein Benutzer (der Eigentümer). Keine Mehrbenutzerfähigkeit, keine Rollen, keine Freigaben an Dritte. Diese Annahme vereinfacht Auth, Datenmodell und Betrieb deutlich und wird bewusst nicht „für später“ aufgeweicht.

## 3. Plattformen

| Gerät                        | Rolle    | Anforderungen                                                                                   |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| Smartphone (Android, Chrome) | Primär   | PWA auf Homescreen, Touch-Ziele ≥ 44 px, Einhand-Bedienung, Schnellaktionen in Daumenreichweite |
| Desktop / Laptop             | Sekundär | Mehrspaltiges Dashboard, Auswertungen, Konfiguration, Datenexport                               |

Eine Codebasis, responsive Layouts (Mobile-first). Robust bei schlechter Verbindung (siehe Abschnitt 8).

## 4. Kernprinzipien

1. **Erfassung darf nicht lästig werden.** Häufige Aktionen ≤ 1–2 Taps vom Dashboard aus.
2. **Modular.** Jeder Tracking-Bereich ist ein unabhängiges Modul; neue Tracker brechen keine bestehenden.
3. **Privat by default.** Keine externen Requests (keine CDNs, keine Analytics, keine Web-Fonts von Dritten).
4. **Beschreibend, nicht diagnostisch.** Auswertungen zeigen Muster und Korrelationen, ziehen aber keine medizinischen Schlüsse.
5. **Daten gehören dem Benutzer.** Vollständiger Export jederzeit, dokumentiertes Format.

## 5. Funktionsumfang

### 5.1 MVP (Phasen 1–4)

**Plattform**

- Login mit Passwort, langlebige Sitzung (Smartphone bleibt angemeldet)
- PWA: installierbar, App-Shell offline verfügbar
- Dashboard mit Widgets (feste Standardanordnung, intern bereits konfigurationsfähig modelliert)
- Tagesansicht („Heute“) und Navigation zu vergangenen Tagen
- Einträge nachträglich bearbeiten/löschen (inkl. Rückdatieren)
- Datenexport (JSON komplett, CSV pro Tracker)
- Automatische lokale Backups
- Backup-Download mit einem Tap, Erinnerung nach 14 Tagen ohne Download, Wiederherstellung per Upload

**Module im MVP (Reihenfolge der Umsetzung)**

| Modul                   | Erfassung                                                                    | Auswertung                                               |
| ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| Wasser                  | Schnellbuttons (z. B. +250 ml, +500 ml), freie Menge                         | Tagesfortschritt vs. Ziel, Verlauf, Wochen-/Monatsmittel |
| Schlaf                  | Einschlaf-/Aufwachzeit, Qualität (1–5), optional Notiz                       | Dauer, Regelmäßigkeit, Trends                            |
| Stimmung & Wohlbefinden | Stimmung, Energie, Stress, Wohlbefinden (je 1–5), Notiz                      | Verlauf, Wochenmuster                                    |
| Gewohnheiten            | Eigene Gewohnheiten mit Zeitplan (täglich, Wochentage, x-mal/Woche); abhaken | Erfüllungsquote, Serien (Streaks), Kalender              |

**Danach (Phase 3b)**: Sport & Bewegung, Ernährung, Körperwerte, Gesundheit & Symptome, Produktivität & Fokus, eigene (benutzerdefinierte) Tracker.

### 5.2 Statistiken (Phase 4)

- Tages-, Wochen-, Monats-, Jahresübersichten pro Tracker
- Zeitraumvergleich (z. B. diese Woche vs. letzte Woche)
- Gegenüberstellung zweier Metriken auf Tagesbasis (Streudiagramm + Korrelationskoeffizient + Stichprobengröße + Hinweistext „Korrelation ≠ Kausalität“)

### 5.3 Ausdrücklich nicht im MVP (architektonisch vorbereitet)

- Home-Assistant-Integration / automatische Datenerfassung
- Apple Health / Google Fit / Health Connect
- Erinnerungen & Push-Benachrichtigungen
- KI-gestützte Auswertungen
- Frei konfigurierbares Dashboard (Drag & Drop)
- Vollständige Offline-Synchronisierung

## 6. Modul-Anforderungen im Detail

### Wasser

- Tagesziel (Standard 2 000 ml), historisiert (Zieländerung verfälscht alte Tage nicht)
- Konfigurierbare Schnellmengen (Standard 250 / 500 ml)
- „Rückgängig“ direkt nach Schnellaktion (Toast, ~5 s)

### Schlaf

- Eintrag = eine Schlafphase mit Start und Ende; Dauer wird berechnet
- Zuordnung zum **Aufwachtag** („Letzte Nacht“ am heutigen Tag)
- Qualität 1–5, optional: Einschlafdauer, Aufwachen nachts, „ausgeruht“ 1–5, Notiz
- Schnellerfassung: zuletzt verwendete Zeiten vorausgefüllt

### Stimmung & Wohlbefinden

- Mehrfach pro Tag möglich; Tageswert = Mittelwert (Auswertung) bzw. letzter Wert (Dashboard)
- Skala 1–5 mit Emoji/Label, Ein-Tap-Erfassung der Stimmung; Energie/Stress/Wohlbefinden optional aufklappbar

### Gewohnheiten

- Benutzerdefiniert: Name, Icon, Zeitplan, optional Zielanzahl pro Tag (z. B. 2× Zähneputzen)
- Abhaken direkt im Dashboard-Widget
- Archivieren statt Löschen (Historie bleibt erhalten)

### Sport & Bewegung

- Sportart (konfigurierbare Liste), Dauer, Intensität (1–3 bzw. RPE), optional Distanz, Notiz

### Ernährung

- Mahlzeitentyp (Frühstück, Mittag, Abend, Snack), optionale Beschreibung, optionale Tags (z. B. „selbst gekocht“, „Fast Food“), optional Sättigung/Bewertung

### Körperwerte

- Jeder Messwert ist ein eigener Tracker (Gewicht, Ruhepuls, Blutdruck, …) mit Einheit
- Mehrteilige Werte möglich (Blutdruck systolisch/diastolisch)

### Gesundheit & Symptome

- Symptomkatalog (erweiterbar), Intensität 0–10, Notiz
- Verlauf je Symptom

### Produktivität & Fokus

- Fokus-Session (Start/Ende oder Dauer), Konzentration 1–5, subjektive Produktivität 1–5, Notiz

### Eigene Tracker

- Felder frei zusammenstellbar aus: Zahl, Text, Auswahl, Mehrfachauswahl, Skala, Ja/Nein, Datum, Uhrzeit, Dauer
- Einheit, Ziel, Erfassungsrhythmus konfigurierbar

## 7. Dashboard & Design

- Stil: ruhig, hochwertig, an Apple Health / Fitness / modernen Wellness-Apps orientiert; Karten mit großzügigem Weißraum, klare Typografie, dezente Farben je Modul, Hell- und Dunkelmodus (System)
- **Mobile**: Eine Spalte, oben Tagesübersicht (Ringe/Fortschritt), darunter Widgets; untere Tab-Leiste (Heute · Verlauf · Statistik · Einstellungen) + zentraler „+“-Button für Schnellerfassung (Bottom Sheet)
- **Desktop**: Raster mit 2–4 Spalten, Seitennavigation
- Widgets im MVP: Wasserfortschritt, Letzte Nacht, Stimmung heute, Gewohnheiten heute, Bewegung heute, Wochenüberblick
- Keine Überladung: Widgets zeigen eine Kernaussage + eine Aktion

## 8. Nicht-funktionale Anforderungen

| Bereich          | Anforderung                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Performance      | Dashboard interaktiv < 1,5 s auf Smartphone über Tailscale; Schnellaktion fühlt sich sofort an (optimistische UI)               |
| Ressourcen       | Server-Prozess < 150 MB RAM im Leerlauf auf dem Pi; keine dauerhafte CPU-Last                                                   |
| Robustheit       | App-Shell offline; letzte Daten lesbar; fehlgeschlagene Schreibvorgänge werden klar angezeigt und wiederholbar (später: Outbox) |
| Datenintegrität  | Transaktionen, Migrationen versioniert und vorwärtsgerichtet, Backups automatisch                                               |
| Sicherheit       | Kein öffentlicher Zugang; HTTPS; Passwort-Hash (scrypt); HttpOnly-Cookies; keine sensiblen Daten in Logs                        |
| Datenschutz      | Keine Drittanbieter-Requests; Export & vollständige Löschung möglich                                                            |
| Wartbarkeit      | TypeScript strikt, Tests für Kernlogik, dokumentierte Architekturentscheidungen                                                 |
| Barrierefreiheit | Ausreichende Kontraste, Fokuszustände, Screenreader-Labels                                                                      |
| Sprache          | UI Deutsch; Code, Bezeichner und Commits Englisch                                                                               |
| Einheiten        | Metrisch; 24-Stunden-Format; Woche beginnt Montag                                                                               |

## 9. Erfolgskriterien

- Tägliche Erfassung von Wasser, Stimmung und Gewohnheiten dauert zusammen < 30 Sekunden.
- Ein neues Modul lässt sich ergänzen, ohne bestehende Module oder Tabellen zu ändern.
- Nach Ausfall der microSD-Karte ist ein Restore aus einem Off-Device-Backup in < 30 Minuten möglich.
- Home Assistant zeigt nach Installation keine messbare Beeinträchtigung.

## 10. Abgrenzung / Risiken

- Keine medizinische Software; keine Diagnosen, keine Grenzwert-Warnungen mit medizinischem Anspruch.
- Single-User: kein Konfliktmanagement zwischen Personen, wohl aber zwischen Geräten (gleichzeitige Erfassung auf Handy und PC) – gelöst über idempotente IDs und „last write wins“ pro Eintrag.
