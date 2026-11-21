// Preparation only. No network, authentication or claims about Bring account state.
import {cookingTotals,portion,validKey} from '../domain/planning.mjs';
import {datesBetween} from '../../prototype/planner.mjs';
const compare=(a,b)=>a<b?-1:a>b?1:0;
const validRecipe=r=>r&&Number.isFinite(r.baseServings)&&r.baseServings>0&&Array.isArray(r.ingredients)&&r.ingredients.length&&r.ingredients.every(x=>x&&typeof x.ingredientId==='string'&&typeof x.unit==='string'&&(x.quantity===null||Number.isFinite(x.quantity)&&x.quantity>0));
export function prepareRecipeImport(recipe,requestedQuantity,publicUrl){
 portion(requestedQuantity);
 if(!validRecipe(recipe))throw Error('Rezeptdate sind unvollständig.');
 const url=new URL(publicUrl);
 if(url.protocol!=='https:')throw Error('Bring! bruucht e öffentlichi HTTPS-Rezept-URL.');
 const params=new URLSearchParams({url:url.href,source:'web',baseQuantity:String(recipe.baseServings),requestedQuantity:String(requestedQuantity)});
 return {publicUrl:url.href,baseQuantity:recipe.baseServings,requestedQuantity,
  importUrl:'https://api.getbring.com/rest/bringrecipes/deeplink?'+params,
  recipeSavedInBring:'unknown',ingredientsOnBringList:'unknown',transferVerified:false};
}
export function buildTransferManifest(plan,recipes,from,to,{includeOptional=false,extras=[],publicRecipeUrl=()=>null}={}){
 const days=new Set(datesBetween(from,to));
 const usable=Object.fromEntries(Object.entries(recipes).filter(([,r])=>validRecipe(r)));
 const orderedPlan={...plan,entries:Object.fromEntries(Object.entries(plan.entries).sort(([a],[b])=>compare(a,b)))};
 const totals=cookingTotals(orderedPlan,usable,from,to,{includeOptional});
 const warnings=totals.warnings.map(x=>({...x}));
 const cooking=[],contributions=new Map();
 for(const [key,e] of Object.entries(plan.entries).sort(([a],[b])=>compare(a,b))){
  if(!days.has(key.slice(0,10))||e?.type!=='recipe')continue;
  try{
   validKey(key);portion(e.cookedServings);
   const recipe=usable[e.recipeId];
   if(!recipe)throw Error('Rezeptdate fehled oder sind unvollständig.');
   let officialImport=null;
   const url=publicRecipeUrl(recipe);
   if(url){try{officialImport=prepareRecipeImport(recipe,e.cookedServings,url)}catch(err){warnings.push({key,message:err.message})}}
   else warnings.push({key,message:'Kei öffentlichi Rezept-URL; Einzelimport nöd vorbereitet.'});
   cooking.push({mealKey:key,recipeId:e.recipeId,title:recipe.title||e.recipeId,
    cookedServings:e.cookedServings,officialImport});
   for(const row of recipe.ingredients){
    if(row.optional&&!includeOptional)continue;
    const id=row.ingredientId+'|'+row.unit;
    if(!contributions.has(id))contributions.set(id,[]);
    contributions.get(id).push({mealKey:key,optional:!!row.optional});
   }
  }catch(err){warnings.push({key,message:err.message})}
 }
 const items=totals.items.sort((a,b)=>compare(a.key,b.key)).map(row=>{
  const sources=contributions.get(row.key)||[];
  return {...row,optional:sources.every(x=>x.optional),sources};
 });
 const duplicateCandidates=items.filter(x=>x.sources.length>1).map(x=>({ingredientId:x.ingredientId,unit:x.unit,mealKeys:[...new Set(x.sources.map(s=>s.mealKey))]}));
 const units=new Map();
 for(const row of items){if(!units.has(row.ingredientId))units.set(row.ingredientId,new Set());units.get(row.ingredientId).add(row.unit)}
 for(const [id,set] of units)if(set.size>1)warnings.push({key:id,message:'Glichi Zutat mit verschiedene Einheite; separat prüefe, kei automatische Umrechnig.'});
 for(const row of totals.skipped)warnings.push({key:row.date+'|'+row.meal,message:'Menü ohni berechenbari Zutate: '+row.title});
 return {version:1,range:{from,to},includeOptional,cooking,items,
  extras:extras.filter(x=>x&&days.has(x.date)).map(x=>({date:x.date,title:x.title})).sort((a,b)=>compare(a.date+'|'+a.title,b.date+'|'+b.title)),
  duplicateCandidates,warnings:warnings.sort((a,b)=>compare(a.key+'|'+a.message,b.key+'|'+b.message)),
  bringState:{recipeSavedInBring:'unknown',ingredientsOnBringList:'unknown',transferVerified:false}};
}
export const serializeManifest=manifest=>JSON.stringify(manifest,null,2)+'\n';
export function manifestText(manifest,names={}){
 const amount=x=>x.quantity===null?'nach Geschmack':new Intl.NumberFormat('de-CH',{maximumFractionDigits:2}).format(x.quantity)+(x.quantityMax!=null?'–'+new Intl.NumberFormat('de-CH',{maximumFractionDigits:2}).format(x.quantityMax):'')+(x.unit==='to_taste'?'':' '+x.unit);
 return ['Wachochemer, '+manifest.range.from+' bis '+manifest.range.to,
  ...manifest.items.map(x=>(names[x.ingredientId]||x.ingredientId)+' — '+amount(x)+(x.optional?' (optional)':'')),
  ...manifest.extras.map(x=>x.title),...manifest.warnings.map(x=>'Achtung: '+x.key+': '+x.message),
  'Nur vorbereitet. In Bring! gespeicherte Rezepte und Zutaten auf der Einkaufsliste sind nicht überprüft.'].join('\n');
}
