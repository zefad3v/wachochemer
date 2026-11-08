# Architektur

## Entwicklungsprototyp: radiales Wochenkarussell

Der M3-Entwicklungsstand verwendet `prototype/carousel.mjs` für reine Kreisgeometrie und kontinuierliche Tagesrotation. `prototype/app.js` verbindet sie mit vorhandenen Kalender- und Touchzuständen. Ein gemeinsamer CSS-3D-Ring dreht sieben beständige Karten; abgerundete, deckende Bildflächen enthalten jeweils ihre eigenen Textlayer. Nur die aktive Karte zeigt Titel und Verlauf. Es gibt keine neue Laufzeitabhängigkeit und keine Änderung am Rezept- oder Planmodell. Details zu Ebenen, Gesten und manueller iPhone-Abnahme stehen in [m3-planning.md](m3-planning.md).

## Entscheidungen

* Die Oberfläche verwendet derzeit schweizerdeutsche Bezeichnungen. Rezeptinhalte bleiben auf Deutsch (CH).
* Mehrsprachigkeit ist durch `locales/`, stabile Zutaten-IDs und sprachbezogene Namen vorbereitet, aber noch nicht implementiert.
* Der Zutatenstamm liegt in `data/ingredients.json`.
* Rezepte liegen in `data/recipes/*.json`. Mengen sind Zahlen mit festen Einheiten. IDs und `schemaVersion` erleichtern eine spätere Datenbankmigration.
* Die JSON-Daten sind jetzt die **einzige Quelle** für angezeigte Rezeptinformationen sowie Schema.org/Recipe.

## Generator

`node scripts/build.mjs` erzeugt `index.html` und für jedes Rezept eine Detailseite unter `rezepte/<slug>/index.html`. Es werden keine npm-Abhängigkeiten benötigt.

Die GitHub Action `.github/workflows/generate.yml` soll bei Änderungen an Rezepten, Zutaten, Sprache oder Generator auf `main` automatisch neu generieren und die fertigen Dateien committen. Für den Push benötigt GitHub Actions Schreibberechtigung (`contents: write` und passende Repository-Einstellungen). Dieser automatische Lauf ist noch separat zu verifizieren.

## Bring!

* Das offizielle Bring! Widget bleibt vorhanden.
* `data-bring-base-quantity` und `data-bring-requested-quantity` werden aus `baseServings` erzeugt.
* Der HTML-Generator gibt die Zutaten in `schema.org/Recipe` als Text aus.
* Optionale Zutaten erhalten den Hinweis `(optional)`.
* Die automatische Bring! Übertragung muss nach dieser Umstellung nochmals auf einem Mobilgerät getestet werden.

## Grenzen und nächste Schritte

* Die Startseite ist derzeit die erste Rezeptdetailseite, keine Archivübersicht.
* Die Benennung mancher Einheiten und Pluralformen ist derzeit pragmatisch. Für mehr Rezepte benötigen wir Tests mit Mengen, Zutatenvarianten und Übersetzungen.
* Die Rezepte sind öffentlich. Persönliche Wochenpläne und Familienprofile gehören später in einen separaten privaten Datenbereich.
* Die Browseroberfläche und das Design werden im nächsten Schritt überarbeitet.
