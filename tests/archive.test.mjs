import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildRecipeIndex,buildFromFiles} from '../scripts/build-recipe-index.mjs';
import {validateIndex,fetchArchiveData,archiveEntries,filterArchive} from '../prototype/catalog.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const load=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const catalog=load('data/ingredients.json');
const filenames=readdirSync(join(root,'data/recipes')).filter(x=>x.endsWith('.json'));
const recipes=filenames.map(x=>load('data/recipes/'+x));
const index=load('data/recipe-index.json');
const fetchJson=async path=>load('prototype/'+path);
test('generated directory covers every canonical JSON recipe',()=>{
 assert.deepEqual(index,buildFromFiles());
 assert.deepEqual(index,buildRecipeIndex(recipes,catalog));
 assert.equal(index.recipes.length,filenames.length);
 assert.equal(index.recipes.length,3);
 assert(index.recipes.some(x=>x.id==='apfel-omeletten'));
});
test('manifest excludes demonstration recipes and contains only IDs/slugs',()=>{
 assert(index.recipes.every(x=>!x.id.includes('demo')));
 assert(index.recipes.every(x=>Object.keys(x).sort().join(',')==='id,slug'));
 assert.equal(validateIndex(index),index);
});
test('archive loads all source data, with descriptions, instructions and quantities',async()=>{
 const result=await fetchArchiveData(fetchJson);
 assert.deepEqual(result.recipes.map(r=>r.id).sort(),index.recipes.map(r=>r.id).sort());
 assert(result.recipes.every(r=>r.ingredients.length>0&&r.instructions['de-CH'].length>0));
 assert.deepEqual(result.catalog,catalog);
});
test('all archive entries come from real recipes without invented metadata',()=>{
 const entries=archiveEntries(recipes,{'poulet-fajitas':'/placeholder-image.jpg'});
 assert.equal(entries.length,3);
 assert(entries.every(x=>x.real===true));
 for(const entry of entries){
  const source=recipes.find(r=>r.id===entry.id);
  assert.equal(entry.title,source.title);
  assert.equal(entry.description,source.description);
  assert.equal(entry.minutes,source.prepMinutes+source.cookMinutes);
 }
 assert.equal(entries.find(x=>x.id==='apfel-omeletten').image,null);
});
test('search ignores case and accents, also searches descriptions',()=>{
 const entries=archiveEntries(recipes);
 assert.equal(filterArchive(entries,{query:'OMELETTEN'}).length,1);
 assert.equal(filterArchive(entries,{query:'küRBIS'}).length,1);
 assert.equal(filterArchive(entries,{query:'kuerbis'}).length,0); // ae/ue are spelling changes, not accents
 assert.equal(filterArchive(entries,{query:'Quark'})[0].id,'apfel-omeletten');
 assert.equal(filterArchive(entries,{query:'no match'}).length,0);
 assert.equal(filterArchive(entries).length,3);
});
test('favorites always filter canonical recipe IDs',()=>{
 const entries=archiveEntries(recipes);
 const hits=filterArchive(entries,{filter:'favorites',favorites:new Set(['apfel-omeletten','one-pot-pasta-demo'])});
 assert.deepEqual(hits.map(x=>x.id),['apfel-omeletten']);
});
test('bad and duplicate manifests are rejected',()=>{
 assert.throws(()=>validateIndex({schemaVersion:1,recipes:[]}),/Ungültiges/);
 assert.throws(()=>validateIndex({schemaVersion:1,recipes:[{id:'bad/',slug:'bad'}]}),/Ungültiger/);
 assert.throws(()=>validateIndex({schemaVersion:1,recipes:[index.recipes[0],index.recipes[0]]}),/Doppeltes/);
});
test('archive does not silently fall back when source files fail',async()=>{
 await assert.rejects(()=>fetchArchiveData(async path=>{if(path.endsWith('apfel-omeletten.json'))throw Error('404');return fetchJson(path)}),/404/);
 await assert.rejects(()=>fetchArchiveData(async path=>path.endsWith('recipe-index.json')?{...index,recipes:[{id:'wrong',slug:'apfel-omeletten'}]}:fetchJson(path)),/stimmt nicht/);
});
test('duplicate and unknown recipe ingredients fail validation',()=>{
 const duplicate=[recipes[0],recipes[0]];
 assert.throws(()=>buildRecipeIndex(duplicate,catalog),/duplicate recipe ID/);
 const broken=structuredClone(recipes[0]);broken.ingredients[0].ingredientId='not_in_catalog';
 assert.throws(()=>buildRecipeIndex([broken],catalog),/unknown ingredientId/);
});
