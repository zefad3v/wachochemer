// Optional real-browser checks, without adding runtime dependencies to the app.
// Install Playwright separately or set PLAYWRIGHT_MODULE to an existing package.
// CAROUSEL_SCREENSHOTS selects the output directory; default is the OS temp folder.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const output=process.env.CAROUSEL_SCREENSHOTS||path.join(os.tmpdir(),'wachochemer-carousel');
const passed=[];

async function main(){
 fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  try{
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'text/plain');
   res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,timezoneId:'Europe/Zurich'});
  let page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/prototype/`;
  const ready=()=>page.waitForFunction(()=>document.getElementById('wheel').dataset.weekKey?.endsWith('|1'));
  const index=()=>page.locator('.recipe-card.current').getAttribute('data-day').then(Number);
  const settle=()=>page.waitForFunction(()=>document.getAnimations().every(animation=>animation.playState!=='running'));
  const shot=name=>page.screenshot({path:path.join(output,name+'.png')});
  async function check(name,fn){await fn();passed.push(name);console.log('PASS '+name)}
  async function sameCards(){assert(await page.evaluate(()=>window.testCards.every((card,i)=>card===document.querySelectorAll('.recipe-card')[i])))}
  async function layout(){
   return page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.recipe-card')];
    const bounds=document.querySelector('.week-experience').getBoundingClientRect();
    return {count:cards.length,dates:cards.map(c=>c.dataset.date),visibleText:cards.filter(c=>getComputedStyle(c.querySelector('.card-content')).display!=='none').length,
     width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,
     cards:cards.map(c=>{
      const rect=c.getBoundingClientRect(),face=getComputedStyle(c.querySelector('.card-face'));
      return {day:c.dataset.day,current:c.classList.contains('current'),radius:parseFloat(face.borderRadius),opacity:getComputedStyle(c).opacity,
       inBounds:rect.left>=bounds.left-.5&&rect.right<=bounds.right+.5&&rect.top>=bounds.top-.5&&rect.bottom<=bounds.bottom+.5};
     })};
   });
  }
  const cdp=await context.newCDPSession(page);
  async function swipe(dy,dx=0){
   const box=await page.locator('.recipe-card.current').boundingBox();
   const x=box.x+box.width/2,y=box.y+box.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/4,y:y+dy*i/4}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await page.goto(url);
  await ready();await settle();
  await check('mobile start: seven dated cards, one text layer, opaque rounded faces, no overflow',async()=>{
   const state=await layout();
   assert.equal(state.count,7);assert.equal(new Set(state.dates).size,7);assert.equal(state.visibleText,1);
   assert.equal(state.scrollWidth,state.width);assert.equal(state.scrollY,0);
   assert(state.cards.every(c=>c.opacity==='1'&&c.radius>=19&&c.inBounds),JSON.stringify(state));
   await page.evaluate(()=>window.testCards=[...document.querySelectorAll('.recipe-card')]);
   await shot('mobile-start');
  });
  await check('day arrows rotate both ways without replacing cards',async()=>{
   const first=await index();
   await page.locator('#day-next').click();assert.equal(await index(),(first+1)%7);
   await settle();await shot('mobile-next');
   await page.locator('#day-prev').click();assert.equal(await index(),first);await sameCards();
  });
  await check('native touch up/down rotates once, rapid swipes complete two circuits without page scroll',async()=>{
   await settle();const first=await index();
   await swipe(-85);assert.equal(await index(),(first+1)%7);
   await swipe(85);assert.equal(await index(),first);
   for(let i=0;i<14;i++)await swipe(-75);
   assert.equal(await index(),first);await sameCards();await settle();
   const state=await layout();assert.equal(state.scrollY,0);assert.equal(state.visibleText,1);
   await shot('mobile-rapid');
  });
  await check('tap and jitter do not rotate; drag does not open editor; pinch cancellation does not select',async()=>{
   const first=await index();
   await swipe(-16);assert.equal(await index(),first);
   assert.equal(await page.locator('#meal-editor').evaluate(d=>d.open),false);
   const box=await page.locator('.recipe-card.current').boundingBox();
   const x=box.x+box.width/2,y=box.y+box.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y},{x:x+30,y:y+30}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   assert.equal(await index(),first);
  });
  await check('visible neighbour can be selected by tapping its exposed image',async()=>{
   await page.waitForTimeout(430);
   const point=await page.evaluate(()=>{
    const current=document.querySelector('.recipe-card.current');
    const wheel=document.getElementById('wheel').getBoundingClientRect();
    for(let y=wheel.top+10;y<wheel.bottom;y+=5)for(let x=wheel.left+5;x<wheel.right;x+=5){
     const card=document.elementFromPoint(x,y)?.closest('.recipe-card');
     if(card&&card!==current)return {x,y,index:Number(card.dataset.day)};
    }
   });
   assert(point,'No neighbour hit target found');
   await page.touchscreen.tap(point.x,point.y);assert.equal(await index(),point.index);await sameCards();await settle();
  });
  await check('week change resets to day zero; all seven new dates map to new data',async()=>{
   const dates=(await layout()).dates;
   await page.locator('#week-next').click();await settle();assert.equal(await index(),0);
   const changed=(await layout()).dates;
   changed.forEach((date,i)=>assert.equal(Date.parse(date)-Date.parse(dates[i]),7*86400000));
   assert.equal((await layout()).visibleText,1);
   await page.evaluate(()=>window.testCards=[...document.querySelectorAll('.recipe-card')]);
  });
  await check('last/first seam is one continuous step in either direction',async()=>{
   await page.locator('#day-prev').click();assert.equal(await index(),6);
   const before=await page.locator('.wheel-ring').evaluate(el=>el.style.transform);
   assert(Math.abs(Number(before.match(/rotateY\(([^d]+)deg\)/)[1])-360/7)<.001);
   await page.locator('#day-next').click();assert.equal(await index(),0);
   assert((await page.locator('.wheel-ring').evaluate(el=>el.style.transform)).includes('rotateY(0deg)'));
   await sameCards();await settle();
  });
  let date;
  await check('active card tap opens editor; recipe dinner and manual lunch persist after reload',async()=>{
   await page.locator('.recipe-card.current').tap();assert(await page.locator('#meal-editor').evaluate(d=>d.open));
   date=await page.locator('#meal-editor-date').textContent();
   await page.locator('#meal-servings').fill('5');
   await page.locator('#meal-servings').press('ArrowUp');assert.equal(await index(),0);
   await page.locator('#meal-servings').fill('5');
   await shot('mobile-editor');await page.locator('[type=submit]',{hasText:'Speichere'}).click();
   await page.locator('#edit-day').click();await page.locator('#meal-type').selectOption('lunch');
   await page.locator('#meal-kind').selectOption('manual');await page.locator('#meal-manual').fill('Zmittag bi de Grosseltere');
   await page.locator('[type=submit]',{hasText:'Speichere'}).click();
   const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('wachochemer:mealPlanV1')));
   assert.equal(plan.entries[date+'|dinner'].servings,5);assert.equal(plan.entries[date+'|lunch'].title,'Zmittag bi de Grosseltere');
   await page.reload();await ready();await settle();
   const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('wachochemer:mealPlanV1')));assert.deepEqual(restored,plan);
   await page.locator('#week-next').click();await page.locator('#edit-day').click();
   assert.equal(await page.locator('#meal-editor-date').textContent(),date);
   assert.equal(await page.locator('#meal-servings').inputValue(),'5');await page.locator('#meal-editor-close').click();
  });
  await check('planned recipe opens details; archive selection still enters the selected calendar day',async()=>{
   await settle();await page.locator('.recipe-card.current').tap();assert(await page.locator('#recipe-dialog').evaluate(d=>d.open));
   await page.locator('#dialog-close').click();
   await page.locator('.bottom-nav [data-tab=archive]').click();await page.locator('.archive-card').first().click();
   await page.locator('.plan-recipe-action').click();assert.equal(await page.locator('#meal-editor-date').textContent(),date);
   await page.locator('#meal-editor-close').click();
  });
  await check('shopping includes planned recipe only, free date range and extra article survive reload',async()=>{
   await page.locator('.bottom-nav [data-tab=shopping]').click();
   await page.locator('#shopping-from').fill(date);await page.locator('#shopping-to').fill(date);
   assert(await page.locator('[data-shopping]').count()>0);
   await page.locator('#shopping-extra').fill('Windle');await page.locator('#shopping-add-form button').click();
   assert(await page.locator('#shopping-items').textContent().then(t=>t.includes('Windle')));
   await page.reload();await ready();await page.locator('.bottom-nav [data-tab=shopping]').click();
   assert.equal(await page.locator('#shopping-from').inputValue(),date);
   assert(await page.locator('#shopping-items').textContent().then(t=>t.includes('Windle')));
  });
  await check('leftover entry and removal remain available; demos generate no ingredients',async()=>{
   await page.locator('.bottom-nav [data-tab=week]').click();await page.locator('#week-next').click();
   await page.locator('#day-next').click();await page.locator('#edit-day').click();
   await page.locator('#meal-kind').selectOption('leftover');
   assert(await page.locator('#meal-leftover-tip').isVisible());
   await page.locator('[type=submit]',{hasText:'Speichere'}).click();
   await page.locator('#edit-day').click();assert.equal(await page.locator('#meal-kind').inputValue(),'leftover');
   await page.locator('#meal-remove').click();
   await page.locator('#edit-day').click();assert(await page.locator('#meal-remove').isDisabled());
   await page.locator('#meal-editor-close').click();
   await page.locator('.bottom-nav [data-tab=shopping]').click();
   await page.locator('#shopping-from').fill('2026-01-01');await page.locator('#shopping-to').fill('2026-01-07');
   assert.equal(await page.locator('[data-shopping]').count(),0);
  });
  await check('small portrait screens and desktop fit all rounded card bounds',async()=>{
   await page.locator('.bottom-nav [data-tab=week]').click();
   for(const viewport of [{width:320,height:568},{width:390,height:664},{width:430,height:932},{width:1440,height:1000}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(180);await settle();
    const state=await layout();assert.equal(state.scrollWidth,state.width);
    assert(state.cards.every(c=>c.inBounds),JSON.stringify({viewport,state}));
    if(viewport.width===320)await shot('mobile-small');
    if(viewport.width===1440)await shot('desktop-start');
   }
  });
  await check('desktop mouse wheel and arrow keys retain stable cards; reduced motion removes transitions',async()=>{
   const desktop=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Europe/Zurich'});
   page=await desktop.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await ready();await settle();await shot('desktop-start');
   await page.evaluate(()=>window.testCards=[...document.querySelectorAll('.recipe-card')]);
   const first=await index();await page.keyboard.press('ArrowDown');assert.equal(await index(),(first+1)%7);
   await page.keyboard.press('ArrowUp');assert.equal(await index(),first);
   await settle();await page.locator('.recipe-card.current').hover();await page.mouse.wheel(0,180);await page.waitForTimeout(50);assert.equal(await index(),(first+1)%7);
   await sameCards();await settle();await shot('desktop-next');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('.wheel-ring').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
   await page.keyboard.press('ArrowDown');await sameCards();assert.deepEqual(errors,[]);
  });
  await check('each selected card owns its visible centre for all seven days on desktop and mobile',async()=>{
   for(const viewport of [{width:1440,height:1000},{width:393,height:852}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(180);
    for(let i=0;i<7;i++){
     await page.keyboard.press('ArrowDown');
     const hit=await page.evaluate(()=>{
      const active=document.querySelector('.recipe-card.current'),rect=active.getBoundingClientRect();
      const target=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('.recipe-card');
      return {active:active.dataset.day,hit:target?.dataset.day};
     });
     assert.equal(hit.hit,hit.active,JSON.stringify({viewport,hit}));
    }
   }
  });
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({browser:await browser.version(),passed,errors},null,2));
  console.log(`${passed.length} browser scenarios passed. Screenshots: ${output}`);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
