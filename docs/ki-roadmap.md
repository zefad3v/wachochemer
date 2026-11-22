# KI-Roadmap

Massgeblich sind die [aktuelle Roadmap](roadmap.md), [Architektur](architecture.md), [Betriebsdokumentation](production.md) und die Projektgrenzen in [AGENTS.md](../AGENTS.md).

## Aktuelles Paket M0, M2 und M10

Produktiver Alpha-Einstieg, überlagernde Glasnavigation, richtungsabhängige Suchzeile, Wochengeste, kompakter Menüeditor und schrittweise Rezeptauswahl sind implementiert. Die iPhone-Abnahme bleibt separat erforderlich.

## Fachregeln

Wochenstart standardmässig Donnerstag. Die Planung verwendet lokale Kalenderdaten und stabile Rezept-IDs. Personen im Haushalt und Login-Mitglieder bleiben getrennt. Kochmenge, Verzehr und reservierte Resten sind eigenständige Werte. Resten lösen keinen zweiten Zutateneinkauf aus. Ungleiche Einheiten werden nicht still umgerechnet. Revisionskonflikte erhalten den Entwurf.

## Vorgehen pro Änderung

Bestehende Quellen und relevante Dokumentation lesen. Projektzuordnung vor jeder Mutation bestätigen. Bestehende Datensätze und Sitzungen kompatibel halten. Für Änderungen an gemeinsamem Speicher oder Auth alle Prüfungen in AGENTS.md ausführen. Keine produktiven Daten als Testfixture verändern. Prüfergebnisse mit ihrer tatsächlichen Aussagekraft berichten und iPhone-Abnahme separat nennen.

Historische UI-Pakete sind in den datierten Berichten dokumentiert. Ihre früheren lokalen Speichervorgaben und damaligen Merge-Gates gelten nicht als aktueller Betriebsstand.
