// Deterministic visual fixtures; no seed data is persisted by the application.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const out=new URL('../docs/screenshots/v16/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
let checks=0;
const check=(name,value)=>{assert(value,name);console.log('PASS '+name);checks++};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Europe/Zurich'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-15T12:00:00+01:00')});
 await page.goto(base+'/prototype/?imageDemo=1');
 await page.waitForFunction(()=>document.querySelector('#day-card').textContent.includes('Noch nichts geplant'));
 await page.locator('#day-edit').click();
 await page.locator("#meal-recipe-search").fill("Kürbis");await page.locator('[data-pick-recipe="kuerbissuppe-kaesetoast"]').click();
 await page.locator('#meal-form button[type=submit]').click();
 await page.locator('#day-card img').evaluate(img=>img.decode());
 check('demo visibly labelled and image loaded',await page.locator('#day-card .image-demo-badge').isVisible());
 const geometry=()=>page.evaluate(()=>{
  const card=document.querySelector('#day-card').getBoundingClientRect(),nav=document.querySelector('.bottom-nav').getBoundingClientRect(),title=document.querySelector('.mobile-page-title').getBoundingClientRect(),gear=document.querySelector('.header-settings').getBoundingClientRect();
  return {fits:card.bottom<=nav.top,scroll:document.documentElement.scrollHeight<=innerHeight,center:Math.abs(title.x+title.width/2-innerWidth/2)<1,gear:gear.top>=0,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 const g=await geometry();check('390×844 day fits above nav and title centered',g.fits&&g.scroll&&g.center&&g.gear&&!g.overflow);
 check('header has no blur or transform',await page.locator('.topbar').evaluate(el=>{const s=getComputedStyle(el);return s.filter==='none'&&s.transform==='none'&&s.backdropFilter==='none'}));
 check('only glass background is blurred',await page.locator('.bottom-nav').evaluate(el=>getComputedStyle(el).backdropFilter==='none'&&getComputedStyle(el,'::before').backdropFilter.includes('blur')));
 check('meal controls have transparent background and 44px targets',await page.locator('#meal-pages button').evaluateAll(els=>els.every(el=>getComputedStyle(el).backgroundImage==='none'&&getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'&&el.getBoundingClientRect().height>=44)));
 await page.screenshot({path:out+'01-iphone-planned-image.png',fullPage:true});
 await page.locator('#choose-dinner').click();
 await page.screenshot({path:out+'02-iphone-unplanned.png',fullPage:true});
 await page.locator('#day-edit').click();await page.locator("#meal-recipe-search").fill("Kürbis");await page.locator('[data-pick-recipe="kuerbissuppe-kaesetoast"]').click();await page.locator('#meal-form button[type=submit]').click();
 await page.locator('#day-card img').evaluate(img=>img.decode());
 await page.screenshot({path:out+'03-iphone-dinner.png',fullPage:true});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#week-strip [aria-current=date][aria-pressed=true]'));
 check('reload selects local today',await page.locator('#week-strip [aria-current=date][aria-pressed=true]').count()===1);
 await page.setViewportSize({width:844,height:390});
 if(await page.locator('#screen-week').getAttribute('data-view')!=='week')await page.locator('[data-view=week]').click();
 await page.screenshot({path:out+'04-landscape-week.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('.bottom-nav [data-tab=archive]').click();await page.locator('#recipe-search').fill('kürbis');
 await page.locator('.archive-suggestion img').evaluate(img=>img.decode());
 check('search shows one compact real recipe with labelled demo',await page.locator('.archive-suggestion').count()===1&&(await page.locator('.archive-suggestion').textContent()).includes('Bild-Demo'));
 for(const [key,value] of Object.entries({width:'52',height:'52',loading:'lazy',decoding:'async'}))assert.equal(await page.locator('.archive-suggestion img').getAttribute(key),value);
 await page.screenshot({path:out+'05-iphone-search.png',fullPage:true});
 await page.locator('.archive-suggestion').click();check('search result opens canonical recipe',await page.locator('#dialog-title').textContent()==='Kürbissuppe mit Käsetoast');await page.locator('#dialog-close').click();
 await page.locator('.bottom-nav [data-tab=week]').click();
 if(await page.locator('#screen-week').getAttribute('data-view')!=='day')await page.locator('[data-view=day]').click();
 for(const size of [{width:320,height:568},{width:430,height:932}]){
  await page.setViewportSize(size);check('no horizontal overflow '+size.width,!(await geometry()).overflow);
 }
 await page.setViewportSize({width:320,height:568});await page.addStyleTag({content:'html{font-size:150%} button{font-size:1.2rem!important} .day-card-content strong{font-size:2.4rem!important}'});
 const large=await page.evaluate(()=>{const c=document.querySelector('#day-card').getBoundingClientRect(),t=document.querySelector('.day-card-content strong').getBoundingClientRect(),m=document.querySelector('#meal-pages').getBoundingClientRect();return t.top>=c.top&&t.bottom<m.top});
 check('large text retains title and meal separation',large);
 await page.goto(base+'/prototype/');await page.locator('.bottom-nav [data-tab=archive]').click();await page.locator('#recipe-search').fill('kürbis');
 check('normal mode has neutral placeholder',await page.locator('.suggestion-placeholder').count()===1);
 assert.deepEqual(errors,[]);console.log(`${checks} V16 browser checks passed`);
}finally{await browser.close()}
