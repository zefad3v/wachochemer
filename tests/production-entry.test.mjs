
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('production entry preserves invitation and recovery callback while retaining the installed PWA identity',()=>{
 const html=readFileSync('index.html','utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const paths=[];
 new Function('location',script)({search:'?invite=fixture',hash:'#type=recovery&marker=fixture',replace:path=>paths.push(path)});
 assert.deepEqual(paths,['./prototype/?invite=fixture#type=recovery&marker=fixture']);
 const manifest=JSON.parse(readFileSync('prototype/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');
});
