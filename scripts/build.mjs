// Generates static HTML and schema.org/Recipe from the JSON source of truth.
// Run: node scripts/build.mjs
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read = path => JSON.parse(readFileSync(join(root,path),"utf8"));
const catalog=read("data/ingredients.json");
const labels=read("locales/gsw-CH.json").labels;
function buildHtml(recipe, catalog, labels) {
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const decimal = n => Number(n).toLocaleString("de-CH",{maximumFractionDigits:2});
  const amounts = {g:"g",kg:"kg",ml:"ml",l:"l",piece:"",tbsp:"EL",tsp:"TL"};
  const names = new Map(catalog.ingredients.map(item=>[item.id,item.names["de-CH"]]));
  const format = entry => {
    const name = names.get(entry.ingredientId);
    if (!name) throw new Error(`Unknown ingredient: ${entry.ingredientId}`);
    const amount = entry.unit==="to_taste" || entry.quantity===null ? "Etwas" : `${decimal(entry.quantity)}${amounts[entry.unit] === undefined ? (()=>{throw new Error("Unknown unit "+entry.unit)})() : amounts[entry.unit] ? " "+amounts[entry.unit] : ""}`;
    const nouns = {wheat_tortilla_small:"kleine Weizentortillas"};
    const displayName = nouns[entry.ingredientId] || name;
    return `${amount} ${displayName}${entry.optional ? " (optional)" : ""}`;
  };
  if (!Number.isSafeInteger(recipe.baseServings) || recipe.baseServings<1) throw new Error("Invalid baseServings");
  if (!/^[a-z0-9-]+$/.test(recipe.slug)) throw new Error("Invalid slug");
  const lines=recipe.ingredients.map(format);
  const instructions=recipe.instructions["de-CH"];
  if (!Array.isArray(instructions) || !instructions.length) throw new Error("Missing de-CH instructions");
  const schema={"@context":"https://schema.org","@type":"Recipe","name":recipe.title,"description":recipe.description,"recipeCuisine":recipe.cuisine,"recipeCategory":"Abendessen","recipeYield":`${recipe.baseServings} Portionen`,"prepTime":`PT${recipe.prepMinutes}M`,"cookTime":`PT${recipe.cookMinutes}M`,"totalTime":`PT${recipe.prepMinutes+recipe.cookMinutes}M`,"recipeIngredient":lines,"recipeInstructions":instructions.map(text=>({"@type":"HowToStep",text}))};
  const safeJson=JSON.stringify(schema).replace(/</g,"\\u003c");
  return `<!doctype html>
<html lang="de-CH">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#faf6ee">
<title>${esc(labels.brand)} | ${esc(recipe.title)}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#faf6ee;color:#25332b;margin:0}
header,main,footer{max-width:760px;margin:auto;padding:22px}header{border-bottom:1px solid #d8ddcf}
h1{font-size:2.5rem;margin:.2em 0}h2{margin-top:1.6em}a{color:#28664a}
.tag{color:#50755d;font-weight:650}.card{background:white;border-radius:18px;padding:22px;box-shadow:0 3px 16px #0000000a}
.meta{color:#586b5d}li{padding:5px 0;line-height:1.5}.brand{font-size:1.3rem;font-weight:800}footer{color:#637064;font-size:.9rem}
</style>
<script type="application/ld+json">${safeJson}</script>
<script async src="https://platform.getbring.com/widgets/import.js"></script>
</head>
<body>
<header><div class="brand">${esc(labels.brand)}</div><div class="meta">${esc(labels.archive)} · Rezept</div></header>
<main><article class="card">
<div class="tag">Familienrezept · Mild</div><h1>${esc(recipe.title)}</h1>
<p>${esc(recipe.description)}</p><p class="meta">${recipe.prepMinutes+recipe.cookMinutes} Minuten · ${esc(recipe.householdNote)}</p>
<h2>${esc(labels.ingredients)}</h2><ul>${lines.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>
<h2>${esc(labels.instructions)}</h2><ol>${instructions.map(i=>`<li>${esc(i)}</li>`).join("")}</ol>
<h2>${esc(labels.importToBring)}</h2>
<p>Mit em Bring! Button chasch d Zutate grad uf dini Iichaufslischte überneh. Grundrezept: ${recipe.baseServings} Portione.</p>
<div data-bring-import data-bring-language="de" data-bring-theme="light" data-bring-base-quantity="${recipe.baseServings}" data-bring-requested-quantity="${recipe.baseServings}" style="display:none"><a href="https://www.getbring.com">Bring! Einkaufsliste App</a></div>
<p class="meta">Alternativ chasch s Rezept im Safari-Menü über «Rezept übertragen» importiere.</p>
</article></main><footer>${esc(labels.brand)} · Chochchischtli</footer>
</body></html>
`;
}
const recipes=readdirSync(join(root,"data/recipes")).filter(name=>name.endsWith(".json")).sort().map(name=>read("data/recipes/"+name));
if (!recipes.length) throw new Error("No recipes");
const ids=new Set();const slugs=new Set();
for(const recipe of recipes){
 if(ids.has(recipe.id)||slugs.has(recipe.slug)) throw new Error("Duplicate recipe id or slug");
 ids.add(recipe.id);slugs.add(recipe.slug);
 const html=buildHtml(recipe,catalog,labels);
 const dir=join(root,"rezepte",recipe.slug);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,"index.html"),html);
}
// Until an archive homepage exists, the first recipe stays available at the root URL.
writeFileSync(join(root,"index.html"),buildHtml(recipes[0],catalog,labels));
console.log("Generated "+recipes.length+" recipe pages and index.html");
