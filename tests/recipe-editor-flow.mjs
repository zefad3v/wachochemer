import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {recipeEditor} from '../prototype/recipe-editor.mjs';
const w=new JSDOM(readFileSync('prototype/index.html','utf8')).window;
Object.assign(globalThis,{document:w.document,Option:w.Option,confirm:()=>true});
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
const el=id=>w.document.getElementById(id),form=el('house-recipe-form');
const draft={title:'Spätzli',description:'',source:'https://www.swissmilk.ch/recipe/',image:'',baseServings:5,prepMinutes:null,cookMinutes:null,ingredients:[{name:'Butterflocken',unit:'unspecified',quantity:null,optional:false}],steps:['Mischen.']};
const row={id:'saved-id',revision:3,draft};let saves=0,deletes=0,finished=0;
const account={refresh:async()=>{},saveRecipe:async(target,id,revision,d)=>{saves++;assert.equal(id,row.id);assert.equal(revision,3);return {refreshed:true};},deleteRecipe:async()=>{deletes++;return {refreshed:true};},importRecipe:async()=>({draft:{image:'https://images.example/spaetzli.jpg'}})};
const editor=recipeEditor({account:()=>account,household:()=> 'house',findRow:()=>row,findSource:()=>row,onSaved:()=>finished++});
const settle=()=>new Promise(r=>setTimeout(r,0));
editor.open(row);el('house-source-image').click();await settle();assert.equal(form.elements.image.value,'https://images.example/spaetzli.jpg');
form.dispatchEvent(new w.Event('submit',{cancelable:true}));el('house-save').click();el('house-save').click();await settle();assert.equal(saves,1);assert.equal(finished,1);assert.equal(el('house-recipe-editor').open,false);
editor.open(row);globalThis.confirm=()=>false;el('house-delete').click();await settle();assert.equal(deletes,0);
globalThis.confirm=()=>true;el('house-delete').click();await settle();assert.equal(deletes,1);assert.equal(el('house-recipe-editor').open,false);
editor.open();for(const [name,value] of Object.entries({title:'Neu',servings:'5',source:draft.source,steps:'Mischen.'}))form.elements[name].value=value;
const ingredient=el('house-ingredients').firstChild;ingredient.querySelector('.name').value='Butterflocken';ingredient.querySelector('.unit').value='unspecified';
form.dispatchEvent(new w.Event('submit',{cancelable:true}));el('house-save').click();await settle();assert.equal(saves,2);assert.equal(el('house-recipe-editor').open,false);
console.log('PASS recipe editor save, duplicate update, image recovery, double click and confirmed deletion');

editor.open();
const importSection=el('house-import'),importStatus=el('house-import-status');
importSection.open=true;
el('house-import-url').value=draft.source;
el('house-ai-text').value='Kopiertes Rezept';
account.importRecipe=async(_target,{mode})=>{
  throw Object.assign(new Error('Import fehlgeschlagen'),{code:mode==='ai'?'ai_failed':'page'});
};
for (const button of ['house-read-link','house-read-ai']) {
  el(button).click();
  await settle();
  assert.equal(importStatus.hasAttribute('data-error'),true);
  assert.equal(importSection.open,true);
  assert.equal(el('house-import-url').value,draft.source);
  assert.equal(el('house-ai-text').value,'Kopiertes Rezept');
  assert.equal(el('house-editor-status').textContent,'');
}
account.importRecipe=async()=>({source:draft.source,draft:{...draft,lines:['Butterflocken']}});
el('house-read-link').click();
await settle();
assert.equal(importStatus.hasAttribute('data-error'),false);
assert.equal(importSection.open,false);
assert.equal(form.elements.title.value,draft.title);
console.log('PASS import feedback location, error state and draft preservation');
