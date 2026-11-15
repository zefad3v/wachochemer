# V15 / Issue #9 – UI-Abnahme

Umfang: M0/UI-Stabilisierung auf Basis von V14/PR #8, kein neues Fachpaket und keine Änderung am Planformat.

- `prototype/app.js`: entfernten `edit-day`-Listener beseitigt; Karte öffnet immer Datum und angezeigte Mahlzeit im Editor. Touchbewegungen unterdrücken nachfolgende Kartentaps. Archivdetails und Planübernahme bleiben erreichbar. Heute und Auswahl sind getrennt, auch über Wochen-/Jahresgrenzen. Manuelle Mahlzeitwahl gilt in der Sitzung bis zum lokalen Tageswechsel; ohne Wahl vor 14 Uhr Zmittag, danach Znacht.
- `prototype/styles.css`: integrierte Mahlzeitsteuerung mit reserviertem Titelraum, sichtbarer Glass-Kontur, Blur/Saturation, WebKit-Unterstützung und dunklem Fallback bei fehlender Blur-Unterstützung oder reduzierter Transparenz. Kompakter Header berücksichtigt Safe Areas; Seiten und Editor bleiben scrollbar.
- Suchresultate bleiben sofortige Textzeilen. Bilder erhalten 52 × 52 Pixel, lazy loading und async decoding; ohne Foto erscheint ein neutraler gleich grosser Platzhalter. Es gibt weiterhin keine verifizierten Fotos im Archiv. Der Foto-Test injiziert ausschliesslich eine Testgrafik, keine Rezeptdaten.
- Menüplanung, Portionen, Resten, Favoriten, Einkaufszeitraum und Bring!-Vorbereitung bleiben im bestehenden Datenmodell. Keine Migration, kein Backend, kein Hostingwechsel.

## Automatisiert geprüft

- `node --check` für App, Katalog, Planner, responsive Planner und beide Build-Skripte.
- `node --test tests/*.test.mjs`: bestanden. Zusätzlich `node --test --test-isolation=none tests/*.test.mjs` für die vollständige Einzeltestzählung: 35 Tests bestanden.
- `node scripts/build-recipe-index.mjs`: 3 Rezepte; Index unverändert. Die Archivtests validieren die kanonischen Rezept-/Zutatendaten.
- `node scripts/build.mjs`: erfolgreich. Generatorausgaben ausserhalb des V15-Umfangs wurden nicht übernommen; die bestehende Startseite bleibt erhalten.
- `node tests/v15-browser.mjs`: 9 Chromium-Prüfungen bestanden. Voraussetzungen: Playwright, Chromium (`CHROMIUM_PATH` optional), lokaler Server auf Port 8000 (`BASE_URL` optional). Beispiel: `python -m http.server 8000` in separatem Terminal.
- Browserumfang: Initialisierung ohne Bearbeiten-Button, Vor-/Nach-14-Uhr-Standard, lokaler Kalender statt UTC, Heute/Auswahl über Jahres-/Wochengrenze, Kartentap bei gespeichertem Rezept, Portionen nach Reload, Wischen ohne Editortap, manuelle Wahl und Mitternachtsreset, 390 × 844 / 844 × 390 / 320 × 568 ohne horizontalen Überlauf oder Titel-/Reglerüberdeckung, Suchfokus mit stabiler Headerposition, Suchthumb/Fallback und Archivdetails. Keine JS-Laufzeitfehler im Hauptablauf.

## Manuell offen / Risiken

Kein echter iOS-Safari-Test durchgeführt. Auf einem iPhone in Safari und als Homebildschirm-App prüfen: Dynamic Island/Safe Areas, native Bildschirmtastatur beim Suchen, Rotation mit offener Tastatur, grosse Systemschrift, echte Touchgesten und Zurückkehren nach Mitternacht. Chromium-Fokusprüfung ersetzt die native iOS-Tastatur nicht. Auch das visuelle Safari-Blur-Fallback ist noch manuell zu prüfen. Bring!-Import bleibt separat zu validieren, ohne neue API-Versprechen.

Kein Merge und kein Deployment. Rollback: V15-Änderungscommit rückgängig machen; gespeicherte Pläne bleiben kompatibel. Nächstes Fachpaket: M4 nach iPhone-Abnahme.
