import test from 'node:test';
import assert from 'node:assert/strict';
import {imageFor,recipeImages,demoImages} from '../prototype/recipe-images.mjs';
import {readFileSync,existsSync} from 'node:fs';
test('alpha never serves demo images, including old opt-in URLs',()=>{
 assert.equal(Object.keys(recipeImages).length,3);
 for(const path of Object.values(recipeImages))assert(existsSync(new URL("../prototype/"+path,import.meta.url)));
 assert.deepEqual(demoImages,{});
 assert.equal(imageFor('kuerbissuppe-kaesetoast').imageGenerated,true);
 assert.deepEqual(imageFor('unknown',true),{image:null,imageDemo:false});
 for(const [id,fixture] of Object.entries(demoImages)){
  assert.equal(imageFor(id,true).imageDemo,true);
  assert(existsSync(new URL('../prototype/'+fixture.image,import.meta.url)));
 }
});
test('only assigned recipe images are displayed',()=>{
 recipeImages['test-recipe']='./owned.webp';
 try{assert.deepEqual(imageFor('test-recipe',true),{image:'./owned.webp',imageDemo:false})}
 finally{delete recipeImages['test-recipe']}
});
test('canonical recipes contain no demo image paths',()=>{
 const index=JSON.parse(readFileSync(new URL('../data/recipe-index.json',import.meta.url)));
 for(const {slug} of index.recipes)assert.doesNotMatch(readFileSync(new URL('../data/recipes/'+slug+'.json',import.meta.url),'utf8'),/assets\/demo|imageDemo/);
});
