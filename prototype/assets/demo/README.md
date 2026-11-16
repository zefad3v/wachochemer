# Bild-Demo V16

`pumpkin-soup.webp` wurde am 15. November 2026 für diese visuelle Prüfung mit OpenAI Image Generation erzeugt (generisches Motiv: Kürbissuppe, Käsetoast, grüner Tisch, warmes Tageslicht). Keine fremde Fotografie, keine Stockbildquelle. Das Motiv dokumentiert weder die Zubereitung noch das tatsächliche kanonische Rezept. KI-Bilder können kulinarisch ungenau sein.

Nur mit `?imageDemo=1` oder der expliziten Einstellung «Bild-Demo aazeige» sichtbar. Die Zuordnung in `prototype/recipe-images.mjs` ist eine Präsentationsfixture; die Rezept-JSONs und gespeicherten Menüs enthalten keine Demo-Bilddaten. Im UI stehen Bild-Demo/KI-Hinweise. Es wird kein Menü automatisch angelegt.

Eigene, rechtlich geklärte Fotos später in `recipeImages` anhand stabiler Rezept-ID eintragen, z. B. `'kuerbissuppe-kaesetoast':'./assets/recipes/kuerbissuppe.webp'`. Eigene Bilder haben Vorrang, auch bei aktiver Demo. Bei Bildern ohne verifizierte Zuordnung bleibt der neutrale Platzhalter. Die separate Demo-Zuordnung kann danach gelöscht werden.
