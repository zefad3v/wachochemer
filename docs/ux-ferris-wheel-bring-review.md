# UX Review: Riesenrad, Planung, Bring! Vorbereitung

> Historischer Entwicklungsbericht. Die aktive Bedienung wurde in V13 durch [responsive Tages- und Wochenplanung](responsive-day-week-planner.md) ersetzt; 3D-Navigation wird nicht weiterverfolgt.


Status: **Implementierter Entwurf in PR #6**, basierend auf dem Codex-Branch aus PR #5. Die öffentliche Seite und `main` bleiben unverändert.

## Rückmeldung und Entscheide

| Problem | Massnahme | Grenzen |
| --- | --- | --- |
| Karussell soll wie ein Riesenrad drehen | Horizontaler Drehachsenring `rotateX` statt senkrechter `rotateY` Achse, 7 Karten, leichte Linksdrehung, Hauptkarte grösser. Berührt weder Tagesreferenzen noch die bestehenden Touch-Events. | iPhone: Wischrichtung, Sichtbarkeit, Rotation und Ruckeln prüfen |
| Wochenumschalter ungünstig | Mittig in einer pillenförmigen Leiste unter dem Seitentitel. | Mobil visuell prüfen |
| Hauptnavigation besteht aus losen Knöpfen | Gemeinsame halbtransparente Leiste hinter den drei Symbolen, aktive Markierung erhalten. | Safari und installierte Web-App prüfen |
| Einstellungen verlassen | Zurück-Taste und zweiter Zahnradklick führen zum vorherigen Tab. | Zugänglichkeit prüfen |
| Rezepteditor öffnet grosses Dropdown | Eigene suchbare Liste mit eindeutiger Auswahl und Markierung; Fokus zunächst auf Überschrift. | iOS Tastatur und Scrollposition prüfen |
| Rezept aus Archiv in Wochenplan übertragen: Ziel unklar | Menüeditor zeigt Datum als editierbares Feld, auch wenn er aus einem Rezept geöffnet wird. Die Speichertaste verwendet ausdrücklich dieses Datum. | Noch kein zusätzlicher Datumsauswahlschritt vor Öffnen des Editors |
| Chochchischtli verändert beim Suchen Kartenlayout | Gleiches Kartenlayout vor und nach Suchbeginn. | Auf schmalen Geräten Lesbarkeit prüfen |
| Doppelte Einkaufsliste neben Bring! | Bisherigen Checkbox-Workflow aus der sichtbaren Ansicht entfernt. Zutatensammlung ist Vorbereitung mit Kopieroption, manuelle Zusatzartikel bleiben möglich. | **Die Zwischenablage ist kein bestätigter direkter Bring!-Import.** Einzelrezept-Import und tatsächliche Wochenintegration bleiben M6 |
| Datumsfelder überlappen | Einkaufdatumseingaben auf Mobile in einer Spalte, volle Containerbreite. | Echter iOS Safari-Test offen |

## Fachliche Grenzen

* Der Wochenbeginn bleibt eine reine Anzeigepräferenz. Einkaufsbeginn und Einkaufsende sind unabhängig.
* Es werden nur tatsächlich geplante Rezepte innerhalb des gewählten Zeitraums summiert. Resten werden nicht doppelt erfasst.
* Der Menüeditor verwendet weiterhin lokal gespeicherte Einträge. Sync mehrerer Geräte gehört zu einem späteren Paket.
* Kein neues Rezept wird erfunden. Demo-Karten zählen nicht als Einkauf.
* Die automatische Berechnung von Zusatzportionen für Resten gehört M4.
* Bring!: Kein behaupteter Gesamtimport. Kopieren ist nur ein transparenter Zwischenstand. Vor einer produktiven Freigabe müssen wir überprüfen, welche Daten Bring! tatsächlich als Gesamtimport unterstützt, und einen unterstützten Übergabeweg bauen.

## Technische Prüfung

GitHub Actions Run `43624734486`: 34 von 34 Tests bestanden, keine Fehler. Enthält Geometrie, Datenlogik, Planungsregressionen, UI-Struktur und JavaScript-Syntax. Tests sind keine Safari- oder PWA-Renderprüfung.

## Manuelle Abnahme

1. Auf iPhone innerhalb der Wuchenplan-Ansicht vertikal wischen. Nächste Karte muss physisch von unten nach vorn drehen; umgekehrt von oben nach vorn. An den Übergängen von Sonntag zu Montag und Mittwoch zu Donnerstag prüfen.
2. Prüfen, ob die Hauptkarte gross genug bleibt und die Nachbarkarten nicht darüberliegende Texte zeigen.
3. Header und untere Navigation auf kleinem iPhone sowie in der Homebildschirm-App prüfen.
4. Chochchischtli zuerst ohne Suchtext, danach mit einem Suchtreffer anzeigen: keine Änderung des Kartenformats.
5. Rezept öffnen, in Wochenplan übernehmen, Zieldatum ändern, speichern und nach Reload kontrollieren.
6. Menüeditor öffnen: Tastatur und native Auswahl dürfen nicht ungefragt aufgehen. Rezeptsuche, Tagesdatum und Speichern prüfen.
7. Einkaufstermine auf iPhone ändern, Überlappung ausschliessen; Copy-Status überprüfen. Dabei keine direkte Bring!-Übernahme erwarten.

Kein Merge vor manueller Abnahme der relevanten Gerätetests.
