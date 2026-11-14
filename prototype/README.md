# Wachochemer Entwicklungsprototyp

Aktueller Arbeitsbranch: `codex/responsive-day-week-planner`, PR-Ziel: `feat/ux-review-ferris-wheel-bring-flow`. Kein Merge oder Deployment nach main.

Die Oberfläche bietet eine grosse Tageskarte, eine kompakte Siebentageleiste und eine vollständige Wochenübersicht mit direkter Bearbeitung. Unter 680 px startet Tag, ab 680 px Woche. Der Umschalter speichert die Auswahl pro Breitenklasse. Ab 1100 px ergänzt eine Tageskarte die Wochenübersicht.

Menüs, Zmittag/Znacht, Rezeptsuche, Portionen, eigene Menüs, Resten, Wochenbeginn und Zutatenvorbereitung verwenden weiterhin lokale Daten. Die Rezeptübernahme aus dem Archiv zeigt ein editierbares Zieldatum und eine Mahlzeit. Ungeplante Tage enthalten keine Demo-Gerichte. Da im Datenstamm keine verifizierten Rezeptfotos vorliegen, erscheinen neutrale Platzhalter.

Lokal starten: `python3 -m http.server 8765`, dann `/prototype/` öffnen.

Prüfen: `node --test tests/*.test.mjs`, `node --check prototype/app.js`, `node scripts/build-recipe-index.mjs`. Optional mit separat verfügbarem Playwright und Chromium: `node scripts/check-responsive-planner-browser.cjs`. `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` und `PLANNER_SCREENSHOTS` können Pfade überschreiben. Keine neue Laufzeitabhängigkeit.

Details und offene echte iPhone-Abnahme: [Responsive Tages- und Wochenplanung](../docs/responsive-day-week-planner.md). Frühere 3D-Berichte dokumentieren ausschliesslich verworfene historische Entwicklungsstände.
