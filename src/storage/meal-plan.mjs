import {migratePlan} from '../domain/planning.mjs';
export const PLAN_KEY='wachochemer:mealPlanV2';
const LEGACY='wachochemer:mealPlanV1';
export function loadPlan(storage){
 try{
  const current=storage.getItem(PLAN_KEY);
  if(current!==null)return {plan:migratePlan(JSON.parse(current)),error:null};
  const old=storage.getItem(LEGACY);
  if(old===null)return {plan:{version:2,entries:{}},error:null};
  const plan=migratePlan(JSON.parse(old));
  // Backup before first migration write. Never overwrite the original v1 key.
  if(storage.getItem(LEGACY+':backup')===null)storage.setItem(LEGACY+':backup',old);
  storage.setItem(PLAN_KEY,JSON.stringify(plan));
  return {plan,error:null};
 }catch(err){return {plan:null,error:'Plan nöd glade: '+err.message+' Original bliibt erhalte; kei Überschriibe.'}}
}
export function storePlan(storage,plan){
 const previous=storage.getItem(PLAN_KEY);
 if(previous!==null)storage.setItem(PLAN_KEY+':backup',previous);
 storage.setItem(PLAN_KEY,JSON.stringify(plan));
}
export function restorePlan(storage){
 const backup=storage.getItem(PLAN_KEY+':backup')??storage.getItem(LEGACY+':backup')??storage.getItem(LEGACY);
 if(backup===null)throw Error('Kei Sicherig verfügbar.');
 const plan=migratePlan(JSON.parse(backup));
 storage.setItem(PLAN_KEY,JSON.stringify(plan));return plan;
}
