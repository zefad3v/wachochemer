// Seven fixed places on one X/Z ring. Keep turns unbounded across the 6/0 seam:
// reducing the angle modulo 360 would animate a whole revolution backwards.
export const DAY_COUNT=7;
export const DAY_ANGLE=360/DAY_COUNT;
export const RING_PITCH=-38;
export const CARD_TILT=-11;
export const wrapDay=index=>((index%DAY_COUNT)+DAY_COUNT)%DAY_COUNT;

export function turnToDay(turn,index){
 let delta=wrapDay(index)-wrapDay(turn);
 if(delta>3)delta-=DAY_COUNT;
 if(delta< -3)delta+=DAY_COUNT;
 return turn+delta;
}

export function ringGeometry(width,turn,height=Infinity){
 const radius=Math.max(1,Math.min(290,width*.35,height*.23));
 const pitch=RING_PITCH*Math.PI/180;
 const rotation=turn*DAY_ANGLE;
 return {
  radius,rotation,
  // Cancel the front point's pitch displacement, so the selected card stays centred.
  transform:`translateY(${Math.sin(pitch)*radius}px) translateZ(${-Math.cos(pitch)*radius}px) rotateX(${RING_PITCH}deg) rotateY(${-rotation}deg)`,
  facing:`rotateY(${rotation}deg) rotateX(${-RING_PITCH}deg) rotateY(${CARD_TILT}deg)`,
  slots:Array.from({length:DAY_COUNT},(_,index)=>{
   const angle=index*DAY_ANGLE;
   const relative=(index-turn)*DAY_ANGLE*Math.PI/180;
   return {index,x:Math.sin(relative)*radius,z:Math.cos(relative)*radius,
    transform:`rotateY(${angle}deg) translateZ(${radius}px) rotateY(${-angle}deg)`};
  })
 };
}

export function swipeDirection(dx,dy){
 return Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)?(dy<0?1:-1):0;
}

