import {parseDay} from '../prototype/planner.mjs';

export const mealLabels={lunch:"Mittagessen",dinner:"Abendessen"};
export const unitLabels = {g:'g',kg:'kg',ml:'ml',l:'l',piece:'Stück',tbsp:'EL',tsp:'TL',pinch:'Prise',unspecified:'ohne Mengenangabe',to_taste:'nach Geschmack'};

const planDateFormat=new Intl.DateTimeFormat("de-CH",{day:"numeric",month:"short",timeZone:"UTC"});
export function planDateLabel(date){
 try{return planDateFormat.format(parseDay(date))}catch{return ""}
}
export function mealKeyLabel(key){
 const [date,meal,...rest]=String(key??"").split("|");
 const day=planDateLabel(date);
 return day&&Object.hasOwn(mealLabels,meal)&&!rest.length?day+" · "+mealLabels[meal]:"";
}
