import test from 'node:test';
import assert from 'node:assert/strict';
import {householdNeed,portion,migratePlan,assessPlan,updateMeal,cookingTotals} from '../src/domain/planning.mjs';
import {loadPlan,storePlan,restorePlan,PLAN_KEY} from '../src/storage/meal-plan.mjs';
const recipes={r:{baseServings:3,ingredients:[{ingredientId:'rice',unit:'g',quantity:300},{ingredientId:'salt',unit:'to_taste',quantity:null,optional:true}]}};
const source='2026-12-31|dinner',a='2027-01-01|lunch',b='2027-01-02|lunch';
const recipe=(cooked=6,consumed=2.5)=>({type:'recipe',recipeId:'r',cookedServings:cooked,consumedServings:consumed});
const leftover=(portions=2.5,sourceKey=source)=>({type:'leftover',sourceKey,portions});
const plan=()=>({version:2,entries:{[source]:recipe()}});
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data}};
test('configurable household, recipe and meal overrides and fractional shares',()=>{
 const h={adults:2,children:1,childrenShare:.5};
 assert.equal(householdNeed(h),2.5);assert.equal(householdNeed(h,{childrenShare:.25}),2.25);
 assert.equal(householdNeed(h,{adults:1}),1.5);
 assert.equal(householdNeed({...h,babies:1,babiesShare:.2}),2.7);
 for(const x of [null,{}, {adults:-1},{adults:1.5},{adults:101}])assert.throws(()=>householdNeed(x));
 for(const x of [NaN,Infinity,-1,0,1001])assert.throws(()=>portion(x));
});
test('separate cooked, consumed and multiple reserved amounts',()=>{
 let p=updateMeal(plan(),a,leftover(),recipes);p=updateMeal(p,b,leftover(.75),recipes);
 assert.deepEqual(assessPlan(p,recipes).balances[source],{cooked:6,consumed:2.5,reserved:3.25,available:.25,shortfall:0});
 assert.equal(plan().entries[a],undefined);
 assert.throws(()=>updateMeal(p,'2027-01-03|lunch',leftover(.5),recipes),/Portionen fehlen/);
});
test('source meal identity, same-day lunch to dinner, no cycles or future sources',()=>{
 const p={version:2,entries:{'2026-12-31|lunch':recipe(4,1),[source]:recipe(5,2)}};
 assert.equal(assessPlan(updateMeal(p,a,leftover(2,'2026-12-31|lunch'),recipes),recipes).balances[source].reserved,0);
 assert.doesNotThrow(()=>updateMeal(p,source,leftover(2,'2026-12-31|lunch'),recipes));
 for(const key of [a,b,'2026-12-30|lunch','bad'])assert.throws(()=>updateMeal(plan(),a,leftover(2,key),recipes));
 let linked=updateMeal(plan(),a,leftover(),recipes);
 assert.throws(()=>updateMeal(linked,b,leftover(1,a),recipes));
 assert.throws(()=>updateMeal(linked,source,null,recipes),/ursprüngliche Rezept/);
 assert.throws(()=>updateMeal(linked,source,recipe(3,2),recipes),/fehlen/);
});
test('shopping only buys cooking events, even when range starts after source',()=>{
 const p=updateMeal(plan(),a,leftover(),recipes);
 assert.equal(cookingTotals(p,recipes,'2026-12-31','2027-01-02').items[0].quantity,600);
 assert.deepEqual(cookingTotals(p,recipes,'2027-01-01','2027-01-02').items,[]);
 assert.deepEqual(cookingTotals(p,recipes,'2026-12-31','2027-01-02'),cookingTotals(p,recipes,'2026-12-31','2027-01-02'));
 const tiny={version:2,entries:{[source]:recipe(.125,.025)}};
 assert.equal(cookingTotals(tiny,recipes,'2026-12-31','2026-12-31').items[0].quantity,12.5);
});
test('unknown recipes, invalid amounts, manual meals and optional ingredients',()=>{
 assert.throws(()=>updateMeal(plan(),source,{...recipe(),recipeId:'missing'},recipes));
 assert.throws(()=>updateMeal(plan(),source,recipe(1,2),recipes));
 assert.throws(()=>updateMeal(plan(),source,{type:'manual',title:''},recipes));
 assert.equal(cookingTotals(plan(),recipes,'2026-12-31','2026-12-31',{includeOptional:true}).items.length,2);
});
test('v1 migration preserves every entry and leaves ambiguous references unresolved',()=>{
 const raw={version:1,entries:{[source]:{type:'recipe',recipeId:'r',servings:6},[a]:{type:'leftover',sourceDate:'2026-12-31'},bad:{type:'recipe',recipeId:'missing'}}};
 const p=migratePlan(raw);assert.equal(Object.keys(p.entries).length,3);
 assert.equal(p.entries[a].sourceKey,null);assert.equal(p.entries[source].cookedServings,6);
 assert.equal(p.entries[source].consumedServings,null);
 assert.equal(raw.version,1);assert.equal(migratePlan(p).entries[source].cookedServings,6);
 assert(assessPlan(p,recipes).issues.length>=3);
 assert.equal(cookingTotals(p,recipes,'2026-12-31','2027-01-01').items[0].quantity,600);
});
test('local migration and reload keep original bytes and support backup restore',()=>{
 const storage=memory(),raw=JSON.stringify({version:1,entries:{[source]:{type:'recipe',recipeId:'r',servings:6}}});
 storage.setItem('wachochemer:mealPlanV1',raw);
 const loaded=loadPlan(storage);assert.equal(loaded.error,null);
 assert.equal(storage.getItem('wachochemer:mealPlanV1'),raw);
 assert.equal(storage.getItem('wachochemer:mealPlanV1:backup'),raw);
 assert.deepEqual(loadPlan(storage).plan,loaded.plan);
 storePlan(storage,plan());storage.setItem(PLAN_KEY,'corrupt');
 assert.equal(loadPlan(storage).plan,null);
 assert.equal(restorePlan(storage).entries[source].cookedServings,6);
});
test('unsupported/corrupt formats and quota errors never overwrite originals',()=>{
 for(const raw of ['{','{"version":99,"entries":{}}','{"version":2,"entries":[]}']){
  const storage=memory();storage.setItem(PLAN_KEY,raw);
  assert.equal(loadPlan(storage).plan,null);assert.equal(storage.getItem(PLAN_KEY),raw);
 }
 const storage=memory();storage.setItem('wachochemer:mealPlanV1',JSON.stringify({version:1,entries:{}}));
 storage.setItem=()=>{throw Error('quota')};
 assert.equal(loadPlan(storage).plan,null);
 assert.throws(()=>storePlan(storage,plan()),/quota/);
 assert.throws(()=>restorePlan(memory()),/Sicherung/);
});
