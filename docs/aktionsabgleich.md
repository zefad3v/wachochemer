# Featurewunsch: Aktionen bei Detailhändlern und Verkaufsstellen abgleichen

Status: **Idee / spätere Ausbaustufe** (26. Oktober 2026). Noch nicht zur Implementierung freigegeben.

## Ziel

Wachochemer soll beim Erstellen des Wochenplans und der Einkaufsliste auf aktuelle Aktionen von Schweizer Grossverteilern und weiteren bevorzugten Verkaufsstellen hinweisen können. So können Familien passende Rezepte günstiger einkaufen, ohne dass Aktionen den Speiseplan unkontrolliert bestimmen.

## Nutzerszenarien

1. Die Familie wählt ihre relevanten Händler bzw. Filialen (beispielsweise Migros, Coop, Aldi, Lidl, Denner). Die Liste ist konfigurierbar.
2. Beim Wochenplan werden Aktionen hervorgehoben, die zu **bereits geplanten Rezepten** passen. Optional kann die Planung passende saisonale bzw. reduzierte Zutaten berücksichtigen.
3. Die Einkaufsliste zeigt geeignete Angebotsprodukte zu Zutaten und möglichst eine nachvollziehbare Ersparnis.
4. Ein Angebotsvorschlag darf ein Rezept oder eine Zutat nur nach ausdrücklicher Bestätigung ersetzen. Allergene, Vorlieben, Mengen und Rezeptqualität haben Vorrang.
5. Die Planung berücksichtigt die Gültigkeit der Aktion für das voraussichtliche Einkaufsdatum und die relevanten Filialen.

## Fachliche Anforderungen und Datenmodell

* **Zutaten bleiben händlerunabhängig.** Aktionen werden als eigener Datenbestand geführt und über eindeutige Zutaten-IDs oder geprüfte Zuordnungen verbunden.
* Ein Angebot soll möglichst folgende Felder abbilden: Händler, Filiale oder Region, Produktbezeichnung, Hersteller, Produkt-/Angebotskennung, Packungsinhalt, Einheit, Aktionspreis, regulärer Preis (falls verlässlich verfügbar), Preis pro Basiseinheit, Währung, Gültigkeitsbeginn und -ende, Bedingungen, Quelle, Zeitpunkt der letzten Aktualisierung und Datenqualität.
* Unterscheiden zwischen einer **exakten Übereinstimmung** (zum Beispiel 500 g Penne) und einer **ähnlichen Alternative** (andere Marke, Sorte oder Packungsgrösse). Alternativen explizit als solche kennzeichnen.
* Packungsgrössen und Einheiten normalisieren, damit Preise und benötigte Rezeptmengen sinnvoll verglichen werden können.
* Mehrfachkäufe, Mindestmengen, persönliche Kundenkartenaktionen, digitale Coupons und nur lokal verfügbare Angebote separat kennzeichnen.
* Angebote nicht als aktuell anzeigen, wenn Gültigkeit oder Aktualität ungeklärt sind. Nach Ablauf automatisch ausblenden.
* Keine behauptete Ersparnis, wenn Vergleichspreis, benötigte Menge oder Angebotsbedingungen nicht belastbar sind.
* Bevorzugte Händler bzw. Filialen gehören später in persönliche Einstellungen. Ohne Profil kann der Vergleich mit lokalen Defaults oder einer expliziten Auswahl funktionieren.

## Umsetzbarkeit zuerst prüfen

* **Datenquellen:** Offizielle Schnittstellen, Feeds, Kooperationen, erlaubte Importformate und Nutzungsbedingungen je Händler prüfen. Öffentlich sichtbare Prospekte sind noch keine Erlaubnis zur automatischen Übernahme.
* **Betriebsaufwand:** Aktualisierungsrhythmus, Fehlererkennung, historische Preise, lokale Unterschiede und Zuordnungsqualität evaluieren. Keine aufwendige Scraping-Infrastruktur ohne geklärten rechtlichen und wirtschaftlichen Nutzen.
* **Pilot:** Nur eine Verkaufsstelle bzw. ein Händler, wenige Zutatenkategorien und eine begrenzte Testwoche. Erst Zuordnungs- und Einsparqualität messen, danach ausbauen.
* **Architektur:** Import und Aktualisierung vom statischen Rezeptstamm entkoppeln; Angebotsdaten als eigenständiges, austauschbares Modul modellieren. Ein dauerhafter Backend-Dienst ist für die Validierung des Nutzens nicht automatisch nötig.

## Abnahmekriterien für einen künftigen Pilot

* Es wird ein konkretes Angebot mit Quelle, Filiale/Region und Gültigkeit zu einer Zutat angezeigt.
* Die Übereinstimmung ist nachvollziehbar und unterscheidet exakt von ähnlich.
* Packungs- und Einheitenunterschiede verursachen keine irreführenden Ersparnisangaben.
* Abgelaufene oder unbestätigte Angebote werden nicht als gültig ausgegeben.
* Bestehende Wochenplanung, Portionen, Restenlogik und Bring!-Integration funktionieren auch ganz ohne Angebotsdaten.

## Priorität

**Backlog, nach dem funktionalen Kern.** Zuerst echte Rezeptverwaltung, persistenter Wochenplan, Portions-/Restenberechnung und nutzbare Einkaufsliste mit Bring! stabilisieren. Anschliessend Datenquellen und Aufwand des Angebotsabgleichs untersuchen. Die Funktion soll schon jetzt bei Zutaten-IDs und Datenmodell berücksichtigt werden, aber keine zusätzliche UI-Komplexität auslösen.
