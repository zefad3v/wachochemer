import test from 'node:test';import assert from 'node:assert/strict';
import {parseIngredientLines,validateDraft,householdRecipe} from '../prototype/household-recipes.mjs';
test('publisher spice notes become independent ingredients without invented quantities',()=>{
 for(const line of ['Salz Pfeffer und Chili','Salz (Pfeffer und Chili)','Salz, Pfeffer und Chili']){
  const ingredients=parseIngredientLines([line]);
  assert.deepEqual(ingredients.map(r=>[r.name,r.quantity,r.unit]),[['Salz',null,'unspecified'],['Pfeffer',null,'unspecified'],['Chili',null,'unspecified']]);
  const draft={title:'Curry',description:'',source:'',baseServings:4,prepMinutes:null,cookMinutes:null,ingredients,steps:['Abschmecken.']};
  validateDraft(draft);const saved=householdRecipe({id:'curry',draft},{});assert.equal(new Set(saved.recipe.ingredients.map(r=>r.ingredientId)).size,3);
 }
 assert.deepEqual(parseIngredientLines(['Salz und Pfeffer nach Geschmack']).map(r=>r.unit),['to_taste','to_taste']);
});
test('spice splitting preserves measured mixtures, alternatives and preparation notes',()=>{
 for(const line of ['1 TL Salz und Pfeffer','Salz oder Pfeffer','Pfeffer (frisch gemahlen)','Limette (gepresst)','Salz (Pfeffer und Chili nach Belieben)','Salz und Pfeffersauce'])assert.equal(parseIngredientLines([line]).length,1,line);
 assert.equal(parseIngredientLines(['500 g Hähnchen','Salz (Pfeffer und Chili)','Reis zum Servieren']).length,5);
});
