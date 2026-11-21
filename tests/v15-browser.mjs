// Optional real-browser checks: requires Playwright and Chromium, plus a local HTTP server.
// node tests/v15-browser.mjs (BASE_URL defaults to http://127.0.0.1:8000)
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://127.0.0.1:8000';
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Europe/Zurich'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-12-31T12:59:00+01:00')});
 await page.goto(base+'/prototype/');
 await page.waitForFunction(()=>document.querySelector('#day-card').textContent.includes('Noch nichts geplant'));
 await check('initialization without edit-day, local today and before-14 lunch',async()=>{
  assert.equal(await page.locator('#edit-day').count(),0);
  assert.equal(await page.locator('#week-strip [aria-current=date]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#week-strip [aria-current=date] strong').textContent(),'31');
  assert.equal(await page.locator('#choose-lunch').getAttribute('aria-pressed'),'true');
 });
 await check('today is independent from selection across year/week boundary',async()=>{
  await page.locator('#week-strip [data-day="1"]').click();
  assert.equal(await page.locator('#week-strip [aria-current=date]').getAttribute('aria-pressed'),'false');
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#week-strip [aria-current=date]').count(),0);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#week-strip [aria-current=date]').getAttribute('aria-pressed'),'true');
 });
 await check('card edits selected meal and persists recipe and portions',async()=>{
  await page.locator('#choose-dinner').click();await page.locator('#day-edit').click();
  assert.equal(await page.locator('#meal-type').inputValue(),'dinner');
  assert.equal(await page.locator('#meal-date').inputValue(),'2026-12-31');
  await page.locator('#meal-recipe-search').fill('Kürbis');await page.locator('[data-pick-recipe]').click();await page.locator('#meal-advanced').evaluate(el=>el.open=true);await page.locator('#meal-servings').fill('6');await page.locator('#meal-form button[type=submit]').click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('#day-card').textContent.length>0);
  await page.locator('#choose-dinner').click();await page.locator('#day-edit').click();
  assert.equal(await page.locator('#meal-servings').inputValue(),'6');
  assert.equal(await page.locator('#recipe-dialog[open]').count(),0);
  await page.locator('#meal-editor-close').click();
 });
 await check('swipe changes meal without opening editor',async()=>{
  await page.locator('#day-card').evaluate(el=>{
   const touch=(type,x)=>el.dispatchEvent(new TouchEvent(type,{bubbles:true,touches:type==='touchend'?[]:[new Touch({identifier:1,target:el,clientX:x,clientY:200})],changedTouches:[new Touch({identifier:1,target:el,clientX:x,clientY:200})]}));
   touch('touchstart',100);touch('touchend',220);el.click();
  });
  assert.equal(await page.locator('#choose-lunch').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#meal-editor[open]').count(),0);
 });
 await check('manual meal survives time and navigation, resets on local midnight',async()=>{
  await page.clock.setSystemTime(new Date('2026-12-31T15:00:00+01:00'));
  await page.locator('#week-strip [data-day="1"]').click();
  assert.equal(await page.locator('#choose-lunch').getAttribute('aria-pressed'),'true');
  await page.clock.setSystemTime(new Date('2027-01-01T15:00:00+01:00'));
  await page.setViewportSize({width:391,height:844});
  await page.waitForFunction(()=>document.querySelector('#choose-dinner').getAttribute('aria-pressed')==='true');
 });
 await check('portrait/landscape layout and glass controls stay within card',async()=>{
  for(const size of [{width:390,height:844},{width:844,height:390},{width:320,height:568}]){
   await page.setViewportSize(size);
   if(await page.locator('#screen-week').getAttribute('data-view')!=='day')await page.locator('button[data-view=day]').click();
   const result=await page.evaluate(()=>{
    const c=document.querySelector('#day-card').getBoundingClientRect(),m=document.querySelector('#meal-pages').getBoundingClientRect(),t=document.querySelector('.day-card-content strong').getBoundingClientRect();
    return {inside:m.bottom<=c.bottom&&m.top>=c.top,noOverlap:t.bottom<m.top,noOverflow:document.documentElement.scrollWidth<=innerWidth,blur:getComputedStyle(document.querySelector('.bottom-nav'),'::before').backdropFilter};
   });
   assert(result.inside&&result.noOverlap&&result.noOverflow,JSON.stringify({size,result}));assert.match(result.blur,/blur/);
  }
 });
 await check('instant search uses 52px neutral thumbnails and opens recipe details',async()=>{
  await page.setViewportSize({width:390,height:844});
  await page.locator('.bottom-nav [data-tab=archive]').click();
  const top=await page.locator('.topbar').boundingBox();
  await page.locator('#recipe-search').fill('poulet');
  assert.equal(await page.locator('.archive-suggestion').count(),1);
  assert.equal(await page.locator('.archive-card').count(),0);
  const thumb=await page.locator('.suggestion-thumb').boundingBox();assert.equal(thumb.width,52);assert.equal(thumb.height,52);
  assert.equal((await page.locator('.topbar').boundingBox()).y,top.y);
  await page.locator('.archive-suggestion').click();assert.equal(await page.locator('#recipe-dialog[open]').count(),1);
 });
 await page.locator('#dialog-close').click();
 await page.locator('.bottom-nav [data-tab=week]').click();
 if(await page.locator('#screen-week').getAttribute('data-view')!=='day')await page.locator('button[data-view=day]').click();
 await page.screenshot({path:'/tmp/wachochemer-v15-portrait.png',fullPage:true});
 assert.deepEqual(errors,[]);await context.close();
 const west=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});
 const westPage=await west.newPage();await westPage.clock.install({time:new Date('2027-01-01T00:30:00Z')});
 await westPage.goto(base+'/prototype/');
 await check('fresh start after 14 uses dinner and local calendar instead of UTC date',async()=>{
  await westPage.waitForFunction(()=>document.querySelector('#week-strip [aria-current=date]'));
  assert.equal(await westPage.locator('#week-strip [aria-current=date] strong').textContent(),'31');
  assert.equal(await westPage.locator('#choose-dinner').getAttribute('aria-pressed'),'true');
 });
 await west.close();
 // Exercise the photo path with an explicit test fixture, without adding recipe photos.
 const photo=await browser.newPage({viewport:{width:390,height:844}});
 await photo.route('**/prototype/recipe-images.mjs',async route=>{
  const response=await route.fetch();const body=(await response.text()).replace('export const recipeImages={};','export const recipeImages={"poulet-fajitas":"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="};');
  await route.fulfill({response,body});
 });
 await photo.goto(base+'/prototype/');await photo.locator('.bottom-nav [data-tab=archive]').click();await photo.locator('#recipe-search').fill('poulet');
 await check('provided-photo rendering has fixed dimensions, lazy loading and async decoding',async()=>{
  const img=photo.locator('.archive-suggestion img');await img.waitFor();
  for(const [key,value] of Object.entries({width:'52',height:'52',loading:'lazy',decoding:'async'}))assert.equal(await img.getAttribute(key),value);
 });
 await photo.close();console.log(`${checks} browser checks passed`);
}finally{await browser.close()}
