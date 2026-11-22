# Produktiver Alpha-Betrieb

Stand 22. November 2026. Wa chochemer wird mit echten Haushaltsdaten von Fabian und Jasmine verwendet. Der Status ist produktive Alpha mit laufender Geräteabnahme.

## Adresse und Kompatibilität

Der öffentliche Einstieg ist https://zefad3v.github.io/wachochemer/. Er leitet zur bestehenden App unter `/wachochemer/prototype/` weiter und übernimmt Queryparameter und URL-Fragment. Einladungen und Auth-Rücksprünge bleiben dadurch erhalten. Öffentliche Rezeptseiten unter `/rezepte/<slug>/` bleiben erreichbar.

Der technische App-Pfad, Manifest-ID, Manifest-Scope und die SDK-Speicherschlüssel werden beibehalten. Bestehende PWA-Installationen müssen wegen dieses Releases nicht neu erstellt werden. Der Einstieg ist kein Hostingwechsel und braucht keine neue Datenbank oder kostenpflichtige Umgebung. Der Generator erzeugt den Einstieg bei jedem Lauf erneut.

Eine spätere eigene Domain oder Verschiebung der App-Dateien braucht eine gesonderte Migration von Auth-Rücksprungadressen, Mail-Links, Manifest und Origin-gebundenen Sitzungen. Dafür ist eine eigene Releaseentscheidung erforderlich.

## Dienste und Daten

GitHub Pages hostet das Frontend. Das zugeordnete Supabase-Projekt ist `wachochemer`, Ref `gikbeszvxvqqobdqujzz`, Region `eu-central-2`. Supabase übernimmt Auth, Haushalt, Menüplan und private Rezepte. Edge Functions übernehmen Einladungsversand und Rezeptimport.

Alle Mitglieder eines Haushalts haben dieselben Rechte. Die Datenbank erzwingt Mitgliedschaft und bei aktiviertem MFA AAL2. Änderungen verwenden Revisionen. Konflikte erhalten den Entwurf. Kein Offline-Schreibbetrieb.

Öffentliche Startrezepte werden über Git gepflegt. Haushaltsrezepte werden in der App erfasst. Ein endgültiges Löschen erfordert eine Bestätigung und wird bei Verwendung im Wochenplan blockiert. Produktive Daten werden für Tests nicht gelöscht oder zurückgesetzt.

## Bedienung dieses Releases

- Die mobile Navigation schwebt über dem Inhalt. Transparenz und Unschärfe haben einen deckenden Fallback bei reduzierter Transparenz oder fehlender Browserunterstützung.
- Der Wochenplan verwendet ein durchgehendes, abgedunkeltes Rezeptbild als Atmosphäre. Der Header hat zusätzliche Tönung für lesbaren Text.
- Suche und Plus im Kochbuch werden beim Hochscrollen wieder sichtbar. Während der Eingabe bleibt die Suche zugänglich.
- Dauer und Sortierung haben angepasste geschlossene Felder und native Auswahlmenüs.
- Datum und Mahlzeit stehen bei ausreichender Breite nebeneinander. Sehr schmale Ansichten wechseln auf eine Spalte.
- Im Menüeditor werden zunächst acht Rezepte gerendert. Weitere erscheinen über eine Schaltfläche. Die Suche arbeitet über alle geladenen Rezepte.
- Kochbuchfilter und Sortierung berücksichtigen öffentliche und private Rezepte gemeinsam.

## Freigabe und Rücknahme

Änderungen laufen über einen Pull Request mit passenden automatisierten Prüfungen. Nach Freigabe und Merge baut GitHub Pages die Veröffentlichung. Der Abschluss wird erst gemeldet, wenn die neue Version unter der Liveadresse geprüft wurde. Bei einem Fehler wird der fehlerhafte Commit über einen neuen Commit zurückgenommen. Bestehende Datenbankmigrationen werden auf Kompatibilität geprüft, bevor ein älteres Frontend wieder aktiviert wird.

Die Supabase-Backup-Verfügbarkeit und eine Wiederherstellung mit den tatsächlich gebuchten Projektleistungen sind vor einer breiten öffentlichen Freigabe gesondert zu prüfen. Ein Backup- oder Restore-Test wird durch dieses Release nicht behauptet.

## Abnahmegrenzen

Automatisierte Node-, SQL- und DOM-Prüfungen sowie eine Chromium-Prüfung in CI werden im Releasebericht ausgewiesen. Native iOS-Menüs, Statusbereich, PWA-Rotation, Touchverhalten und der Glas-Eindruck brauchen die Abnahme auf dem echten iPhone. Der Alpha-Status behauptet keine abgeschlossene allgemeine Gerätefreigabe.

Bring! bietet weiterhin die vorhandene Einzelrezeptübergabe und eine kopierbare Zutatenvorbereitung. Ein automatischer Gesamtimport und der tatsächliche Inhalt einer Bring!-Liste sind durch die App nicht bestätigt.

## Dokumentation

README, Architektur und Roadmaps beschreiben den aktuellen Stand. Historische UI-Berichte behalten ihre damaligen Messwerte und Screenshots. Ein Hinweis am Anfang verweist auf diesen Betriebsstand. Ihre damaligen Aussagen zu lokalem Speicher, offenen Merges und Demo-Daten sind keine aktuellen Betriebsvorgaben.

## Anbieterunabhängiger Rezeptimport, 22. November 2026

Öffentliche HTTPS-Seiten werden ohne Anbieterliste eingelesen. Jeder Redirect wird erneut geprüft. DNS-Adressen werden auf öffentliche Ziele beschränkt und für die TLS-Verbindung festgehalten. Interne Adressen, Zugangsdaten in URLs und andere Ports sind gesperrt. Fehlende Rezeptdaten, nicht erreichbare Seiten und Grössenlimits ergeben eine Rückmeldung. Bei KI-Text plus Link wird das Rezeptbild zusätzlich versucht; ein Bildfehler verhindert den Textimport nicht. Kochkarussell wurde mit vier Portionen, zwölf Zutaten, drei Schritten, 10/20/30 Minuten und Bild geprüft.

## Transportkorrektur für die Edge-Laufzeit

Der HTTPS-Import verbindet sich mit der geprüften öffentlichen IP über Deno.connect und startet TLS mit dem ursprünglichen Hostnamen. Zertifikatsprüfung und SNI bleiben aktiv. Der Supabase-Edge-Runtime fehlen die Node-HTTPS-Option lookup und die neuere TCP-Proxy-Option von Deno.createHttpClient. Deshalb genügt ein Test mit aktuellem Deno allein nicht. Der Curry-Abruf samt zwölf Zutaten, drei Schritten, Zeit und Bild wurde am 22. November direkt in der bereitgestellten Supabase-Funktion verifiziert. Temporäre Diagnoserouten sind anschliessend entfernt worden.
