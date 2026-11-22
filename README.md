# Wa chochemer

Produktiv genutzte Alpha für gemeinsame Haushalte. Die App plant Mahlzeiten, sammelt Rezepte und bereitet den Einkauf vor.

[App öffnen](https://zefad3v.github.io/wachochemer/) · [Betrieb und Release](docs/production.md) · [Architektur](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Supabase](supabase/README.md)

## Verwendung

Einladung annehmen oder mit E-Mail und Passwort anmelden. Mehrere Konten gehören zu einem Haushalt und haben dieselben Rechte. Optional sichert eine Authenticator-App das Konto ab.

Der Wochenplan bietet Tages- und Wochenansicht. Wischen auf den Wochentagen wechselt die Woche, Wischen auf der Tageskarte die Mahlzeit. Die Startwoche ist Donnerstag bis Mittwoch und kann in den Einstellungen angepasst werden.

Im Kochbuch stehen öffentliche Startrezepte und private Haushaltsrezepte. Über das Plus lassen sich Rezepte erfassen oder mit Kontrollvorschau importieren. Der Linkimport prüft öffentliche HTTPS-Seiten unabhängig vom Anbieter auf strukturierte Rezeptdaten. KI-Import verwendet einen serverseitigen OpenAI-Schlüssel und benötigt API-Guthaben.

Suche, Favoriten, Herkunftsfilter, Dauer und Sortierung helfen bei grösseren Sammlungen. Der Menüeditor zeigt zunächst acht Treffer und lädt auf Wunsch weitere nach. Die Suche berücksichtigt den gesamten Katalog.

## Entwicklung

- `prototype/` enthält aus Kompatibilitätsgründen weiterhin die produktive App.
- `data/recipes/` und `data/ingredients.json` enthalten öffentliche Rezeptdaten.
- `src/` enthält Fachlogik, gemeinsamen Speicher und Bring!-Vorbereitung.
- `supabase/` enthält Migrationen, Edge Functions, Mailvorlagen und SQL-Prüfungen.
- `locales/` enthält Schweizer Standarddeutsch und gemeinsame Formatierung.
- `scripts/build.mjs` erzeugt öffentliche Rezeptseiten und den App-Einstieg.

Mit `npm ci` installieren. Lokal `python -m http.server 8765` im Repository starten. Für vollständigen Onlinebetrieb muss die öffentliche Supabase-Konfiguration zu diesem Projekt passen. Geheimnisse bleiben in Supabase.

## Prüfungen

```sh
npm test
npm run test:database
npm run test:online
node scripts/check-data.mjs
node scripts/build.mjs
node scripts/build-recipe-index.mjs
```

Die Datenbanktests verwenden PGlite, die Online-DOM-Tests simulieren Supabase. Sie ersetzen keine echte iPhone- oder Zustellprüfung. Aktuelle Betriebsgrenzen stehen in [production.md](docs/production.md).

## Anbieterunabhängiger Rezeptimport, 22. November 2026

Öffentliche HTTPS-Seiten werden ohne Anbieterliste eingelesen. Jeder Redirect wird erneut geprüft. DNS-Adressen werden auf öffentliche Ziele beschränkt und für die TLS-Verbindung festgehalten. Interne Adressen, Zugangsdaten in URLs und andere Ports sind gesperrt. Fehlende Rezeptdaten, nicht erreichbare Seiten und Grössenlimits ergeben eine Rückmeldung. Bei KI-Text plus Link wird das Rezeptbild zusätzlich versucht; ein Bildfehler verhindert den Textimport nicht. Kochkarussell wurde mit vier Portionen, zwölf Zutaten, drei Schritten, 10/20/30 Minuten und Bild geprüft.
