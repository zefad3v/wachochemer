# Issue #15 – Kochen und Alltagsplanung (M0/M4)

> Historischer Entwicklungsbericht. Aktueller Betriebsstand vom 22. November 2026 siehe [Produktiver Alpha-Betrieb](production.md) und [Roadmap](roadmap.md). Die nachfolgenden Angaben und Messwerte beziehen sich auf den damaligen Entwicklungsstand.

Basis: PR #13, `c9fdc043730f5c0063a11abf3af238614a67356a`. Neuer Branch
`feat/issue15-cooking-ux`, PR-Basis `feat/m6-bring-transfer-manifest`.

## Verhalten

- Geplante echte Rezepte öffnen per Karte dieselbe Rezeptansicht wie das Archiv,
  aber mit der tatsächlichen geplanten Kochmenge. Ein separater 44px-Stift öffnet
  den Editor für den angezeigten Tag und Mittag/Abend. Swipe bleibt davon getrennt.
- Kochmodus: identische skalierte Zutaten, Schritt vor/zurück, Fortschritt und
  Rückkehr zum Rezept. Flüchtiger Zustand; kein Plan-/Einkaufs-Schreibzugriff.
  Archivportionen sind unabhängig und in 0.5-Schritten einstellbar.
- Sichtbare Rezeptauswahl und Suche auf Wunsch. Mahlzeitenbedarf mit +/- 0.5 und
  frei editierbarem Dezimalfeld; optionale Zusatzmenge für später. Ohne Haushalt
  keine stille Ein-Portion-Vorgabe, sondern gekennzeichnete Rezept-Basisportionen.
- M4-Felder bleiben getrennt. Die erweiterte Ansicht erhält exakte Koch-/Verzehrwerte;
  ungeklärter V1-Verzehr bleibt ausdrücklich zu klären. Keine Datenmigration nötig.
- Restenpicker zeigt gültige frühere Quellen und freie Mengen. Eigene Reservierung
  wird beim Editieren mitberücksichtigt. M4 prüft weiterhin Überbuchung und Änderungen
  an bereits reservierten Ursprungsmahlzeiten. Kein automatisches Reservieren.
- Landscape bis 500px Höhe: ein Titel, Dock und Einstellungen getrennt, kompakte
  Tagesnavigation und Karte. Dokument/Modals dürfen vertikal scrollen; 100dvh und
  Safe-Area-Abstände bleiben berücksichtigt.

## Nachweise

53 Node-Einzeltests erfolgreich, Syntax und `git diff --check` erfolgreich.
Rezeptindex-Generator und Seitengenerator erfolgreich ausgeführt; generierte
Produktionsdateien werden nicht Teil dieses PRs.

Browser: alle bestehenden Suites (Bring 8, Issue11 13, M4 8, V15 9, V16 12,
V17 25) sowie Issue15 (78) und Reservierungen/Haushalt (10).
Die alten Editor-Tests verwenden jetzt explizit den Stift. Der historische
Responsive-Einstieg behauptete noch entfernte V1-Speicherung, auto-ausgewählte
Rezepte und Swipe-Tagesnavigation; er führt nun die aktuellen V15-/Issue15-Suites aus.

Neue Screenshots: [Portrait](screenshots/issue15/390-plan.png),
[Landscape](screenshots/issue15/844-plan.png),
[Editor](screenshots/issue15/844-editor.png),
[Kochmodus](screenshots/issue15/844-cooking.png).
Chromium-Viewports: 390x844, 393x852, 844x390, 932x430. Geprüft: reale
Dezimalskalierung (3.75 Portionen = 1000g Kürbis), Schrittwechsel bis zum Ende
per Tastatur, unveränderter Plan beim Lesen, getrennte Archivmengen, Erstnutzung,
Haushaltsbedarf, bestehende Zusatzmenge, gültige/erschöpfte Restenquellen,
Überreservierung und Ursprungsänderung. M6-Manifestregressionen bleiben grün.

## Manuelle Abnahme vor Integration

Kein echter iOS-Test. Auf iPhone 14 Pro in Safari und installierter PWA prüfen:
Browserleisten ein-/ausblenden, Rotation beider Richtungen, Notch/Safe Areas,
Bildschirmtastatur bei Dezimal- und Suchfeldern, Scrollen in Editor/Kochmodus,
Touch und Lesbarkeit. Mit echten iPhone-Screenshots gegen diesen Stand abnehmen.
Die separate PWA-Blur-Frage wurde nicht umgestaltet. Rezeptfotos fehlen weiterhin;
der neutrale Platzhalter ist absichtlich unverändert.

Bring!-Import auf echter Testliste und dezimale öffentliche Rezeptübernahme bleiben
separate offene M6-Nachweise. Kein Import behauptet, keine Credentials, kein
Merge/Deployment. Rollback: diesen Feature-Commit zurücknehmen; keine Migration.
