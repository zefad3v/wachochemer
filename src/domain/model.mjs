// Independent business rules. Recipe JSON remains the source of truth.
export const SCHEMA_VERSION=1;
export const UNITS=Object.freeze(['g','kg','ml','l','piece','tbsp','tsp','to_taste']);
const unitSet=new Set(UNITS), slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ingredientId=/^[a-z][a-z0-9_]*$/, datePattern=/^\d{4}-\d{2}-\d{2}$/;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
function check(value,where,reason){if(!value)throw new Error(where+': '+reason)}
export function validateIngredientCatalog(catalog){
 check(object(catalog),'catalog','expected object');
 check(catalog.schemaVersion===1,'catalog','unsupported schemaVersion');
 check(Array.isArray(catalog.ingredients)&&catalog.ingredients.length>0,'catalog','no ingredients');
 const ids=new Set();
 for(const entry of catalog.ingredients){
  const where='ingredient / '+(entry?.id??'?');
  check(object(entry)&&typeof entry.id==='string'&&ingredientId.test(entry.id),where,'invalid ID');
  check(!ids.has(entry.id),where,'duplicate ingredient ID');
  check(object(entry.names)&&typeof entry.names['de-CH']==='string'&&entry.names['de-CH'].trim(),where,'missing name');
  check(unitSet.has(entry.defaultUnit),where,'unknown unit');
  ids.add(entry.id);
 }
 return ids;
}
export function validateRecipe(recipe,ingredientIds){
 const where='recipe / '+(recipe?.id??'?');
 check(object(recipe),where,'expected object');
 check(recipe.schemaVersion===1,where,'unsupported schemaVersion');
 check(typeof recipe.id==='string'&&slug.test(recipe.id),where,'invalid ID');
 check(typeof recipe.slug==='string'&&slug.test(recipe.slug),where,'invalid slug');
 check(recipe.locale==='de-CH',where,'unsupported locale');
 check(typeof recipe.title==='string'&&recipe.title.trim(),where,'missing title');
 check(Number.isSafeInteger(recipe.baseServings)&&recipe.baseServings>0,where,'invalid servings');
 check(integer(recipe.prepMinutes)&&integer(recipe.cookMinutes),where,'invalid times');
 check(Array.isArray(recipe.ingredients)&&recipe.ingredients.length>0,where,'missing ingredients');
 check(Array.isArray(recipe.instructions?.['de-CH'])&&recipe.instructions['de-CH'].length>0&&recipe.instructions['de-CH'].every(x=>typeof x==='string'&&x.trim()),where,'invalid instructions');
 check(ingredientIds instanceof Set,where,'missing ingredient IDs');
 for(const [i,entry] of recipe.ingredients.entries()){
  const ctx=where+' ingredient '+i;
  check(object(entry),ctx,'invalid entry');
  check(ingredientIds.has(entry.ingredientId),ctx,'unknown ingredientId');
  check(unitSet.has(entry.unit),ctx,'unknown unit');
  check(entry.optional===undefined||typeof entry.optional==='boolean',ctx,'invalid optional');
  if(entry.unit==='to_taste')check(entry.quantity===null,ctx,'to_taste needs null');
  else check(positive(entry.quantity),ctx,'invalid quantity');
 }
 return recipe;
}
export function validateRecipes(recipes,catalog){
 const ingredientIds=validateIngredientCatalog(catalog);
 check(Array.isArray(recipes)&&recipes.length>0,'recipes','empty recipes');
 const ids=new Set(),slugs=new Set();
 for(const recipe of recipes){
  validateRecipe(recipe,ingredientIds);
  check(!ids.has(recipe.id),'recipes','duplicate recipe ID');
  check(!slugs.has(recipe.slug),'recipes','duplicate recipe slug');
  ids.add(recipe.id);slugs.add(recipe.slug);
 }
 return {ingredientCount:ingredientIds.size,recipeCount:recipes.length};
}
// UTC calendar-day arithmetic prevents local daylight-saving shifts.
export function parseCalendarDate(value){
 check(typeof value==='string'&&datePattern.test(value),'date','expected YYYY-MM-DD');
 const [y,m,d]=value.split('-').map(Number),out=new Date(0);
 out.setUTCFullYear(y,m-1,d);out.setUTCHours(12,0,0,0);
 check(out.getUTCFullYear()===y&&out.getUTCMonth()===m-1&&out.getUTCDate()===d,'date','invalid calendar date');
 return out;
}
function iso(d){return String(d.getUTCFullYear()).padStart(4,'0')+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0')}
export function weekDates(dateISO,weekStartsOn=4){
 check(Number.isInteger(weekStartsOn)&&weekStartsOn>=0&&weekStartsOn<=6,'week','invalid start');
 const start=parseCalendarDate(dateISO);
 start.setUTCDate(start.getUTCDate()-(start.getUTCDay()-weekStartsOn+7)%7);
 return Array.from({length:7},(_,i)=>{const day=new Date(start);day.setUTCDate(day.getUTCDate()+i);return iso(day)});
}
export function scaleQuantity(entry,baseServings,desiredServings){
 check(object(entry)&&unitSet.has(entry.unit),'quantity','invalid unit');
 check(positive(baseServings)&&positive(desiredServings),'quantity','invalid servings');
 if(entry.unit==='to_taste'){check(entry.quantity===null,'quantity','to_taste needs null');return null}
 check(positive(entry.quantity),'quantity','invalid amount');
 return entry.quantity*desiredServings/baseServings; // no premature rounding
}
// Data contracts only. Implement actual leftovers in M4.
export function validateHousehold(h){
 check(object(h),'household','expected object');
 check(integer(h.adults)&&integer(h.children)&&h.adults+h.children>0,'household','invalid counts');
 check(Number.isInteger(h.weekStartsOn)&&h.weekStartsOn>=0&&h.weekStartsOn<=6,'household','invalid week start');
 return h;
}
export function validateMealAssignment(a,recipeIds){
 check(object(a),'assignment','expected object');
 parseCalendarDate(a.date);
 check(['lunch','dinner'].includes(a.meal),'assignment','invalid meal');
 check(recipeIds instanceof Set&&recipeIds.has(a.recipeId),'assignment','unknown recipe');
 check(positive(a.servings),'assignment','invalid servings');
 return a;
}
