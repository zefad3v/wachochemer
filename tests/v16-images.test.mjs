import test from 'node:test';
import assert from 'node:assert/strict';
import {imageFor,recipeImages,demoImages} from '../prototype/recipe-images.mjs';
import {readFileSync,existsSync} from 'node:fs';
test('demo images are opt-in, separate and never assigned to unknown recipes',()=>{
 assert.deepEqual(recipeImages,{});
 assert.deepEqual(imageFor('kuerbissuppe-kaesetoast'),{image:null,imageDemo:false});
 assert.deepEqual(imageFor('unknown',true),{image:null,imageDemo:false});
 for(const [id,fixture] of Object.entries(demoImages)){
  assert.equal(imageFor(id,true).imageDemo,true);
  assert(existsSync(new URL('../prototype/'+fixture.image,import.meta.url)));
 }
});
test('verified image takes precedence over illustrative demo',()=>{
 recipeImages['test-recipe']='./owned.webp';
 try{assert.deepEqual(imageFor('test-recipe',true),{image:'./owned.webp',imageDemo:false})}
 finally{delete recipeImages['test-recipe']}
});
test('canonical recipes contain no demo image paths',()=>{
 const index=JSON.parse(readFileSync(new URL('../data/recipe-index.json',import.meta.url)));
 for(const {slug} of index.recipes)assert.doesNotMatch(readFileSync(new URL('../data/recipes/'+slug+'.json',import.meta.url),'utf8'),/assets\/demo|imageDemo/);
});
