# M3: Menüplanung, 3D-Revolver und Einkaufszeitraum

Status: **Implementiert als Entwurf in PR #4**, basiert auf M2 / PR #3. Automatisierte Tests und echte iPhone-Abnahme getrennt ausweisen. Kein Merge nach `main`.

## Bedienablauf für den Alltag

1. **Woche ansehen:** Im Wochenplan mit Wischen, den Pfeilen oder den Tageskarten durch sieben Tage drehen. Die Karten stehen leicht nach links geneigt auf einer räumlichen 3D-Kurve. Zu Beginn sind die alten sieben Beispielbilder ausdrücklich mit **Demo · Menü plane** gekennzeichnet und zählen weder als gespeicherte Menüs noch als Einkauf.
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
* Das Karussell stellt alle sieben Karten auf einer `rotateX` / `translate3d` Kurve mit konstant leichter `rotateY(-11deg)` Drehung dar. Eine reduzierte Bewegungsdarstellung wird berücksichtigt.

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
