# Gemeinsamer Haushalt

Ein Konto hat pro Haushalt eine Mitgliedschaft. Die Portionsvorgaben sind am Haushalt gespeichert und zählen unabhängig vom Login. Alle Mitglieder haben dieselben Rechte. Der Onlinebetrieb verwendet eine Zeile pro Haushalt, Kalendertag und Mahlzeit mit einer Revision für konkurrierende Änderungen. Eine Restenreservierung verweist auf eine frühere Mahlzeit desselben Haushalts.

Die Migration in `migrations/` setzt Supabase Auth voraus. Row Level Security schränkt Lesezugriffe und Änderungen der Haushaltseinstellungen auf Mitglieder ein. Schreibfunktionen für Mitgliedschaften, Einladungen und Mahlzeiten prüfen den Zugriff in der Datenbank. Die private Funktionsebene liegt ausserhalb der exponierten API-Schemas. Konten mit aktivierter 2FA müssen eine verifizierte Sitzung vorweisen.

## Lokal prüfen

Auf einer lokalen Supabase Datenbank mit angewandter Migration:

```sh
psql "$WACHOCHEMER_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/shared_households.sql
```

Die Prüfung legt Testkonten und Haushalte in einer Transaktion an und setzt sie am Ende zurück. Sie deckt Zugriffe zwischen zwei Haushalten, eingeladene Mitglieder, 2FA, entzogene Mitgliedschaften, veraltete Mahlzeitenrevisionen und doppelte Restenreservierungen ab.

## Anbindung des Prototyps

Für den privaten Start werden Konten per Einladung eingerichtet. Eine Haushaltseinladung ist an die bestätigte E-Mail-Adresse des eingeladenen Kontos gebunden. Die Datenbank erzeugt und prüft den Einladungsschlüssel. Die App braucht noch den E-Mail-Login mit Passwortreset, die TOTP-Einrichtung, den Einladungsablauf und die Online-Anbindung des Wochenplans. Die Übernahme eines vorhandenen Browserplans wird explizit aus dem bestehenden Gerät ausgelöst.
