// Optional verification dependency; application itself has no npm dependencies.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output=process.env.PLANNER_SCREENSHOTS||'/tmp/wachochemer-responsive';
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const server=spawn('python3',['-m','http.server','8765'],{stdio:'ignore'});
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({timezoneId:'Europe/Zurich',viewport:{width:393,height:852},hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00'));
  await page.goto('http://127.0.0.1:8765/prototype/');
  await page.waitForFunction(()=>document.querySelectorAll('#meal-recipe-options button').length===0&&document.querySelector('#day-card strong'));
  await page.locator('#edit-day').click();await page.locator('[data-pick-recipe]').first().waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'meal-editor-title');
  await page.locator('#meal-date').fill('2026-11-15');await page.locator('#meal-servings').fill('5');
  await page.locator('#meal-form button[type=submit]').click();
  await page.reload();await page.locator('#day-card strong').waitFor();
  assert.equal(await page.locator('#screen-week').getAttribute('data-view'),'day');
  assert.equal(await page.locator('#week-strip button').count(),7);
  const choose=async i=>page.locator('#week-strip button').nth(i).click();
  await choose(6);const last=await page.locator('#day-card').getAttribute('aria-label');
  const cdp=await context.newCDPSession(page);
  const swipe=async(dx,dy)=>{
   const box=await page.locator('#day-card').boundingBox();
   const x=box.x+box.width/2,y=box.y+100;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx/2,y:y+dy/2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  const range=await page.locator('#week-range').innerText();await swipe(-90,2);
  assert.notEqual(await page.locator('#week-range').innerText(),range);assert.equal(await page.locator('#week-strip button').first().getAttribute('aria-current'),'date');
  await swipe(90,0);assert.equal(await page.locator('#week-range').innerText(),range);assert.equal(await page.locator('#day-card').getAttribute('aria-label'),last);
  await choose(2);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('wachochemer:plannerViews'))),null);const selected=await page.locator('#day-card').getAttribute('aria-label');
  await page.locator('#edit-day').click();await page.locator('#meal-kind').selectOption('manual');await page.locator('#meal-manual').fill('Familienmenü');
  await page.setViewportSize({width:852,height:393});
  await page.waitForFunction(()=>document.querySelector('#screen-week').dataset.view==='week');
  assert.equal(await page.locator('#meal-manual').inputValue(),'Familienmenü');
  assert.equal(await page.locator('#day-card').getAttribute('aria-label'),selected);
  await page.locator('#meal-form button[type=submit]').click();assert.match(await page.locator('#week-overview').innerText(),/Familienmenü/);
  assert.equal(await page.locator('.week-row').count(),7);
  await page.locator('[data-view=day]').click();await page.setViewportSize({width:393,height:852});
  await page.waitForFunction(()=>document.querySelector('#screen-week').dataset.view==='day');
  await page.locator('[data-view=week]').click();await page.reload();await page.locator('.week-row').first().waitFor();
  assert.equal(await page.locator('#screen-week').getAttribute('data-view'),'week');
  assert.match(await page.locator('#week-overview').innerText(),/Familienmenü/);
  await page.locator('[data-view=day]').click();await page.screenshot({path:output+'/mobile-day.png',fullPage:true});
  await page.locator('.bottom-nav [data-tab=archive]').click();await page.locator('.archive-card').first().waitFor();
  const before=await page.locator('.archive-card').first().evaluate(el=>getComputedStyle(el).display);
  await page.locator('#recipe-search').fill('Fajitas');assert.equal(await page.locator('.archive-card').count(),1);
  assert.equal(await page.locator('.archive-card').evaluate(el=>getComputedStyle(el).display),before);
  await page.locator('.archive-card').click();await page.locator('.plan-recipe-action').click();
  await page.locator('#meal-date').fill('2026-11-19');await page.locator('#meal-type').selectOption('lunch');
  assert.equal(await page.locator('#meal-recipe').inputValue(),'poulet-fajitas');
  await page.locator('#meal-servings').fill('6');await page.locator('#meal-form button[type=submit]').click();
  const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('wachochemer:mealPlanV1')));
  assert.deepEqual(plan.entries['2026-11-19|lunch'],{type:'recipe',recipeId:'poulet-fajitas',servings:6});
  await page.locator('.bottom-nav [data-tab=week]').click();
  await page.locator('[data-view=week]').click();await page.locator('#week-next').click();
  await page.locator('[data-edit-day="0"]').click();assert.equal(await page.locator('#meal-date').inputValue(),'2026-11-19');
  await page.locator('#meal-type').selectOption('lunch');assert.equal(await page.locator('#meal-servings').inputValue(),'6');
  await page.locator('#meal-editor-close').click();await page.locator('[data-view=day]').click();
  await page.locator('#day-card').click();assert.match(await page.locator('#dialog-title').innerText(),/Fajitas/);await page.locator('#dialog-close').click();
  await page.locator('#edit-day').click();await page.locator('#meal-kind').selectOption('leftover');await page.locator('#meal-leftover-source').fill('2026-11-18');await page.locator('#meal-form button[type=submit]').click();
  assert.match(await page.locator('#day-meals').innerText(),/Reschte vom 2026-11-18/);
  await page.locator('#edit-day').click();await page.locator('#meal-remove').click();assert.doesNotMatch(await page.locator('#day-meals').innerText(),/Reschte/);
  await page.locator('.bottom-nav [data-tab=shopping]').click();await page.locator('#shopping-from').fill('2026-11-01');await page.locator('#shopping-from').dispatchEvent('change');await page.locator('#shopping-to').fill('2026-11-30');await page.locator('#shopping-to').dispatchEvent('change');
  assert.equal(await page.locator('#shopping-window-error').isVisible(),false);
  await page.locator('#shopping-extra').fill('Windeln');await page.locator('#shopping-add-form button').click();assert.match(await page.locator('#shopping-items').innerText(),/Windeln/);
  await page.locator('.header-settings').click();await page.locator('#settings-back').click();assert(await page.locator('#screen-shopping').isVisible());
  await page.locator('.header-settings').click();await page.locator('.header-settings').click();assert(await page.locator('#screen-shopping').isVisible());
  for(const width of [320,393,679,680,852,1100,1440]){
   await page.setViewportSize({width,height:width===852?393:900});
   for(const tab of ['week','archive','shopping']){
    await page.locator('.bottom-nav [data-tab='+tab+']').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width} ${tab}`);
   }
  }
  await page.locator('.bottom-nav [data-tab=week]').click();await page.locator('[data-view=week]').click();
  await page.screenshot({path:output+'/desktop-week.png',fullPage:true});
  await page.setViewportSize({width:852,height:393});await page.screenshot({path:output+'/landscape-week.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Browser checks passed: selection, boundary swipes, responsive defaults, draft preservation, preferences/reload, archive target/meal/servings, shopping range/extras, settings, overflow at 7 widths. Screenshots: '+output);
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
