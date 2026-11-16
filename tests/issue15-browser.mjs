import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
let n=0;const check=(v,label)=>{assert(v,label);n++;console.log('PASS '+label)};
const out=process.env.SCREENSHOT_DIR||'/tmp/issue15-screenshots';mkdirSync(out,{recursive:true});
try{
 for(const [width,height] of [[390,844],[393,852],[844,390],[932,430]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/prototype/');await page.waitForFunction(()=>document.querySelector('#day-card').textContent.includes('No nüt plant'));
 await page.locator('#choose-dinner').click();await page.locator('#day-card').click();
 check(await page.locator('#meal-editor').isVisible(),'empty card opens planning');
 check(await page.locator('#meal-need').inputValue()==='','first run does not assume one portion');
 await page.locator('#meal-recipe-search').fill('Kürbis');await page.locator('[data-pick-recipe]').click();
 check((await page.locator('#meal-portion-note').innerText()).includes('Basisportione'),'explicit recipe fallback');
 check(await page.locator('#meal-recipe-search').isVisible(),'recipe remains searchable after selection');
 check(!await page.locator('#meal-recipe-change').count(),'redundant recipe change button removed');
 await page.locator('#meal-need').fill('2.25');await page.locator('#meal-extra-enabled').check();await page.locator('#meal-extra').fill('1.5');
 await page.locator('#meal-form button[type=submit]').click();
 const saved=await page.evaluate(()=>localStorage.getItem('wachochemer:mealPlanV2'));const entry=Object.values(JSON.parse(saved).entries)[0];
 check(entry.cookedServings===3.75&&entry.consumedServings===2.25,'separate domain amounts from simple editor');
 await page.screenshot({path:out+'/'+width+'-plan.png',fullPage:true});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 if(width>height)check(await page.evaluate(()=>{const a=document.querySelector('.bottom-nav').getBoundingClientRect(),b=document.querySelector('.header-settings').getBoundingClientRect(),c=document.querySelector('.screen-heading').getBoundingClientRect();return a.right<=b.left&&a.bottom<=c.top}),'landscape dock avoids controls and heading');
 await page.locator('#day-card').click();check((await page.locator('#portion-count').innerText()).includes('3.75'),'planned decimal recipe portions');
 check((await page.locator('#dialog-ingredients').innerText()).includes("1'000 g"),'scaled pumpkin quantity');
 await page.locator('#jump-to-ingredients').click();check(await page.locator('#cooking-mode').isVisible(),'cooking mode');
 await page.screenshot({path:out+'/'+width+'-cooking.png',fullPage:true});
 const first=await page.locator('#cooking-step').innerText();await page.locator('#cooking-next').click();check(first!==await page.locator('#cooking-step').innerText(),'next step');await page.locator('#cooking-prev').click();check(first===await page.locator('#cooking-step').innerText(),'previous step');
 while(await page.locator('#cooking-mode').isVisible()){await page.locator('#cooking-next').focus();await page.keyboard.press('Enter')}
 check(await page.locator('#dialog-title').evaluate(el=>el===document.activeElement),'finish returns focus to recipe');
 await page.locator('#dialog-close').click();
 check(saved===await page.evaluate(()=>localStorage.getItem('wachochemer:mealPlanV2')),'reading never mutates plan');
 await page.locator('#day-edit').click();check(await page.locator('#meal-need').inputValue()==='2.25'&&await page.locator('#meal-extra').inputValue()==='1.5','reopening preserves difference');
 await page.screenshot({path:out+'/'+width+'-editor.png',fullPage:true});
 await page.locator('#meal-editor-close').click();await page.locator('#choose-lunch').click();await page.locator('#day-card').click();check(await page.locator('#meal-type').inputValue()==='lunch','lunch target preserved');
 await page.locator('#meal-kind').selectOption('manual');await page.locator('#meal-manual').fill('Picknick');await page.locator('#meal-form button[type=submit]').click();await page.locator('#day-card').click();check(await page.locator('#meal-editor').isVisible(),'manual meal edits without empty recipe');
 await page.locator('#meal-editor-close').click();await page.locator('.bottom-nav [data-tab=archive]').click();
 await page.locator('[data-recipe=kuerbissuppe-kaesetoast]').click();await page.locator('#portion-plus').click();
 check((await page.locator('#portion-count').innerText()).includes('3.5'),'archive uses independent decimal portions');
 await page.locator('#dialog-close').click();await page.locator('.bottom-nav [data-tab=week]').click();await page.locator('#choose-dinner').click();await page.locator('#day-card').click();
 check((await page.locator('#portion-count').innerText()).includes('3.75'),'planned quantity unaffected by archive');
 await page.locator('#dialog-close').click();
 check(!errors.length,'no browser errors');await page.close();
 }
 console.log(n+' Issue 15 browser checks passed');
}finally{await browser.close()}
