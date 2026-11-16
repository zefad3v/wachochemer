import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let n=0;const check=v=>{assert(v);n++};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/prototype/');
 await page.waitForFunction(()=>document.querySelector('#day-card').textContent.includes('No nüt plant'));
 await page.locator('#choose-dinner').click();await page.locator('#day-card').click();
 await page.locator('#meal-recipe-search').fill('Fajitas');await page.locator('[data-pick-recipe]').click();
 await page.locator('#meal-servings').fill('5.5');await page.locator('#meal-consumed').fill('2.5');await page.locator('#meal-form button[type=submit]').click();
 await page.locator('[data-view=week]').click();await page.locator('#prepare-bring').click();
 const href=await page.locator('#bring-imports a').getAttribute('href');check(new URL(href).searchParams.get('requestedQuantity')==='5.5');
 const downloadPromise=page.waitForEvent('download');await page.locator('#shopping-manifest').click();
 const download=await downloadPromise;const data=JSON.parse(readFileSync(await download.path(),'utf8'));
 check(data.cooking.length===1);check(data.bringState.transferVerified===false);
 const before=data.items.length;await page.locator('#shopping-optional').check();
 const d2=page.waitForEvent('download');await page.locator('#shopping-manifest').click();const d=await d2;
 const optional=JSON.parse(readFileSync(await d.path(),'utf8'));check(optional.items.length>before);
 // Clipboard mocked locally: test fallback text without touching a Bring account.
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedText=text}},configurable:true}));
 await page.locator('#shopping-copy').click();check((await page.evaluate(()=>window.copiedText)).includes('nicht überprüft'));
 check((await page.locator('#shopping-copy-status').textContent()).includes('müend si no'));
 check(await page.locator('#shopping-items input[type=checkbox]').count()===0);
 check(errors.length===0);console.log(n+' Bring browser checks passed');
}finally{await browser.close()}
