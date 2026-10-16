# Wa chochemer?

Schweizerdeutsche Rezeptplattform im Aufbau. Momentan ein öffentliches Testrezept mit funktionierendem Bring! Button und korrekter Portionenskalierung.

## Daten

* `data/recipes/poulet-fajitas.json`: Rezept als strukturierter Datensatz.
* `data/ingredients.json`: zentraler Zutatenstamm mit IDs.
* `locales/gsw-CH.json`: vorbereitete schweizerdeutsche Oberflächentexte.
* `docs/architecture.md`: Architektur und aktuelle Grenzen.
* `docs/roadmap.md`: weitere Schritte.

**Aktueller Stand:** `index.html` ist noch statisch und liest die JSON-Dateien nicht automatisch. Der nächste technische Schritt ist ein Generator aus den JSON-Quelldaten. Die funktionierende Bring! Integration wurde nicht verändert.

## Webseite

GitHub Pages mit Branch `main` und Ordner `/ (root)`: https://zefad3v.github.io/wachochemer/
