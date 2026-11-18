# V17 – Header-Ebenen, kompakter Tagesplan, einheitliche Archivkacheln

M0/UI-Abnahme auf dem aktuellen Stand von PR #10, Basis `437637010dfc62330d277df60f2ea6de71dfae2a`. Kein neues Fachpaket, keine Änderung an Rezeptdaten oder Planformat.

## Umsetzung und Grenzen

- Header: Hintergrund ist ein eigenes `header-backdrop`-Element, die Vordergrundelemente sind explizit darüber angeordnet. Header, Titel, Zahnrad und deren Vorfahren haben weder Filter noch Backdrop-Filter, Transformation oder verringerte Deckkraft. Der App-Container verwendet keine gemeinsame isolierte Compositing-Gruppe mehr. Die Umgebungsdekoration liegt in einem separaten Geschwisterlayer hinter `main`, Header und Navigation. Für den Header ist bewusst ein ungefilterter Verlauf gewählt; Blur ist dort nicht nötig. Schriftgrösse/Zeilenhöhe sind mobil ganzzahlige CSS-Pixel, SVG bleibt ein 24px-Vektor. Keine `translateZ`-/`will-change`-Promotion, Animation oder Skalierung. `overscroll-behavior-y:none` reduziert unterstütztes elastisches Overscrollen, ohne Inhalte durch `overflow:hidden` einzusperren.
- iOS-PWA-Schärfe ist damit technisch abgesichert, **auf echtem iOS weiterhin nicht nachgewiesen**. Es gibt hier kein echtes iPhone und kein installiertes iOS-Web-App-Fenster. Chromium-Screenshots und berechnete CSS-Werte beweisen nicht das Verhalten des iOS-Compositors.
- Tag ist auf allen Breiten der Standard. Bestehende explizite Ansichtspräferenzen pro Breitenklasse bleiben erhalten. Der Wechsel zur sekundären Woche ist ein kleines Icon/Text-Control direkt unter den Tagen; Rückkehr über «Tag». Kein dominanter Glas-Umschalter rechts oben. Die redundante sekundäre Wochenschaltfläche wird ausgeblendet. Wochenwechsel, direkte Auswahl und Editor bleiben erhalten.
- Mobile Navigation: 54px Höhe, 6px Abstand plus echte untere Safe Area. 44px Header plus obere Safe Area, weniger Kartenreserve, intrinsische Kartenhöhe für grosse Schrift/lange Menüs. Bei 390×844 liegen etwa 13px zwischen Karte und Dock; kein Scrollen im normalen Tagesplan. Auch mit simulierten 59/34px Safe Areas bei 393×852 passt die Ansicht. Kleine Geräte und grosse Schrift dürfen scrollen.
- Glas: 30px Blur/180% Sättigung ausschliesslich im Hintergrund des Docks; transparentes Material, weiche Lichtreflexe und Schatten. Text/Icons sind ungefiltert. Ein zurückhaltendes, separates Foto-Ambiente des ausgewählten Rezeptbilds gibt dem Glas tatsächliche Bildstruktur. Nur im Wochenplan sichtbar; das Archiv bleibt ruhig. Ohne Foto bleiben grüne/warme Lichtfelder. Kleine Rezeptdialog-Controls erhalten ebenfalls eigene Blur-Hintergründe. WebKit- und Transparenz-Fallback bleiben vorhanden. Keine Nachbildung nativen Apple-Renderings.
- Archiv: gleich hohe Grid-Zeilen über alle Reihen (`minmax(...,1fr)`), randfüllendes Bild oder identischer Platzhalter, unteres Glas-/Verlaufs-Overlay. Lange Titel bleiben vollständig im DOM und dürfen alle Kacheln gemeinsam vergrössern. Live-Suche bleibt eine kompakte Liste mit festen 52px lazy/async Thumbnails. Keine Suche-/Datenlogik geändert.
- Bild-Demo aus V16 bleibt explizit, opt-in und vom Rezept-/Planbestand getrennt. Es fehlen weiterhin eigene verifizierte Rezeptfotos. Keine neue Fotoquelle, kein Backend, keine Datenmigration und kein PWA-/Offline-Versprechen.

## Tests und Sichtprüfung

- `node --test tests/*.test.mjs`: 7 Testdateien bestanden; mit `--test-isolation=none`: **38/38** Einzeltests.
- Syntaxprüfung für App und responsive Planner bestanden. Rezeptindex- und HTML-Generator erfolgreich; Ausgaben ausserhalb des Prototyps zurückgesetzt.
- `BASE_URL=http://127.0.0.1:8765 node tests/v15-browser.mjs`: **9/9** bestehende Chromium-Prüfungen.
- `node tests/v16-browser.mjs`: **12/12** bestehende Chromium-Prüfungen; historische V16-Screenshotdateien nach dem Lauf nicht überschrieben übernommen.
- `node tests/v17-browser.mjs`: **25/25** neue Chromium-Prüfungen. Header samt Vorfahren ohne Filter/Transform; kein Bearbeiten-Button; sekundärer Wechsel und Persistenz; 390×844 ohne Scrollen; 393×852 mit 59/34px Safe-Area-Simulation ohne Scrollen; scharfe Ebenen nach Navigation; gleich hohe Archivkarten bei 390/320/1280px und vergrössertem Text; stabile Suchposition/Thumbnails; Favoriten; Karteneditor für Znacht; Bring!-Vorbereitung; Desktop-Dock oberhalb des Headerhintergrunds. Keine JS-Laufzeitfehler im Hauptablauf.
- `git diff --check` bestanden.

Fünf neue Aufnahmen wurden mit Chromium und DPR 3 erzeugt und visuell gelesen. Die erste Aufnahme simuliert Safe-Area-Inset-Werte durch einen Test-Stylesheet-Override; sie ist **kein Screenshot einer installierten iOS-PWA** und zeigt keine echte Statusleiste.

1. [PWA-Safe-Area-Simulation, iPhone Hochformat](screenshots/v17/01-pwa-safe-area-simulation.png)
2. [Tagesplan mit Bildkarte](screenshots/v17/02-iphone-image-card.png)
3. [Chochchischtli-Raster](screenshots/v17/03-archive-grid.png)
4. [Live-Suche](screenshots/v17/04-live-search.png)
5. [Glasnavigation im Detail](screenshots/v17/05-glass-navigation.png)

Sichtprüfung: Titel/Zahnrad erscheinen in den Chromium-Aufnahmen scharf; Bild und Platzhalter haben gleiche Rahmenhöhen; Texte bleiben lesbar, Mahlzeitwahl bleibt ohne Buttonoptik. Glas zeigt sichtbar unterschiedliche Hintergrundtönungen und Lichtreflexe. Der zunächst geringfügige vertikale Überlauf wurde korrigiert. Das Foto-Ambiente wurde nach Sichtprüfung auf den Plan begrenzt, um das Archiv nicht mit einem zweiten grossen Motiv zu überladen. Der Desktop-Dock liegt explizit über dem Headerhintergrund.

## Echte iPhone-Abnahme offen

- Installierte Home-Screen-App und Safari: Schärfe bei Scrollen/Hochziehen, PWA-Compositor, Dynamic Island/Statusleiste, Safe Areas und Rückkehr aus dem Hintergrund.
- Tatsächlicher Glas-Blur, reduzierte Transparenz, Lesbarkeit über eigenen Fotos.
- Native Suchtastatur, Rotation mit offener Tastatur, Dynamic Type/Textzoom und lange eigene Menüs.
- Echte Touchgesten, Datum/Mitternacht und Bring!-Import separat.

Kein Merge, keine Änderung an main, kein produktives Deployment. Rollback per Revert; lokale Menüs, Portionen, Resten, Favoriten und Bring!-Vorbereitung bleiben kompatibel. Nächstes Fachpaket M4 nach echter iPhone-Abnahme.
