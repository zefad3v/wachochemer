import {UNITS,validateRecipe} from '../src/domain/model.mjs';

export const unitLabels = {g:'g',kg:'kg',ml:'ml',l:'l',piece:'Stück',tbsp:'EL',tsp:'TL',pinch:'Prise',unspecified:'ohni Mengenangab',to_taste:'nach Geschmack'};
const fractions={'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8'};
const numeric = s => s.split(/\s+/).reduce((sum,part)=>{
  const [a,b]=part.replace(',','.').split('/').map(Number);
  return sum+a/(b??1);
},0);
const aliases={g:'g',gramm:'g',kg:'kg',kilogramm:'kg',ml:'ml',l:'l',liter:'l',dl:'ml',cl:'ml',
  el:'tbsp',esslöffel:'tbsp',tl:'tsp',teelöffel:'tsp',stück:'piece',stk:'piece',prise:'pinch',prisen:'pinch'};
export function parseAmount(text) {
 const s=String(text).replace(/([½¼¾⅓⅔⅛])/g,(_m,ch)=>' '+fractions[ch]).trim();
 const number='(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?)';
 const match=new RegExp('^('+number+')(?:\\s*(?:[-–—]|bis)\\s*('+number+'))?$','i').exec(s);
 if(!match)throw Error('Bitte e Zahl oder en Mengenbereich iiträge.');
 const quantity=numeric(match[1]),quantityMax=match[2]?numeric(match[2]):null;
 if(!Number.isFinite(quantity)||quantity<=0||quantityMax!=null&&(!Number.isFinite(quantityMax)||quantityMax<quantity))throw Error('Bitte en gültige Mengenbereich iiträge.');
 return {quantity,...(quantityMax!=null?{quantityMax}:{})};
}
export function parseIngredient(line) {
  const raw=String(line).trim(), unknown={name:raw,unit:'',quantity:null,optional:false};
  const s=raw.replace(/([½¼¾⅓⅔⅛])/g,(_m,ch)=>' '+fractions[ch]).trim();
  const taste=s.match(/^(?:etwas|nach Geschmack)\s+(.+)|^(.+?)[, ]+nach Geschmack$/i);
  if(taste)return {...unknown,name:(taste[1]||taste[2]).trim(),unit:'to_taste'};
  const range=s.match(/^(\d+(?:\s+\d+\/\d+|[.,]\d+)?|\d+\/\d+)\s*(?:[-–—]|bis)\s*(\d+(?:\s+\d+\/\d+|[.,]\d+)?|\d+\/\d+)\s*([a-zäöü]+)\.?\s+(.+)$/i);
  if(range && Object.hasOwn(aliases,range[3].toLowerCase())){
    const key=range[3].toLowerCase(),factor=key==='dl'?100:key==='cl'?10:1;
    const amount=parseAmount(range[1]+'-'+range[2]);
    return {...unknown,name:range[4],unit:aliases[key],quantity:amount.quantity*factor,quantityMax:amount.quantityMax*factor};
  }
  const m=s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*([a-zäöü]+)\.?\s+(.+)$/i);
  if (!m || !Object.hasOwn(aliases,m[2].toLowerCase())) {
    // Leave ranges and unrecognised measures intact for review.
    const count=s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s+((?:(?:grosse|kleine|mittelgrosse|rotschalige|reife|rote|gelbe)\s+)?(?:Eier?|Äpfel|Apfel|Zitronen?|Zwiebeln?|Karotten?|Tomaten?|Bananen?|Kartoffeln?))(,.*)?$/i);
    if(count)return {...unknown,name:count[2]+(count[3]||''),quantity:numeric(count[1]),unit:'piece'};
    return /\d/.test(s)?unknown:{...unknown,unit:'unspecified'};
  }
  const key=m[2].toLowerCase(), quantity=numeric(m[1])*(key==='dl'?100:key==='cl'?10:1);
  return {...unknown,name:m[3],unit:aliases[key],quantity};
}
export function canonicalSource(text) {
  if (!text.trim()) return '';
  let url;
  try {url=new URL(text.trim());} catch {throw Error('Bitte e gültigi HTTPS-Quelle iiträge.');}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Bitte e HTTPS-Quelle ohni Zuegangsdate iiträge.');
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
    baseServings:d.baseServings,prepMinutes:d.prepMinutes,cookMinutes:d.cookMinutes,totalMinutes:d.totalMinutes??null,image:d.image||null,
    ingredients,instructions:{'de-CH':d.steps},householdRecipe:true};
  validateRecipe(recipe,new Set(Object.keys(names)));
  return {recipe,names};
}
export function validateDraft(d) {
  if (!d.title || d.title.length>160 || d.description.length>2000 || d.source.length>2000)
    throw Error('Bitte Titel, Beschriibig und Quelle prüefe.');
  if(!Number.isInteger(d.baseServings)||d.baseServings<1||d.baseServings>999)throw Error('Bitte d Basisportione iiträge.');
  if([d.prepMinutes,d.cookMinutes,d.totalMinutes].some(n=>n!=null&&(!Number.isInteger(n)||n<0||n>9999)))throw Error('Bitte gültigi Ziite i Minute iiträge.');
  if(d.image)canonicalSource(d.image);
  if(!d.steps.length || d.steps.length>100 || d.steps.some(s=>!s.trim()||s.length>3000))throw Error('Bitte d Zuebereitig prüefe. Pro Zeile ein Schritt.');
  if(!d.ingredients.length||d.ingredients.length>100)throw Error('Es brucht 1 bis 100 Zutate.');
  for(const [i,row] of d.ingredients.entries()){
    if(row.quantityMax!=null && (['to_taste','unspecified'].includes(row.unit)||!Number.isFinite(row.quantityMax)||row.quantityMax<row.quantity||row.quantityMax>1e6))throw Error('Bitte en gültige Mengenbereich iiträge.');
    if(!row.name || row.name.length>200 || !UNITS.includes(row.unit) ||
      (['to_taste','unspecified'].includes(row.unit)?row.quantity!==null:!Number.isFinite(row.quantity)||row.quantity<=0||row.quantity>1e6))
      throw Error('Zutat '+(i+1)+': Bitte Name, Menge und Einheit prüefe.');
  }
  return d;
}
