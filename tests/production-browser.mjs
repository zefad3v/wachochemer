const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
const root=resolve('.');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const file=resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
 const original=window.matchMedia.bind(window);
 window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:original(q);
});
// Chromium has no installed-PWA CSS emulation; activate the same standalone rules in this isolated fixture.
await context.route('**/styles.css?*',r=>r.fulfill({contentType:'text/css',body:readFileSync(root+'/prototype/styles.css','utf8').replaceAll('(display-mode:standalone)','(min-width:0px)')}));
await context.route('**/backend-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const backendConfig={url:"",publishableKey:""};'}));
const recipe=JSON.parse(readFileSync(root+'/data/recipes/apfel-omeletten.json'));
const fixtures=Array.from({length:25},(_,i)=>({...recipe,id:'test-'+i,slug:'test-'+i,title:'Gericht '+String(i).padStart(2,'0')}));
await context.route('**/data/recipe-index.json',r=>r.fulfill({json:{schemaVersion:1,recipes:fixtures.map(({id,slug})=>({id,slug}))}}));
await context.route('**/data/recipes/test-*.json',r=>r.fulfill({json:fixtures.find(x=>r.request().url().endsWith(x.slug+'.json'))}));
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/?invite=test-marker#callback-marker');
await page.waitForURL('**/prototype/?invite=test-marker#callback-marker');
await page.locator('#help-close').click();
await page.locator('.bottom-nav [data-tab=archive]').click();
await page.waitForFunction(()=>document.querySelectorAll('.archive-card').length===25);
const geometry=await page.evaluate(()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
 return {dock:rect('.bottom-nav'),main:rect('#main'),search:rect('.search-field'),plus:rect('#new-house-recipe')};
});
// Add button is hidden in local-only mode, so verify the production rule separately via computed CSS.
assert(geometry.main.bottom>=geometry.dock.bottom,'Content must continue behind floating dock');
await page.locator('#main').evaluate(e=>e.scrollTop=500);
await page.waitForFunction(()=>document.querySelector('#screen-archive').classList.contains('search-hidden'));
await page.locator('#main').evaluate(e=>e.scrollTop=450);
await page.waitForFunction(()=>!document.querySelector('#screen-archive').classList.contains('search-hidden'));
await page.locator('#archive-sort').selectOption('title-desc');
assert.equal(await page.locator('.archive-caption strong').first().textContent(),'Gericht 24');
await page.locator('.bottom-nav [data-tab=week]').click();
const before=await page.locator('#week-strip').textContent();
async function swipe(dx,dy=0){await page.locator('#week-strip').evaluate((el,{dx,dy})=>{
 const fire=(name,touches,changedTouches=[])=>{const event=new Event(name,{bubbles:true});Object.defineProperties(event,{touches:{value:touches},changedTouches:{value:changedTouches}});el.dispatchEvent(event)};
 fire('touchstart',[{clientX:200,clientY:200}]);fire('touchend',[],[{clientX:200+dx,clientY:200+dy}]);
},{dx,dy});}
await swipe(-80);assert.notEqual(await page.locator('#week-strip').textContent(),before);
await swipe(80);assert.equal(await page.locator('#week-strip').textContent(),before);
await swipe(5,90);assert.equal(await page.locator('#week-strip').textContent(),before);
await page.locator('#day-edit').click();
assert.equal(await page.locator('#meal-recipe-options [data-pick-recipe]').count(),8);
await page.locator('#meal-recipes-more').click();assert.equal(await page.locator('#meal-recipe-options [data-pick-recipe]').count(),16);
await page.locator('#meal-recipe-search').fill('Gericht 24');
assert.equal(await page.locator('#meal-recipe-options [data-pick-recipe]').count(),1);
await page.locator('#meal-recipe-options [data-pick-recipe]').click();
assert.equal(await page.locator('#meal-recipe').inputValue(),'test-24');
const layout=await page.locator('.meal-date-row').evaluate(el=>{
 const inputs=[...el.querySelectorAll('input,select')].map(e=>e.getBoundingClientRect());
 const box=el.getBoundingClientRect();
 return {sameRow:Math.abs(inputs[0].top-inputs[1].top)<2,contained:inputs.every(r=>r.left>=box.left&&r.right<=box.right+.5)};
});
assert(layout.sameRow);assert(layout.contained);

await page.locator('#meal-editor-close').click();
await page.locator('.bottom-nav [data-tab=archive]').click();

assert.deepEqual(errors,[]);
console.log('PASS Chromium portrait: floating dock, scroll search, 25 recipes, query, incremental choices, week swipes, compact date and root redirect');
console.log(JSON.stringify({geometry,layout}));
await page.setViewportSize({width:340,height:740});
await page.locator('.bottom-nav [data-tab=week]').click();await page.locator('#day-edit').click();
assert(await page.locator('#meal-date').evaluate(el=>el.getBoundingClientRect().right<=document.querySelector('.meal-date-row').getBoundingClientRect().right+.5));
await page.locator('#meal-editor-close').click();
await page.setViewportSize({width:1280,height:900});
await page.locator('.bottom-nav [data-tab=archive]').click();
assert.equal(await page.locator('.archive-card').count(),25);
// Open the real editor handler without a cloud session; this fixture only measures layout.
await page.evaluate(()=>document.getElementById('new-house-recipe').click());
await page.locator('#house-add-ingredient').click();
for(const width of [393,340,768]){
 await page.setViewportSize({width,height:900});
 const boxes=await page.locator('#house-recipe-form').evaluate(form=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
  const numbers=[...form.querySelectorAll('.recipe-numbers input')].map(rect);
  const measures=[...form.querySelector('.house-ingredient .ingredient-measure').querySelectorAll('input,select')].map(rect);
  const last=rect(form.querySelector('.house-ingredient:last-child'));
  const add=rect(document.getElementById('house-add-ingredient'));
  const bounds=rect(form);
  return {numbers,measures,addGap:add.top-last.bottom,contained:[...numbers,...measures].every(r=>r.left>=bounds.left&&r.right<=bounds.right+.5)};
 });
 assert(boxes.numbers.every(r=>Math.abs(r.height-46)<.5),JSON.stringify({width,boxes}));
 assert(Math.abs(boxes.numbers[0].top-boxes.numbers[1].top)<.5);
 assert(Math.abs(boxes.numbers[1].top-boxes.numbers[2].top)<.5);
 assert(Math.abs(boxes.numbers[3].top-boxes.numbers[4].top)<.5);
 assert(boxes.measures.every(r=>Math.abs(r.height-46)<.5));
 assert(Math.abs(boxes.measures[0].top-boxes.measures[1].top)<.5);
 assert(boxes.addGap>=15.5);assert(boxes.contained);
 console.log('PASS recipe editor geometry',width,JSON.stringify(boxes));
}
assert.deepEqual(errors,[]);
await page.evaluate(()=>document.getElementById('house-recipe-editor').close());
await browser.close();await new Promise(resolve=>server.close(resolve));
