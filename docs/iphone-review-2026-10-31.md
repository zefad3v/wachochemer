# iPhone-Review vom 31.10.2026, M2 und Prototyp

**Quelle:** Fünf echte iPhone-Screenshots aus dem Rezeptarchiv, Rezeptdialog, der Demoeinkaufsliste und der installierten Homebildschirm-Web-App.

Status: CSS- und Dialogkorrekturen im M2-Entwicklungsbranch implementiert. Automatisierte Strukturtests vorgesehen. **Visuelle Abnahme auf dem echten iPhone bleibt offen.** Weder PR #1 noch PR #3 automatisch mergen.

## Fehler und Änderungen

| Referenz | Beobachtung | Korrektur | Abnahme |
|---|---|---|---|
| B1/B2 | Schon nach der zweiten Eingabe in die Rezeptsuche springt der komplette Header nach unten oder oben. | Die aktive Nicht-Wochenplan-Seite darf im vertikalen Flex-Layout nicht durch `margin:auto` zentriert werden. Auf `margin:0 auto` und `align-self:stretch` festgelegt. | Suche mit 0, 1, 2 und mehreren Treffern bei geöffneter iOS-Tastatur prüfen: Titel und Suchfeld müssen an ihrer Position bleiben. |
| B3 | Beim Öffnen des Dialogs erhält die Zurück-Schaltfläche automatisch den sichtbaren Tastaturfokus. | Rezepttitel programmgesteuert fokussieren (`tabindex="-1"`, `focus({preventScroll:true})`), statt den ersten Button fokussieren zu lassen. | Dialog aus Rezeptsuche und Wochenplan öffnen. Keine Hervorhebung am Zurück-Button, sinnvolle VoiceOver-/Tastaturnavigation. |
| B4 | Zahnrad erscheint direkt neben dem Markennamen statt am rechten oberen Rand. | Die mobile Kopfleiste bekommt `width:100%` und Safe-Area-Padding. Zahnrad erhält 44×44-Pixel-Trefferfläche und absolute Verankerung rechts oben. | Safari und Homebildschirm-App: Zahnrad sichtbar am rechten oberen Rand, nicht hinter Statusanzeigen. |
| B4 | Grosses Infofeld behauptet, Bring! sei schon integriert; im Wochenplan ist ein Gesamtimport noch nicht umgesetzt. | Infofeld in der Demoeinkaufsliste entfernt. Der verbleibende Demo-Hinweis bleibt transparent, Bring! wird nur für bestehende veröffentlichte Einzelrezepte verlinkt. | Einkaufsliste hat kein grosses Bring!-Banner. Kein Versprechen eines Wochenimports. |
| B5 oben | Installierte App schneidet erste Kopfzeile ab bzw. lässt Titel in die iPhone-Statusleiste laufen. | Höhe und oberes Padding der mobilen Topbar um `env(safe-area-inset-top)` ergänzen. | App vom Homebildschirm starten; Marke, Zahnrad, Titel und Wochensteuerung vollständig sichtbar. |
| B5 unten | Der verschwommene Bildhintergrund endet abrupt, darunter bleibt ein unpassendes dunkles Band. | Bildhintergrund als festen Layer direkt unter `#app` und nicht im beschnittenen Wochenplan platzieren. So bleibt das Bild bis zum unteren Viewport hinter der Navigation. | Standalone auf iPhone mit Home Indicator prüfen. Kein harter Farbbruch am unteren Ende. |

### Grenzen

* Die native Safari-URL-Leiste bleibt ausserhalb der Kontrolle des Webseiten-CSS. Verbesserungen im Standalone-Modus garantieren nicht dieselbe Darstellung im Browser.
* Automatisierte Tests prüfen CSS-/DOM-Verträge und JavaScript-Syntax, nicht echtes Safari-Rendering, Safe-Area-Insets oder die iOS-Tastatur. Die Screenshots ersetzen keinen Retest nach der Änderung.
* Das visuelle Redesign (Design, Rezeptbilder, Farbwahl) ist nicht Bestandteil dieser Fehlerkorrektur.

## Produktentscheidungen für spätere Pakete

### Kochmodus, eigenes vertikales Paket nach M3/M4

**Empfehlung:** Rezeptdetails bleiben lesbar und vollständig. Ein separat aktivierbarer Kochmodus zeigt je einen Zubereitungsschritt mit grosser Schrift, klarer Navigation vor/zurück und zugänglichen Bedienelementen. Zutatenliste und eingestellte Portionen bleiben erreichbar. Erst nach echtem iPhone-Test optional Bildschirmsperre während des Kochens verhindern. Keine automatisch laufenden Timer oder weitere Ablenkungen ohne Nutzernutzen.

### Portionen, im Paket M4 fachlich klären

* Der bestehende Picker mit ganzen Werten von 1 bis 16 bleibt für M2 erhalten. Er definiert **Rezept-Portionen**, nicht automatisch Erwachsene oder Kinder.
* **Vorschlag für M4:** zwischen Schrittweite 1 und ½ Portion umschalten oder eine explizite Eingabe von z. B. 2,5 Portionen erlauben. Die Grundmenge und Ausgangsportionen der Rezepte bleiben unverändert.
* Für die Familienplanung getrennt definieren, wie viel eine erwachsene und eine kindliche Person von diesem Gericht tatsächlich isst. Der Anteil darf pro Gericht abweichen und darf nicht pauschal ½ als allgemeine Kinderportion setzen.
* Rechenwerte bleiben intern exakt. Eier, Stückzahlen und andere diskrete Zutaten brauchen eine verständliche Anzeige und gegebenenfalls Hinweise wie «1 Ei verquirlen, etwa die Hälfte verwenden», statt ohne Erklärung auf ganze Eier aufzurunden.
* Restenberechnung und Mengenplanung sind M4, nicht Bestandteil des reinen M2-Rezeptarchivs.

## Release-Gate

Voraussetzungen vor Freigabe von M2: CI grün, 5 manuelle Regressionspunkte B1 bis B5 auf echtem iPhone abgenommen, PR #1 weiter gesondert prüfen. Kein Merge von `feat/m2-real-recipe-archive` nach `main` vor diesen Schritten.
