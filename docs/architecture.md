# Architekturentscheidungen

## Prinzipien

* Aktuelle Oberfläche: Schweizerdeutsch (gsw-CH). Rezeptinhalte: Deutsch (CH).
* Sprachumschaltung und weitere Sprachen sind vorbereitet, jedoch **noch nicht implementiert**.
* Rezepte und Zutaten werden über stabile IDs referenziert. Datenformat JSON mit `schemaVersion`.
* Rezeptmengen sind numerisch und an `baseServings` gebunden; Mengenwerte sind sprachunabhängig.
* Zutatenkatalog ist der zentrale Ort für Bezeichnungen (aktuell nur `de-CH`), zukünftige Locale-Werte sind ergänzbar.
* `optional` markiert optionale Zutaten, ohne die Bring! Funktionalität vorauszusetzen.
* Spätere DB-Migration soll dieselben IDs und Referenzen behalten.

## Struktur

* `data/ingredients.json`: Zutatenstamm.
* `data/recipes/*.json`: strukturierte Rezepte.
* `locales/gsw-CH.json`: künftige Übersetzungen der Navigation.
* `index.html`: aktuell veröffentlichte statische Testseite mit eingebetteten Schema.org-Daten und funktionierendem Bring! Widget.

## Wichtiger Übergangsschritt

Die Webseite liest die JSON-Dateien **noch nicht automatisch**. Beim Ändern eines Rezepts muss bis zur Einführung eines Generators auch die HTML-Seite nachgeführt werden. Als nächstes einen statischen Build-Schritt hinzufügen, der HTML, JSON-LD und sichtbare Zutaten aus den JSON-Dateien generiert. Das Bring! Widget mit `data-bring-base-quantity="3"` bleibt bis zum erneuten Praxistest unverändert.

## Noch offen

* Mehrsprachige Zubereitungstexte, Pluralformen und lokalisierte Einheiten.
* Zutatenvarianten, Synonyme und Massenkonvertierung.
* Benutzerkonten, Wochenplanung und DB.
