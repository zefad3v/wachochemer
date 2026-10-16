# Wa chochemer?

Eine Schweizer Rezeptplattform im Aufbau. Rezepte, Zutaten und Oberflächentexte werden strukturiert verwaltet. Das erste Testrezept ist **Milde Poulet-Fajitas** mit Bring! Integration.

## Projektstruktur

* `data/ingredients.json`: zentraler Zutatenstamm, eindeutige IDs und Bezeichnungen.
* `data/recipes/*.json`: Rezepte und Mengen als strukturierte Quelldaten.
* `locales/gsw-CH.json`: schweizerdeutsche Oberflächenbegriffe.
* `scripts/build.mjs`: statischer Generator für HTML und Schema.org/Recipe.
* `index.html`: vorläufige Startseite, aus JSON generiert.
* `rezepte/<slug>/index.html`: generierte Detailseiten.
* `.github/workflows/generate.yml`: automatische Generierung auf GitHub.
* `docs/architecture.md` und `docs/roadmap.md`: Entscheidungen und weitere Schritte.

## Neues Rezept hinzufügen

1. Bei Bedarf fehlende Zutaten mit stabiler ID in `data/ingredients.json` ergänzen.
2. Eine Rezeptdatei in `data/recipes/` anlegen und auf Zutaten-IDs verweisen.
3. Lokal `node scripts/build.mjs` ausführen oder auf die GitHub Action warten.
4. HTML und Bring! Import prüfen. Für alle Rezepte gibt es eine URL unter `rezepte/<slug>/`.

Keine npm-Installation nötig, Node.js 22 wird in der GitHub Action verwendet.

## Webseite

https://zefad3v.github.io/wachochemer/

Der GitHub-Workflow für die künftige automatische Generierung ist eingerichtet, sein erfolgreicher erster Lauf muss noch bestätigt werden. Details in `docs/architecture.md`.
