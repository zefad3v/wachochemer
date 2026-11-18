import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedHousehold,decodeSnapshot} from '../src/storage/shared-household.mjs';

test('shared snapshot preserves decimal amounts and exact revision tokens',()=>{
  const result=decodeSnapshot({household:{id:'one',revision:'9007199254740993',name:'Family',adults:2,children:1,babies:0,adults_share:1,children_share:0.5,babies_share:0,recipe_shares:{},shopping_extras:[]},meals:[
    {day:'2026-11-20',slot:'lunch',revision:'9007199254740995',entry:{type:'recipe',recipeId:'poulet-fajitas',cookedServings:3.75,consumedServings:2.25}}
  ]});
  assert.equal(result.householdRevision,'9007199254740993');
  assert.equal(result.revisions['2026-11-20|lunch'],'9007199254740995');
  assert.equal(result.plan.entries['2026-11-20|lunch'].cookedServings,3.75);
});

test('concurrent and failed writes propagate errors and preserve caller input',async()=>{
  const calls=[];
  const client={rpc:async(name,args)=>{
    calls.push({name,args});
    return {error:{code:'40001',message:'conflict'}};
  }};
  const shared=new SharedHousehold(client);
  shared.id='family';
  const entry={type:'manual',title:'Picknick'};
  await assert.rejects(shared.saveMeal('2026-11-20|lunch',entry,'11'),{code:'40001'});
  assert.deepEqual(entry,{type:'manual',title:'Picknick'});
  assert.deepEqual(calls[0],{name:'save_household_meal',args:{target:'family',meal_day:'2026-11-20',meal_slot:'lunch',expected_revision:'11',meal_entry:entry}});
  await assert.rejects(shared.saveSettings({},'3'),{code:'40001'});
});

test('missing membership fails closed and delete uses its exact revision',async()=>{
  let captured;
  const shared=new SharedHousehold({rpc:async(name,args)=>{captured=args;return {data:null,error:null}}});
  shared.id='family';
  await assert.rejects(shared.load(),/Mitgliedschaft/);
  await shared.saveMeal('2026-11-20|dinner',null,'42');
  assert.equal(captured.expected_revision,'42');assert.equal(captured.meal_entry,null);
});
