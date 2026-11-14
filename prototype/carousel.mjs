// Seven fixed places on a vertical Y/Z Ferris wheel.
// A vertical swipe moves the next card from below towards the front.
export const DAY_COUNT=7;
export const DAY_ANGLE=360/DAY_COUNT;
export const LEFT_TILT=-9;
export const wrapDay=index=>((index%DAY_COUNT)+DAY_COUNT)%DAY_COUNT;
export function turnToDay(turn,index){
 let delta=wrapDay(index)-wrapDay(turn);
 if(delta>3)delta-=DAY_COUNT;
 if(delta< -3)delta+=DAY_COUNT;
 return turn+delta;
}
export function ringGeometry(width,turn,height=Infinity){
 const radius=Math.max(1,Math.min(320,width*.68,height*.40));
 const rotation=turn*DAY_ANGLE;
 return {
  radius,rotation,
  // The wheel's axle runs from left to right (X axis). Rotate the entire wheel,
  // not each card independently, then cancel the rotation on card faces.
  transform:`translateZ(${-radius}px) rotateY(${LEFT_TILT}deg) rotateX(${rotation}deg)`,
  facing:`rotateX(${-rotation}deg)`,
  slots:Array.from({length:DAY_COUNT},(_,index)=>{
   const angle=index*DAY_ANGLE;
   const relative=(index-turn)*DAY_ANGLE*Math.PI/180;
   return {index,y:Math.sin(relative)*radius,z:Math.cos(relative)*radius,
    transform:`rotateX(${-angle}deg) translateZ(${radius}px) rotateX(${angle}deg)`};
  })
 };
}
export function swipeDirection(dx,dy){
 return Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)?(dy<0?1:-1):0;
}
