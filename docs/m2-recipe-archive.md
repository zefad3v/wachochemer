# M2: Echtes Chochchischtli

**Status:** Implementiert auf `feat/m2-real-recipe-archive` (PR #3), gestapelt auf dem noch offenen UI-PR #1. 14 automatisierte Tests bestanden. iPhone-Retest und Integration nach `main` ausstehend. Neue Review-Mängel und Korrekturen: [`docs/iphone-review-2026-10-31.md`](iphone-review-2026-10-31.md).

## Lieferumfang

* Alle tatsächlichen Rezept-JSON-Dateien im Branch werden über `scripts/build-recipe-index.mjs` erfasst.
* `data/recipe-index.json` enthält **nur Rezept-ID und Slug**, keine kopierten Titel, Zutaten, Portionsangaben oder Anleitungen.
* `prototype/catalog.mjs` lädt Index, Zutatenkatalog und alle referenzierten Rezepte, validiert mit dem M1-Modell die Quelldaten und liefert Anzeigeeinträge.
* Die Archivsuche verwendet echte Rezepttitel und Beschreibungen, ignoriert Gross-/Kleinschreibung und Akzente. Favoriten beziehen sich ausschliesslich auf reale Rezept-IDs.
* Der Rezeptdialog zeigt die vollständigen Zutaten und Zubereitungsschritte; die Portionsauswahl aus dem bestehenden Prototyp wird weiterverwendet.
* Für bislang nicht zuverlässig bebilderte Rezepte wird ein neutraler Platzhalter angezeigt, kein fremdes Ersatzrezept.
* Bei HTTP-/Datenfehlern wird eine echte Ladefehlermeldung gezeigt; kein verkürztes Fallback-Rezept wird als real ausgegeben.
* Der bestehende statische Generator bleibt unverändert. Die bestehende GitHub-Action erzeugt zusätzlich das Rezeptverzeichnis und committet es bei Änderungen.

## Tatsächliche Rezepte der Testvorschau

1. Apfel-Omeletten mit Quark
2. Kürbissuppe mit Käsetoast
3. Milde Poulet-Fajitas

Das dritte Rezept und acht zusätzliche Zutaten wurden aus dem seit Erstellung von PR #1 fortgeschrittenen `main`-Stand in den Vorschauzweig übernommen. Dies sind keine neuen erfundenen Rezepte.

## Abgrenzung

* Die 7 Wochenplan-Karten bleiben ein visuelles Designbeispiel. Die echten Rezepte im Archiv werden **nicht automatisch** zu einem gespeicherten Wochenplan.
* Die Demo-Einkaufsliste bleibt auf die bisherigen zwei echten Wochenkarten begrenzt. Die Aggregation aus einem editierbaren Wochenplan folgt mit M3–M5.
* Die Bring!-Schaltfläche öffnet weiterhin die bereits veröffentlichte individuelle Rezeptseite. Kein neuer synchroner Wochenexport in M2.
* UI-Design, Hosting und PWA-Technik bleiben ausserhalb von M2. Die öffentliche Website unter `main` ist unverändert.

## Technische Prüfung

GitHub Actions: **Check real recipe archive (M2)**, finaler Run `41224366856`, **14 von 14 Tests erfolgreich, 0 Fehler** (neun Rezept- und fünf UI-Strukturtests). Enthalten: vollständiger JSON-Index, keine Demo-IDs, exakte Quelldaten, Suche, Favoriten, ungültige/manipulierte Indexeinträge, Ladefehler, unbekannte Zutaten. Syntaxchecks für App und Generator sowie reproduzierbare Generierung bestanden.

## Noch offen

* Auf echtem iPhone: Archiv mit drei Rezepten öffnen; Apfel-Omeletten, Suche und Favoriten prüfen; Rezeptdialog mit Portionen und Bring!-Link prüfen. Speziell B1 bis B5 aus dem jüngsten iPhone-Review nachprüfen. Die automatischen UI-Strukturtests sind kein Ersatz für Safari-/PWA-Abnahme.
* PR #1 wird erst nach separatem UI-Review gemergt; PR #3 wird danach gegen den aktuellen `main`-Stand geprüft und integriert.
* Falls `main` inzwischen weitere Rezepte erhält, vor Integration das generierte Indexfile neu erstellen und die M2-Tests wiederholen.

## Vorschau

Stabiler Testlink wird aus dem finalen Branch-Commit erzeugt:
`https://raw.githack.com/zefad3v/wachochemer/<COMMIT-SHA>/prototype/index.html`

Dies ist ein Drittanbieter-Preview, kein Produktionseinsatz.
