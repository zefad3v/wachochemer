import test from 'node:test';
import assert from 'node:assert/strict';
import {DAY_COUNT,DAY_ANGLE,wrapDay,turnToDay,ringGeometry,swipeDirection} from '../prototype/carousel.mjs';

test('seven equally spaced days form a closed X/Z circle, not a vertical stack',()=>{
 const {radius,slots}=ringGeometry(390,0);
 assert.equal(slots.length,7);
 assert.deepEqual(slots.map(x=>x.index),[0,1,2,3,4,5,6]);
 for(const slot of slots)assert(Math.abs(Math.hypot(slot.x,slot.z)-radius)<1e-9);
 for(let i=0;i<7;i++){
  const a=slots[i],b=slots[(i+1)%7];
  assert(Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-2*radius*Math.sin(Math.PI/7))<1e-9);
 }
 assert.equal(DAY_COUNT*DAY_ANGLE,360);
});

test('every selected day is the frontmost point, with neighbours on both sides',()=>{
 for(let turn=-15;turn<16;turn++){
  const {slots,radius}=ringGeometry(390,turn);
  const front=slots[wrapDay(turn)];
  assert(Math.abs(front.x)<1e-9);
  assert(Math.abs(front.z-radius)<1e-9);
  assert(slots.every(slot=>slot.z<=front.z+1e-9));
  assert(slots[wrapDay(turn+1)].x>0);
  assert(slots[wrapDay(turn-1)].x<0);
 }
});

test('next, previous and rapid full circuits retain continuous rotation at the seam',()=>{
 let turn=0;
 for(let i=1;i<=28;i++){
  turn=turnToDay(turn,wrapDay(turn)+1);
  assert.equal(turn,i);
 }
 for(let i=27;i>=-14;i--){
  turn=turnToDay(turn,wrapDay(turn)-1);
  assert.equal(turn,i);
 }
 assert.equal(turnToDay(6,0),7);
 assert.equal(turnToDay(0,6),-1);
 assert.equal(turnToDay(0,4),-3);
 assert.equal(turnToDay(3,0),0);
});

test('slot transforms stay fixed during rotation; responsive radius and week reset are deterministic',()=>{
 const first=ringGeometry(390,0),rotated=ringGeometry(390,8);
 assert.deepEqual(first.slots.map(x=>x.transform),rotated.slots.map(x=>x.transform));
 assert.notEqual(first.transform,rotated.transform);
 assert.equal(rotated.rotation,8*DAY_ANGLE);
 assert.equal(ringGeometry(390,0).transform,first.transform);
 assert(ringGeometry(320,0).radius<first.radius);
 assert.equal(ringGeometry(2000,0).radius,290);
 assert(ringGeometry(320,0,300).radius<ringGeometry(320,0).radius);
 assert.match(first.transform,/rotateX\(-38deg\) rotateY\(0deg\)/);
 assert.match(first.facing,/rotateY\(-11deg\)/);
});

test('only deliberate vertical swipes select a day; taps, horizontal drags and jitter do not',()=>{
 assert.equal(swipeDirection(2,-80),1);
 assert.equal(swipeDirection(-8,60),-1);
 for(const [x,y] of [[0,0],[2,7],[0,35],[90,50],[50,50]])assert.equal(swipeDirection(x,y),0);
});
