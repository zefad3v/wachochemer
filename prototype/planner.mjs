// M3: local calendar day meal planning. Independent of display week start.
// A shopping range is inclusive and can cross any week boundary.
const isoPattern=/^\d{4}-\d{2}-\d{2}$/;
export function parseDay(day){
 if(typeof day!=='string'||!isoPattern.test(day))throw Error('Ungültiges Datum');
 const [y,m,d]=day.split('-').map(Number);
 const t=new Date(0);t.setUTCFullYear(y,m-1,d);t.setUTCHours(12,0,0,0);
 if(t.getUTCFullYear()!==y||t.getUTCMonth()+1!==m||t.getUTCDate()!==d)throw Error('Ungültiges Datum');
 return t;
}
export function formatDay(date){
 return String(date.getUTCFullYear()).padStart(4,'0')+'-'+String(date.getUTCMonth()+1).padStart(2,'0')+'-'+String(date.getUTCDate()).padStart(2,'0');
}
export function addDays(day,increment){
 const d=parseDay(day);d.setUTCDate(d.getUTCDate()+increment);return formatDay(d);
}
export function datesBetween(from,to){
 const start=parseDay(from),end=parseDay(to);
 const count=Math.round((end-start)/86400000)+1;
 if(count<1||count>60)throw Error('Einkaufszeitraum: 1 bis 60 Tage wählen');
 return Array.from({length:count},(_,i)=>addDays(from,i));
}
export const mealKey=(date,meal)=>{parseDay(date);if(!['lunch','dinner'].includes(meal))throw Error('Ungültige Mahlzeit');return date+'|'+meal};
export function validateEntry(entry,recipes){
 if(!entry||typeof entry!=='object')throw Error('Ungültiger Menüeintrag');
 if(entry.type==='recipe'){
  if(!recipes[entry.recipeId])throw Error('Unbekanntes Rezept');
  if(!Number.isInteger(entry.servings)||entry.servings<1||entry.servings>24)throw Error('Portionen von 1 bis 24');
 }else if(entry.type==='manual'){
  if(typeof entry.title!=='string'||!entry.title.trim()||entry.title.length>140)throw Error('Menütext fehlt');
 }else if(entry.type==='leftover'){
  parseDay(entry.sourceDate);
 }else throw Error('Ungültige Menüart');
 return entry;
}
export function mealFor(plan,date,meal){
 const result=plan?.[mealKey(date,meal)];
 return result&&typeof result==='object'?result:null;
}
export function normalizePlan(raw,recipes){
 if(!raw||raw.version!==1||!raw.entries||typeof raw.entries!=='object'||Array.isArray(raw.entries))return {version:1,entries:{}};
 const entries={};
 for(const [key,value] of Object.entries(raw.entries)){
  try{
   const [date,meal]=key.split('|');
   if(mealKey(date,meal)!==key)continue;
   validateEntry(value,recipes);
   entries[key]=value;
  }catch{}
 }
 return {version:1,entries};
}
export function ingredientTotals(entries,recipes,from,to,{includeOptional=false}={}){
 const days=new Set(datesBetween(from,to)),out=new Map(),skipped=[];
 for(const [key,entry] of Object.entries(entries)){
  const [date,meal]=key.split('|');
  if(!days.has(date)||!['lunch','dinner'].includes(meal))continue;
  if(entry.type!=='recipe'){
   if(entry.type==='manual')skipped.push({date,meal,title:entry.title});
   continue; // leftovers already cooked; do not buy a second time
  }
  const recipe=recipes[entry.recipeId];
  if(!recipe){skipped.push({date,meal,title:'Unbekanntes Rezept'});continue}
  if(!Number.isInteger(entry.servings)||entry.servings<1||entry.servings>24)continue;
  for(const row of recipe.ingredients){
   if(row.optional&&!includeOptional)continue;
   const id=row.ingredientId+'|'+row.unit;
   const quantity=row.quantity===null?null:row.quantity*entry.servings/recipe.baseServings;
   if(!out.has(id))out.set(id,{ingredientId:row.ingredientId,unit:row.unit,quantity,optional:!!row.optional});
   else{
    const existing=out.get(id);
    if(existing.quantity!==null&&quantity!==null)existing.quantity+=quantity;
   }
  }
 }
 return {items:[...out.entries()].map(([key,row])=>({key,...row})),skipped};
}
export function shoppingWindow(today,length=7){parseDay(today);return {from:today,to:addDays(today,length-1)}}
