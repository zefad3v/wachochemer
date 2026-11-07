import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../prototype/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../prototype/styles.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../prototype/app.js',import.meta.url),'utf8');

test('week photo background belongs to the app root, not the clipped week section',()=>{
 assert.equal((html.match(/id="ambient-backdrop"/g)||[]).length,1);
 assert.match(html,/<div id="app">\s*<div id="ambient-backdrop"/);
 assert.match(css,/body\.week-mode #app>\.ambient-backdrop\s*\{/);
 assert.match(css,/body\.week-mode #app>\.ambient-backdrop\s*\{[^}]*position:fixed/);
 assert.doesNotMatch(html,/week-bottom-frost/);
});
test('search page cannot vertically auto-centre when result count changes',()=>{
 assert.match(css,/#main>\.screen\.active:not\(#screen-week\)\s*\{[^}]*margin:0 auto/s);
 assert.match(css,/#main>\.screen\.active:not\(#screen-week\)\s*\{[^}]*align-self:stretch/s);
});
test('header has full mobile width, safe area and corner settings hit target',()=>{
 assert.match(css,/#app>\.topbar\s*\{[^}]*width:100%/s);
 assert.match(css,/#app>\.topbar\s*\{[^}]*env\(safe-area-inset-top\)/s);
 assert.match(css,/#app>\.topbar \.header-settings\s*\{[^}]*right:calc\(3px \+ env\(safe-area-inset-right\)\)/s);
 assert.match(css,/#app>\.topbar \.header-settings\s*\{[^}]*width:44px;height:44px/s);
});
test('recipe title receives initial focus, not back button',()=>{
 assert.match(html,/<h2 id="dialog-title" tabindex="-1">/);
 assert.match(js,/dialog\.showModal\(\);\s*dialog\.querySelector\("\.dialog-scroll"\)\.scrollTop=0;[\s\S]*?byId\("dialog-title"\)\.focus\(\{preventScroll:true\}\)/);
});
test('shopping area no longer claims weekly Bring integration',()=>{
 assert.doesNotMatch(html,/Bring! isch scho integriert/);
 assert.match(html,/id="shopping-items"/);
 assert.match(html,/id="shopping-from"/);
 assert.match(html,/id="shopping-to"/);
});


test('seven cards are positioned on a 3D rotating arc with left tilt',()=>{
 assert.match(css,/#screen-week \.wheel-shell\{perspective:1100px/);
 assert.match(css,/#screen-week \.wheel\{transform-style:preserve-3d/);
 assert.match(js,/const angle=d\*25\*Math\.PI\/180/);
 assert.match(js,/const depth=\(Math\.cos\(angle\)-1\)\*310/);
 assert.match(js,/rotateX\("\+\(-d\*14\)\+"deg\) rotateY\(-11deg\)/);
 assert.match(js,/element\.style\.pointerEvents="auto"/);
 assert.match(js,/element\.style\.borderRadius=\(19\/size\)\.toFixed\(2\)\+"px"/);
});
test('iOS revolver keeps vertical swipes instead of handing them to page scrolling',()=>{
 const v8=css.slice(css.indexOf('/* V8: vertical swipes'));
 assert(v8.length>0,'V8 gesture override missing');
 assert.match(v8,/#screen-week \.wheel-shell,[\s\S]*?#screen-week \.recipe-card[\s\S]*?touch-action:pan-x pinch-zoom/);
 assert.doesNotMatch(css,/\.recipe-card,\.circle-control,\.icon-btn\{touch-action:manipulation\}/);
 assert.match(js,/shell\.addEventListener\("touchstart"/);
 assert.match(js,/shell\.addEventListener\("touchmove"[\s\S]*?e\.cancelable\)e\.preventDefault\(\);\s*\},\{passive:false\}\)/);
 assert.match(js,/shell\.addEventListener\("touchend"[\s\S]*?setDay\(state\.current\+\(dy<0\?1:-1\)\)/);
 assert.match(js,/shell\.addEventListener\("touchcancel"/);
 assert.match(js,/shell\.addEventListener\("wheel"/);
 assert.match(js,/byId\("day-prev"\)\.addEventListener/);
 assert.match(js,/byId\("day-next"\)\.addEventListener/);
});


test('revolver reuses the same card nodes across swipes, avoiding a visual jump',()=>{
 const render=js.slice(js.indexOf('function renderWheel(){'),js.indexOf('function renderArchive(){'));
 assert.match(render,/const rebuilding=wheel\.dataset\.weekKey!==weekKey\|\|wheel\.children\.length!==7/);
 assert.match(render,/if\(rebuilding\)\{\s*wheel\.classList\.add\("wheel-initial"\);\s*wheel\.innerHTML=/);
 assert.match(render,/wheel\.dataset\.weekKey=weekKey/);
 assert.match(render,/Array\.from\(wheel\.children\)\.forEach/);
 assert.match(render,/element\.style\.transform=/);
 assert.match(render,/requestAnimationFrame\(\(\)=>requestAnimationFrame\(\(\)=>wheel\.classList\.remove\("wheel-initial"\)\)\)/);
 assert.match(css,/\.wheel\.wheel-initial \.recipe-card\s*\{\s*transition:none!important;/);
 // Rendering an already initialized week must not replace the wheel's nodes.
 assert.equal((render.match(/wheel\.innerHTML=/g)||[]).length,1);
});

test('date based menu form and shopping range are visible and wired',()=>{
 for(const id of ['meal-editor','meal-kind','meal-recipe','meal-servings','meal-type','shopping-from','shopping-to','shopping-add-form','edit-day'])assert(html.includes('id="'+id+'"'));
 assert.match(js,/state\.plan=normalizePlan\(readSaved\("wachochemer:mealPlanV1"/);
 assert.match(js,/function persistPlan\(\)/);
 assert.match(js,/function saveMealEditor\(event\)/);
 assert.match(js,/ingredientTotals\(state\.plan\.entries,state\.recipes,from,to\)/);
 assert.match(js,/byId\("shopping-from"\)\.value=state\.shopping\.from/);
 assert.match(js,/byId\("shopping-following"\)\.addEventListener/);
 assert.match(js,/byId\("edit-day"\)\.addEventListener/);
});

test('meal editor shows leftover reminder and does not claim failed persistence',()=>{
 assert.match(html,/id="meal-leftover-tip"/);
 assert.match(js,/byId\("meal-leftover-tip"\)\.hidden=kind!=="leftover"/);
 assert.match(js,/if\(!save\("wachochemer:mealPlanV1",state\.plan\)\)throw Error/);
 assert.match(js,/if\(previous\)state\.plan\.entries\[key\]=previous;else delete state\.plan\.entries\[key\]/);
});
