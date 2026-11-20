import test from 'node:test';
import assert from 'node:assert/strict';
import {extractRecipe,fetchPage,readLimited} from '../supabase/functions/recipe-import/extract.mjs';
import {parseIngredient,canonicalSource,householdRecipe,validateDraft} from '../prototype/household-recipes.mjs';

test('Recipe graph, referenced sections, missing values and multilingual units',()=>{
 const graph=[{'@id':'s','@type':'HowToStep',text:'Umrühren.'},{'@type':['Recipe'],name:'Brei',recipeYield:'4 Personen',
   recipeIngredient:['1 ½ dl Milch','2–3 Äpfel'],recipeInstructions:[{'@type':'HowToSection',itemListElement:[{'@id':'s'}]}]}];
 const result=extractRecipe({querySelectorAll:()=>[{textContent:'invalid'},{textContent:JSON.stringify({'@graph':graph})}]},s=>s);
 assert.deepEqual(result.steps,['Umrühren.']);assert.equal(result.baseServings,4);assert.equal(result.cookMinutes,null);
 assert.equal(parseIngredient('2 kleine Zwiebeln').quantity,2);
 assert.equal(parseIngredient('2 Becher Tomaten').unit,'');
 assert.equal(extractRecipe({querySelectorAll:()=>[{textContent:JSON.stringify({...graph[1],recipeYield:'4 bis 6 Personen'})}]},s=>s).baseServings,null);
 const milk=parseIngredient(result.lines[0]);assert.equal(milk.quantity,150);assert.equal(milk.name,'Milch');assert.equal(milk.unit,'ml');
 assert.deepEqual(parseIngredient(result.lines[1]),{name:'2–3 Äpfel',unit:'',quantity:null,optional:false});
});
test('source normalisation, quantities, stable private recipes and catalog ingredient reuse',()=>{
 const source=canonicalSource('https://fooby.ch/gericht?a=1&utm_source=mail#zutaten');
 assert.equal(source,'https://fooby.ch/gericht?a=1');assert.throws(()=>canonicalSource('http://example.org'));
 const draft={source,title:'Salat',description:'',baseServings:2,prepMinutes:5,cookMinutes:0,
   ingredients:['0,5 kg Reis','Salz nach Geschmack'].map(parseIngredient),steps:['Mischen.']};
 validateDraft(draft);const {recipe,names}=householdRecipe({id:'0123',draft},{salt:'Salz'});
 assert.equal(recipe.ingredients[1].ingredientId,'salt');assert.equal(names[recipe.ingredients[0].ingredientId],'Reis');
 assert.throws(()=>validateDraft({...draft,ingredients:[parseIngredient('eine Handvoll Kräuter')]}));
});
test('approved redirects only, source limit and unavailable sites',async()=>{
 let called=0;
 await assert.rejects(fetchPage('https://fooby.ch/r',async()=>{called++;return Response.redirect('https://outside.example/');}),/source/);
 assert.equal(called,1);
 const page=await fetchPage('https://fooby.ch/r',async()=>new Response('Recipe',{headers:{'content-type':'text/html'}}));
 assert.equal(page.html,'Recipe');
 await assert.rejects(readLimited(new Response('abcdefgh').body,3),/size/);
});
