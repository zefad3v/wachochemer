import {strict as assert} from 'node:assert';
import {parseHTML} from 'npm:linkedom@0.18.12';
import {fetchPage,extractRecipe} from '../supabase/functions/recipe-import/extract.mjs';
Deno.test('public TLS transport imports Kochkarussell original page including photo',async()=>{
 const page=await fetchPage('https://kochkarussell.com/gelbes-thai-curry-haehnchen/');
 const recipe=extractRecipe(parseHTML(page.html).document,(s:string)=>s.replace(/<[^>]*>/g,''));
 assert.equal(recipe.baseServings,4);assert.equal(recipe.lines.length,12);assert.equal(recipe.steps.length,3);
 assert.equal(recipe.totalMinutes,30);assert.match(recipe.image,/^https:\/\/kochkarussell.com\//);
});
