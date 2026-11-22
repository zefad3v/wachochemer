import {UNITS,validateRecipe} from '../src/domain/model.mjs';

export {unitLabels} from '../locales/format-de-CH.mjs';
const fractions={'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8'};
const numeric = s => s.split(/\s+/).reduce((sum,part)=>{
  const [a,b]=part.replace(',','.').split('/').map(Number);
  return sum+a/(b??1);
},0);
const aliases={g:'g',gramm:'g',kg:'kg',kilogramm:'kg',ml:'ml',l:'l',liter:'l',dl:'ml',cl:'ml',
  el:'tbsp',esslöffel:'tbsp',tl:'tsp',teelöffel:'tsp',stück:'piece',stk:'piece',prise:'pinch',prisen:'pinch',bund:'bunch',bünde:'bunch'};
export function parseAmount(text) {
 const s=String(text).replace(/([½¼¾⅓⅔⅛])/g,(_m,ch)=>' '+fractions[ch]).trim();
 const number='(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?)';
 const match=new RegExp('^('+number+')(?:\\s*(?:[-–—]|bis)\\s*('+number+'))?$','i').exec(s);
 if(!match)throw Error('Bitte gib eine Zahl oder einen Mengenbereich ein.');
 const quantity=numeric(match[1]),quantityMax=match[2]?numeric(match[2]):null;
 if(!Number.isFinite(quantity)||quantity<=0||quantityMax!=null&&(!Number.isFinite(quantityMax)||quantityMax<quantity))throw Error('Bitte gib einen gültigen Mengenbereich ein.');
 return {quantity,...(quantityMax!=null?{quantityMax}:{})};
}
export function parseIngredient(line) {
  const raw=String(line).trim(), unknown={name:raw,unit:'',quantity:null,optional:false};
  const s=raw.replace(/([½¼¾⅓⅔⅛])/g,(_m,ch)=>' '+fractions[ch]).trim();
  const taste=s.match(/^(?:etwas|nach Geschmack)\s+(.+)|^(.+?)[, ]+nach Geschmack$/i);
  if(taste)return {...unknown,name:(taste[1]||taste[2]).trim(),unit:'to_taste'};
  const number='(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?)';
  const amountMatch=new RegExp('^('+number+'(?:\\s*(?:[-–—]|bis)\\s*'+number+')?)\\s*(.+)$','i').exec(s);
  if(!amountMatch)return /\d/.test(s)?unknown:{...unknown,unit:'unspecified'};
  let amount;try{amount=parseAmount(amountMatch[1]);}catch{return unknown;}
  const remainder=amountMatch[2];
  const measured=remainder.match(/^(?:(gehäufte[nrsm]?|gestrichene[nrsm]?|gro(?:ss|ß)e[nrsm]?)\s+)?([a-zäöü]+)\.?\s+(.+)$/i);
  if(measured && Object.hasOwn(aliases,measured[2].toLowerCase())){
    const key=measured[2].toLowerCase(),factor=key==='dl'?100:key==='cl'?10:1;
    return {...unknown,name:measured[3]+(measured[1]?' ('+measured[1]+' '+measured[2]+')':''),unit:aliases[key],
      quantity:amount.quantity*factor,...(amount.quantityMax!=null?{quantityMax:amount.quantityMax*factor}:{})};
  }
  // Infer Stück only for recognised counted ingredients, never for unknown measures.
  const counted=/^(?:(?:gro(?:ss|ß)e|kleine|mittlere|mittelgro(?:ss|ß)e|rotschalige|reife|rote|gelbe)\s+)?(?:Frühlingszwiebeln?|Pak[- ]?Choi|Ei|Eier|Äpfel|Apfel|Zitronen?|Limetten?|Knoblauchzehen?|Zwiebeln?|Karotten?|Tomaten?|Bananen?|Kartoffeln?)(?=$|[\s,])/i;
  if(amount.quantityMax==null && counted.test(remainder))return {...unknown,name:remainder,quantity:amount.quantity,unit:'piece'};
  return unknown;
}
export function canonicalSource(text) {
  if (!text.trim()) return '';
  let url;
  try {url=new URL(text.trim());} catch {throw Error('Bitte gib eine gültige HTTPS-Adresse ein.');}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Bitte gib eine HTTPS-Adresse ohne Zugangsdaten ein.');
  url.hash='';
  for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
  return url.href;
}
const normalizedName = name=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-CH');
export function householdRecipe(row,catalogNames) {
  const d=row.draft, id='haushalt-'+row.id;
  const ids=new Map(Object.entries(catalogNames).map(([id,name])=>[normalizedName(name),id]));
  const names={};
  const ingredients=d.ingredients.map(({name,quantity,quantityMax,unit,optional})=>{
    const key=normalizedName(name);
    const ingredientId=ids.get(key) || 'eigen_'+Array.from(key,c=>c.codePointAt(0).toString(16)).join('_');
    names[ingredientId]=name;
    return {ingredientId,quantity,...(quantityMax!=null?{quantityMax}:{}),unit,optional};
  });
  const recipe={schemaVersion:1,locale:'de-CH',id,slug:id,title:d.title,description:d.description,
    baseServings:d.baseServings,prepMinutes:d.prepMinutes,cookMinutes:d.cookMinutes,activeMinutes:d.activeMinutes??null,totalMinutes:d.totalMinutes??null,image:d.image||null,
    ingredients,instructions:{'de-CH':d.steps},householdRecipe:true};
  validateRecipe(recipe,new Set(Object.keys(names)));
  return {recipe,names};
}
export function validateDraft(d) {
  if (!d.title || d.title.length>160 || d.description.length>2000 || d.source.length>2000)
    throw Error('Bitte prüfe Titel, Beschreibung und Quelle.');
  if(!Number.isInteger(d.baseServings)||d.baseServings<1||d.baseServings>999)throw Error('Bitte gib die Portionszahl des Grundrezepts ein.');
  if([d.prepMinutes,d.cookMinutes,d.totalMinutes,d.activeMinutes].some(n=>n!=null&&(!Number.isInteger(n)||n<0||n>9999)))throw Error('Bitte gib eine gültige Dauer in Minuten ein.');
  if(d.image)canonicalSource(d.image);
  if(!d.steps.length || d.steps.length>100 || d.steps.some(s=>!s.trim()||s.length>3000))throw Error('Prüfe die Zubereitung. Schreibe jeden Schritt auf eine eigene Zeile.');
  if(!d.ingredients.length||d.ingredients.length>100)throw Error('Gib zwischen 1 und 100 Zutaten an.');
  for(const [i,row] of d.ingredients.entries()){
    if(row.quantityMax!=null && (['to_taste','unspecified'].includes(row.unit)||!Number.isFinite(row.quantityMax)||row.quantityMax<row.quantity||row.quantityMax>1e6))throw Error('Bitte gib einen gültigen Mengenbereich ein.');
    if(!row.name || row.name.length>200 || !UNITS.includes(row.unit) ||
      (['to_taste','unspecified'].includes(row.unit)?row.quantity!==null:!Number.isFinite(row.quantity)||row.quantity<=0||row.quantity>1e6))
      throw Error('Zutat '+(i+1)+': Bitte prüfe Name, Menge und Einheit.');
  }
  return d;
}
