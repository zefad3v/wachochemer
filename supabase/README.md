# Gemeinsamer Haushalt

Die App unter `prototype/` verwendet Supabase Auth und PostgreSQL, sobald `prototype/backend-config.js` eine Projekt-URL und einen öffentlichen Schlüssel enthält. Ohne Konfiguration bleibt die bisherige lokale Vorschau verfügbar. Eine teilweise Konfiguration sperrt die App mit einer Fehlermeldung.

## Verhalten

- Anmeldung mit E-Mail und Passwort, E-Mail-Bestätigung und Passwortreset.
- Optionale TOTP-Zwei-Faktor-Anmeldung. Wer einen verifizierten Faktor aktiviert hat, braucht für jeden Haushaltszugriff eine AAL2-Sitzung. Ein zweiter Authenticator kann als Ersatz eingerichtet werden. Es werden keine eigenen Recovery-Codes erzeugt.
- Mehrere Logins pro Haushalt und mehrere Haushalte pro Konto. Alle Mitglieder können planen, Einstellungen ändern, einladen und Mitglieder entfernen. Das letzte Mitglied kann den Haushalt nicht verlassen.
- Personenanzahl und Portionsvorgaben sind unabhängig von der Anzahl der Logins.
- Einladungen sind an die bestätigte E-Mail-Adresse gebunden und sieben Tage gültig. Die App kann sie direkt per SMTP verschicken oder den Link zum Teilen anzeigen. Aktive Links bleiben beim erneuten Versand gültig. Bestätigungsmails und Passwortresets laufen über Supabase Auth.
- Wucheplan, Portionsvorgaben pro Rezept und zusätzliche Einkaufsartikel werden gemeinsam gespeichert. Die App lädt Änderungen bei Fensterfokus und spätestens beim nächsten 10-Sekunden-Intervall, solange kein Menüeditor geöffnet ist. Es gibt keinen Offline-Schreibpuffer.
- Jede Mahlzeit und die Haushaltseinstellungen haben eine Versionsnummer. Veraltete Änderungen werden abgewiesen. Der Entwurf bleibt erhalten; „Aktuelle Stand lade“ bietet einen ausdrücklichen Neustart der Bearbeitung an.
- Resten reservieren Mengen einer früheren Mahlzeit desselben Haushalts. Eine Transaktion verhindert doppelte Reservierungen oder das Löschen einer weiterhin verwendeten Quelle.
- „Lokale Plan übernäh“ importiert den vorhandenen Browserplan ausdrücklich in einen leeren gemeinsamen Plan. Ein fehlgeschlagener Import wird vollständig zurückgerollt, ein identischer Wiederholungsversuch bleibt folgenlos. Ungeklärte Legacy-Portionen müssen vorher im lokalen Prototyp bereinigt werden. Lokale Personen-/Portionsvorgaben und Einkaufszusätze werden dabei nicht automatisch übernommen.
- Rezepttexte und Bilder bleiben die öffentlichen, versionierten JSON-/Bilddateien im Repository. Resten verwenden die Bildreferenz des Ursprungsrezepts. Favoriten, Archivportionen und Anzeigevorlieben bleiben browserbezogen.

## Einrichtung eines eigenen Wachochemer-Projekts

Das Projekt `wachochemer` ist in der Organisation `zefad3v` eingerichtet, Region Zürich (`eu-central-2`), Projekt-Ref `gikbeszvxvqqobdqujzz`. Die öffentliche Browserkonfiguration verweist auf dieses Projekt. Beide Migrationen wurden am 18. November 2026 angewandt. Der gemeinsame Onlinebetrieb ist noch nicht veröffentlicht, da Mailversand, erste Login-Adresse und die echte Anmeldung noch ausstehen. Keine Zugangsdaten anderer Projekte wiederverwenden.

1. Ein separates Supabase-Projekt für Wachochemer auswählen oder erstellen. Die Migrationen in `migrations/` nach Dateiname aufsteigend anwenden. Nur `public` als Anwendungsschema exponieren; `wachochemer_private` bleibt intern. Bei Verwendung der Supabase CLI zuerst `supabase init` und `supabase link --project-ref <wachochemer-ref>` ausführen, dann `supabase db push`. Alternativ können die beiden Transaktionsdateien im SQL Editor des bestätigten Projekts ausgeführt werden.
2. Unter Auth Hooks den PostgreSQL-Hook **Before User Created** auf `public.before_user_created` setzen und aktivieren. Die Migration allein aktiviert den Hook im Auth-Dienst nicht. Damit sind Registrierungen nur für die interne Freigabeliste oder eine noch gültige Haushaltseinladung möglich.
3. Die E-Mail des ersten Kontos administrativ freigeben. Im folgenden SQL den Platzhalter ersetzen und die Adresse korrekt als SQL-String quoten. Diese Liste ist nicht über die öffentliche API erreichbar.

   ```sql
   insert into wachochemer_private.signup_allowlist (email)
   values (lower(btrim('deine-adresse@example.invalid')))
   on conflict do nothing;
   ```

4. Auth mit E-Mail/Passwort aktivieren, E-Mail-Bestätigung verlangen und eine Mindestpasswortlänge von mindestens 8 setzen. TOTP Enrollment und Verification aktivieren. Die private Anwendung erlaubt die Registrierung über den Hook; `enable_signup` darf deshalb nicht global ausgeschaltet werden.
5. Die endgültige HTTPS-Adresse des Prototyps als Site URL setzen. Die exakten Rücksprungpfade samt Einladungsparameter in die erlaubten Redirect URLs aufnehmen, beispielsweise `https://<host>/wachochemer/prototype/` und `https://<host>/wachochemer/prototype/?invite=*`. Die Registrierung mit Link, E-Mail-Bestätigung auf einem zweiten Gerät und Passwortreset müssen mit der tatsächlichen Adresse geprüft werden. Entwicklungsadressen separat und eng begrenzt freigeben.
6. Einen eigenen SMTP-Absender für Bestätigungen und Passwortreset einrichten. Der Standard-Maildienst von Supabase ist für den regulären Versand an Haushaltsmitglieder nicht ausreichend. SMTP-Zugangsdaten bleiben in Supabase und gehören nicht ins Repository.
7. Die öffentlichen Verbindungswerte setzen und die Browserkonfiguration erzeugen.

   ```sh
   export WACHOCHEMER_SUPABASE_URL='https://<wachochemer-ref>.supabase.co'
   export WACHOCHEMER_SUPABASE_PUBLISHABLE_KEY='sb_publishable_<public-key>'
   npm run configure:backend
   ```

   Das Skript akzeptiert einen Publishable Key oder einen alten `anon`-JWT. Secret Keys, `service_role`-JWTs und URLs mit eingebetteten Zugangsdaten werden zurückgewiesen. Die erzeugte Datei ist bewusst öffentlich; den Datenzugriff sichern die serverseitigen Prüfungen.
8. Den konfigurierten Stand auf der bestätigten HTTPS-Adresse veröffentlichen. Das erste Konto registrieren, E-Mail bestätigen, Haushalt erstellen und Personen erfassen. Anschliessend eine zweite Person einladen und gemeinsam prüfen. Wer beide Authenticator-Zugänge verliert, benötigt die administrative Wiederherstellung im Supabase-Projekt.

Als App-Adresse ist `https://zefad3v.github.io/wachochemer/prototype/` im Dashboard gespeichert. Die erlaubten Rücksprünge sind exakt diese Adresse und dieselbe Adresse mit `?invite=*`. Das ist die vorgesehene Zieladresse nach Veröffentlichung; die Änderungen auf PR #20 sind noch nicht auf GitHub Pages veröffentlicht.

Der Auth-Hook `public.before_user_created` ist im Dashboard aktiviert. E-Mail/Passwort und E-Mail-Bestätigung sind eingeschaltet, die Mindestpasswortlänge wurde auf acht Zeichen gesetzt. Anonyme Anmeldungen sind ausgeschaltet. TOTP ist aktiviert; bis zu zehn Faktoren pro Konto sind erlaubt. Die AAL1-Sitzungsbegrenzung nach Anmeldung bei aktiviertem MFA ist eingeschaltet.

Ein tatsächlicher Registrierungsversuch ohne Freigabe/Einladung über den öffentlichen Auth-Endpunkt wurde mit HTTP 403 und „Für die Registrierung brauchst du eine Haushaltseinladung.“ abgewiesen. Dabei wurde kein Konto angelegt. Damit ist auch die Anbindung des Hooks an Supabase Auth geprüft.

Die erste Login-Adresse ist freigegeben. Custom SMTP ist mit Infomaniak und einem Gerätepasswort eingerichtet. Die erste Bestätigungsmail ist beim Nutzer angekommen. Bestätigung und gemeinsame Nutzung mit zwei regulären Konten sind noch zu prüfen. Die Registrierungsvorlage ist im Dashboard auf Schweizerdeutsch gespeichert. Der Betreff lautet «Wa chochemer? Bitte E-Mail bestätige», der Inhalt liegt in templates/confirmation.html. Der Bestätigungslink verwendet weiterhin {{ .ConfirmationURL }}.

## Versand von Haushaltseinladungen aktivieren

1. Die Migration `20261119194713_household_invitation_mail.sql` im bestätigten Wachochemer-Projekt anwenden. Bestehende Einladungen und ihre Ablaufdaten bleiben erhalten.
2. Unter **Edge Functions → Secrets** `INVITE_SMTP_USERNAME` mit der vollständigen Infomaniak-Postfachadresse und `INVITE_SMTP_PASSWORD` mit einem Gerätepasswort dieses Postfachs hinterlegen. Ein eigenes Gerätepasswort für Einladungen erlaubt getrenntes Widerrufen. Wenn der bestehende Absender vom Login abweicht, optional `INVITE_SMTP_FROM` mit der beim Postfach eingerichteten Absenderadresse setzen. Die separaten Secrets ändern den bestehenden Auth-Versand nicht.
3. `supabase/functions/send-household-invitation/index.ts` als `send-household-invitation` mit aktiviertem JWT-Gateway bereitstellen. Supabase stellt `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` serverseitig bereit. Die Funktion verbindet sich per TLS mit `mail.infomaniak.com:465` und erzeugt Links zur fest hinterlegten GitHub-Pages-Adresse. Die Browseränderung erst nach der Migration und dem Funktions-Deploy veröffentlichen.
4. Mit einem eigenen Testempfänger den Eingang der Einladung und das Öffnen des Links prüfen. «Verschickt» zeigt die SMTP-Annahme an. Bei nicht bestätigtem Versand bleibt der Link in der App zum Teilen verfügbar.

Die Versandreservierung prüft die Mitgliedschaft und die AAL2-Anforderung mit dem JWT der anfragenden Person. Sie erzwingt eine Minute Abstand pro Einladung und höchstens zwölf Versuche je Konto innerhalb eines Stundenfensters. Nur der Server kann die SMTP-Annahme als Versandzeitpunkt speichern.

## Abnahme der eingerichteten Datenbank

Die SQL-Regressionen `shared_households.sql` und `online_app.sql` liefen erfolgreich auf dem echten Supabase PostgreSQL 17.12. Die Prüfungen enthalten Haushalte mit mehreren Konten, fremde Haushalte, bestätigte und unbestätigte E-Mails, AAL1/AAL2, Einladungen, Entzug der Mitgliedschaft, Versionskonflikte, Restenreservierungen und atomaren Import. Sämtliche Fixtures wurden zurückgerollt; danach waren `auth.users`, Haushalte, Mitgliedschaften und Mahlzeiten leer.

Mit dem tatsächlichen öffentlichen Publishable Key wurden die REST-Zugriffe auf alle vier Anwendungstabellen und der Snapshot-RPC ohne Anmeldung geprüft. Alle fünf Zugriffe wurden mit `42501` abgewiesen. Auf allen öffentlichen Anwendungstabellen ist RLS aktiviert. Die private Freigabeliste ist weder für `anon` noch für `authenticated` lesbar oder beschreibbar; sämtliche Tabellenrechte wurden explizit entzogen. Der pauschale Hinweis von `list_tables` auf fehlendes RLS in diesem privaten Schema ist daher kein Beleg für öffentliche Erreichbarkeit. Die Supabase-Sicherheits- und Performance-Advisors meldeten nach den Migrationen keine Befunde.

Diese Prüfung verwendet SQL-Testkonten innerhalb zurückgerollter Transaktionen. Die echte Registrierung, E-Mail-Zustellung, Authenticator-Einrichtung und gemeinsame Nutzung mit zwei regulären Logins stehen weiter aus.

## Lokal prüfen

```sh
npm ci
npm test
npm run test:database
npm run test:online
npm run build:auth
```

`test:database` führt die Migrationen und SQL-Regressionstests in echtem PostgreSQL über PGlite aus. Die Tabellen und JWT-Funktionen von Supabase Auth sind dort Test-Fixtures. Geprüft werden getrennte Haushalte, Einladungen, bestätigte E-Mails, AAL1/AAL2, Mitgliedsentzug, Schreibrevisionen, Restenreservierungen, atomarer Import und Registrierungshook.

`test:online` führt die tatsächlichen App-Module in einer DOM-Testumgebung aus. Supabase Auth und RPC-Transport sind simuliert. Die Prüfung umfasst Login, Haushalt, wiederholte Speicherung, Versionskonflikte mit Neuladen, Einladung, Authenticator-Abbruch, 2FA-Challenge, Passwortreset und verspätete Schreibantworten nach dem Abmelden.

Die Workflow-Datei `check-backend.yml` führt diese Prüfungen aus und kontrolliert den reproduzierbaren Browser-SDK-Build. Der Rezeptgenerator und die App benötigen zur Laufzeit keinen Buildserver. Nur für Entwicklung und Tests ist `npm ci` nötig.

Für eine wegwerfbare Supabase-Testdatenbank können die SQL-Dateien zusätzlich mit `psql -X -v ON_ERROR_STOP=1 -f <datei>` ausgeführt werden. Jede Datei verwendet eine Transaktion mit abschliessendem Rollback. Keine Testkonten in einer produktiven Datenbank anlegen.

## Noch erforderliche echte Abnahme

Die lokalen Tests ersetzen die Dienstintegration nicht. Nach der Projektverbindung sind diese Abläufe mit zwei echten Konten zu prüfen.

- Registrierung mit und ohne Einladung, E-Mail-Bestätigung, Passwortreset.
- Zwei Mitglieder sehen und ändern denselben Plan. Ein fremder Haushalt bleibt unzugänglich.
- Gleichzeitige Änderung derselben Mahlzeit und gleichzeitige Restenreservierungen.
- Mitglied entfernen, Einladungslink widerrufen oder ablaufen lassen.
- TOTP aktivieren, neu anmelden, falschen Code ablehnen, Ersatzfaktor und Deaktivierung prüfen.
- Netzverlust beim Speichern, erneutes Laden und Import nach einem Verbindungsabbruch.
- iPhone/Safari im Hoch- und Querformat, insbesondere Anmeldung, Dialogscrollen und Rezeptbild.

Die gemeinsame Browserumgebung konnte den lokalen Vorschauport nicht erreichen. Die DOM-Prüfung ist erfolgreich, eine visuelle Browserabnahme dieses Online-Standes ist deshalb noch ausstehend.

## Referenzen

- [Passwort-Anmeldung](https://supabase.com/docs/guides/auth/passwords)
- [TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Registrierungshook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
- [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Eigener SMTP-Versand](https://supabase.com/docs/guides/auth/auth-smtp)
