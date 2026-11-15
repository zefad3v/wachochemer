// Width classes are independent of orientation and keyboard height.
export const displayClass=width=>width>=680?'wide':'compact';
export function viewForClass(cls,preferences={}){
 const saved=preferences[cls];
 return saved==='day'||saved==='week'?saved:'day';
}
export function moveDay(current,weekOffset,delta){
 const target=current+delta;
 return {current:((target%7)+7)%7,weekOffset:weekOffset+Math.floor(target/7)};
}
export function swipeDirection(dx,dy){
 return Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3?(dx<0?1:-1):0;
}
