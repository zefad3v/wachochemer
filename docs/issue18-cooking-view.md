# V20 / Issue #18 – Rezeptdetails und Kochansicht

> Historischer Entwicklungsbericht. Aktueller Betriebsstand vom 22. November 2026 siehe [Produktiver Alpha-Betrieb](production.md) und [Roadmap](roadmap.md). Die nachfolgenden Angaben und Messwerte beziehen sich auf den damaligen Entwicklungsstand.

Roadmap: M0/M4-Alltagsbedienung. Basis: PR #17,
`5b6c8477cbc6d414bdbdcea768dff509c41683f0`.
Kein Merge, Deployment oder neues Speicherformat.

## Verhalten

- Der Dialog selbst erhält Fokus ohne Scrollbewegung; seine Scrollfläche wird vor/nach dem Öffnen und im nächsten Frame auf Anfang gesetzt. Tastaturfokus auf Buttons bleibt sichtbar.
- Headerbuttons stehen im normalen Fluss vor Titel und Metadaten, mit Safe-Area-Abständen. Ohne Bild entfällt die leere Hero-Fläche. Vorhandene Bilder/Demo-Kennzeichnung bleiben erhalten.
- Geplante Rezepte starten mit M4-Kochmenge. Ein flüchtiger `recipeViewServings`-Override hat Vorrang vor dem unveränderten `plannedServings`. +/- skaliert in 0.5-Schritten, begrenzt auf 0.5–1000. Hinweis bei Abweichung; Reset bei Öffnen/Schliessen, auch Escape.
- Archivpräferenzen werden wie bisher separat gespeichert. Plan, Verzehr, Resten, Einkauf und Bring!-Manifest werden beim geplanten Kochen nicht geschrieben.
- Eine gemeinsame Zutatencheckliste und eine gemeinsame nummerierte Anleitung dienen beiden Modi. Im Kochmodus sind Zutaten standardmässig eingeklappt; Portionsregler bleiben ausserhalb der Aufklappsektion. Mengenänderungen erhalten Checkboxen und Aufklappzustand. Zurück führt in die Rezeptdetails.
- Kein redundanter Planbutton bei Öffnung aus dem Plan; der Tageskartenstift bleibt unverändert.

## Prüfung

- `node --test tests/*.test.mjs`: 10 Testdateien bestanden.
- Syntax: App, Generator und Datenindex-Generator bestanden.
- `node scripts/build-recipe-index.mjs`: unveränderter Datenindex, 3 Rezepte.
- `node scripts/build.mjs`: erfolgreich; erzeugte Abweichungen der öffentlichen Seiten nicht Teil dieses PR.
- `node tests/issue15-browser.mjs`: 154 Chromium-Prüfungen in 390×844, 393×852, 844×390 und 932×430. Bestehende Assistentenprüfungen ersetzt, keine Dummy-Controls.
- `issue15-reservations-browser.mjs`: 10; `m4-browser.mjs`: 8; `bring-browser.mjs`: 8 Prüfungen bestanden.
- Überprüft: 3.75 → 4.25 → 4.75 und skalierte Mengen, vollständiger localStorage-Vergleich, Archivpersistenz, erneutes Öffnen, Escape, alle Schritte scrollbar, Checkbox-Erhalt, grosse Schrift (64px Titel/24px Text), simulierte Safe-Area-Abstände, Tab-Fokus.
- Screenshots unter [screenshots/issue18](screenshots/issue18): Detail, Kochen und grosse Schrift. Bildkontrolle führte zusätzlich zur Korrektur des Positionierungsbezugs der Button-Hintergrundebenen.

## Noch offen / Grenzen

Echtes iPhone Safari und Homebildschirm-PWA: Adressleiste, Rotation, Bildschirmtastatur, VoiceOver, reale Safe Areas und Dynamic Type. Chromium mit simulierten Abständen ersetzt diese Abnahme nicht. WebKit konnte mangels installiertem Browser nicht ausgeführt werden; Download scheiterte an HTTP 403 „Domain forbidden“. Der gemeinsame Cloud-Browser konnte seine Steuerungsanforderungen nicht laden; reproduzierbare Browserprüfungen erfolgten mit Playwright.

Risiko: browserspezifische Fokus-/Scrollwiederherstellung bleibt am echten Gerät abzunehmen. Keine Änderungen an Domainrechnung, Migration oder Bring!-Vorbereitung. Rollback durch Revert dieses PR. Nächster Schritt: reale iPhone-Abnahme vor Integration; M6-Import weiterhin separat verifizieren.
