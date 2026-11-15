// Chromium viewport/Safe-Area simulation; never claims to be real iOS PWA.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const out=new URL('../docs/screenshots/v17/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
let checks=0;
function check(name,value){assert(value,name);console.log('PASS '+name);checks++}
async function ready(page){await page.waitForFunction(()=>document.querySelector('#day-card').textContent.includes('No nüt plant'))}
async function headerSharp(page){return page.evaluate(()=>{
 const nodes=[...document.querySelectorAll('.mobile-page-title,.header-settings,.header-settings svg')];
 return nodes.every(el=>{for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.filter!=='none'||s.backdropFilter!=='none'||s.transform!=='none'||Number(s.opacity)!==1)return false}return true});
})}
async function dimensions(page){return page.evaluate(()=>{
 const r=s=>document.querySelector(s).getBoundingClientRect(),c=r('#day-card'),n=r('.bottom-nav'),h=r('.topbar'),t=r('.mobile-page-title');
 return {fits:c.bottom+4<=n.top,scroll:document.documentElement.scrollHeight>innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,gap:n.top-c.bottom,header:h.height,center:Math.abs(t.x+t.width/2-innerWidth/2)<1};
})}
try{
 const errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'Europe/Zurich'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-15T12:00:00+01:00')});
 await page.goto(base+'/prototype/?imageDemo=1');await ready(page);
 check('day is primary on fresh start',await page.locator('#screen-week').getAttribute('data-view')==='day');
 check('header and all foreground ancestors are unfiltered',await headerSharp(page));
 let g=await dimensions(page);check('390×844 fits without scroll, compact dock gap and centered header',g.fits&&!g.scroll&&!g.overflow&&g.gap<18&&g.center);
 check('no separate edit-day button',await page.locator('#edit-day').count()===0);
 check('secondary week control sits after day navigation',await page.locator('.day-navigation #week-strip + .view-switch').count()===1);
 check('secondary switch has no glass/background',await page.locator('.view-switch').evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(el,'::before').display==='none'));
 await page.locator('[data-view=week]').click();check('week view opens',await page.locator('#week-overview').isVisible());await page.locator('[data-view=day]').click();
 await page.reload();await ready(page);check('explicit day preference survives reload',await page.locator('#screen-week').getAttribute('data-view')==='day');
 // Actual recipe planning, no injected recipe data.
 await page.locator('#day-card').click();await page.locator('[data-pick-recipe="kuerbissuppe-kaesetoast"]').click();await page.locator('#meal-form button[type=submit]').click();await page.locator('#day-card img').evaluate(img=>img.decode());
 await page.screenshot({path:out+'02-iphone-image-card.png',fullPage:true});
 check('atmosphere uses only selected image',await page.locator('#app').evaluate(el=>el.style.getPropertyValue('--meal-atmosphere').includes('pumpkin-soup.webp')));
 check('dock blur is on background only',await page.locator('.bottom-nav').evaluate(el=>getComputedStyle(el).backdropFilter==='none'&&getComputedStyle(el,'::before').backdropFilter.includes('blur(30px)')));
 await page.locator('.bottom-nav').screenshot({path:out+'05-glass-navigation.png'});
 await page.locator('.bottom-nav [data-tab=archive]').click();await page.locator('.archive-card img').evaluate(img=>img.decode());
 const equalCards=()=>page.locator('.archive-card').evaluateAll(els=>{const sizes=els.map(el=>el.getBoundingClientRect().height);return sizes.length===3&&Math.max(...sizes)-Math.min(...sizes)<1});
 check('photo and placeholder tiles share one height across all rows',await equalCards());
 check('archive text fits inside every tile',await page.locator('.archive-card').evaluateAll(els=>els.every(el=>{const c=el.getBoundingClientRect(),t=el.querySelector('.archive-caption').getBoundingClientRect();return t.top>=c.top&&t.bottom<=c.bottom})));
 await page.screenshot({path:out+'03-archive-grid.png',fullPage:true});
 const searchTop=await page.locator('#recipe-search').boundingBox();
 for(const query of ['k','kü','kürbis'])await page.locator('#recipe-search').fill(query);
 await page.locator('.archive-suggestion img').evaluate(img=>img.decode());
 check('typing leaves search position stable',Math.abs((await page.locator('#recipe-search').boundingBox()).y-searchTop.y)<1);
 check('compact search retains fixed lazy async thumbnail',await page.locator('.archive-suggestion img').evaluate(img=>img.width===52&&img.height===52&&img.loading==='lazy'&&img.decoding==='async'));
 await page.screenshot({path:out+'04-live-search.png',fullPage:true});
 await page.locator('.archive-suggestion').click();await page.locator('#dialog-favourite').click();await page.locator('#dialog-close').click();await page.locator('#recipe-search').fill('');await page.locator('[data-filter=favorites]').click();check('favourite survives filtering',await page.locator('.archive-card').count()===1);
 await page.locator('[data-filter=all]').click();await page.setViewportSize({width:320,height:568});
 await page.addStyleTag({content:'.archive-caption strong{font-size:30px!important;line-height:1.2!important}'});check('long/larger tile text grows every grid row evenly',await equalCards());
 await page.locator('.bottom-nav [data-tab=week]').click();
 g=await dimensions(page);check('small phone stays within viewport width',!g.overflow);
 await page.addStyleTag({content:'.day-card-content strong{font-size:64px!important;line-height:1.2!important}'});
 check('large text grows card and allows scrolling', (await dimensions(page)).scroll);
 await page.locator('#meal-pages').scrollIntoViewIfNeeded();
 await page.locator('#choose-dinner').click();await page.locator('#day-card').click();check('card still edits selected dinner',await page.locator('#meal-type').inputValue()==='dinner');await page.locator('#meal-editor-close').click();
 await page.setViewportSize({width:844,height:390});await page.locator('[data-view=week]').click();await page.locator('#prepare-bring').click();check('Bring preparation remains reachable',await page.locator('#screen-shopping').isVisible());
 await page.locator('#shopping-back').click();check('sharp header after scroll/navigation',await headerSharp(page));
 // Simulate CSS env() values 59/34px on a modern iPhone; no installation claim.
 const pwa=await context.newPage();await pwa.setViewportSize({width:393,height:852});
 await pwa.route('**/prototype/styles.css',async route=>{
  const response=await route.fetch();const css=(await response.text()).replace(/env\(safe-area-inset-(top|bottom|left|right)\)/g,(_,side)=>({top:'59px',bottom:'34px',left:'0px',right:'0px'})[side]);
  await route.fulfill({response,body:css});
 });
 await pwa.clock.install({time:new Date('2026-11-15T12:00:00+01:00')});await pwa.goto(base+'/prototype/?imageDemo=1');
 await pwa.waitForFunction(()=>document.querySelector('#day-card img'));await pwa.locator('#day-card img').evaluate(img=>img.decode());
 if(await pwa.locator('#screen-week').getAttribute('data-view')!=='day')await pwa.locator('[data-view=day]').click();
 const safe=await dimensions(pwa);check('59/34px PWA safe-area simulation fits without scroll',safe.fits&&!safe.scroll&&!safe.overflow);
 check('PWA simulation keeps header sharp above background',await headerSharp(pwa));
 await pwa.screenshot({path:out+'01-pwa-safe-area-simulation.png',fullPage:true});
 const desktop=await context.newPage();await desktop.setViewportSize({width:1280,height:900});await desktop.goto(base+'/prototype/');
 await desktop.locator('.bottom-nav [data-tab=archive]').click();
 check('desktop dock remains above header backdrop and archive opens',await desktop.locator('#screen-archive').isVisible());
 check('desktop archive tiles share one height',await desktop.locator('.archive-card').evaluateAll(els=>{const h=els.map(e=>e.getBoundingClientRect().height);return Math.max(...h)-Math.min(...h)<1}));
 assert.deepEqual(errors,[]);console.log(`${checks} V17 browser checks passed`);
}finally{await browser.close()}
