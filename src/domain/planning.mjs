// Pure M4 domain. No DOM, storage or network.
import {mealKey,parseDay,ingredientTotals as aggregate} from '../../prototype/planner.mjs';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function portion(value,allowZero=false){
 if(!Number.isFinite(value)||value<(allowZero?0:Number.MIN_VALUE)||value>1000)throw Error('Portione müend gültig und höchstens 1000 sii.');
 return value;
}
export function householdNeed(h,override={}){
 if(!object(h))throw Error('Bitte de Haushalt konfiguriere.');
 const p={...h,...override};
 let total=0;
 for(const group of ['adults','children','babies']){
  const count=p[group]??0,share=p[group+'Share']??(group==='adults'?1:0);
  if(!Number.isInteger(count)||count<0||count>100)throw Error('Ungültigi Haushaltsgrössi.');
  portion(share,true);total+=count*share;
 }
 return portion(total);
}
export function validKey(key){
 const parts=String(key).split('|');
 if(parts.length!==2||mealKey(...parts)!==key)throw Error('Ungültigi Ursprungsmahlziit.');
 return key;
}
const order=key=>key.slice(0,10)+(key.endsWith('|lunch')?'0':'1');
export function migratePlan(raw){
 if(!object(raw)||![1,2].includes(raw.version)||!object(raw.entries))throw Error('Planformat nöd unterstützt. Originaldate bitte wiederherstelle.');
 const plan=structuredClone(raw);plan.version=2;plan.issues=[];
 for(const [key,entry] of Object.entries(plan.entries)){
  try{
   validKey(key);
   if(!object(entry))throw Error('Ungültige Menüeintrag');
   if(raw.version===1&&entry.type==='recipe'){
    entry.cookedServings=entry.servings;
    // Legacy servings described cooking, never actual consumption.
    entry.consumedServings=null;
    entry.needsReview=true;
   }
   if(raw.version===1&&entry.type==='leftover'){
    entry.sourceKey=null;entry.portions=null;entry.needsReview=true;
   }
   if(entry.needsReview)plan.issues.push({key,message:'Alti Portionen/Reschte bitte prüefe.'});
  }catch(err){plan.issues.push({key,message:err.message})}
 }
 return plan;
}
export function assessPlan(plan,recipes){
 const balances={},issues=[];
 const warn=(key,message)=>issues.push({key,message});
 for(const [key,e] of Object.entries(plan.entries)){
  try{
   validKey(key);
   if(e.needsReview)warn(key,'Alte Iitrag: Verzehr oder Reschte bitte kläre.');
   if(e.type==='recipe'){
    if(!recipes[e.recipeId])throw Error('Rezept nöd verfügbar.');
    const cooked=portion(e.cookedServings);
    if(e.consumedServings===null){balances[key]={cooked,consumed:null,reserved:0,available:null};continue}
    const consumed=portion(e.consumedServings,true);
    balances[key]={cooked,consumed,reserved:0,available:Math.max(0,cooked-consumed)};
    if(consumed>cooked)throw Error('Verzehr überstiigt d Kochmenge.');
   }else if(e.type==='manual'){
    if(typeof e.title!=='string'||!e.title.trim()||e.title.length>140)throw Error('Menütext fehlt.');
   }else if(e.type!=='leftover')throw Error('Ungültigi Menüart.');
  }catch(err){warn(key,err.message)}
 }
 for(const [key,e] of Object.entries(plan.entries)){
  if(e?.type!=='leftover')continue;
  try{
   validKey(key);validKey(e.sourceKey);
   if(order(e.sourceKey)>=order(key))throw Error('Reschte müend vo ere früehere Mahlziit sii.');
   const source=plan.entries[e.sourceKey],balance=balances[e.sourceKey];
   if(source?.type!=='recipe'||!balance)throw Error('Ursprungsrezept fehlt oder isch ungültig.');
   if(balance.available===null)throw Error('Verzehr am Ursprungstag bitte zuerst kläre.');
   balance.reserved+=portion(e.portions);
  }catch(err){warn(key,err.message)}
 }
 for(const [key,b] of Object.entries(balances)){
  if(b.available===null)continue;
  const remaining=b.cooked-b.consumed-b.reserved;
  b.shortfall=Math.max(0,-remaining);b.available=Math.max(0,remaining);
  if(remaining < -1e-10)warn(key,'Z wenig Reschte: '+b.shortfall+' Portione fehled (kocht '+b.cooked+', verzehrt '+b.consumed+', reserviert '+b.reserved+').');
 }
 return {balances,issues};
}
export function updateMeal(plan,key,entry,recipes){
 validKey(key);
 const next=structuredClone(plan);
 if(entry===null)delete next.entries[key];else next.entries[key]=structuredClone(entry);
 const result=assessPlan(next,recipes);
 // Existing review entries may remain; new edits may not create/reinforce any invalid dependency.
 const previous=assessPlan(plan,recipes).issues;
 const introduced=result.issues.filter(x=>x.key===key||!previous.some(p=>p.key===x.key&&p.message===x.message));
 if(introduced.length)throw Error(introduced.map(x=>x.key+': '+x.message).join('\n'));
 return next;
}
export function cookingTotals(plan,recipes,from,to,options={}){
 const entries={};
 for(const [key,e] of Object.entries(plan.entries)){
  if(!object(e))continue;
  if(e?.type==='recipe'){
   try{validKey(key);portion(e.cookedServings);entries[key]={...e,servings:e.cookedServings}}catch{}
  }else entries[key]=e;
 }
 return {...aggregate(entries,recipes,from,to,options),warnings:assessPlan(plan,recipes).issues};
}
