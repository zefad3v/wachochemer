import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTransferManifest,serializeManifest,manifestText,prepareRecipeImport} from '../src/integrations/bring.mjs';
const r={id:'r',slug:'rice',title:'Reis',baseServings:2,ingredients:[{ingredientId:'rice',unit:'g',quantity:200},{ingredientId:'salt',unit:'g',quantity:2,optional:true}]};
const recipes={r};
const source='2026-12-31|dinner',second='2027-01-02|dinner';
const plan={version:2,entries:{[source]:{type:'recipe',recipeId:'r',cookedServings:5,consumedServings:2.5},'2027-01-01|lunch':{type:'leftover',sourceKey:source,portions:2.5},[second]:{type:'recipe',recipeId:'r',cookedServings:1.25,consumedServings:1.25}}};
const options={publicRecipeUrl:r=>'https://example.org/rezepte/'+r.slug+'/'};
test('manifest uses only M4 cooking quantities across years and aggregates duplicate ingredients',()=>{
 const m=buildTransferManifest(plan,recipes,'2026-12-31','2027-01-03',options);
 assert.equal(m.items[0].quantity,625);assert.equal(m.cooking.length,2);
 assert.equal(m.duplicateCandidates.length,1);
 assert.equal(m.cooking[0].officialImport.requestedQuantity,5);
 const after=buildTransferManifest(plan,recipes,'2027-01-01','2027-01-01',options);
 assert.deepEqual(after.items,[]);assert.deepEqual(after.cooking,[]);
});
test('exports are reproducible, independent of entry order, no mutations',()=>{
 const original=structuredClone(plan);
 const a=buildTransferManifest(plan,recipes,'2026-12-31','2027-01-03',options);
 const b=buildTransferManifest({...plan,entries:Object.fromEntries(Object.entries(plan.entries).reverse())},recipes,'2026-12-31','2027-01-03',options);
 assert.equal(serializeManifest(a),serializeManifest(b));assert.deepEqual(plan,original);
});
test('optional ingredients and explicit extras respect selection and range',()=>{
 const m=buildTransferManifest(plan,recipes,'2026-12-31','2027-01-03',{...options,includeOptional:true,extras:[{date:'2027-01-01',title:'Milch'},{date:'2027-02-01',title:'Nicht jetzt'}]});
 assert.equal(m.items.find(x=>x.ingredientId==='salt').quantity,6.25);
 assert.equal(m.extras.length,1);assert.match(manifestText(m),/optional/);
 assert.match(manifestText(m),/nicht überprüft/);
});
test('official single import encodes URL and quantities, keeps two independent unknown states',()=>{
 const p=prepareRecipeImport(r,2.5,'https://example.org/reis?a=1&b=2');
 const url=new URL(p.importUrl);
 assert.equal(url.searchParams.get('url'),'https://example.org/reis?a=1&b=2');
 assert.equal(url.searchParams.get('requestedQuantity'),'2.5');assert.equal(url.searchParams.get('baseQuantity'),'2');
 assert.equal(p.recipeSavedInBring,'unknown');assert.equal(p.ingredientsOnBringList,'unknown');assert.equal(p.transferVerified,false);
 assert.throws(()=>prepareRecipeImport(r,2,'javascript:alert(1)'));
 assert.throws(()=>prepareRecipeImport(r,0,'https://example.org'));
});
test('missing recipe data or URL creates warnings without phantom ingredients',()=>{
 const missing=buildTransferManifest(plan,{r:{baseServings:2}},'2026-12-31','2027-01-03',options);
 assert.deepEqual(missing.items,[]);assert(missing.warnings.length);
 const m=buildTransferManifest(plan,recipes,'2026-12-31','2027-01-03');
 assert.equal(m.cooking[0].officialImport,null);assert(m.warnings.some(x=>/öffentliche Rezeptadresse/.test(x.message)));
});
test('different units stay separate; mandatory and optional contributions retain provenance',()=>{
 const dup={...r,ingredients:[...r.ingredients,{ingredientId:'rice',unit:'kg',quantity:.2},{ingredientId:'rice',unit:'g',quantity:10,optional:true}]};
 const m=buildTransferManifest(plan,{r:dup},'2026-12-31','2027-01-03',{...options,includeOptional:true});
 assert(m.warnings.some(x=>/Einheite/.test(x.message)));
 assert.equal(m.items.find(x=>x.key==='rice|g').optional,false);
 assert.equal(m.items.find(x=>x.key==='rice|g').quantity,656.25);
});
test('manifest preparation has no network effects or browser requirements',()=>{
 const saved=globalThis.fetch;globalThis.fetch=()=>{throw Error('NETWORK SIDE EFFECT')};
 try{assert.doesNotThrow(()=>serializeManifest(buildTransferManifest(plan,recipes,'2026-12-31','2027-01-03',options)))}
 finally{globalThis.fetch=saved}
});
