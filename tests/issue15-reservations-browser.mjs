import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const p=await b.newPage({viewport:{width:844,height:390}});
 await p.goto('http://127.0.0.1:8765/prototype/');
 await p.evaluate(()=>{localStorage.setItem('wachochemer:household',JSON.stringify({adults:2,children:1,childrenShare:.5}));localStorage.setItem('wachochemer:mealPlanV2',JSON.stringify({version:2,entries:{'2026-11-15|dinner':{type:'recipe',recipeId:'kuerbissuppe-kaesetoast',cookedServings:6,consumedServings:2.5},'2026-11-16|lunch':{type:'leftover',sourceKey:'2026-11-15|dinner',portions:2.5}}}))});
 await p.reload();await p.waitForFunction(()=>document.querySelector('#day-card').textContent.length>0);await p.locator('#day-edit').click();
 await p.locator('#meal-date').fill('2026-11-16');await p.locator('#meal-type').selectOption('lunch');
 assert.equal(await p.locator('#meal-source-choice').inputValue(),'2026-11-15|dinner');
 assert.match(await p.locator('#meal-source-choice option').last().innerText(),/3.5 frei/);
 await p.locator('#meal-leftover-portions').fill('4');await p.locator('#meal-form button[type=submit]').click();assert.match(await p.locator('#meal-editor-error').innerText(),/Portione fehled/);
 await p.locator('#meal-leftover-portions').fill('3');await p.locator('#meal-form button[type=submit]').click();
 await p.locator('#day-edit').click();await p.locator('#meal-date').fill('2026-11-15');await p.locator('#meal-type').selectOption('dinner');
 assert.equal(await p.locator('#meal-extra').inputValue(),'3.5');await p.locator('#meal-extra-enabled').uncheck();await p.locator('#meal-form button[type=submit]').click();assert.match(await p.locator('#meal-editor-error').innerText(),/Portione fehled/);
 await p.locator('#meal-editor-close').click();await p.locator('#day-edit').click();await p.locator('#meal-date').fill('2026-11-17');await p.locator('#meal-type').selectOption('lunch');await p.locator('#meal-kind').selectOption('leftover');
 assert.equal(await p.locator('#meal-source-choice').inputValue(),'');assert.match(await p.locator('#meal-source-choice option').last().innerText(),/0.5 frei/);
 await p.locator('#meal-source-choice').selectOption('2026-11-15|dinner');await p.locator('#meal-leftover-portions').fill('.5');await p.locator('#meal-form button[type=submit]').click();
 assert(!await p.locator('#meal-editor').isVisible());
 await p.locator('#day-edit').click();await p.locator('#meal-date').fill('2026-11-18');await p.locator('#meal-type').selectOption('dinner');await p.locator('#meal-kind').selectOption('leftover');assert.equal(await p.locator('#meal-source-choice option').count(),1);
 await p.locator('#meal-kind').selectOption('recipe');await p.locator('#meal-recipe-search').fill('Fajitas');await p.locator('[data-pick-recipe]').click();assert.equal(await p.locator('#meal-need').inputValue(),'2.5');
 console.log('10 reservation/household browser checks passed');
}finally{await b.close()}
