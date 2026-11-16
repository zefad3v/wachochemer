# M6 Bring!-Übertragungsplan

Issue #11 C. Grundlage: [geprüfte API-Analyse](bring-api-assessment.md).
Dies ist eine Übertragungsvorbereitung, kein automatischer Transfer.

## Implementiert
src/integrations/bring.mjs ist rein, deterministisch und ohne Netzwerk-/Browserzugriffe.
buildTransferManifest nutzt ausschliesslich die M4-Kochmengen und cookingTotals.
Enthalten: inklusiver Einkaufszeitraum (1–60 Tage), Kochvorgänge, Dezimalportionen,
aggregierte Zutaten, Herkunft jeder Zutat, ausdrücklich eingeschlossene optionale Zutaten,
datumsbezogene Extras, Dublettenkandidaten und Warnungen.
Resten lösen nie einen neuen Einkauf aus; Quelle vor Zeitraum bedeutet keine Zutaten.
Gleiche Zutaten und Einheit werden summiert; verschiedene Einheiten bleiben separat mit Warnung.
Kein semantisches Zusammenlegen von Extras mit Zutaten und keine automatische Einheitenumrechnung.
JSON-Export bleibt ungerundet; Kopiertext und Vorschau runden zur Darstellung.
Sortierung und fehlender Zeitstempel erlauben reproduzierbare Exporte.

Offizielle Einzelrezeptlinks verwenden den dokumentierten HTTPS-Deeplink mit URL,
source=web, baseQuantity und requestedQuantity. Öffnen ist eine bewusste Nutzeraktion.
Die öffentliche Rezeptseite muss bereits existieren und Schema.org/Recipe bereitstellen.
Das Manifest selbst ist kein Bring!-Batchimportformat und wird nicht als solches angeboten.
Die Anwendung bietet Download, Einzelrezeptlinks und den bisherigen Kopierfallback;
keine zweite abhakbare Einkaufsliste.

## Strikte Zustände
recipeSavedInBring und ingredientsOnBringList sind getrennt und beide unknown.
transferVerified bleibt false. Kopieren, Download oder Linköffnung bestätigen keine
Bring!-Änderung. Auch ein lokaler Abschluss wäre kein ausgelesener Bring!-Zustand.
Keine Anmeldung, Credentials, Tokens oder inoffiziellen API-Aufrufe im Frontend.

## Was für automatischen Wochenimport fehlt
1. Dokumentierter, autorisierter Batch-/Partnerschnittstellenvertrag und Freigabe von Bring!.
2. Nachgewiesener Weg zum Lesen/Abgleichen gespeicherter Rezept-URLs, unabhängig vom
   Lesen der Einkaufsliste; derzeit beides über die offizielle Import-API nicht belegt.
3. Idempotenz-/Dublettenstrategie pro Einkauf, Einheiten und Teilimporte; Fehler,
   Wiederholung und nachvollziehbare Quittierung dürfen nicht zum Doppelimport führen.
4. Bei künftig benötigter Authentifizierung: separat entschiedene geschützte Backend-/
   Tokenverwaltung. Hier weder nötig noch implementiert. Die inoffizielle batch_update_list-
   Alternative ist ausschliesslich in der Analyse dokumentiert.
5. Echte Bring!-Testliste: zwei Einzelrezepte importieren, «Meine Rezepte» und
   Einkaufszutaten getrennt prüfen; gleiche Zutaten, erneuter Import, optionale Zutaten,
   Dezimalportionen, App-/Browser-Rückkehr und Abbruch testen. Öffentliches Rezept-Parsing
   und Unterstützung von Dezimalmengen extern bestätigen.

## Nachweise und Grenzen
53/53 Node-Einzeltests, davon sieben Exporttests: Zeiträume über Jahresgrenzen, Resten,
Portionen, stabile JSON-Ausgabe, optionale Zutaten, Extras, fehlende Daten, Einheiten,
zwei unabhängige unbekannte Zustände und keine Netzwerk-Nebenwirkungen.
Chromium: 8 neue Bring-Prüfungen für echte Download-Datei, Portionen im Link,
optionale Zutaten, Kopierfallback und keine Checkbox-Einkaufsliste.
Alle übrigen Browserregressionen ebenfalls ausgeführt.
Echte iPhone-Safari/PWA- und Bring!-End-to-End-Prüfung offen.
Keine erfolgreiche Übertragung behauptet, kein produktives Deployment.
