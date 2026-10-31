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
 assert.match(html,/Demo-Wucheplan/);
});


test('mobile neighbouring recipe cards have the selected outline and visible rounded corners',()=>{
 assert.match(css,/V7: preview contours/);
 assert.match(css,/#screen-week \.recipe-card,\s*#screen-week \.recipe-card\.current\s*\{[^}]*border-color:rgba\(250,247,231,\.86\)/s);
 assert.match(js,/maxPreviewShift=Math\.max\(0,\(wheelHeight-visibleHeight\)\/2-14\)/);
 assert.match(js,/Math\.min\(desiredShift,maxPreviewShift\)/);
 assert.match(js,/element\.style\.borderRadius=\(19\/size\)\.toFixed\(2\)\+"px"/);
 assert.match(js,/element\.style\.borderWidth=\(1\/size\)\.toFixed\(2\)\+"px"/);
 assert.match(js,/element\.style\.opacity=a>1\?"0":".99"/);
 assert.doesNotMatch(js,/translateY\("\+delta\+"px\) rotateX/);
});
