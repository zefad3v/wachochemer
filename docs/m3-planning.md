# M3: Menüplanung, 3D-Revolver und Einkaufszeitraum

Status: **Implementiert als Entwurf in PR #4**, basiert auf M2 / PR #3. Automatisierte Tests und echte iPhone-Abnahme getrennt ausweisen. Kein Merge nach `main`.

## Bedienablauf für den Alltag

1. **Woche ansehen:** Im Wochenplan mit vertikalem Wischen, den Pfeilen oder den Tageskarten durch sieben Tage drehen. Die Karten bewegen sich auf einem geschlossenen räumlichen Ring, mit leicht nach links gedrehter Bildfläche. Zu Beginn sind die sieben Beispielbilder ausdrücklich mit **Demo · Menü plane** gekennzeichnet und zählen weder als gespeicherte Menüs noch als Einkauf.
2. **Tag erfassen:** Den gewünschten Tag anzeigen und das **Stift-Symbol** berühren. Für Znacht oder Zmittag ein vorhandenes Rezept, ein eigenes Menü, Resten oder einen leeren Tag wählen.
3. **Rezept erfassen:** Ein echtes Rezept aus dem Chochchischtli wählen, Portionen für die **tatsächlich zu kochende Menge** eingeben und speichern. Direkt aus einem Rezept lässt es sich über **I Wucheplan** in den gewählten Tag übernehmen.
4. **Spontane Abweichung:** Bei Auswärtsessen oder selbst gewählten Gerichten **Eigenes Menü** wählen. Für geplante Resten das Datum der ursprünglichen Mahlzeit angeben. Zum Streichen das Menü entfernen. Diese Änderungen bleiben beim Wochenwechsel und nach einem Reload erhalten.
5. **Einkaufen:** In der Iichaufslischte den Zeitraum **Vo / Bis** eingeben oder schnell die nächsten sieben Tage beziehungsweise die gerade angezeigte Planwoche auswählen. Der Einkaufszeitraum ist unabhängig davon, ob die Wochenansicht an einem Donnerstag, Montag oder Mittwoch beginnt. Ein Einkauf kann daher über Kalenderwochen hinweg gehen.
6. **Extras:** Windeln, Getränke oder andere zusätzliche Artikel manuell aufnehmen. Sie werden dem Anfangsdatum des aktuellen Einkaufszeitraums zugeordnet und tauchen nur in Zeiträumen auf, die dieses Datum enthalten. Checkboxes bleiben im lokalen Browser gespeichert.

## Fachliche Architektur

* `prototype/planner.mjs` enthält datumsschlüsselbasierte Datenmodelle und eine reine Aggregation der Rezeptzutaten für einen **inklusiven** Datumsbereich von 1 bis 60 Tagen.
* Plan: `{version:1, entries:{"YYYY-MM-DD|dinner":{type:"recipe",recipeId,servings}, ...}}`.
* Weitere Eintragsarten: `{type:"manual",title}` oder `{type:"leftover",sourceDate}`.
* Der gewählte Wochenanfang ist eine **reine Ansichtseinstellung** und verändert keine gespeicherten Menüs.
* `wachochemer:mealPlanV1`, `wachochemer:shoppingRange`, `wachochemer:shoppingExtras`, `wachochemer:shoppingChecked` sind lokale Browser-Speicherschlüssel. Keine Anmeldung und keine geräteübergreifende Synchronisation.
* Rezept-IDs und Zutaten stammen aus dem bestehenden M2/M1-Stamm. Rezeptkarten werden bei normalem Blättern nicht neu erzeugt, damit das Karussell nicht springt.
* `prototype/carousel.mjs` enthält die reine Ringgeometrie, die kontinuierliche Tagesrotation und die Wischschwelle. Die Darstellung verwendet CSS-3D ohne zusätzliche Laufzeitabhängigkeiten. Technische Details und Prüfstatus folgen unten.

## Mengen und Datenqualität

* Die Liste enthält **nur Zutaten aus tatsächlich eingetragenen Rezepten** innerhalb des Einkaufszeitraums. Eine manuelle Mahlzeit enthält keine strukturierten Rezeptzutaten. Diese Zutaten kann man als Extra hinzufügen.
* Gleiche Zutat und Einheit werden summiert. Optionale Zutaten sind vorerst nicht automatisch eingeschlossen.
* **Resten werden nicht erneut eingekauft.** Die nötige ursprüngliche Kochmenge muss der Nutzer aktuell selbst im Rezept des Vortags über die Portionszahl berücksichtigen. Automatische Familienportionen und Restenberechnung sind **M4**.
* Die Liste ist noch kein offizieller Bring!-Wochenexport. Einzelrezept-Links bleiben bestehen, Wochenexport ist **M6**.
* Manuelle Extras gelten als Einkaufszusatz ab Einkaufsbeginn. Es gibt noch keine Vorratshaltung, automatische Packungsgrössen, Ladenpreise oder Händleraktionen.

## Abnahme vor Merge

* M3- und UI-Tests bestanden, inklusive Monats- und Jahreswechsel, freien Einkaufsdaten, korrekter Zutatenaggregation und Resten ohne Doppelzählung.
* **Echter iPhone-Test offen:** schnell vor/zurück wischen, sieben Karten sichtbar, 3D-Linksdrehung und stabile Position ohne Sprung. Safari und installierte Homebildschirm-App prüfen.
* Realen Menüeintrag für Zmittag und Znacht anlegen, wechseln, ändern, entfernen und nach Reload überprüfen.
* Einkauf von Mittwoch bis Dienstag sowie von einer Planwoche in die folgende prüfen; Zusatzartikel dürfen nicht auf eine andere Einkaufsperiode übertragen werden.
* PR #1 und PR #3 bleiben unabhängig reviewpflichtig. PR #4 wird nicht eigenständig nach `main` gemergt.

## Nächste Fachpakete

* **M4:** Haushaltsportionen für Erwachsene/Kinder und exakte Restenbedarfe, insbesondere Montag bis Donnerstag Abendessen für den Folgetag. Portionsanteile pro Rezept überschreibbar.
* **M5:** Manuelle Mengenkorrekturen, Vorrat und optionale Zutaten, Einheitenumrechnung und längerfristige Einkaufslistenverwaltung.
* **M6:** Bring!-Wochenimport nur bei nachgewiesener technischer Unterstützung.
* **M7:** echte installierbare PWA, Icon und Update-/Cache-Verhalten.

## Radiales 3D-Karussell und Layer-Fix, 8. November 2026

### Ausgangspunkt und Umfang

Arbeitsbranch `codex/3d-radial-carousel-fix`, Basis und PR-Ziel ausschliesslich `feat/m3-meal-planner-carousel-shopping-dates`. Dessen Stand entsprach beim Beginn dem Referenzcommit `78ce37d11e2669876fccc2de10d0a2ab307b3c67`; keine neueren Änderungen mussten übernommen werden. PR #1 → #3 → #4 wurde als bestehende Branch-Kette berücksichtigt. Keine Änderungen an Rezeptdaten, Hosting oder `main`.

`AGENTS.md` und `docs/ki-roadmap.md` fehlen auf dieser Basis. Die vorhandene `docs/roadmap.md` wurde gelesen und bleibt unverändert, da dieser Auftrag kein weiteres Fachpaket abschliesst. Im Auftragsanhang waren keine Bilder enthalten. Die Produktansicht von [Circular 3D Carousel / FWDesign](https://codecanyon.net/item/circular-3d-carousel/58521282) diente der visuellen Orientierung; kein fremder Quellcode und keine Bibliothek wurden übernommen.

### Geometrie und Animation

* Sieben feste Plätze mit Winkelabstand `360° / 7`. `rotateY(i * Winkel) translateZ(R) rotateY(-i * Winkel)` definiert die Kreispositionen in X/Z. Keine vertikale Kartenstapelung.
* Der gemeinsame `.wheel-ring` dreht um die Y-Achse. Eine Neigung um -38° macht die hintere Ringhälfte oberhalb der Vorderkarte sichtbar. Ein konstanter Y-/Z-Versatz zentriert den vordersten Punkt. Der Radius ist `min(290px, Breite * .35, Höhe * .23)` und berücksichtigt damit auch kleine Viewports.
* Gegenrotationen auf den Karten gleichen Ringdrehung und Neigung aus; die Bildflächen behalten eine leichte Linksdrehung von -11°. Die aktive Karte hat Skalierung 1, die anderen .62. Konturradius und Rahmenstärke werden um die lokale Skalierung kompensiert; die perspektivische Verkleinerung bleibt sichtbar.
* Der Rotationszähler läuft über mehrere Umdrehungen weiter. Am Übergang 6 → 0 wird der Winkel nicht auf null zurückgesetzt. Direkte Kartenauswahl nimmt den kürzeren Weg. Gleiche Transformationsreihenfolge und identische 550-ms-Kurven halten Ring und Gegenrotation synchron, auch bei unterbrochener Animation.
* Tageswechsel verändern ausschliesslich Transform, Klasse, ARIA und Sichtbarkeit. Die sieben Karten behalten ihre DOM-Identität. Ein Neubau erfolgt bei geändertem Datumsbereich oder geänderten Plandaten; `.wheel-initial` unterdrückt dabei eine Animation aus der Standardposition.

### Ebenen und Trefferflächen

`wheel-shell` (Perspektive) → `wheel` → `wheel-ring` (beide `preserve-3d`) → sieben `recipe-card` → jeweils eine flache, abgerundete `card-face`.

* Keine gruppierende Opazität, Filter, Isolation oder Clipping auf den inneren 3D-Vorfahren. Der äussere Wochenbereich begrenzt die gesamte Darstellung; nur die einzelne Bildfläche beschneidet Bild, Text und Verlauf an der Kartenkontur.
* Alle Karten sind vollständig deckend. Der grosse Textblock der sechs inaktiven Karten ist über `hidden` und `display:none` entfernt. Nur die aktive Fläche besitzt einen dunklen Verlauf. Dadurch gibt es keine durchscheinenden Nachbartitel und keine vervielfachten Textverläufe.
* `backface-visibility:hidden` verhindert Rückseiten; Hintergründe und Platzhalter bleiben deckend. Bildfilter wurden entfernt. Der unscharfe App-Hintergrund bleibt ausserhalb des Rings.
* Transparente Ringcontainer nehmen keine Zeigerereignisse an; die Buttons bleiben bedienbar. Die Kartenfläche selbst reicht Ereignisse an ihren Button durch. Ein zusätzlicher Ebenenrang 1 auf der aktiven Karte gleicht die native Trefferreihenfolge an ihre tatsächliche vorderste Geometrie an. Ohne diese Ergänzung traf Chrome auf Desktop teilweise einen hinteren Button durch die sichtbar aktive Karte hindurch. Die räumliche Anordnung wird weiterhin vollständig durch die Ringgeometrie bestimmt.

### Touchsteuerung und behobene Interaktionsfehler

Die bestehende Touch-Event-Steuerung bleibt erhalten und sitzt auf `wheel-shell`, damit auch freie Flächen zwischen den Karten reagieren. `touch-action:pan-x pinch-zoom` reserviert vertikale Gesten für das Karussell und erlaubt weiterhin horizontale Browsergesten und Pinch-Zoom. Ein nicht passiver `touchmove` verhindert bei abbrechbaren vertikalen Bewegungen ab 7 px das native Scrollen. `touchend` wählt bei mehr als 35 px und überwiegend vertikaler Bewegung genau einen nächsten oder vorherigen Tag.

Mehrfingergesten und `touchcancel` brechen die Auswahl ab. Bewegungen ohne Tagwechsel unterdrücken ebenfalls den nachfolgenden synthetischen Klick, damit ein kleiner Drag nicht versehentlich den Editor öffnet. Schnelle Swipes werden während einer Animation angenommen. Mausrad hat weiterhin eine 400-ms-Sperre gegen Trackpad-Nachlauf; Nullbewegungen und Ctrl-Mausrad für Zoom wechseln keinen Tag. Pfeiltasten bleiben erhalten, greifen aber nicht mehr in geöffneten Menüeditoren oder Eingabefeldern. `prefers-reduced-motion` schaltet Ring- und Kartenübergänge aus.

### Durchgeführte Prüfungen

* `node --check prototype/app.js`, `prototype/carousel.mjs` und `scripts/check-carousel-browser.cjs`: erfolgreich.
* `node --test tests/*.test.mjs`: **30/30 bestanden**, darunter fünf neue Geometrie-/Interaktionstests sowie die bisherigen Archiv-, Menüplanungs- und Einkaufsprüfungen.
* `node scripts/build-recipe-index.mjs` und Vergleich zum versionierten Rezeptverzeichnis: erfolgreich, keine inhaltliche Änderung. Produktiver Seitengenerator und Rezeptdaten wurden nicht geändert.
* Optionaler Browserlauf: **14/14 Szenarien bestanden** mit Chrome 157.0.8103.38. `scripts/check-carousel-browser.cjs` verwendet separat vorhandenes Playwright und einen lokalen HTTP-Server. Das Skript benötigt keine neue Abhängigkeit in der Anwendung. Aufruf: `node scripts/check-carousel-browser.cjs`; bei extern installiertem Paket `PLAYWRIGHT_MODULE` setzen. `CAROUSEL_SCREENSHOTS` bestimmt den Ausgabeordner, sonst wird ein temporärer OS-Ordner verwendet.
* Mobile Chrome-Emulation: 393×852, zusätzlich 320×568, 390×664 und 430×932; Desktop-Layout 1440×1000. Screenshots für Start, nächsten Tag, schnelle Rotationen, Menüeditor, kleinen Bildschirm und Desktop. Das ist ausdrücklich **keine iPhone-Safari-Abnahme**.
* Browserfälle prüfen echte über das Chrome-Protokoll eingespeiste Touch-Ereignisse, Auf-/Abbewegung, 14 schnelle Vorwärtsgesten, Abbruch bei Mehrfingergesten, kein Seitenscrollen, Nachbarkarte antippen, Woche wechseln, Rundlauf, stabile DOM-Karten und genau einen sichtbaren Textlayer. Zusätzlich Menüs bearbeiten und nach Reload wiederherstellen, echte Rezeptdetails öffnen, aus dem Archiv planen, unabhängige Einkaufsdaten, Zusatzartikel, Resten entfernen, keine Demo-Zutaten, Mausrad, Tastatur und reduzierte Bewegung.

### Grenzen und offene manuelle Abnahme

* Auf einem echten iPhone in Safari **und** als Homebildschirm-Web-App prüfen: Statusleiste/Dynamic Island, obere und untere Safe Areas, wechselnde Safari-Werkzeugleisten, schnelle Richtungswechsel, Tippen unmittelbar nach einer Geste, Pinch-Zoom und Wischen am Bildrand.
* Alle sieben Tage mehrfach umrunden; aktive Karte und sichtbare Nachbarn auf korrektes Überdecken, Rundungen, Lesbarkeit und Trefferflächen prüfen. Je nach Bildschirm verdeckt die grosse Vorderkarte Teile der hinteren Karten; die sieben Positionen bleiben immer im Ring.
* Menü für Zmittag/Znacht bearbeiten, Portionszahl ändern, Reload und lokalen Einkauf auf demselben Gerät bestätigen. Lokaler Speicher bleibt geräte- und ursprungsgebunden; eine neue Vorschau-URL übernimmt keine Daten von einem anderen Host.
* Keine WebGL-Biegung oder Shader-Effekte der kommerziellen Referenz; die Karten bleiben flache CSS-Bildflächen. Externe Unsplash-Demobilder bleiben wie bisher vorläufig.
* Reales iOS-Rendering, Safe-Area-Werte und Homebildschirm-Verhalten wurden hier nicht ausgeführt. Kein Merge und keine Veröffentlichung der öffentlichen Webseite.
