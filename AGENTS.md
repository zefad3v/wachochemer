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
- Einzige Ausnahme für die ausdrücklich gewünschte Einladungsvorschau vor der Anmeldung: Mit einem gültigen, zufälligen Einladungs-UUID dürfen ausschliesslich die Ziel-E-Mail und der Haushaltsname angezeigt werden. Kein Auflisten oder Suchen nach E-Mail/Haushalt, keine weiteren Daten und keine Schreibrechte. Abgelaufene, zurückgezogene oder unbekannte Links geben keine Vorschau. Der Beitritt selbst braucht weiterhin die passende bestätigte Kontoadresse und gegebenenfalls AAL2; weitere Haushaltszugriffe erfordern Mitgliedschaft.
- Fremde Änderungen dürfen nicht still überschrieben werden. Versionskonflikte müssen den Entwurf erhalten und ein ausdrückliches Neuladen erlauben.
- Die Bedienoberfläche verwendet Deutsch (Schweiz). Der App-Name «Wa chochemer» und die Überschrift «Wucheplan» bleiben im Dialekt. Technische Schlüssel wie `lunch` gehören nicht in sichtbare Titel.

## Prüfung

Für Änderungen an gemeinsamem Speicher oder Auth ausführen

```sh
npm ci
npm test
npm run test:database
npm run test:online
```

Nach einer SDK-Änderung `npm run build:auth` ausführen und Bundle samt Lizenzhinweisen committen. DOM-Tests simulieren Supabase; PGlite prüft PostgreSQL mit Auth-Fixtures. Diese Prüfungen nicht als echte Supabase- oder iPhone-Abnahme ausgeben. Einrichtung und offene Dienstabnahme sind in `supabase/README.md` dokumentiert.

## Betrieb und Änderungen

Die App ist eine produktiv genutzte Alpha. Aktuell gelten docs/production.md, docs/architecture.md und docs/roadmap.md. Datierte UI-Berichte sind historische Nachweise.

Öffentliche Startrezepte bleiben in data/recipes, private Rezepte im gemeinsamen Haushalt. Der technische App-Pfad prototype bleibt aus Gründen der PWA- und Sitzungskompatibilität bestehen. Root-Einstieg und öffentliche Rezeptseiten werden durch scripts/build.mjs erzeugt.

Änderungen müssen bestehende Konten, Haushaltsdaten, Links und Sitzungen erhalten. Keine produktiven Daten zu Testzwecken löschen oder zurücksetzen. Kein Hostingwechsel oder neue kostenpflichtige Dienste ohne Nutzerauftrag. Bestehende Autorisierung für Umsetzung und Veröffentlichung gilt im jeweiligen Auftragsumfang.

Vor Änderungen relevante Quellen lesen. Referenzen und IDs stabil halten, bestehende Fachlogik wiederverwenden. Tests mit realer Aussagekraft ausführen. Automatisierte Tests und tatsächliche iPhone-Abnahme klar unterscheiden. Die Dokumentation im selben Paket nachführen.
