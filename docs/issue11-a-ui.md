# Issue 11 A: UI-Abschluss

> Historischer Entwicklungsbericht. Aktueller Betriebsstand vom 22. November 2026 siehe [Produktiver Alpha-Betrieb](production.md) und [Roadmap](roadmap.md). Die nachfolgenden Angaben und Messwerte beziehen sich auf den damaligen Entwicklungsstand.

Keine automatische Rezeptwahl; Treffer erst bei Suchtext, nach Auswahl wieder geschlossen.
Bestehende Auswahl wird angezeigt. Ungültige Auswahl verhindert Speichern mit zugänglichem Fehler.
Text/Punktwahl mittig, sieben Tagesfelder in Wochenansicht auf allen Breiten entfernt; Tag-Rücksprung bleibt.
Editor: einheitliches box-sizing, volle Feldbreiten, scrollbarer Dialog mit Safe-Area-Abstand.
Chochchischtli unverändert.

Prüfung: 38/38 Node-Einzeltests; Chromium: 13 neue, 12 V16 und 25 V17 bestanden.
V15 wird ebenfalls ausgeführt. Browserfälle wählen nun ausdrücklich ein Rezept statt den alten Fehler vorauszusetzen.
Screenshot /tmp/issue11-editor.png visuell geprüft: bündige Felder, kein Überlauf bei 390×844.
Echter iPhone-Test bleibt offen: Safari/PWA, Tastatur, Rotation, Dynamic Type, Fokus/Scroll, Touch/Swipe.
Der obere iOS-PWA-Blur ist nicht isoliert geklärt. Chromium beweist keinen iOS-Compositor.
Kein weiterer CSS-Workaround dafür implementiert. Kein Merge/Deployment.
