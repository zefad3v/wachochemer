import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let count=0;const check=(v)=>{assert(v);count++};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:8765/prototype/');
 await page.waitForFunction(()=>document.querySelector('#day-card').textContent.includes('Noch nichts geplant'));
 await page.locator('#choose-dinner').click();await page.locator('#day-edit').click();
 check(await page.locator('#meal-recipe').inputValue()==='');
 check(!await page.locator('#meal-recipe-options').isVisible());
 await page.locator('#meal-form button[type=submit]').click();
 check(await page.locator('#meal-editor-error').isVisible());
 check(await page.locator('#meal-editor').isVisible());
 await page.locator('#meal-recipe-search').fill('Kürbis');
 check(await page.locator('[data-pick-recipe]').count()===1);
 check(await page.locator('[data-pick-recipe]').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.meal-picker').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right}));
 await page.locator('[data-pick-recipe]').click();await page.locator('#meal-form button[type=submit]').click();
 await page.locator('#day-edit').click();check(await page.locator('#meal-recipe').inputValue()==='kuerbissuppe-kaesetoast');
 check(!await page.locator('#meal-recipe-options').isVisible());
 await page.locator('#meal-editor-close').click();
 check(await page.locator('#meal-pages').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<1&&getComputedStyle(el).justifyContent==='center'}));
 await page.locator('[data-view=week]').click();check(!await page.locator('#week-strip').isVisible());
 check(await page.locator('#week-overview .week-row').count()===7);
 await page.locator('[data-view=day]').click();check(await page.locator('#week-strip').isVisible());
 await page.locator('#choose-lunch').click();await page.locator('#day-edit').click();check(await page.locator('#meal-type').inputValue()==='lunch');
 await page.screenshot({path:'/tmp/issue11-editor.png'});
 console.log(count+' issue11 browser checks passed');
}finally{await browser.close()}
