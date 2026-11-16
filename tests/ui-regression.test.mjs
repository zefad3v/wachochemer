import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../prototype/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../prototype/styles.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../prototype/app.js',import.meta.url),'utf8');

test('date based menu form and shopping range are visible and wired',()=>{
 for(const id of ['meal-editor','meal-kind','meal-recipe','meal-servings','meal-type','shopping-from','shopping-to','shopping-add-form'])assert(html.includes('id="'+id+'"'));
 assert.match(js,/const loaded=loadPlan\(localStorage\)/);
 assert.match(js,/function persistPlan\(\)/);
 assert.match(js,/function saveMealEditor\(event\)/);
 assert.match(js,/buildTransferManifest\(state\.plan,state\.recipes/);
 assert.match(js,/byId\("shopping-from"\)\.value=state\.shopping\.from/);
 assert.match(js,/byId\("shopping-following"\)\.addEventListener/);
 assert.doesNotMatch(js,/byId\("edit-day"\)/);
});

test('meal editor shows leftover reminder and does not claim failed persistence',()=>{
 assert.match(html,/id="meal-leftover-tip"/);
 assert.match(js,/byId\("meal-leftover-tip"\)\.hidden=kind!=="leftover"/);
 assert.match(js,/storePlan\(localStorage,state\.plan\)/);
 assert.match(js,/state\.plan=previousPlan/);
});

test('settings returns to previous tab and archive layout remains stable during search',()=>{
 assert.match(html,/id="settings-back"/);
 assert.match(js,/if\(tab==="settings"&&state\.tab==="settings"\)tab=state\.returnTab/);
 assert.match(js,/grid\.classList\.remove\("search-results"\)/);
 assert.match(js,/byId\("settings-back"\)\.addEventListener/);
});
test('editing targets an explicit date with searchable nonnative recipe picker',()=>{
 for(const id of ['meal-date','meal-recipe-search','meal-recipe-options','meal-recipe-selected'])assert(html.includes('id="'+id+'"'));
 assert.match(html,/<h2 id="meal-editor-title" tabindex="-1">/);
 assert.match(html,/id="meal-recipe" type="hidden"/);
 assert.match(js,/byId\("meal-editor-title"\)\.focus\(\{preventScroll:true\}\)/);
 assert.match(js,/function renderMealRecipeOptions\(\)/);
 assert.match(js,/byId\("meal-recipe-options"\)\.addEventListener/);
 assert.match(js,/const date=byId\("meal-date"\)\.value/);
});
test('Bring-first export uses clipboard and no second checkbox shopping workflow',()=>{
 assert.match(html,/id="shopping-copy"/);
 assert.match(html,/id="shopping-copy-status"/);
 assert.match(js,/function shoppingTransferText\(\)/);
 assert.match(js,/navigator\.clipboard\.writeText\(shoppingTransferText\(\)\)/);
 const shopping=js.slice(js.indexOf('function renderShopping(){'),js.indexOf('function currentServings(recipe){'));
 assert.doesNotMatch(shopping,/data-shopping=/);
 assert.match(css,/\.shopping-date-panel\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
});

test('flat planner has both views, compact direct day navigation and no 3D code',()=>{
 for(const id of ['week-strip','day-card','week-overview'])assert(html.includes('id="'+id+'"'));
 assert.match(html,/data-view="day"/);assert.match(html,/data-view="week"/);
 assert.doesNotMatch(js+css+html,/ringGeometry|rotate[XYZ]\(|perspective:|wheel-shell|carouselTurn/);
 assert.match(css,/touch-action:pan-y pinch-zoom/);
 assert.doesNotMatch(js,/addEventListener\("wheel"/);
});
test('shared header, safe areas and scrollable editor are retained',()=>{
 assert.match(css,/safe-area-inset-top/);assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/meal-editor\{overflow-y:auto/);
 assert.match(html,/id="settings-back"/);
});
