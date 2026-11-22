# Produktive App im bestehenden technischen Pfad

Dieser Ordner enthält die produktiv genutzte Alpha von Wa chochemer. Der Ordnername bleibt für kompatible PWA-Installationen, Sitzungen und Links erhalten.

[App öffnen](https://zefad3v.github.io/wachochemer/) · [Betrieb](../docs/production.md) · [Architektur](../docs/architecture.md) · [Entwicklung und Prüfungen](../README.md).

Die App lädt öffentliche Startrezepte und private Haushaltsrezepte in einen gemeinsamen Katalog. Der Onlinebetrieb verwendet das ausschliesslich diesem Repository zugeordnete Supabase-Projekt. `backend-config.js` enthält nur öffentliche Konfiguration.

Lokal den HTTP-Server im Repository-Hauptverzeichnis starten. Node-Tests prüfen Fachlogik, DOM-Tests simulieren Supabase. Die native iPhone-Darstellung bleibt separat abzunehmen.
