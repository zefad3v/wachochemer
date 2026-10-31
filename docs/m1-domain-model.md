# M1: Domänenmodell und Tests

Status: **abgeschlossen und in main integriert** (31. Oktober 2026, PR #2, Squash-Commit 5fb17463e4b8c10acfde0b38b841ddf76fb11001).

## Inhalt

* `src/domain/model.mjs`: framework-unabhängige Validatoren für Zutatenstamm, Rezepte, Familie und einzelne Mahlzeiten; Kalenderwochen mit konfigurierbarem Starttag und Donnerstag als Familienstandard; exakt skalierte Zutatenmengen.
* `scripts/check-data.mjs`: prüft alle bestehenden echten Rezept-JSONs gegen den Zutatenstamm, ohne bestehende Daten zu verändern.
* `tests/domain.test.mjs`: Node.js-Bordmittel (`node:test`) ohne neue Abhängigkeiten.
* `.github/workflows/check-domain.yml`: CI-Prüfung bei Pull Requests und Datenänderungen.

## Modellgrenzen

* `Recipe` und `Ingredient` bleiben die versionierten Dateien in `data/recipes` und `data/ingredients.json`.
* `Household` als zukünftiges lokales Objekt: `{adults: 2, children: 1, weekStartsOn: 4}`. Keine personenbezogenen Namen in Git.
* `MealAssignment` als zukünftiges Objekt: `{date: "2026-10-29", meal: "dinner", recipeId: "...", servings: 5}`; `date` bezeichnet einen Kalendertag und keinen UTC-Zeitpunkt.
* Resten, Bedarfsmengen und Einkaufsliste werden **nicht** in diesem Paket vorweggenommen. Ihre Berechnung gehört zu M4/M5.
* Rechenwerte bleiben ungerundet. Für Stückzahlen wird später eine Anzeigestrategie festgelegt.
* Weder UI, Generator noch öffentliche Website wurden in diesem Branch absichtlich verändert.

## Prüfungen

Lokal:
```sh
node --test tests/*.test.mjs
node scripts/check-data.mjs
node --check scripts/build.mjs
```

GitHub Actions Run 41125550866: alle 8 Tests bestanden, 3 Rezepte und 27 Zutaten validiert, Generator-Syntax bestanden. Der ergänzte Generatorlauf inklusive Prüfung auf unveränderte Ausgaben bestand ebenfalls (Run 41200862298). Der finale PR-Head bestand die Prüfung erneut (Run 41200876685). Ein echter iPhone-Test (M0) ist davon unabhängig und weiterhin offen.

## Nächster Schritt

Nach erfolgreicher Abnahme ist M1 abgeschlossen. Weiter mit M2: alle realen Rezeptdateien für das Chochchischtli über ein generiertes Manifest verfügbar machen, statt Demo-Rezepte als echte Daten zu behandeln. PR #1 (UI-Prototyp) nicht automatisch mergen.
