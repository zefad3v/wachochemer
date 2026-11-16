import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../prototype/'+name,import.meta.url),'utf8');
const js=read('app.js'),css=read('styles.css'),html=read('index.html');
test('Issue 15 separates recipe reading and explicit editing',()=>{
 assert.doesNotMatch(js,/byId\("edit-day"\)/);
 assert.doesNotMatch(html,/id="edit-day"/);
 const click=js.split('byId("day-card").addEventListener("click",')[1].split('\n')[0];
 assert.match(click,/lastSwipeAt<420/);assert.match(click,/openMealEditor/);assert.match(click,/openRecipe/);
});
test('V15 meal controls live in the card shell and reserve title space',()=>{
 assert.match(html,/class="day-card-shell">\s*<button[^>]*id="day-card"[^]*?id="meal-pages"/);
 assert.match(css,/\.day-card-shell\{position:relative/);
 assert.match(css,/\.meal-pages\{position:absolute/);
 assert.match(css,/\.day-card-content\{bottom:90px\}/);
});
test('V15 glass provides Safari blur and readable fallback',()=>{
 assert.match(css,/-webkit-backdrop-filter:blur\(24px\) saturate\(165%\)/);
 assert.match(css,/@supports not[^]*?\.glass-control\{background:#304334\}/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
});
test('V15 search photos have explicit lazy async dimensions and neutral fallback',()=>{
 assert.match(js,/class="suggestion-thumb"[^]*?width="52" height="52" loading="lazy" decoding="async"/);
 assert.match(js,/suggestion-thumb suggestion-placeholder/);
 assert.match(css,/\.suggestion-thumb\{width:52px;height:52px;flex:0 0 52px/);
});
