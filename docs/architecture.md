# Architektur

Aktueller Stand der produktiven Alpha, 22. November 2026. [Release und Betrieb](production.md).

## Frontend und Einstieg

GitHub Pages liefert die App. Der Root-Einstieg leitet unter Erhalt von Query und Fragment zum bestehenden technischen Pfad `prototype/` weiter. Der Pfad bleibt für PWA-Scope und Sitzungskompatibilität erhalten.

`prototype/app.js` verbindet Darstellung und Fachlogik. `prototype/responsive-planner.mjs` kapselt Ansichtsgrenzen und Gestenschwellen. `prototype/planner.mjs` und `src/domain/` berechnen Kalender, Portionen, Resten und Zutaten. Tag und Woche verwenden denselben datumsschlüsselbasierten Menüplan.

`#main` scrollt in der installierten mobilen App. Die Navigation liegt darüber und reserviert keine separate Zeile. Unterer Inhaltsabstand hält die letzten Aktionen erreichbar. Die Suchzeile wird abhängig von Scrollrichtung und Fokus sichtbar. Geste auf der Tageskarte wechselt die Mahlzeit, Geste auf der Wochentagsleiste die Woche. Untermenüs unterstützen die bestehende Zurückgeste.

## Speicherung und Schutz

`prototype/account.mjs` und `src/storage/shared-household.mjs` koordinieren Supabase-Sitzung, MFA und Haushaltszustand. Bis zur Sitzungsprüfung ist die Oberfläche gesperrt. Im Onlinebetrieb gibt es keinen lokalen Ersatzplan für fehlgeschlagene Schreibvorgänge.

Serverseitige Mitgliedschaftsprüfung und AAL2 schützen Haushalt, Menüs und Rezepte. RPC-Schreibvorgänge verwenden Revisionen und Haushaltssperren. Die öffentliche Einladungsvorschau gibt mit gültigem UUID ausschliesslich Zieladresse und Haushaltsname frei. Die Annahme benötigt das passende bestätigte Konto. Details und Einrichtung stehen im [Supabase-Handbuch](../supabase/README.md).

## Rezepte

Öffentliche Startrezepte liegen in `data/recipes/`, Zutaten in `data/ingredients.json`. Haushaltsrezepte liegen privat in `household_recipes`. Der gemeinsame Katalog verwendet stabile IDs und enthält beide Quellen.

Der Editor unterstützt manuelle Eingabe, gewöhnlichen Linkimport und ausdrücklichen KI-Import. Mengenbereiche bleiben mit beiden Grenzen erhalten. Fehlende Mengen bleiben ohne Mengenangabe. Bund ist eine eigene Einheit. Vorbereitungszeit, Kochzeit, Gesamtzeit und Aktivzeit sind getrennt und optional. Rezeptbild und Quelle werden übernommen oder als HTTPS-Link gepflegt.

Die Kontrollvorschau geht dem Speichern voraus. Ein erfolgreicher Schreibvorgang schliesst den Editor. Ein bestehender Quelllink erfordert die ausdrückliche Bestätigung einer Aktualisierung. Löschen ist endgültig, revisionsgeschützt und bei eingeplantem Rezept blockiert.

Suche, Favoriten, Herkunft und Dauer filtern den Katalog, Name und Dauer sortieren ihn. Die Rezeptauswahl im Menüeditor rendert acht Treffer je Schritt. Der Katalog selbst bleibt vollständig geladen, die Suche erfasst alle Einträge.

## Darstellung und Sprache

Die Oberfläche verwendet Deutsch (Schweiz). «Wa chochemer» und «Wucheplan» bleiben im Dialekt. Rezeptinhalte behalten ihre Originalsprache. `locales/format-de-CH.mjs` formatiert Einheiten und Mahlzeiten.

Das aktive Rezeptbild wird als schwache Hintergrundatmosphäre eingesetzt. Glasflächen filtern ihren Hintergrund, Text bleibt ungefiltert. Reduzierte Bewegung deaktiviert die Ladeanimation, reduzierte Transparenz verwendet einen deckenden Fallback. Native Auswahlmenüs kommen vom Browser, geschlossene Felder werden per CSS gestaltet.

## Generator und Bring!

`scripts/build.mjs` erzeugt den App-Einstieg und öffentliche Rezeptseiten mit Schema.org/Recipe und Bring!-Widget. `scripts/build-recipe-index.mjs` erzeugt das Verzeichnis öffentlicher Rezepte. GitHub Actions prüft die reproduzierbaren Ausgaben.

Bring!-Einzelrezeptlinks bleiben erhalten. `src/integrations/bring.mjs` bereitet Zutaten, Warnungen und kopierbaren Export vor. Ein automatischer Gesamtimport ist weiterhin unbestätigt.

## Prüfungen

Node prüft Fachlogik, PGlite SQL mit Auth-Fixtures und DOM-Tests simulierte Onlineabläufe. Browserprüfungen testen zusätzlich echte Layoutmasse und Ereignisse. Echte Supabase-, E-Mail- und iPhone-Abnahmen werden separat ausgewiesen.

## Anbieterunabhängiger Rezeptimport, 22. November 2026

Öffentliche HTTPS-Seiten werden ohne Anbieterliste eingelesen. Jeder Redirect wird erneut geprüft. DNS-Adressen werden auf öffentliche Ziele beschränkt und für die TLS-Verbindung festgehalten. Interne Adressen, Zugangsdaten in URLs und andere Ports sind gesperrt. Fehlende Rezeptdaten, nicht erreichbare Seiten und Grössenlimits ergeben eine Rückmeldung. Bei KI-Text plus Link wird das Rezeptbild zusätzlich versucht; ein Bildfehler verhindert den Textimport nicht. Kochkarussell wurde mit vier Portionen, zwölf Zutaten, drei Schritten, 10/20/30 Minuten und Bild geprüft.
