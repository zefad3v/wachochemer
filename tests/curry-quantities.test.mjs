import test from 'node:test';import assert from 'node:assert/strict';
import {parseIngredient,validateDraft,householdRecipe} from '../prototype/household-recipes.mjs';
test('curry counts, size adjectives, spoon ranges and fractional pressed fruit survive saving',()=>{
 const lines=['1 Knoblauchzehe','1 große Karotte','2 mittlere Kartoffeln','1-3 große EL Gelbe Currypaste je nach Schärfe','1/2 Limette gepresst'];
 const rows=lines.map(parseIngredient);
 assert.deepEqual(rows.map(r=>[r.quantity,r.unit,r.quantityMax??null]),[[1,'piece',null],[1,'piece',null],[2,'piece',null],[1,'tbsp',3],[.5,'piece',null]]);
 assert.equal(rows[3].name,'Gelbe Currypaste je nach Schärfe (große EL)');
 assert.equal(rows[4].name,'Limette gepresst');
 const draft={title:'Curry',description:'',source:'',baseServings:4,prepMinutes:10,cookMinutes:20,ingredients:rows,steps:['Kochen.']};
 validateDraft(draft);const saved=householdRecipe({id:'curry',draft},{});
 assert.equal(saved.recipe.ingredients[3].quantityMax,3);assert.equal(saved.recipe.ingredients[4].quantity,.5);
 for(const line of ['1 grosse Karotte','1 mittelgroße Kartoffel','½ Limette, gepresst','1 Ei','500g Mehl'])assert.notEqual(parseIngredient(line).quantity,null,line);
 assert.equal(parseIngredient('2 Becher Kräuter').unit,'');
 assert.equal(parseIngredient('1 gehäufter EL Zucker').name,'Zucker (gehäufter EL)');
});
