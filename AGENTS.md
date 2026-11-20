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

## Historischer Projektstand vor dem gemeinsamen Haushalt

# Coding-Agent Leitlinien für Wa chochemer?

Lies **vor jeder Codeänderung** `docs/ki-roadmap.md`, `docs/architecture.md` und die für dein Ticket relevanten Quelldateien. Die Roadmap enthält die priorisierten Pakete M0 bis M12, Fachregeln, Akzeptanzkriterien und Definition of Done.

## Verbindliche Regeln

- Arbeite an **einem klar abgegrenzten Paket** pro Pull Request. Stelle bei mehreren möglichen Aufgaben zuerst M0, dann M1 usw. in den Vordergrund.
- Schütze die produktive GitHub-Pages-Seite auf `main`. Der mobile Designprototyp liegt separat in `feat/mobile-revolver-prototype` (PR #1). Keine eigenmächtigen Merges, Deployments oder Hostingwechsel.
- Grundlage sind strukturierte Rezept- und Zutatendaten in `data/recipes/*.json` und `data/ingredients.json`. Referenzen, IDs und Slugs stabil halten; keine zweite, hartcodierte Quelle für reale Rezepte.
- Demo-Gerichte klar als Demo markieren und niemals als fertig gespeicherte echte Rezepte ausgeben.
- Die Familienregeln zu Donnerstag-bis-Mittwoch-Wochen, Portionen, Montags-bis-Donnerstags-Resten und einfachem Mittwoch stehen in `docs/ki-roadmap.md`. Sie sind fachliche Akzeptanzkriterien, nicht bloss UI-Vorschläge.
- Bei Rezepten und Zutaten Deutsch (Schweiz), für UI-Begriffe Schweizerdeutsch. Keine deutschen ß im Text.
- Keine erfundenen Bring!-Funktionen oder nicht bestätigten Grossverteiler-APIs. Der Aktionenabgleich steht separat in `docs/aktionsabgleich.md` und ist vorerst P2.
- UI nicht weiter grundlegend umgestalten. Priorität haben funktionale Korrektheit, mobile Bedienbarkeit, Tests und persistente Daten.
- Erst das Problem und die minimal nötigen Dateien identifizieren, dann Tests und Code ändern. Vor Abgabe passende Node-/Generator-Tests ausführen und nicht durchgeführte iPhone-Tests klar ausweisen.
- Bei geänderten Datenstrukturen Migration und Kompatibilität dokumentieren. Keine neuen externen Dienste oder versteckten Schlüssel ohne ausdrückliche Freigabe.

## Abschlussbericht pro Aufgabe

Berichte kurz: betroffene Roadmap-ID, geänderte Dateien und Funktionen, automatisierte Tests mit Resultat, manuell ausstehende Prüfungen, Risiken und das nächste sinnvolle Paket.
