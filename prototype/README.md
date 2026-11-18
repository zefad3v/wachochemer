# Wachochemer Entwicklungsprototyp

Aktueller Arbeitsbranch: `codex/responsive-day-week-planner`, PR-Ziel: `feat/ux-review-ferris-wheel-bring-flow`. Kein Merge oder Deployment nach main.

Die Oberfläche bietet eine grosse Tageskarte, eine kompakte Siebentageleiste und eine vollständige Wochenübersicht mit direkter Bearbeitung. Ohne gespeicherte Präferenz startet auf allen Breiten Tag; Woche bleibt sekundär. Der Umschalter speichert die Auswahl pro Breitenklasse. Ab 1100 px ergänzt eine Tageskarte die Wochenübersicht.

Menüs, Zmittag/Znacht, Rezeptsuche, Portionen, eigene Menüs, Resten, Wochenbeginn und Zutatenvorbereitung verwenden weiterhin lokale Daten. Die Rezeptübernahme aus dem Archiv zeigt ein editierbares Zieldatum und eine Mahlzeit. Ungeplante Tage enthalten keine Demo-Gerichte. Da im Datenstamm keine verifizierten Rezeptfotos vorliegen, erscheinen neutrale Platzhalter.

Lokal starten: `python3 -m http.server 8765`, dann `/prototype/` öffnen.

Prüfen: `node --test tests/*.test.mjs`, `node --check prototype/app.js`, `node scripts/build-recipe-index.mjs`. Optional mit separat verfügbarem Playwright und Chromium: `node scripts/check-responsive-planner-browser.cjs`. `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` und `PLANNER_SCREENSHOTS` können Pfade überschreiben. Keine neue Laufzeitabhängigkeit.

Details und offene echte iPhone-Abnahme: [Responsive Tages- und Wochenplanung](../docs/responsive-day-week-planner.md). Frühere 3D-Berichte dokumentieren ausschliesslich verworfene historische Entwicklungsstände.

V16 auf PR #10: optionale Bild-Demo mit `?imageDemo=1` oder über Iistellige. Anschliessend «Kürbissuppe mit Käsetoast» selbst in eine Mahlzeit einplanen; die Demo legt keine Menüs an. Beispielbild ist KI-generiert, kein tatsächliches Rezeptfoto. Details, Tests und fünf neue Screenshots: [V16](../docs/v16-ui.md). Browserprüfung: `BASE_URL=http://127.0.0.1:8765 node tests/v16-browser.mjs`.

V17 auf demselben PR: explizite Header-Ebenen, sekundärer Woche-Wechsel bei den Tagen, kompakteres Glass-Dock und einheitliche bildfüllende Archivkacheln. Prüfung: `node tests/v17-browser.mjs`. [V17-Sichtprüfung und offene echte iOS-PWA-Abnahme](../docs/v17-ui.md).
