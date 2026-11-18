import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDecimal,decimalText} from '../prototype/locale-number.mjs';

const html=readFileSync(new URL('../prototype/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../prototype/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../prototype/styles.css',import.meta.url),'utf8');

test('period and comma keyboard decimals resolve to the same exact number',()=>{
 assert.equal(parseDecimal('2.5'),2.5);
 assert.equal(parseDecimal('2,5'),2.5);
 assert.equal(parseDecimal('0,25'),.25);
 assert.equal(parseDecimal('.5'),.5);
 assert.equal(parseDecimal(',5'),.5);
 assert.equal(parseDecimal('2'),2);
 assert.equal(parseDecimal(2.5),2.5);
 assert.equal(decimalText(parseDecimal('2,5')),'2.5');
});
test('decimal values reject invalid, empty and ambiguous input',()=>{
 for(const value of ['',null,undefined,' ','2,5.3','2.5,3','1,000.2','1 000','NaN','-1','2-3','2x']){
  assert(Number.isNaN(parseDecimal(value)),String(value));
 }
 assert.equal(decimalText(NaN),'');
});
test('editor uses a single searchable recipe field and canonical decimal inputs',()=>{
 assert(!html.includes('id="meal-recipe-change"'));
 assert(!app.includes('byId("meal-recipe-change")'));
 for(const id of ['meal-need','meal-extra','meal-servings','meal-consumed','meal-leftover-portions','recipe-child-share']){
  assert.match(html,new RegExp('id="'+id+'" type="text"[^>]*inputmode="decimal"'));
 }
 assert.match(app,/function syncMealPortions\(\)/);
 assert.match(app,/const need=parseDecimal\(byId\("meal-need"\)\.value\)/);
 assert.match(app,/cookedServings:parseDecimal\(byId\("meal-servings"\)\.value\)/);
 assert.match(app,/portions:parseDecimal\(byId\("meal-leftover-portions"\)\.value\)/);
});
test('legacy warnings are collapsed instead of stretching the main screen',()=>{
 assert.match(html,/<details id="plan-review" class="plan-review" hidden>/);
 assert.match(html,/<summary id="plan-review-summary"/);
 assert.match(app,/function updatePlanNotice\(error=null\)/);
 assert.match(app,/details\.hidden=!error&&issues\.length===0/);
 assert.match(app,/const button=event\.target\.closest\("\[data-review-key\]"\)/);
 assert.match(app,/openMealEditor\(date,meal\)/);
 assert.match(css,/\.plan-review\[hidden\]\{display:none!important\}/);
});
