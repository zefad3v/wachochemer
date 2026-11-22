# Architektur

## Entwicklungsprototyp: responsive Tages- und Wochenplanung

`prototype/responsive-planner.mjs` kapselt Breitenklassen, Ansichtsvorgaben, Tageswechsel über Wochengrenzen und horizontale Wischschwellen. `prototype/app.js` rendert Tageskarte und Wochenübersicht aus demselben datumsschlüsselbasierten Plan in `prototype/planner.mjs`. Der bestehende Datenspeicher bleibt kompatibel. CSS verwendet normale Grid-/Listenlayouts. Die frühere 3D-Geometrie und `carousel.mjs` wurden entfernt. Details: [responsive-day-week-planner.md](responsive-day-week-planner.md).

## Entscheidungen

* Die Oberfläche verwendet Deutsch (Schweiz). Die App heisst «Wa chochemer», die Planansicht «Wucheplan». Von Mitgliedern erfasste oder importierte Inhalte behalten ihre Originalsprache.
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
* Die Rezepte sind öffentlich. Persönliche Wochenpläne und Haushaltsprofile verwenden nach Aktivierung der Supabase-Konfiguration einen durch Mitgliedschaften geschützten Datenbereich.
* Die Browseroberfläche und das Design werden im nächsten Schritt überarbeitet.

## V15-Bedienung

Die Hauptkarte öffnet den Menüeditor für Datum und angezeigte Mahlzeit; Rezeptdetails bleiben im Archiv. Die Mahlzeitsteuerung liegt als separate Geschwisterschaltfläche innerhalb der Kartenhülle, ohne verschachtelte Buttons. Heute verwendet den lokalen Gerätekalender (`aria-current="date"`), Auswahl `aria-pressed`. Die manuelle Mahlzeitwahl bleibt während der laufenden Sitzung bis zum lokalen Tageswechsel erhalten, auch bei Tages-/Wochennavigation. Sichtbarkeitswechsel und eine sparsame Uhrprüfung aktualisieren Standard und Heute-Markierung. Planformat und Speicherschlüssel bleiben unverändert. Details: [V15-Abnahme](v15-ui.md).

## V16-Bild- und Materialebenen

Verifizierte Bilder und opt-in Demo-Bilder sind in `prototype/recipe-images.mjs` von Rezeptdaten getrennt. Nur Darstellungsmetadaten erhalten `imageDemo`; das Planformat bleibt unverändert. Mobile Seitentitel verwenden den normalen Headerfluss; Glass-Blur sitzt auf positionsgebundenen Pseudoelementen, ohne Header/Text/SVG zu filtern. [V16-Abnahme und Screenshots](v16-ui.md).

## V17-Header und Archiv

`app-backdrop`, Headerhintergrund und Header-Vordergrund bilden getrennte Ebenen. Der App-Container selbst bleibt ungefiltert und untransformiert, ohne gemeinsame isolierte Compositing-Gruppe. Der Archiv-Grid nutzt gleich hohe Zeilentracks; Bild/Platzhalter füllen die ganze Kachel, Texte liegen auf einem separaten Overlay. Tag ist ohne gespeicherte Präferenz auf allen Breiten Standard; der Wechsel sitzt bei der Tagesnavigation. [V17-Abnahme](v17-ui.md), mit klarer Grenze zwischen Chromium/Safe-Area-Simulation und echtem iOS-PWA-Test.

## Issue #15: Kochen und einfache Portionsplanung

Geplante Rezeptkarten öffnen `openRecipe` mit unveränderten `cookedServings` (auch Dezimalwerte); ein eigener Stift öffnet den Editor. Archivportionen bleiben unabhängig. Der Kochmodus verwendet dieselben Zutaten und Anleitungen, speichert nur flüchtigen Schrittstatus und schreibt weder Plan noch Einkauf.

Der Editor bildet Mahlzeitenbedarf plus optionale Zusatzmenge auf die bestehenden M4-Felder ab. Ungeklärter V1-Verzehr bleibt leer und muss ausdrücklich geklärt werden. Ohne Haushalt wird erst nach Rezeptwahl dessen Basisportionenzahl als gekennzeichneter Vorschlag gesetzt. Restenquellen stammen aus `assessPlan`, geben beim Editieren die eigene Reservierung zur Auswahl frei und werden beim Speichern weiterhin durch `updateMeal` validiert. Keine Schema- oder Speicherschlüsseländerung; Bring!-Manifest und M4-Domain bleiben unverändert.

## V20: gemeinsame Rezept- und Kochansicht

Der Dialog nutzt eine Scrollfläche, eine Zutatencheckliste und eine nummerierte Anleitung für beide Ansichten. `recipeViewServings` ist ein flüchtiger Override vor `plannedServings` und Archivpräferenz. Nur Archivänderungen speichern weiterhin die vorhandene Präferenz; geplante Kochsitzungen schreiben keinen Speicher. Öffnen/Schliessen setzt den Override zurück. Headercontrols stehen vor dem Titel im Dokumentfluss, Fokus liegt beim Einstieg auf dem benannten Dialog. [Abnahme](issue18-cooking-view.md).

## Rezeptimport und Kochbuchfilter

Haushaltsrezepte unterstützen Bund als Einheit und eine optionale Aktivzeit in Minuten zusätzlich zur Gesamtzeit. Bestehende Rezepte ohne Aktivzeit bleiben gültig. Der Migusto-Import liest die separat angezeigte Aktivzeit aus dem Zeitbereich der Rezeptseite. Kochbuchfilter arbeiten auf dem gemeinsamen Katalog, die Sortierung verändert keine gespeicherten Rezepte. Die Ladeanimation respektiert reduzierte Bewegung. Der Glas-Effekt der Navigation braucht weiterhin eine Sichtprüfung auf dem iPhone.
