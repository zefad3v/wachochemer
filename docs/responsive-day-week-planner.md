# V13: Responsive Tages- und Wochenplanung

> Historischer Entwicklungsbericht. Aktueller Betriebsstand vom 22. November 2026 siehe [Produktiver Alpha-Betrieb](production.md) und [Roadmap](roadmap.md). Die nachfolgenden Angaben und Messwerte beziehen sich auf den damaligen Entwicklungsstand.

## Basis und Bestandsaufnahme

Ausgangsbranch und PR-Ziel: `feat/ux-review-ferris-wheel-bring-flow`. Bei Arbeitsbeginn am 14. November 2026 war dessen neuester Stand unverändert `3d40f77235bc2648ce053916fe8a2819215a304f`. Arbeitsbranch: `codex/responsive-day-week-planner`. Keine Änderung an main, veröffentlichten Seiten oder Rezeptdaten, kein Deployment und kein Merge.

`AGENTS.md` und `docs/ki-roadmap.md` fehlten auf der Basis. Architektur, M3-Planung, UX-Review, bestehende Oberfläche, Katalog-/Planmodelle und Tests wurden gelesen. Die KI-Roadmap wird mit dieser Änderung angelegt. Frühere 3D-Berichte bleiben historische Nachweise.

Vor dem Umbau festgehalten:

* Erhalten: datumsbasierte Einträge, Zmittag/Znacht, durchsuchbare Rezeptauswahl, eigene Menüs, Resten, Portionen, explizites Zieldatum, Entfernen, lokale Speicherung und Wiederherstellung, Wochenbeginn, Archiv, freie Einkaufsperiode, Zutatenaggregation und Extras/Kopieren.
* Entfernen: Ring-/Riesenradgeometrie, Perspektive, Kartenrotation, Gegenrotation, Tiefenstaffelung, Rotationszähler, vertikale Touch- und Mausradsteuerung, Drehpfeile, Fortschrittsrail und karussellspezifische Tests.

## Bedienkonzept

Gemeinsamer Header mit Zahnrad und gemeinsame Symbolnavigation für Wucheplan, Chochchischtli und Einkauf für Bring!. Auf breiten Displays liegt dieselbe Navigationsleiste im freien mittleren Headerbereich, auf Mobilgeräten unten mit Safe-Area-Abstand. Der Plan zeigt Titel, Wochenwechsel, Tag/Woche-Umschalter und sieben kompakte direkt anwählbare Tagesfelder. Tagesnummer, Wochentagskürzel, Planungspunkt und ausgewählter Tag sind erkennbar. Der Familienstandard für den Wochenbeginn bleibt Donnerstag und lässt sich in den Einstellungen ändern.

Die Tagesansicht enthält eine grosse hochformatige Karte mit Datum, Rezept-/Menütitel, Zeit und Portionen bei Rezepten. Eigene Menüs, Resten und ungeplante Tage werden benannt. Beide Mahlzeiten erscheinen zusätzlich unter der Karte. Bei zwei Einträgen bevorzugt die Hauptkarte Znacht, sonst Zmittag. Ein Rezept öffnet beim Antippen Details; ungeplante/eigene Einträge öffnen den Editor. Die primäre Aktion «Menü bearbeiten» bleibt immer verfügbar.

Horizontales Wischen über die Karte wechselt zum benachbarten Datum, einschliesslich vorheriger/nächster Planwoche. Die Schwelle beträgt über 40 px und die horizontale Bewegung muss mindestens 1,3-mal so gross wie die vertikale sein. Vertikales Scrollen und Pinch-Zoom bleiben Browseraufgaben; Mehrfingergesten/Abbruch lösen keine Tagesauswahl aus. Links-/Rechtspfeiltasten funktionieren ausserhalb von Dialogen und Eingaben.

Die Wochenansicht zeigt alle sieben Tageszeilen mit Datum, Bild/Platzhalter, beiden Mahlzeiten, Portionen und direkter Bearbeitungsaktion. Änderungen erscheinen beim Speichern sofort in beiden Ansichten. Alle Tage bleiben durch vertikales Scrollen erreichbar, ohne horizontales Seitenscrollen. Ab 680 px gibt es ein zweispaltiges Raster; ab 1100 px steht daneben zusätzlich die ausgewählte Tageskarte.

## Breiten und manuelle Auswahl

| Viewportbreite in CSS-Pixeln | Klasse | Standard |
| --- | --- | --- |
| unter 680 px | compact | Tag |
| ab 680 px | wide | Woche |
| ab 1100 px | weiterhin wide | zusätzliche Tagesdetails neben der Wochenübersicht |

Die tatsächliche Layoutbreite entscheidet, keine Orientierungserkennung. Übliche iPhones im Hochformat starten in Tag, im Querformat in Woche; kleine Querformatfenster unter 680 px bleiben bewusst in Tag. Tablets richten sich ebenso nach verfügbarer Breite. Tastaturbedingte Höhenänderungen ändern die Klasse nicht.

`wachochemer:plannerViews` speichert eine optionale manuelle Auswahl je Klasse, beispielsweise `{compact:"week",wide:"day"}`. Nur ein bewusster Druck auf Tag/Woche schreibt diese Präferenz. Normales Rendering und Tagesauswahl überschreiben sie nicht. Bei Klassenwechsel gilt die dort gespeicherte Auswahl, andernfalls der Standard. Tag, angezeigte Woche und offene Editorfelder bleiben bei Resize/Rotation erhalten. Es gibt keine Neuinitialisierung oder Reload.

Menüs bleiben unverändert unter `wachochemer:mealPlanV1` mit Schlüsseln `YYYY-MM-DD|lunch` bzw. `|dinner`. Wochenbeginn, Favoriten, Rezeptportionen, Einkaufszeitraum und Extras verwenden ihre vorhandenen Speicherschlüssel. Tag/Wochenauswahl sind Sitzungszustand; Menüeinträge und Ansichtspräferenzen überleben Reload. Lokale Speicherung ist weiterhin browser- und ursprungsgebunden.

## Menüeditor, Archiv und Einkauf

Die suchbare Rezeptliste ersetzt weiterhin ein natives Rezeptdropdown. Der Dialogtitel erhält initial den Fokus, kein Such-/Textfeld. Datum, Mahlzeit und Portionen sind vor dem Speichern sichtbar und änderbar. Bei «I Wucheplan» aus dem Archiv bleiben das gewählte Rezept und die Rezeptportionen auch beim Wechsel der Zielmahlzeit erhalten. Datum ändern plant bewusst für dieses Ziel, ohne den ursprünglichen Tag stillschweigend zu verändern.

Rezept, eigenes Menü, Resten und ungeplant/Entfernen bleiben verfügbar. Bei Speicherfehlern wird kein erfolgreicher Abschluss behauptet. Der bestehende Restenhinweis bleibt: Portionsbedarf muss an der ursprünglichen Mahlzeit berücksichtigt werden, Resten kaufen keine Zutaten ein zweites Mal.

Das Archiv hat vor und nach der Suche dieselbe Kartendarstellung. Header und Seiten verwenden normalen Dokumentfluss; Suchergebnisse können nicht durch automatische vertikale Zentrierung springen. Editor und Rezeptdetails sind scrollbar, 16-px-Eingaben und Safe-Area-Abstände berücksichtigen mobile Bedienung.

Einkaufsdaten bleiben unabhängig von Planwochen, inklusiv und wie bisher auf 1–60 Tage begrenzt. Zeitraum über mehrere Kalenderwochen, tatsächlich geplante Rezeptzutaten, Extras und Kopieren sind erhalten. Mobile Datumsfelder stehen untereinander und sind auf die Containerbreite begrenzt. Keine neue Checklistenfunktion, kein behaupteter automatischer Bring!-Wochenimport.

## Entfernte 3D-Funktionen und Bilddaten

`prototype/carousel.mjs`, dessen Geometrietests und das alte Browserprüfskript wurden entfernt und durch `responsive-planner.mjs` sowie entsprechende Tests ersetzt. Aktive HTML-/CSS-/JS-Oberflächen enthalten keine räumlichen Transformationen, Perspektivberechnungen, Ringzustände oder vertikale Karussellhandler mehr. Angesammelte CSS-Overrides wurden durch flache Layoutregeln ersetzt. CI prüft das neue Modul statt der gelöschten Datei.

Die bisherigen ungeplanten Demo-Gerichte und externen Designfotos wurden entfernt. Der Rezeptstamm enthält keine verifiziert zugeordneten Rezeptfotos; daher erscheinen momentan überall neutrale Platzhalter. Beide Ansichten unterstützen vorhandene verifizierte Bilder über denselben Archivadapter. Es wurden keine Fotos oder Rezeptinhalte erfunden.

## Prüfungen

* `node --test tests/*.test.mjs`: alle vier Testdateien bestanden. Zusätzlich einzeln ausgeführt: **26 Tests bestanden** (9 Archiv, 6 Planmodell/Einkauf, 4 responsive Logik, 7 statische UI-Regressionen).
* Syntax: `app.js`, `catalog.mjs`, `planner.mjs`, `responsive-planner.mjs`, beide Build-Skripte und neues Browserprüfskript erfolgreich.
* `node scripts/build-recipe-index.mjs`: drei kanonische Rezepte validiert, kein Unterschied am versionierten Verzeichnis. `git diff --check` erfolgreich. Der produktive Seitengenerator wurde nicht ausgeführt.
* Tatsächliche Browserprüfungen: lokales Chromium mit separat vorhandenem Playwright. Tagesauswahl, Touch über Chromium-Protokoll, beide Wochengrenzen, responsive Standards, offener Editor bei Breitenwechsel, manuelle Auswahl und Reload, unveränderte Menüs, direkte Wochenbearbeitung, Rezeptdetails, Archivsuche und explizite Zielmahlzeit/Portionen, Resten und Entfernen, mehrwöchige Einkaufsdaten, Extras und beide Einstellungsrückwege.
* Überlaufprüfung der drei Hauptbereiche bei 320, 393, 679, 680, 852, 1100 und 1440 px. Keine JS-Laufzeitfehler. Screenshots für mobile Tagesansicht, Querformat-Woche und Desktop-Woche liegen unter `docs/screenshots/responsive-planner/` und enthalten ausschliesslich Testmenüs.
* Statische DOM-/CSS-Tests sind getrennte Strukturprüfungen; sie belegen kein iOS-Rendering. Chromium-Touch ist ebenfalls kein realer iPhone-Test.

## Offene iPhone-Abnahme und Einschränkungen

Auf echtem iPhone in Safari **und** als Homebildschirm-Web-App prüfen: Dynamic Island, Safe Areas, Home Indicator, wechselnde Safari-Adressleiste, Hoch-/Querformatwechsel mit offenem Menüeditor, Tastatur bei Rezeptsuche, Datumseingaben, Dialogscrollen, schnelle horizontale Richtungswechsel und Pinch-Zoom. Navigation darf nach Scrollen keine Aktion unerreichbar machen. Suche mit sichtbarer Tastatur auf Sprünge prüfen. Diese Abnahme wurde hier **nicht** durchgeführt; Safari-Bedienoberfläche lässt sich nicht durch CSS gestalten.

Keine geräteübergreifende Synchronisierung, Offline-/PWA-Cache-Garantie, automatische Restenportionen oder bestätigte Bring!-Gesamtintegration. Redaktionelle Rezeptfotos sind ein separates Arbeitspaket. Die lokale Vorschau erhält keine gespeicherten Daten anderer Domains.
