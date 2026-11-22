# V16 – Rezeptbilder und sichtbares Glas

> Historischer Entwicklungsbericht. Aktueller Betriebsstand vom 22. November 2026 siehe [Produktiver Alpha-Betrieb](production.md) und [Roadmap](roadmap.md). Die nachfolgenden Angaben und Messwerte beziehen sich auf den damaligen Entwicklungsstand.

Umfang: M0/UI-Abnahme, gezielte Fortsetzung von PR #10 / V15. Basis: `3ba7711b07d4a8b5492c012d810cbc26d97967ae`. Kein neues Fachpaket, keine Planmigration, kein Merge, kein Deployment.

## Umsetzung

- Mobiler Seitentitel steht jetzt direkt im Header, mit symmetrischen 44px-Spalten und Zahnrad rechts. Die zuvor getrennten Header-/Titelzeilen entfallen. Safe-Area-Inset oben bleibt berücksichtigt. Normaler Dokumentfluss, keine Skalierung, Animation, Filter oder Transformation auf Header/SVG. Auf kleinen Displays kein sticky/fixed Header, somit kein eigener scrollender Blur-Layer für Titel und Zahnrad. Safari/Homebildschirm-Abnahme bleibt offen.
- Zmittag/Znacht: nur Text und kleine Punkte, transparente 44px-Touchflächen, kein Segmenthintergrund. Editor-Tap und horizontales Wischen unverändert. Intrinsische Kartenhöhe mit reserviertem unteren Bedienraum lässt lange Texte die Karte vergrössern.
- Glas: Hintergrund-Pseudoelemente mit 24px Blur/165% Sättigung, transparenten Tönungen, Lichtkontur und Schatten. Jedes Element hat einen eigenen Positionierungsrahmen; Text und SVG liegen davor. Grüne und warme Hintergrund-Lichtfelder geben den transparenten Materialien sichtbar unterschiedliche Tönungen. WebKit-Präfix und Fallback für fehlendes Blur/reduzierte Transparenz vorhanden. Web-Annäherung, keine Nachbildung des nativen Apple-Renderers.
- In der iPhone-Queransicht wandert die Navigation in die breite Kopfzeile. Die redundante Tagesleiste entfällt dort in der Wochenansicht; Tage bleiben direkt über die Wochenzeilen auswählbar. Zeilen bleiben scrollbar erreichbar.
- Repository geprüft: vor V16 nur Screenshots, keine verifizierten Rezeptfotos. Neues generiertes KI-Beispielbild (168 KB WebP) ist ausdrücklich als **Bild-Demo** markiert, standardmässig aus. Einschalten mit `?imageDemo=1` oder in den Einstellungen. Kein automatisch angelegtes Menü. Für die Bildprüfung das reale Rezept «Kürbissuppe mit Käsetoast» im Editor wählen. Das Bild dokumentiert dieses Rezept nicht. Herkunft und Austauschweg: [Demo-Dateien](../prototype/assets/demo/README.md).
- `recipe-images.mjs` trennt geprüfte Fotozuordnungen und Demo-Fixtures; eigene Bilder haben Vorrang. Keine Änderung an kanonischen Rezeptdaten, Mengen, lokalen Speicherschlüsseln, Favoriten, Resten oder Bring!-Vorbereitung.
- Live-Suche bleibt eine unmittelbare kompakte Liste: 52px Thumbnails, feste Dimensionen, lazy/async, neutraler Fallback. Demo-Kennzeichnung auch in Suche, Archiv, Details und Wochenübersicht.

## Nachweise

- `node --test tests/*.test.mjs`: 7 Testdateien bestanden; `--test-isolation=none`: 38/38 Einzeltests bestanden.
- Syntaxprüfung für App, Bildmodul und beide Generatoren bestanden.
- `node scripts/build-recipe-index.mjs`: 3 Rezepte, Index unverändert.
- `node scripts/build.mjs`: erfolgreich. Ausgaben ausserhalb des Prototypumfangs zurückgesetzt, produktive Startseite unverändert.
- `BASE_URL=http://127.0.0.1:8765 node tests/v15-browser.mjs`: 9/9 Chromium-Prüfungen, einschliesslich Persistenz/Portionen, Wischen, lokaler Uhrzeit, Mitternacht, Heute/Auswahl und Suche. Prüfung liest Blur nun auf der Hintergrundebene.
- `node tests/v16-browser.mjs`: 12/12 zusätzliche Chromium-Prüfungen. Sichtbare Bildkennzeichnung, geladene Bilddaten, getrennte Schärfe-/Glasebenen, transparente 44px-Mahlzeit-Touchflächen, heute nach Reload, Suche mit Bild/Details, neutraler Normalmodus, 320/390/430px ohne horizontalen Überlauf, grosse simulierte Schrift ohne Titel-/Reglerüberdeckung. Bei 390×844 passt die Tagesansicht vollständig ohne Scrollen oberhalb der Navigation.
- `git diff --check`: bestanden.

Fünf neue Screenshots wurden erzeugt, tatsächlich visuell gelesen und nach Korrekturen erneut erstellt:

1. [iPhone, geplantes Rezept mit Demo-Bild](screenshots/v16/01-iphone-planned-image.png)
2. [iPhone, ungeplante Mahlzeit](screenshots/v16/02-iphone-unplanned.png)
3. [iPhone, Znacht ausgewählt](screenshots/v16/03-iphone-dinner.png)
4. [Querformat, Wochenansicht](screenshots/v16/04-landscape-week.png)
5. [iPhone, Live-Suche mit Bildresultat](screenshots/v16/05-iphone-search.png)

Die Aufnahmen stammen aus Chromium (390×844 / 844×390), keine echten iPhone-Screenshots. Die Queransicht zeigt bewusst die ganze scrollbare Seite. Bei der visuellen Prüfung wurden ein zu knapper Kartenabstand, ein fehlender Begrenzungsrahmen einer Glasfläche und die platzraubende untere Querformat-Navigation korrigiert. Der Versuch, zusätzlich Shared Chrome zu öffnen, scheiterte an der CUA-Initialisierung («Browser Use could not read requirements»); Headless Chromium und Screenshots funktionierten.

## Offen auf echtem iPhone

- Safari und Homebildschirm-App: Dynamic Island/Safe Areas, Browserleisten beim Ziehen, Schärfe von Titel/Zahnrad und tatsächliche Glaswirkung/Fallback.
- Native Suchtastatur, Rotation mit Tastatur, Dynamic Type/Textzoom und lange eigene Menütitel.
- Echte horizontale Touchgesten, Rückkehr nach Mitternacht, Bring!-Einzelimport separat.

Keine Offline-/Installationsgarantie; bestehende PWA-Metadaten sind keine abgeschlossene M7-Implementierung. Restliche Rezepte haben weiterhin keine eigenen Fotos. Rollback durch Revert des V16-Commits, gespeicherte Pläne bleiben kompatibel. Nächstes Fachpaket: M4 nach iPhone-Abnahme.
