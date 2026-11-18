import test from 'node:test';
import assert from 'node:assert/strict';
import {displayClass,viewForClass,moveDay,swipeDirection} from '../prototype/responsive-planner.mjs';
test('width defaults cover phones, tablets and desktop without orientation dependence',()=>{
 for(const width of [320,375,393,430,679])assert.equal(viewForClass(displayClass(width)),'day');
 for(const width of [680,744,852,1024,1440])assert.equal(viewForClass(displayClass(width)),'day');
});
test('manual preferences belong to each display class, invalid values use defaults',()=>{
 const preferences={compact:'week',wide:'day'};
 assert.equal(viewForClass('compact',preferences),'week');assert.equal(viewForClass('wide',preferences),'day');
 assert.equal(viewForClass('wide',{wide:'broken'}),'day');
});
test('day transitions cross the week boundary in both directions',()=>{
 assert.deepEqual(moveDay(6,3,1),{current:0,weekOffset:4});
 assert.deepEqual(moveDay(0,0,-1),{current:6,weekOffset:-1});
 assert.deepEqual(moveDay(2,0,3),{current:5,weekOffset:0});
});
test('only deliberate horizontal swipes navigate',()=>{
 assert.equal(swipeDirection(-80,5),1);assert.equal(swipeDirection(65,-3),-1);
 for(const [dx,dy] of [[0,80],[30,1],[41,40],[80,100],[0,0]])assert.equal(swipeDirection(dx,dy),0);
});
