# Mobile UX Review V14: kompakte Tagesansicht

Stand 14.11.2026, aktueller Arbeitszweig `feat/compact-day-view-bring-research`, basiert auf Codex PR #7. Keine Änderung an main und kein produktiver Deploy.

## Vom iPhone-Screenshot abgeleitete Prioritäten

* **App-Branding**: Auf kleinen Mobilbildschirmen nicht nochmals «Wa chochemer?» über jeder Seite ausgeben. Stattdessen den zentrierten Seitentitel und ein Zahnrad am rechten oberen Rand zeigen. Die Marke bleibt für App-Icon/PWA/Metadaten erhalten.
* **Wochenwahl**: Tag/Woche weiterhin möglich, aber im Tagesmodus als kleiner kontextueller Umschalter statt grosser Doppelsteuerung. Ein expliziter Vor-/Zurück-Wochenschalter wird nur in der Wochenübersicht angezeigt. Tage und Wochen bleiben über die vorhandene Datumsauswahl erreichbar, ohne den Datumseintrag umzuschreiben.
* **Tageskarte**: Zmittag und Znacht als zwei Seiten einer Karte. Punktnavigation direkt unter der Karte, Klick oder horizontal wischen wechselt zwischen den beiden Mahlzeiten; Tageswechsel direkt über die sieben Kürzel. Als Initialwert vor 14:00 Uhr Zmittag, danach Znacht, basierend auf lokaler Geräteuhr. Manuelle Auswahl bleibt bis zu einem Tageswechsel erhalten. Die Uhrzeit verändert keine gespeicherten Menüs.
* **Mobile Fläche**: Titel, Wochenkürzel und Card kompakter. Die Tagesansicht soll auf typischen modernen iPhones ohne unnötigen vertikalen Scroll erscheinen. Auf kleineren Geräten oder bei grösseren Schriftgrössen bleibt vertikales Scrollen erlaubt. Rezeptdetails scrollen ohnehin.
* **Hauptnavigation**: Nur Wucheplan und Chochchischtli; wieder transparenter/unscharfer Hintergrund. Die Bring-Vorbereitung bleibt aus der Wochenübersicht sekundär erreichbar.
* **Leere Rezeptkarte**: Kein übergrosses Asterisk mehr.
* **Chochchischtli**: Beim Tippen sofort textbasierte Suchresultate in einer einspaltigen Liste. Ohne Suchtext bleibt die normale Rezeptkartengalerie. Die Kopfzeile soll beim Wechsel stabil bleiben.
* **Einkauf**: Keine separate Checkliste mit Abhaken; Bring! ist die einzige eigentliche Einkaufsliste. Die bestehende Rezept-Zutatenaggregation und eine Kopierfunktion bleiben vorläufig verfügbar, ohne zu behaupten, die Daten seien in Bring! angekommen.

## Nachgewiesene Bring!-Schnittstellen

Siehe [Bring!-API-Bewertung](bring-api-assessment.md). Offiziell dokumentiert sind Import und Mengenanpassung **eines** Rezepts mit URL/JSON über Widget oder Deeplink. Kein bestätigter offizieller Batchimport mehrerer Rezepte und keine dokumentierte Abfrage der bereits unter «Meine Rezepte» vorhandenen Rezepte. Eine inoffizielle API bietet Batchoperationen für Listeneinträge, verlangt aber Bring!-Anmeldedaten und wäre keine geeignete statische Frontend-Anbindung.

**Entscheid für M6**: Erst mit Bring!-Testliste den tatsächlichen Einzelschritt und Doppelimport prüfen; gegebenenfalls Bring Labs nach offizieller Partnerschnittstelle fragen. Ein bereits in Bring! gespeichertes Rezept bedeutet nicht, dass seine Zutaten schon auf der aktuellen Einkaufsliste stehen. Kein automatischer Dublettenstatus erfinden.

## Offene iPhone-Abnahme

1. Im Hochformat muss der Titel zentriert, das Zahnrad sichtbar und die Tageskarte nicht von Navigation/URL-Leiste verdeckt sein.
2. Beide Mahlzeiten zeigen die richtigen Einträge; Punkt- und Wischwechsel funktioniert, vor/nach 14 Uhr richtige Erstwahl.
3. Wechsel des Wochentags und der Kalenderwoche erhält die gespeicherten Einträge.
4. Umschalten auf Wochenübersicht bleibt erreichbar; Wochenwahl funktioniert dort.
5. Rezeptarchiv: bei Suchtext einspaltige Textresultate, bei Leeren der Suche wieder Bilder. Kein vertikaler Header-Sprung.
6. Bring-Vorbereitung aus Wochenübersicht erreichbar und zurücknavigierbar; keine Behauptung eines bereits erfolgten Imports.
7. Responsive/iOS: kleine Geräte, grosse Schrift, Safe Areas und Homebildschirm-Standalone.

## Nicht Teil dieses Pakets

Automatische Restenberechnung (M4), offizieller Bring!-Wochenexport (M6), Cloud-Synchronisation, eigener App-Icon-Entwurf (M7) und weitere gestalterische Experimente.
