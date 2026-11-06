// Browser-safe archive adapter; no fixed list of real recipe IDs or titles.
import {validateRecipes} from '../src/domain/model.mjs';
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateIndex(index){
 if(index?.schemaVersion!==1||!Array.isArray(index.recipes)||index.recipes.length===0)
  throw new Error('Ungültiges Rezeptverzeichnis');
 const ids=new Set(),slugs=new Set();
 for(const row of index.recipes){
  if(typeof row?.id!=='string'||!slugPattern.test(row.id)||typeof row?.slug!=='string'||!slugPattern.test(row.slug))
   throw new Error('Ungültiger Rezepteintrag');
  if(ids.has(row.id)||slugs.has(row.slug))throw new Error('Doppeltes Rezept im Verzeichnis');
  ids.add(row.id);slugs.add(row.slug);
 }
 return index;
}
export async function fetchArchiveData(fetchJson,base='../data'){
 const [index,catalog]=await Promise.all([
  fetchJson(base+'/recipe-index.json'),fetchJson(base+'/ingredients.json')
 ]);
 validateIndex(index);
 const recipes=await Promise.all(index.recipes.map(row=>fetchJson(base+'/recipes/'+row.slug+'.json')));
 validateRecipes(recipes,catalog);
 for(let i=0;i<recipes.length;i++){
  if(index.recipes[i].id!==recipes[i].id||index.recipes[i].slug!==recipes[i].slug)
   throw new Error('Rezeptverzeichnis stimmt nicht mit den Quelldaten überein');
 }
 return {recipes,catalog};
}
export function archiveEntries(recipes,images={}){
 return recipes.map(recipe=>({
  id:recipe.id,slug:recipe.slug,title:recipe.title,description:recipe.description,
  minutes:recipe.prepMinutes+recipe.cookMinutes,
  image:images[recipe.id]||null,real:true
 })).sort((a,b)=>a.title.localeCompare(b.title,'de-CH'));
}
const searchText=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de-CH');
export function filterArchive(entries,{query='',filter='all',favorites=new Set()}={}){
 const needle=searchText(query.trim());
 return entries.filter(entry=>(!needle||searchText(entry.title+' '+entry.description).includes(needle))
  &&(filter!=='favorites'||favorites.has(entry.id)));
}
