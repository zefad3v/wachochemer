# Wachochemer

## Projektgrenze

Dieses Repository ist ausschliesslich `zefad3v/wachochemer`. Vor Schreiboperationen Arbeitsverzeichnis, `git remote get-url origin`, Branch und `git status --short` prüfen. Nur diesen Repository-Pfad und ausdrücklich diesem Projekt zugeordnete Dienste verwenden. Keine anderen Projekte oder Sites auflisten, öffnen, ändern oder deren Konfiguration übernehmen, um eine fehlende Zuordnung zu ersetzen.

Ein Supabase-Projekt darf erst nach eindeutig bestätigter Zuordnung zu Wachochemer verändert werden. Öffentliche Projekt-URL und Publishable Key dürfen in die Browserkonfiguration. Datenbankpasswörter, Secret Keys und `service_role` dürfen weder in Browserdateien noch in Commits gelangen.

## Fachliche Vorgaben

- Mehrere Konten teilen einen Haushalt. Alle Mitglieder haben dieselben Rechte.
- Anzahl der mitessenden Personen ist unabhängig von Login-Mitgliedschaften.
- Onlinebetrieb ohne Offline-Schreibwarteschlange. Fehlgeschlagene Speicherung darf keinen Erfolg anzeigen und nicht in einen lokalen Ersatzplan ausweichen.
- E-Mail/Passwort mit bestätigter E-Mail; TOTP ist pro Konto optional. Sobald ein Faktor aktiviert ist, erzwingt die Datenbank AAL2.
- Jeder Haushaltszugriff braucht eine Mitgliedschaft. Auch RPC-Schreibvorgänge und Restenreservierungen müssen diese Prüfung serverseitig durchsetzen.
- Fremde Änderungen dürfen nicht still überschrieben werden. Versionskonflikte müssen den Entwurf erhalten und ein ausdrückliches Neuladen erlauben.
- Rezepttexte sind Deutsch (CH), Bedienoberfläche ist Schweizerdeutsch. Technische Schlüssel wie `lunch` gehören nicht in sichtbare Titel.

## Prüfung

Für Änderungen an gemeinsamem Speicher oder Auth ausführen

```sh
npm ci
npm test
npm run test:database
npm run test:online
```

Nach einer SDK-Änderung `npm run build:auth` ausführen und Bundle samt Lizenzhinweisen committen. DOM-Tests simulieren Supabase; PGlite prüft PostgreSQL mit Auth-Fixtures. Diese Prüfungen nicht als echte Supabase- oder iPhone-Abnahme ausgeben. Einrichtung und offene Dienstabnahme sind in `supabase/README.md` dokumentiert.
