import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../prototype/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../prototype/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../prototype/styles.css',import.meta.url),'utf8');

test('mobile navigation has two main areas and Bring remains secondary',()=>{
 const bottom=html.split('<nav class="bottom-nav"')[1]?.split('</nav>')[0]||'';
 assert.equal((bottom.match(/data-tab="/g)||[]).length,2);
 assert.match(bottom,/data-tab="week"/);
 assert.match(bottom,/data-tab="archive"/);
 assert.doesNotMatch(bottom,/data-tab="shopping"/);
 for(const id of ['prepare-bring','shopping-back','shopping-copy'])assert(html.includes('id="'+id+'"'));
 assert.match(js,/byId\("prepare-bring"\)\.addEventListener/);
});
test('day view exposes both lunch and dinner and keeps manual override until day changes',()=>{
 for(const id of ['choose-lunch','choose-dinner','meal-pages'])assert(html.includes('id="'+id+'"'));
 assert.match(js,/const mealForTime=\(\)=>new Date\(\)\.getHours\(\)<14\?"lunch":"dinner"/);
 assert.match(js,/function itemForDay\(date,requestedMeal=null\)/);
 assert.match(js,/state\.selectedMeal=btn\.dataset\.mealPage;renderPlanner\(\)/);
 assert.match(js,/calendarDay!==localToday\(\).*state\.selectedMeal=null/);
 assert.match(js,/openMealEditor\(weekDays\(\)\[state\.current\]\.date,displayedMeal\(\)\)/);
});
test('compact mobile title, restored glass bar and no obsolete image placeholder glyph',()=>{
 assert.match(css,/\.topbar \.brand-block\{display:none\}/);
 assert.match(css,/#screen-week \.screen-heading h1\{font-size:28px;line-height:1\.15;text-align:center\}/);
 assert.match(css,/\.bottom-nav\{\s*grid-template-columns:repeat\(2/);
 assert.match(css,/backdrop-filter:blur\(20px\) saturate\(150%\)/);
 assert.doesNotMatch(js,/class="planner-placeholder" aria-hidden="true">✳/);
});
test('search results become text suggestions with stable search header',()=>{
 assert.match(js,/grid\.classList\.toggle\("search-suggestions",searching\)/);
 assert.match(js,/class="archive-suggestion"/);
 assert.match(css,/\.recipe-grid\.search-suggestions\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(js,/grid\.querySelectorAll\("\[data-recipe\]"\)/);
 assert.match(css,/#screen-archive \.section-title h1\{/);
});

test('horizontal swipes target the two meal pages; weekdays remain directly selectable',()=>{
 assert.match(js,/const direction=swipeDirection\(dx,dy\);\s*if\(direction\)\{state\.selectedMeal=direction>0\?"dinner":"lunch";renderPlanner\(\)\}/);
 assert.match(html,/id="week-strip"/);
 assert.match(js,/if\(day\)setDay\(Number\(day\.dataset\.day\)\)/);
 assert.match(css,/#screen-week \.view-switch\{\s*position:absolute;right:4px;top:3px/);
});
