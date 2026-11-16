# M4 Haushalt, Kochmenge und Resten

Issue #11 B; statisch/lokal, keine Serverinfrastruktur oder Synchronisation.

## Vertrag
Plan version 2: entries mit YYYY-MM-DD|lunch oder |dinner.
Rezept: type recipe, recipeId, cookedServings (positiv bis 1000),
consumedServings (0 bis 1000). Dezimalwerte erlaubt.
Resten: type leftover, sourceKey (eindeutiges ursprüngliches Rezept), portions.
Manuelle Menüs unverändert. Jeder Kochvorgang ist eine eigene Quelle.
Mehrere Reservierungen summieren sich; verfügbar = gekocht minus Verzehr minus Reservierungen.
Überbuchung, fehlende/gelöschte Quellen, spätere Quellen, Selbstbezüge und Restenketten
werden beim Speichern verhindert. Bereits beschädigte Einträge bleiben sichtbar mit Warnung.
Gleicher Tag: Mittag darf Quelle für Abend sein.
Keine automatische Erhöhung der Kochmenge.

Haushalt: konfigurierbare adults/children/babies und jeweilige Share-Werte.
Ohne Profil keine Annahme über eine Familie. Rezeptanteile separat lokal;
Kochmenge und Verzehr pro Mahlzeit frei überschreibbar.
Berechnung ohne Zwischenrundung (JavaScript Number); Rundung nur in der Ausgabe.
Keine Lagerhaltbarkeits-/Lebensmittelsicherheitsbewertung.

## Einkauf
cookingTotals zählt ausschliesslich Kochvorgänge im inklusiven Zeitraum (1 bis 60 Tage).
Resten kaufen nie zusätzlich ein, auch wenn die Quelle ausserhalb des Zeitraums liegt.
Optionale Zutaten nur auf ausdrücklichen Wunsch. Unbekannte Rezepte erzeugen Warnungen.
Keine zweite Checkbox-Einkaufsliste.

## Migration und Wiederherstellung
Neue Speicherung unter wachochemer:mealPlanV2. V1 und dessen Rohdatenbackup bleiben erhalten.
Alle Einträge werden kopiert, auch beschädigte/unbekannte. V1 servings bleibt als Kochmenge
erhalten; der unbekannte Verzehr bleibt null und muss geklärt werden.
Alte sourceDate-Resten erhalten keine automatische Mahlzeitzuordnung, sondern Prüfstatus.
Keine mutmassliche Abendzuordnung. Bereinigte Einträge verlieren ihren Prüfstatus.
Bei Parse-/Versions-/Quota-Fehler wird kein leerer Ersatzplan gespeichert.
Schreibzugriffe sichern den vorherigen Stand. Wiederherstellung aus V2-/V1-Backup;
ohne lesbare Sicherung Originaldaten im Browser erhalten und extern sichern.
Die v1-Hilfsfunktionen im Prototyp bleiben für alte Aufrufer kompatibel; aktive UI nutzt M4.

## Prüfung
46/46 Node-Einzeltests bestanden, darunter 8 M4-Domain-/Speichertests.
Chromium: 7/7 neue M4-Abläufe und bisherige 59 UI-Prüfungen bestanden.
Syntax, Rezeptindex-/Seitengenerator und diff-check erfolgreich; generierte Produktionsdateien
wurden nicht übernommen.
Manuell offen: echte iPhone-Safari/PWA-Tastatur, Rotation, grosse Schrift, Speicherbeschränkungen,
Migration mit eigenen produktiven Browserdaten (vorher sichern).
