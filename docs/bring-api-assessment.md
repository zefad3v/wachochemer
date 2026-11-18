# Bring! Anbindung: geprüfte Schnittstellen und Produktentscheid

Stand: 14.11.2026. Quellen: offizielle Bring!-Dokumentation und separat gekennzeichnete inoffizielle Community-Implementierungen.

## Verifizierte offizielle Integration

* Bring! [Web-to-App Import Developer Guide](https://sites.google.com/getbring.com/bring-import-dev-guide/web-to-app-integration), Revision 1.3, beschreibt ein Rezept pro Widget oder Deeplink.
* Eingabe kann eine öffentliche URL mit Schema.org/JSON-LD Rezeptdaten oder eine unterstützte JSON-Datei sein. Der Parser benötigt u. a. Titel, Autor und Zutaten.
* Ein Import lässt sich über das offizielle Widget `data-bring-import` oder über den Deeplink `https://api.getbring.com/rest/bringrecipes/deeplink?url=...&source=web&baseQuantity=...&requestedQuantity=...` auslösen. Der Parser unterstützt Portionsskalierung.
* Der Bring! [Blog zum Wochenplan](https://www.getbring.com/blog-posts/essen-planen-fur-die-woche-mit-bring) beschreibt einen Importvorgang für jedes Rezept: Zutaten auswählen und gesammelt für dieses Rezept in die Bring!-Liste übernehmen. Das Rezept wird beim Import in «Meine Rezepte» gespeichert.
* **Nicht dokumentiert**: Offizieller Batchimport mehrerer Rezept-URLs, Abfrage, ob eine Rezept-URL bereits in «Meine Rezepte» vorhanden ist, oder direktes Hinzufügen beliebiger Einkaufsposten über eine öffentliche authentifizierte API.
* Folglich lassen sich die zwei Zustände «Rezept bereits gespeichert» und «Zutaten für den aktuellen Einkauf noch nicht hinzugefügt» über die offizielle Web-to-App Schnittstelle nicht sicher unterscheiden. Ein UI-Häkchen darf nur bedeuten, dass ein lokaler Vorgang bestätigt wurde, nicht dass ein Rezept in Bring! vorhanden ist.

## Inoffizielle API

* [miaucl/bring-api](https://miaucl.github.io/bring-api/) dokumentiert `batch_update_list` mit mehreren Posten in einem Vorgang, sowie Listenlesen und Einträge ändern.
* Diese Python-Bibliothek ist ausdrücklich **nicht von Bring! autorisiert oder unterstützt**. Für Login sind Benutzerzugangsdaten nötig, und die interne Schnittstelle kann sich ändern. Das ist keine öffentliche Integrationszusage und kein Grund, Credentials in das statische Frontend aufzunehmen.
* Ein möglicher künftiger Pilot benötigt eine bewusste Entscheidung zu Nutzungsbedingungen, geschütztem Backend, Auth, Token-Management, Dubletten, Grösseneinheiten, Zugriffsrechten und Backup. Ohne diesen Entscheid keine Implementierung.

## Empfehlung und technische Schritte

1. **Bring! bleibt die einzige echte Einkaufsliste.** Die Hauptnavigation der mobilen Wachochemer-App enthält standardmässig nur Wucheplan und Chochchischtli. Die bestehende Zutatenaggregation bleibt im Code erhalten, wird aber nicht als zweite Einkaufsliste vermarktet.
2. **«Für Bring! vorbereiten»** gehört als dezente Aktion zur Wochenübersicht. Bis M6 zeigt diese nur eine zusammengefasste Zutatenvorschau beziehungsweise kopierbare Liste. Kopierte Zeilen sind nicht automatisch in Bring! importiert.
3. Für jedes geplante Rezept mit öffentlicher Rezept-URL ist ein offizieller Einzelimport möglich, aber Nutzer muss in Bring! prüfen, ob es bereits gespeichert ist und welche Zutaten bei diesem Einkauf noch benötigt werden.
4. Wenn ein offizieller Gesamtimport unverzichtbar wird: Anfrage an Bring! Labs nach einer dokumentierten Partnerschnittstelle beziehungsweise Klärung eines autorisierten Workflow. Nicht mit Reverse Engineering des Nutzeraccounts beginnen.
5. Für das spätere M6 einen End-to-End-Test mit zwei Rezepten an einer echten Bring!-Testliste durchführen: nacheinander importieren, Rezept in «Meine Rezepte» prüfen, Zutatenliste, Doppelimporte und Portionskorrekturen verifizieren. Ohne echte Liste keine Behauptung über diese Zustände.
6. M4 muss zuvor die korrekten Kochmengen inklusive Resten modellieren; nur dann können die Übertragungsmengen stimmen.

## Produktregel

**Ein in Bring! gespeichertes Rezept ist nicht dasselbe wie die für einen Einkauf benötigten Zutaten.** Wachochemer darf Zutaten nur nach nachvollziehbarer Nutzerentscheidung als übertragen markieren. Es muss nichts automatisch noch einmal senden und niemals den Bring!-Status behaupten, den es nicht abfragen kann.
