# Wa chochemer? · Mobiler Designprototyp

Diese Vorschau lebt absichtlich auf **feat/mobile-revolver-prototype**. Die öffentliche GitHub-Pages-Version auf **main** wird nicht verändert.

## Was funktioniert

* Vertikaler, räumlich gestaffelter Wochenrevolver auf Smartphones (Wischen, Tippen, Tasten, Mausrad).
* Desktop ab 1040 px: ausgewähltes Gericht links ohne Kachel, horizontaler Revolver rechts.
* Bottom Navigation mit dezenter Glasoptik, Schweizerdeutsch nur für Oberflächenbegriffe.
* Chochchischtli mit Suche, Filter, Favoriten; Rezeptdetails mit hochdeutschem Rezepttext.
* Iichaufslischte als **lokale Demoansicht** mit Zusammenfassung der echten Zutaten aus den zwei bestehenden Rezepten.
* Iistellige mit Wuchebeginn, lokal im Browser gespeichert.
* Die vorhandenen JSON-Rezepte und der Zutatenstamm werden geladen, nicht in die UI dupliziert.
* Kompaktes Bring!-Symbol auf **erfassten** Rezepten führt zur bisherigen öffentlichen Rezeptseite mit funktionierendem Widget.
* Tastaturbedienung, Fokusmarkierungen und reduzierte Bewegung bei passender Geräteeinstellung.

## Design und Grenzen

* Das ist ein **interaktiver Designprototyp**, kein produktives Wochenplanungssystem.
* Die sieben Tagesgerichte dienen der Gestaltung. Nur **Kürbissuppe mit Käsetoast** und **Milde Poulet-Fajitas** sind im echten Rezeptstamm erfasst. Die übrigen fünf sind als Designbeispiele markiert.
* Die Einkaufsliste ist nicht mit Bring! synchronisiert und wird nicht automatisch übertragen. Das Bring!-Symbol öffnet stattdessen das bestehende Rezept mit dem bewährten Import-Widget.
* Kochbilder sind vorläufige externe **Unsplash-Demofotos** und keine eigenen Rezeptfotos. Einzelne Fotos können vom konkreten Rezept abweichen; vor Produktion durch passende lizenzgeprüfte Aufnahmen ersetzen.
* Es gibt noch keine Accounts, personalisierten Essenspläne oder gemeinsame Synchronisierung.
* Die Verwendung lokaler Daten ist nur eine Prototypfunktion. Eine Datenbank ist nicht nötig.
* Browseransicht via file:// kann das Laden der JSON-Dateien verhindern, weshalb in diesem Fall eine ausdrücklich reduzierte Demo-Fallbackansicht erscheint.

## Lokal testen

Im Repository-Wurzelverzeichnis einen statischen Server starten:

    python3 -m http.server 8000

Dann http://localhost:8000/prototype/ öffnen.

## Online-Preview ohne Änderung der Live-Seite

Der Branch kann über ein **externes HTML-Preview** (raw.githack.com) angesehen werden. Dies ist ein unabhängiger Drittanbieter, kein GitHub Pages. Für eine stabile Vorschau eignet sich ein Link mit dem konkreten Commit-SHA. Das Preview kann vor der ersten Öffnung eine Sicherheitsbestätigung verlangen.

Nicht automatisch nach main mergen. Vor dem Mergen die Navigation und den Bring!-Übergang auf dem iPhone testen.

## Dateien

* prototype/index.html: Struktur der vier Ansichten.
* prototype/styles.css: Dark Olive Design, klare Kartenkanten, dezente Glass-Navigation und responsive Layouts.
* prototype/app.js: Interaktionen und Anbindung an bestehende JSON-Daten.

## Mobile Review vom 18. Oktober 2026

* **Safari-Wischen:** Der Bereich des vertikalen Revolvers fängt vertikale Touch-Gesten ab. Die Wochenansicht blockiert das Scrollen der darunterliegenden Seite. Die Steuerung per Pfeilbutton verwendet `touch-action: manipulation`, ohne den Browser-Zoom global abzuschalten.
* **iOS-Suche:** Das Suchfeld verwendet mindestens 16 px Schrift, um den automatischen Safari-Fokuszoom zu vermeiden. Während einer Suche werden Ergebnisse als breite, besser lesbare Zeilen angezeigt.
* **Rezeptportionen:** In der Rezeptdetailansicht können Portionen zwischen 1 und 16 angepasst werden. Die gewählte Anzahl wird lokal gespeichert. Die Mengen der Demo-Einkaufsliste werden bei den erfassten Rezepten entsprechend angepasst. Der Bring!-Button führt weiterhin zur bestehenden Rezeptseite; dort muss die gewünschte Portionszahl gegebenenfalls erneut gewählt werden.
* **Kompakte Header:** Kleinere Kopfzeilen lassen dem Rezeptrevolver mehr Bildschirmhöhe.
* **Adaptives Dock:** Die aktive Navigation erhält eine grössere horizontale Beschriftung, die übrigen Navigationselemente bleiben kompakt und sichtbar. Die Glaswirkung ist bewusst dezent.

**Offen:** Alle Safari-Effekte müssen nach dem Code-Update auf einem echten iPhone erneut geprüft werden. Der GitHub-Workflow prüft Syntax und Datenreferenzen, nicht die tatsächliche iOS-Gestensteuerung.

## Mobile Review V3 vom 18. Oktober 2026

* Hauptnavigation: nur noch drei separat schwebende runde Icons für Wucheplan, Chochchischtli und Iichaufslischte. Keine permanente Beschriftung und kein gemeinsamer Balken. Zugängliche Namen bleiben über `aria-label` erhalten.
* Einstellungen: Zahnrad in die obere Kopfzeile verschoben und aus der Hauptnavigation entfernt.
* Header: Branding, Seitentitel und Datumsanzeige verkleinert, Datumsformat auf Mobilgeräten verkürzt.
* Hintergrund: durchgehend einheitliches dunkles Oliv. Der Bildverlauf bleibt auf den Revolver begrenzt.
* Tagwechsel: Pfeiltasten und Tageszähler seitlich neben die aktive Karte versetzt; die bisherige seitliche Fortschrittslinie entfällt.
* Kein Überlappen zwischen Navigation und Tagessteuerung. Die Woche füllt den verfügbaren vertikalen Bildschirmbereich ohne gewöhnliches Seitenscrollen.
* Der native Safari-Adressbalken ist nicht durch Seitencode versteckbar. Für eine spätere URL-freie Ansicht wäre ein auf dem Home-Bildschirm installiertes Web-App-Erlebnis denkbar.
* Ein echtes iPhone-Review steht aus; automatisierte GitHub-Prüfungen umfassen Syntax/Datenreferenzen, nicht Pixel- oder Touchtests.

## Mobile Review V4 vom 26. Oktober 2026

* Die Einstellungen sind auf Mobilgeräten als **reines Zahnrad ohne sichtbaren Button-Rahmen** rechts oben verankert. Die Branding-Zeile ist zentriert.
* Die Tagessteuerung zeigt **MO, DI, MI, DO, FR, SA, SO** für den ausgewählten Tag statt «1 / 7».
* Das aktive Rezeptbild wird als abgedunkelter, dezent weichgezeichneter Hintergrund bis an die **Ränder des Web-App-Viewports** gezogen. Die Rezeptkarte bleibt scharf.
* Kopfbereich, Wochensteuerung und untere Navigation liegen auf transparenten bzw. weichgezeichneten Flächen. Keine umfassende Liquid-Glass-UI; Lesbarkeit und zuverlässige Touch-Bedienung haben Vorrang.
* **Technische Grenze:** Die URL-Leiste von Safari ist nicht Bestandteil des Webseiten-Viewports und kann nicht per CSS gestaltet oder weichgezeichnet werden. Für die spätere Nutzung ist eine installierbare PWA im eigenständigen Fenster vorzusehen.
* **Test ausstehend:** Auf echtem iPhone in Safari und als zum Home-Bildschirm hinzugefügte Web-App testen, insbesondere Safe Areas, Bildausschnitt, Gesten, Lesbarkeit und Navigation. Keine Änderung an der öffentlichen Website.
* **Priorität danach:** UI einfrieren und am echten Rezept-, Wochenplan-, Resten- und Einkaufslistenverhalten arbeiten. Aktionenabgleich mit Grossverteilern ist separat als spätere Funktion in den Haupt-Dokumenten erfasst.
