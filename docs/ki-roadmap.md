# KI-Umsetzungsroadmap für Wa chochemer?

Stand: 31. Oktober 2026. M1 abgeschlossen und nach erfolgreichen CI-Prüfungen in main integriert (PR #2). Status: verbindliche Arbeitsreihenfolge für die nächste Entwicklungsphase, kein Freipass für grosse automatische Umbauten.

## 0. Grundsatz und Entscheidungsstand

**Ziel des MVP:** Eine Familie kann echte Rezepte auswählen, den Essensplan für eine Woche bearbeiten, die benötigten Mengen inklusive Resten berechnen und eine zuverlässige Einkaufsliste erstellen. Die vorhandene Bring!-Integration bleibt nutzbar.

**Produkt:** Mobile-first Web-App. Die PWA-Installation ist das bevorzugte Auslieferungsmodell. Eine native App ist derzeit nicht geplant.

**Priorität:** Korrektheit von Daten, Mengen und Abläufen vor zusätzlicher Gestaltung. Nach dem aktuellen iPhone-Review nur noch UI-Fehler, Lesbarkeit, Touch-Probleme und Barrierefreiheit beheben. Keine weitere reine Designrunde ohne funktionalen Anlass.

**Hosting:** Noch nicht endgültig entschieden. Die bestehende GitHub-Pages-Seite auf `main` bleibt bis zum bewussten Release unangetastet. Der mobile Prototyp liegt in `feat/mobile-revolver-prototype` (PR #1). Die Vorschau via raw.githack.com ist ein temporäres Testwerkzeug, kein Produktionshosting.

### Aktueller technischer Ausgangspunkt

* `data/ingredients.json`: eindeutiger Zutatenstamm mit `id`, `names` und `defaultUnit`.
* `data/recipes/*.json`: strukturierte Rezepte, `schemaVersion`, `baseServings`, Zutatenmengen und Zubereitung.
* `scripts/build.mjs`: generiert statische Rezeptseiten mit schema.org und Bring!-Widget.
* `prototype/`: interaktiver iPhone-/Desktop-Prototyp mit Demo-Wochenrevolver und nur teilweise echten Rezeptdaten.
* Bestehende Dokumente: `docs/architecture.md`, `docs/roadmap.md`, `docs/aktionsabgleich.md`.

**Achtung:** Der mobile Prototyp kennt bislang nur zwei erfasste Rezepte und weitere Demo-Gerichte; die Rezeptquellen auf `main` enthalten auch die Apfel-Omeletten. KI-Änderungen dürfen diese unterschiedlichen Zustände nicht übersehen oder stillschweigend Demo-Daten als echte Rezepte ausgeben.

## 1. Priorisierte Umsetzung

P0 = Voraussetzung für eine benutzbare erste Version. P1 = unmittelbar danach. P2 = bewusst zurückgestellt.

| ID | Priorität | Paket | Inhalt und Abnahmekriterium | Abhängigkeit |
| --- | --- | --- | --- | --- |
| M0 | P0 | Prototyp und Merge-Gate | Aktuelle V5 auf iPhone testen: Einstellungen rechts oben, Wochentag, bildfüllender Hintergrund, vertikales Wischen, Buttons, Suchfeld, Rezeptdialog, Safe Areas. Kritische Fehler beheben; PR #1 erst danach gezielt integrieren. | keine |
| M1 | **Erledigt** | Datenmodell und Tests | Framework-unabhängige Datenvalidierung, Donnerstag-bis-Mittwoch-Kalender, Portionsskalierung und Haushalts-/Mahlzeitenverträge implementiert. 8 Tests bestanden; 3 Rezepte und 27 Zutaten validiert; Generator-Test erfolgreich. Nachweis: [M1-Abnahme](m1-domain-model.md), [PR #2](https://github.com/zefad3v/wachochemer/pull/2). | Abgeschlossen, M0 iPhone-Review weiterhin offen |
| M2 | P0 | Echtes Rezeptarchiv | Alle vorhandenen Rezept-JSONs durchsuchen, anzeigen und öffnen. Demo-Rezepte nicht als echte auswählbare Rezepte zeigen. Zutaten und Anleitungen immer aus der einen Quelle. | M1 |
| M3 | P0 | Editierbarer Wochenplan | Für ein Datum Rezept auswählen, ersetzen oder entfernen; vorige/nächste Woche; lokal persistent, nach Reload identisch. Sichtbare Kennzeichnung leerer Tage. | M1, M2 |
| M4 | P0 | Portions- und Restenlogik | Erwachsene/Kinder und Folgetag-Resten nachvollziehbar berechnen; pro Tag überschreibbar. Unit-Tests für Familienregeln und Mengen. | M1, M3 |
| M5 | P0 | Einkaufsliste | Ausschliesslich aus tatsächlichen Wochenzuordnungen; gleiche Zutaten sinnvoll bündeln, optionales auswählbar, manuelle Korrektur und Checkboxen. Kein doppelter Einkauf durch Resten. | M1 bis M4 |
| M6 | P0 | Bring!-Übergang verifizieren | Bestehenden offiziellen Import für Einzelrezepte auf iOS prüfen, Portionsmenge und Zutatenübernahme testen. Wochenlisten-Import zuerst technisch validieren; falls nicht zuverlässig, ehrlicher Fallback zum Kopieren/Teilen. | M5 |
| M7 | P1 | Installierbare PWA | Manifest, passende App-Icons, Standalone-Ansicht, sichere Update-/Cache-Strategie. Auf iPhone zum Home-Bildschirm hinzufügen und App-Start prüfen. Offline-Funktion nur wenn ausdrücklich getestet. | M0 bis M3 |
| M8 | P1 | Rezeptpflege und Qualität | Neue Rezepte strukturiert erfassen, Zutaten und Einheiten prüfen; Rezeptbilder mit klaren Rechten. Tests auf Mengen-/Einheitsfehler und fehlerhafte Links. | M1, M2 |
| M9 | P1 | Gemeinsamer Familienplan | Anforderung zuerst konkretisieren: Geräte, Berechtigungen, Konflikte und Sync. Erst dann Login/Cloud-Datenspeicherung mit Backup und Migrationsstrategie. | M3 bis M6 |
| M10 | P1 | Hosting-Entscheidung | Nach erstem funktionsfähigem MVP anhand PWA, Deploy-Workflow, Datenhaltung, Kosten und Domains treffen. Statisches Hosting unabhängig vom künftigen Backend halten. | M3 bis M7 |
| M11 | P2 | Händleraktionen | Datenquellen und Nutzungsrechte für Migros/Coop und weitere Händler evaluieren, erst danach begrenzter Pilot. Keine Angebotsdaten erfinden. | M5 und `docs/aktionsabgleich.md` |
| M12 | P2 | Erweiterungen | Automatische Rezeptvorschläge, Mehrsprachigkeit, Accounts für Fremdnutzer, Monetarisierung, native Apps nur bei validiertem Bedarf. | MVP-Nutzung |

## 2. Verbindliche Fachregeln

### Wochenplan

* Standardwoche beginnt am **Donnerstag** und endet am **Mittwoch**.
* Der Mittwochabend ist besonders einfach, da eine Person allein für beide Kinder zuständig sein kann. Eine Empfehlung darf dies nicht ignorieren.
* Tagesgerichte dürfen frei geändert werden. Empfehlung und automatische Vorschläge sind getrennt von gespeicherten Zuordnungen.
* Rezeptidentität (`recipeId`) und Kalenderdatum (`YYYY-MM-DD` in lokaler Zeitzone) getrennt speichern. Keine automatische Verschiebung durch Wochennummern-/UTC-Fehler.
* Der Startwochentag darf weiterhin konfigurierbar sein. Die Familienvorgabe ist Donnerstag.

### Portionen und Resten

* Normales Abendessen: **2 Erwachsene und 1 mitessendes Kind**.
* Nur **Montag bis Donnerstag abends** zusätzliche Portionen für das jeweilige Mittagessen am **Dienstag bis Freitag** berechnen.
* Für den Folgetag normalerweise **2 Erwachsene und gegebenenfalls das Kind** berücksichtigen. Das Kind kann alternativ Pasta essen.
* Daraus folgt als Orientierungswert an solchen Abenden ungefähr **4 Erwachsenenportionen plus 1 bis 2 Kinderportionen**, nicht eine starre Portionszahl für alle Rezepte.
* Freitagabend keine generelle Restenpflicht. Für Samstag und Sonntag keine automatischen Mittagessen aus Vortagsgerichten vorschreiben.
* Die Zahl der mitessenden Personen und die Restenentscheidung müssen überschreibbar sein; Resten als geplante Nutzung derselben Kochmenge, nicht als zweites Rezept zählen.
* Skalierung mit exakten internen Mengen; erst für die Anzeige sinnvoll runden. Besonders bei Eiern, Stückzahlen und kleinen Mengen Brüche/Familienpraxis prüfen. Keine generelle Ganzzahlrundung, die Rezeptqualität verändert.

### Einkaufsliste

* Kanonische Zutaten-IDs aus dem Zutatenstamm verwenden und Mengeneinheiten normalisieren (z. B. g/kg, ml/l). Ungleiche Zutaten oder inkompatible Einheiten nicht stillschweigend zusammenfassen.
* Zutaten nach tatsächlichem Kochbedarf skalieren, nicht nach der Anzahl abgelegter Rezepte. Resten lösen keinen zweiten Einkauf aus.
* Optionale Zutaten bewusst an-/abwählbar machen. Manuelle Änderungen dürfen nicht beim nächsten Rendering unbemerkt verschwinden.
* Bestandsvorräte und bereits gekaufte Artikel perspektivisch abziehen können, aber nicht als MVP-Blocker einführen.
* Bring!-Schnittstelle nicht erfinden: vorhandenes offizielles Widget verwenden und den tatsächlich möglichen Export vor einem versprochenen One-Click-Import testen.

## 3. Datenarchitektur und technische Leitplanken

1. **Quelle der Wahrheit:** Rezept- und Zutateninformationen bleiben in den strukturierten Quelldateien. Keine zusätzliche feste Rezeptliste im UI und keine divergierenden Anleitungen.
2. **Domainmodell:** Rezept, Zutat, Familienkonfiguration, Wochenplan-Zuordnung, geplante Mahlzeit, Restenverwendung und Listenposition als getrennte Konzepte modellieren. Angebote später als eigenes Modul.
3. **Persistenz:** Zunächst versionierter lokaler Speicher für den MVP, mit Migrationspfad und Export/Import, sobald sinnvoll. Lokal bedeutet: keine Synchronisierung oder Datensicherung zwischen Geräten. Cloud-Sync ist eine separate Entscheidung.
4. **Fachlogik testen:** Portionsskalierung, Datum, Resten, Zutatenaggregation und Einheiten in kleinen, deterministischen Funktionen kapseln; keine Berechnung nur in DOM-Event-Handlern.
5. **Datenschutz:** Keine API-Schlüssel im Frontend, keine personenbezogenen Familiendaten in Git-Commits. Bei späterer Cloud-Persistenz Authentifizierung, Zugriffsschutz, Export/Löschung und Speicherregion evaluieren.
6. **Frontend:** Vorhandene mobil optimierte Navigation nur bei nachgewiesenem UX-Problem verändern. Browser-URL-Leiste ist ausserhalb der CSS-Kontrolle. `prefers-reduced-motion`, Fokus-Bedienung und 16px-Eingabefelder beachten.
7. **Release:** Der bestehende Generator und die öffentliche Website dürfen durch Prototyp-Änderungen nicht unbeabsichtigt überschrieben werden. Generated HTML immer aus Quelldaten erzeugen, statt es von Hand zu bearbeiten.

## 4. Arbeitsanweisung für Codex oder andere Coding-KI

Für **jedes** Paket:

1. Vor dem Codieren `AGENTS.md`, diese Roadmap und die relevanten bestehenden Dateien lesen.
2. Nur **ein Paket oder einen klar begrenzten vertikalen Teil** pro Pull Request bearbeiten. Vorher Änderungen, Datenmigrationen und erwartete Dateien kurz planen.
3. Akzeptanzkriterien und Tests **vor oder zusammen mit dem Code** ergänzen. Wenn ein Test nur manuell in Safari möglich ist, als ausstehenden Test ausweisen.
4. Bestehende JSON-Strukturen, Slugs, Zutaten-IDs, deutsche Rezepttexte und schweizerdeutsche UI-Texte beibehalten. Änderungen am Schema nur begründet und migrationssicher.
5. Prüfen: `node --check prototype/app.js` (solange der Prototyp genutzt wird), `node --check scripts/build.mjs`, Generatorlauf `node scripts/build.mjs` und relevante projektinterne Tests; GitHub Actions nicht als iPhone-Ersatz betrachten.
6. Im PR klar berichten: real implementiert / weiterhin Demo; automatisiert geprüft / manuell offen; bekannte Risiken; Rollback; betroffene Dokumentation.
7. Kein automatischer Merge oder Hostingwechsel ohne explizite Freigabe. Keine neuen externen Services, Bezahlprodukte oder ungeprüften Scraping-Integrationen selbstständig aktivieren.

### Definition of Done je Paket

* Akzeptanzkriterien nachweisbar erfüllt; keine versteckten Dummy-Daten im echten Ablauf.
* Relevante Automatentests vorhanden und bestanden oder begründete Abweichung dokumentiert.
* Die vorhandene Bring!-Funktion und die öffentliche Site sind nicht unbeabsichtigt beschädigt.
* Dateiverhalten und Mengenmodell stimmen mit den Fachregeln überein.
* Dokumentation und Roadmap-Status nachgeführt, PR zur Prüfung bereit.

## 5. Nächste drei konkret ausführbare Arbeitspakete

**Ticket M0 / Review und Stabilisierung**
* Aktuelle Preview V4 auf echtem iPhone mit den bisherigen Problemfällen testen; UI nicht weiter grundsätzlich umgestalten.
* Prüfen: vertikales Swipe ohne Seitenscrollen, Datumsanzeige, Zahnrad, Menü, Klickflächen, Suchfeldfokus ohne iOS-Zoom, Portionsumschaltung und Bring!-Navigation.
* PR #1 vor Merge gegen aktuelle `main` prüfen, da im Hauptzweig seit der Branch-Erstellung weitere Rezeptdaten ergänzt wurden.
* Ergebnis: belastbares Merge-Gate und dokumentierte Abweichungen.

**Ticket M1 / Domainmodell und Testbasis (abgeschlossen)**
* Bestehendes Zutaten-/Rezeptschema erfassen; minimale Schnittstellen für Datum, Mahlzeit, Portionen, Resten und Einkaufsposition definieren.
* Unit-Tests für Datum Donnerstag/Mittwoch, Mengen, optionale Zutaten, unbekannte Zutaten-IDs und Einheiten.
* Keine Cloud und kein UI-Redesign.

**Ticket M2 / echtes Chochchischtli**
* Rezeptarchiv liest alle vorhandenen `data/recipes/*.json` bzw. ein generiertes Rezeptmanifest. Demo-Rezepte nur in expliziten Testdaten.
* Suche, Details und Portionenskalierung arbeiten für alle echten Rezepte.
* Ergebnis ist die Grundlage für ein vollständig editierbares Wochenraster.

## 6. Entscheidungspunkt für Hosting und Synchronisierung

Nach M3 bis M6 einen kurzen Architekturentscheid (ADR) dokumentieren:
* Muss der Plan mit **einem** iPhone oder mit **mehreren** Familiengeräten gleichzeitig funktionieren?
* Reicht ein lokaler Datenspeicher zunächst aus, oder ist gemeinsame Persistenz Voraussetzung?
* Welche Update-/Cache-Garantien braucht die PWA? Wie sieht Preview-/Release-Deployment aus?
* Wo liegen Kosten, Domain, Backup und allfällige Nutzerdaten?
* Bevorzugte Minimalvariante: statische, installierbare PWA, solange keine serverseitigen Funktionen benötigt werden. Für Familien-Sync erst dann ein schlankes Backend evaluieren.

**Bis zu diesem Entscheid keine Datenbank, keine monolithische API und kein Plattform-Rewrite.**
