import test from 'node:test';import assert from 'node:assert/strict';
import {decodeHttp} from '../supabase/functions/recipe-import/public-fetch.mjs';
const bytes=s=>new TextEncoder().encode(s),text=b=>new TextDecoder().decode(b);
test('HTTP transport handles fixed length, chunked responses and redirects',()=>{
 const plain=decodeHttp(bytes('HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nSoup'));assert.equal(text(plain.body),'Soup');
 const chunks=decodeHttp(bytes('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2\r\nSo\r\n2;ext=yes\r\nup\r\n0\r\n\r\n'));assert.equal(text(chunks.body),'Soup');
 const redirect=decodeHttp(bytes('HTTP/1.1 302 Found\r\nLocation: https://example.org/r\r\nContent-Length: 0\r\n\r\n'));assert.equal(redirect.headers.get('location'),'https://example.org/r');
 const hints=decodeHttp(bytes('HTTP/1.1 103 Early Hints\r\n\r\nHTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nSoup'));assert.equal(text(hints.body),'Soup');
});
test('HTTP transport rejects truncated responses and oversized chunks',()=>{
 for(const response of ['HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nSo','HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4\r\nSo','HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\nffffff\r\n'])assert.throws(()=>decodeHttp(bytes(response)));
});
