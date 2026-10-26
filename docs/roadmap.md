# Roadmap

Für Codex und andere Coding-KI gilt die detaillierte priorisierte [KI-Umsetzungsroadmap](ki-roadmap.md) mit Fachregeln, Tickets und Abnahmekriterien als verbindliche Arbeitsgrundlage. Dieses Dokument dient als kompakte Übersicht.

1. **Grundlage:** Rezept-JSON und Zutatenstamm, Schweizerdeutsche UI-Übersetzungen vorbereiten. Bestehendes Bring! Widget erhalten.
2. **Statischer Generator:** aus Rezept-JSON und Zutatenstamm automatisch sichtbares HTML und Schema.org/Recipe erstellen. Bring! Integration erneut testen.
3. **Chochchischtli:** Rezeptübersicht, Detailseiten, Suchfunktion.
4. **Wucheplan:** Familienportionen, Restenplanung, einfache Wochenübersicht.
5. **Iichaufslischte:** Zutaten bündeln, gleiche Zutaten zusammenfassen, Bring! Übertrag evaluieren.
6. **Angebotsabgleich (spätere Ausbaustufe):** Aktionen von ausgewählten Grossverteilern/Verkaufsstellen mit Rezeptzutaten und Einkaufsliste verknüpfen, nach Händler/Filiale und Gültigkeit filtern. Anforderungen und Pilotidee in [`docs/aktionsabgleich.md`](aktionsabgleich.md). Zunächst Datenquellen und Rechte prüfen, keine vorschnelle Integration.
7. **Später nach Bedarf:** Mehrsprachigkeit, persönliche Konten, eigene Rezepte, Datenbank und Monetarisierung.

## Nächster Schwerpunkt

Nach dem abschliessenden mobilen UI-Review den Entwurfszweig gezielt integrieren und die fachlichen Grundlagen priorisieren: echte persistente Rezepte und Wochenpläne, Familienportionen/Resten, gemeinsame Einkaufsliste und überprüfter Bring!-Übergang. Das Design nicht als eigenständiges Dauerprojekt weiterführen.

**Plattformempfehlung:** mobile-first Web-App als installierbare PWA konzipieren. Native iOS-/Android-Apps erst bei nachgewiesenen funktionalen Grenzen prüfen. Die produktive Bereitstellung ist noch zu entscheiden; der aktuelle Revolver ist ein separater Prototyp.

Erst einen Mehrwert nachweisen, dann grössere Infrastruktur einführen.
