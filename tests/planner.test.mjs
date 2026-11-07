import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDay,formatDay,addDays,datesBetween,mealKey,mealFor,normalizePlan,validateEntry,ingredientTotals,shoppingWindow} from '../prototype/planner.mjs';
const recipe=JSON.parse(readFileSync(new URL('../data/recipes/poulet-fajitas.json',import.meta.url),'utf8'));
const soup=JSON.parse(readFileSync(new URL('../data/recipes/kuerbissuppe-kaesetoast.json',import.meta.url),'utf8'));
const recipes={[recipe.id]:recipe,[soup.id]:soup};

test('date ranges include every calendar day across arbitrary week and year boundaries',()=>{
 assert.deepEqual(datesBetween('2026-12-30','2027-01-03'),['2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 assert.equal(addDays('2027-03-28',-1),'2027-03-27');
 assert.equal(addDays('2026-12-31',1),'2027-01-01');
 assert.equal(formatDay(parseDay('2026-11-07')),'2026-11-07');
 assert.deepEqual(shoppingWindow('2026-11-07'),{from:'2026-11-07',to:'2026-11-13'});
 assert.throws(()=>datesBetween('2026-11-10','2026-11-01'),/Einkaufszeitraum/);
 assert.throws(()=>datesBetween('2026-01-01','2026-03-30'),/Einkaufszeitraum/);
 assert.throws(()=>parseDay('2026-02-30'),/Ungültiges/);
});
test('date-based meal keys do not depend on which weekday displays first',()=>{
 const entries={'2026-11-04|dinner':{type:'recipe',recipeId:recipe.id,servings:3},'2026-11-05|lunch':{type:'manual',title:'Beim Grosi'}};
 assert.equal(mealFor(entries,'2026-11-04','dinner').recipeId,recipe.id);
 assert.equal(mealFor(entries,'2026-11-05','lunch').title,'Beim Grosi');
 assert.equal(mealFor(entries,'2026-11-05','dinner'),null);
 assert.equal(mealKey('2026-11-04','dinner'),'2026-11-04|dinner');
 assert.throws(()=>mealKey('2026-11-04','breakfast'));
});
test('meal types and recipe servings are validated',()=>{
 assert.equal(validateEntry({type:'recipe',recipeId:recipe.id,servings:4},recipes).servings,4);
 assert.throws(()=>validateEntry({type:'recipe',recipeId:recipe.id,servings:0},recipes),/Portionen/);
 assert.throws(()=>validateEntry({type:'recipe',recipeId:'missing',servings:3},recipes),/Unbekanntes/);
 assert.throws(()=>validateEntry({type:'manual',title:'   '},recipes),/Menütext/);
 assert.equal(validateEntry({type:'leftover',sourceDate:'2026-11-04'},recipes).type,'leftover');
});
test('normalized plan drops corrupt entries but retains valid manual and recipe meals',()=>{
 const raw={version:1,entries:{
  '2026-11-05|dinner':{type:'recipe',recipeId:recipe.id,servings:4},
  '2026-11-06|lunch':{type:'manual',title:'Zmorge uswärts'},
  '2026-11-07|dinner':{type:'recipe',recipeId:'missing',servings:3},
  'bad|dinner':{type:'manual',title:'Invalid'}
 }};
 assert.equal(Object.keys(normalizePlan(raw,recipes).entries).length,2);
 assert.deepEqual(normalizePlan({},recipes),{version:1,entries:{}});
});
test('shopping totals contain ONLY planned recipes in the requested inclusive range',()=>{
 const entries={
  '2026-11-04|dinner':{type:'recipe',recipeId:recipe.id,servings:3},
  '2026-11-05|dinner':{type:'recipe',recipeId:recipe.id,servings:6},
  '2026-11-06|dinner':{type:'recipe',recipeId:soup.id,servings:3},
  '2026-11-07|lunch':{type:'leftover',sourceDate:'2026-11-06'},
  '2026-11-08|dinner':{type:'manual',title:'Restaurant'}
 };
 const earlier=ingredientTotals(entries,recipes,'2026-11-04','2026-11-05');
 const chicken=earlier.items.find(x=>x.ingredientId==='chicken_breast');
 assert.equal(chicken.quantity,1200);
 const later=ingredientTotals(entries,recipes,'2026-11-06','2026-11-08');
 assert(!later.items.some(x=>x.ingredientId==='chicken_breast'));
 assert(later.items.some(x=>x.ingredientId==='hokkaido_pumpkin'));
 assert.equal(later.skipped.length,1);
 const all=ingredientTotals(entries,recipes,'2026-11-04','2026-11-08');
 assert.equal(all.items.find(x=>x.ingredientId==='chicken_breast').quantity,1200);
});
test('leftovers, manual menus and optional ingredients never double count',()=>{
 const entries={
  '2026-11-05|dinner':{type:'recipe',recipeId:recipe.id,servings:3},
  '2026-11-06|lunch':{type:'leftover',sourceDate:'2026-11-05'},
  '2026-11-06|dinner':{type:'manual',title:'Auswärts'}
 };
 const required=ingredientTotals(entries,recipes,'2026-11-05','2026-11-06');
 assert(required.items.every(x=>x.optional===false));
 assert.equal(required.skipped.length,1);
 const optional=ingredientTotals(entries,recipes,'2026-11-05','2026-11-06',{includeOptional:true});
 assert(optional.items.length>=required.items.length);
 const single=ingredientTotals({'2026-11-05|dinner':entries['2026-11-05|dinner']},recipes,'2026-11-05','2026-11-05');
 assert.deepEqual(required.items,single.items);
});
