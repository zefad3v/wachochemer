# Coding-Agent Leitlinien für Wa chochemer?

Lies **vor jeder Codeänderung** `docs/ki-roadmap.md`, `docs/architecture.md` und die für dein Ticket relevanten Quelldateien. Die Roadmap enthält die priorisierten Pakete M0 bis M12, Fachregeln, Akzeptanzkriterien und Definition of Done.

## Verbindliche Regeln

- Arbeite an **einem klar abgegrenzten Paket** pro Pull Request. Stelle bei mehreren möglichen Aufgaben zuerst M0, dann M1 usw. in den Vordergrund.
- Schütze die produktive GitHub-Pages-Seite auf `main`. Der mobile Designprototyp liegt separat in `feat/mobile-revolver-prototype` (PR #1). Keine eigenmächtigen Merges, Deployments oder Hostingwechsel.
- Grundlage sind strukturierte Rezept- und Zutatendaten in `data/recipes/*.json` und `data/ingredients.json`. Referenzen, IDs und Slugs stabil halten; keine zweite, hartcodierte Quelle für reale Rezepte.
- Demo-Gerichte klar als Demo markieren und niemals als fertig gespeicherte echte Rezepte ausgeben.
- Die Familienregeln zu Donnerstag-bis-Mittwoch-Wochen, Portionen, Montags-bis-Donnerstags-Resten und einfachem Mittwoch stehen in `docs/ki-roadmap.md`. Sie sind fachliche Akzeptanzkriterien, nicht bloss UI-Vorschläge.
- Bei Rezepten und Zutaten Deutsch (Schweiz), für UI-Begriffe Schweizerdeutsch. Keine deutschen ß im Text.
- Keine erfundenen Bring!-Funktionen oder nicht bestätigten Grossverteiler-APIs. Der Aktionenabgleich steht separat in `docs/aktionsabgleich.md` und ist vorerst P2.
- UI nicht weiter grundlegend umgestalten. Priorität haben funktionale Korrektheit, mobile Bedienbarkeit, Tests und persistente Daten.
- Erst das Problem und die minimal nötigen Dateien identifizieren, dann Tests und Code ändern. Vor Abgabe passende Node-/Generator-Tests ausführen und nicht durchgeführte iPhone-Tests klar ausweisen.
- Bei geänderten Datenstrukturen Migration und Kompatibilität dokumentieren. Keine neuen externen Dienste oder versteckten Schlüssel ohne ausdrückliche Freigabe.

## Abschlussbericht pro Aufgabe

Berichte kurz: betroffene Roadmap-ID, geänderte Dateien und Funktionen, automatisierte Tests mit Resultat, manuell ausstehende Prüfungen, Risiken und das nächste sinnvolle Paket.
