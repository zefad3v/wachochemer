"use strict";
import {fetchArchiveData,archiveEntries,filterArchive} from "./catalog.mjs";

// Design prototype. Public recipes and ingredient IDs are read from the existing JSON files.
// The remaining day cards are clearly labelled visual demos, not published recipes.
const images = {
  pumpkin:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1100&q=85",
  fajitas:"https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1100&q=85",
  macaroni:"https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1100&q=85",
  vegetables:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1100&q=85",
  pasta:"https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1100&q=85",
  bowl:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1100&q=85",
  eggs:"https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1100&q=85"
};
const demos = [
 {id:"kuerbissuppe-kaesetoast",weekday:4,title:"Kürbissuppe mit Käsetoast",description:"Sämige Kürbissuppe mit knusprigem Käsetoast.",minutes:30,image:images.pumpkin,real:true},
 {id:"poulet-fajitas",weekday:5,title:"Milde Poulet-Fajitas",description:"Poulet, Peperoni und Mais in warmen Tortillas.",minutes:35,image:images.fajitas,real:true},
 {id:"aelplermagronen-demo",weekday:6,title:"Älplermagronen",description:"Ein herzhaftes Gericht für die ganze Familie.",minutes:40,image:images.macaroni,real:false},
 {id:"ofengemuese-demo",weekday:0,title:"Ofengemüse mit Feta",description:"Farbiges Gemüse direkt aus dem Ofen.",minutes:35,image:images.vegetables,real:false},
 {id:"one-pot-pasta-demo",weekday:1,title:"One-Pot Pasta",description:"Unkomplizierte Pasta für den Feierabend.",minutes:25,image:images.pasta,real:false},
 {id:"gemuesebowl-demo",weekday:2,title:"Saisonale Gemüse-Bowl",description:"Frisches Gemüse, ganz nach Saison.",minutes:25,image:images.bowl,real:false},
 {id:"spiegelei-demo",weekday:3,title:"Spiegelei mit Brot",description:"Einfach, schnell und kindergerecht.",minutes:15,image:images.eggs,real:false}
];
const weekdays=["Sunntig","Mäntig","Zischtig","Mittwuch","Dunschtig","Friitig","Samschtig"];
const weekdayShort=["SO","MO","DI","MI","DO","FR","SA"];
const units={g:"g",kg:"kg",ml:"ml",l:"l",piece:"",tbsp:"EL",tsp:"TL"};
// Do not invent cooking photography. Recipes without a verified image use a placeholder.
const archiveImages={"kuerbissuppe-kaesetoast":images.pumpkin,"poulet-fajitas":images.fajitas};
const state={
 tab:"week",current:0,weekOffset:0,startDay:4,activeRecipeId:null,servings:{},
 recipes:{},names:{},archiveEntries:[],archiveStatus:"loading",favorites:new Set(),checked:new Set(),filter:"all",query:""
};
function readSaved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
state.startDay=Number(readSaved("wachochemer:weekstart",4));
if(!Number.isInteger(state.startDay)||state.startDay<0||state.startDay>6)state.startDay=4;
state.favorites=new Set(readSaved("wachochemer:favorites",[]));
state.checked=new Set(readSaved("wachochemer:shoppingChecked",[]));
state.servings=readSaved("wachochemer:recipeServings",{});
const byId=id=>document.getElementById(id);
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function moneyLike(n){return Number(n).toLocaleString("de-CH",{maximumFractionDigits:2})}
function scaledQuantity(quantity,unit,factor){
 if(quantity===null)return null;
 const scaled=quantity*factor;
 return unit==="g"||unit==="ml" ? Math.round(scaled) : Math.round(scaled*100)/100;
}
function formatIngredient(row,factor=1){
 const name=state.names[row.ingredientId]||row.ingredientId.replaceAll("_"," ");
 const unit=units[row.unit]??row.unit;
 const quantity=scaledQuantity(row.quantity,row.unit,factor);
 const amount=row.quantity===null||row.unit==="to_taste" ? "Etwas" : moneyLike(quantity)+(unit?" "+unit:"");
 const plurals={wheat_tortilla_small:"kleine Weizentortillas",toast_bread_slice:"Scheiben Toastbrot"};
 return amount+" "+(plurals[row.ingredientId]||name)+(row.optional?" (optional)":"");
}
function niceDate(date){return new Intl.DateTimeFormat("de-CH",{day:"numeric",month:"short"}).format(date)}
function baseWeek(){
 const now=new Date();
 const anchor=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0);
 anchor.setDate(anchor.getDate()-(anchor.getDay()-state.startDay+7)%7+state.weekOffset*7);
 return anchor;
}
function weekDays(){
 const start=baseWeek();
 return Array.from({length:7},(_,i)=>{
 const date=new Date(start);date.setDate(date.getDate()+i);
 return {date,day:date.getDay(),item:demos.find(d=>d.weekday===date.getDay())};
 });
}
function activeItem(){return weekDays()[state.current].item}
function showTab(tab){
 state.tab=tab;
 document.body.classList.toggle("week-mode",tab==="week");
 document.querySelectorAll(".screen").forEach(el=>el.classList.toggle("active",el.id==="screen-"+tab));
 document.querySelectorAll("[data-tab]").forEach(el=>{
   const yes=el.dataset.tab===tab;
   el.classList.toggle("active",yes);
   if(yes)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
 });
 if(tab==="week")renderWheel();
 if(tab==="archive")renderArchive();
 if(tab==="shopping")renderShopping();
 window.scrollTo({top:0,behavior:"instant"});
}
function weekLabel(){
 const days=weekDays();
 const first=days[0].date,last=days[6].date;
 if(window.matchMedia("(max-width:1039px)").matches){
  const month=date=>new Intl.DateTimeFormat("de-CH",{month:"short"}).format(date);
  if(first.getMonth()===last.getMonth()&&first.getFullYear()===last.getFullYear()){
   return first.getDate()+".–"+last.getDate()+". "+month(last);
  }
  return first.getDate()+". "+month(first)+" – "+last.getDate()+". "+month(last);
 }
 return niceDate(first)+" – "+niceDate(last);
}
function setWeekOffset(inc){
 state.weekOffset+=inc;state.current=0;renderWheel();
}
function setDay(idx){state.current=(idx+7)%7;renderWheel()}
function distance(i){
 let d=(i-state.current+7)%7;
 if(d>3)d-=7;
 return d;
}
let lastWheelSwipeAt=0;
function renderWheel(){
 const days=weekDays();
 byId("week-range").textContent=weekLabel();
 const selectedDate=days[state.current].date;
 byId("day-indicator").textContent=weekdayShort[selectedDate.getDay()];
 byId("day-indicator").setAttribute("aria-label",weekdays[selectedDate.getDay()]+", "+niceDate(selectedDate));
 byId("wheel-position").style.top=(state.current/6*100)+"%";
 byId("wheel-position").style.setProperty("--progress",(state.current/6*100)+"%");
 const item=activeItem();
 byId("ambient").style.backgroundImage="url('"+item.image+"')";
 byId("ambient-backdrop").style.backgroundImage="url('"+item.image+"')";
 const wheel=byId("wheel");
 wheel.innerHTML=days.map(({item,date},i)=>{
 const isCurrent=i===state.current;
 const d=distance(i),a=Math.abs(d);
 const z=10-a;
 const day=escapeHtml(weekdays[date.getDay()]);
 const label=escapeHtml(item.title);
 const meta=item.minutes+" Min. · "+(state.recipes[item.id]?.baseServings||3)+" Portione";
 return '<button type="button" class="recipe-card'+(isCurrent?' current':'')+'" data-day="'+i+'" aria-label="'+day+', '+label+(isCurrent?', Rezept öffnen':', Tag auswählen')+'" aria-current="'+(isCurrent?"true":"false")+'" style="z-index:'+z+';opacity:'+(a>2?0:.99-a*.16)+';pointer-events:'+(a>2?'none':'auto')+'">'+
 '<img src="'+item.image+'" alt="" loading="'+(a<2?"eager":"lazy")+'">'+
 '<span class="card-content"><span class="card-day">'+day+" · "+niceDate(date)+'</span><span class="card-bottom"><span class="card-title">'+label+'</span><span class="card-meta">'+meta+(item.real?'':' · Demo')+'</span></span></span></button>';
 }).join("");
 const wide=window.matchMedia("(min-width: 1040px)").matches;
 Array.from(wheel.children).forEach((element,i)=>{
 const d=distance(i),a=Math.abs(d);
 const delta=wide?(d*138):(d===0?0:Math.sign(d)*(a===1?169:a===2?274:367));
 const size=wide?1-a*.12:1-a*.11;
 element.style.transform="translate(-50%,-50%) "+(wide?"translateX("+delta+"px) rotateY("+(-d*7)+"deg)":"translateY("+delta+"px) rotateX("+(d*5)+"deg)")+" scale("+size+")";
 });
 wheel.querySelectorAll(".recipe-card").forEach(card=>{
  card.addEventListener("click",()=>{if(Date.now()-lastWheelSwipeAt<420)return;const i=Number(card.dataset.day);if(i===state.current)openRecipe(days[i].item);else setDay(i)});
 });
 const spot=byId("desktop-spotlight");
 const date=days[state.current].date;
 spot.innerHTML='<span class="spot-day">'+escapeHtml(weekdays[date.getDay()])+' · '+niceDate(date)+'</span>'+
 '<h2>'+escapeHtml(item.title)+'</h2><p>'+escapeHtml(item.description)+'</p><div class="detail-meta"><span>◷ '+item.minutes+' Min.</span><span>♙ '+(state.recipes[item.id]?.baseServings||3)+' Portione</span>'+(item.real?'':'<span>Demo</span>')+'</div>'+
 '<div class="detail-actions"><button type="button" class="main-action" id="spot-recipe">Rezept aaluege</button></div>';
 byId("spot-recipe").addEventListener("click",()=>openRecipe(item));
}
function renderArchive(){
 const grid=byId("recipe-grid");
 grid.classList.toggle("search-results",Boolean(state.query.trim()));
 if(state.archiveStatus!=="ready"){
  grid.innerHTML='<p role="status">'+(state.archiveStatus==="error"
   ?"Rezepte chönd grad nöd glade werde. Bitte Verbindig prüefe und d Siite neu lade."
   :"Rezepte werded glade…")+'</p>';
  return;
 }
 const all=filterArchive(state.archiveEntries,{query:state.query,filter:state.filter,favorites:state.favorites});
 grid.innerHTML=all.length?all.map(item=>'<button type="button" class="archive-card" data-recipe="'+escapeHtml(item.id)+'">'+
  (item.image?'<img src="'+escapeHtml(item.image)+'" alt="" loading="lazy">':
    '<span class="archive-image-placeholder" aria-hidden="true"><span>Rezeptbild folgt</span></span>')+
  '<span class="archive-caption"><strong>'+escapeHtml(item.title)+'</strong><small>'+item.minutes+' Min. · Rezept'+
  (state.favorites.has(item.id)?' ♡':'')+'</small></span></button>').join(""):'<p>Kei passende Rezepte gfunde.</p>';
 grid.querySelectorAll(".archive-card").forEach(btn=>btn.addEventListener("click",()=>{
  const item=state.archiveEntries.find(recipe=>recipe.id===btn.dataset.recipe);
  if(item)openRecipe(item);
 }));
 document.querySelectorAll(".filter-chip").forEach(btn=>btn.classList.toggle("active",btn.dataset.filter===state.filter));
}
function renderShopping(){
 const aggregate=new Map();
 demos.filter(d=>d.real).forEach(d=>{
  const recipe=state.recipes[d.id];if(!recipe)return;
  recipe.ingredients.forEach(row=>{
   if(row.optional)return;
   const key=row.ingredientId+"|"+row.unit;
   const quantity=scaledQuantity(row.quantity,row.unit,currentServings(recipe)/recipe.baseServings);
   if(!aggregate.has(key))aggregate.set(key,{...row,quantity});
   else {const existing=aggregate.get(key);if(typeof quantity==="number"&&typeof existing.quantity==="number")existing.quantity+=quantity}
  });
 });
 const items=[...aggregate].map(([key,row])=>({key,row}));
 const done=items.filter(item=>state.checked.has(item.key)).length;
 byId("shopping-progress").textContent=done+" vo "+items.length+" Zutate abghakt · Demo mit "+demos.filter(d=>d.real).length+" echten Rezepten";
 byId("shopping-items").innerHTML='<div class="shopping-group"><h3>Üsi Zutate</h3>'+items.map(({key,row})=>
 '<label class="shopping-row'+(state.checked.has(key)?' checked':'')+'"><input type="checkbox" data-shopping="'+escapeHtml(key)+'"'+(state.checked.has(key)?' checked':'')+'><span class="shopping-name">'+escapeHtml(state.names[row.ingredientId]||row.ingredientId)+'</span><span class="shopping-amount">'+escapeHtml(row.quantity===null?"Nach Geschmack":moneyLike(row.quantity)+(units[row.unit]?" "+units[row.unit]:""))+'</span></label>'
 ).join("")+'</div>';
 byId("shopping-items").querySelectorAll("[data-shopping]").forEach(input=>input.addEventListener("change",()=>{
  if(input.checked)state.checked.add(input.dataset.shopping);else state.checked.delete(input.dataset.shopping);
  save("wachochemer:shoppingChecked",[...state.checked]);renderShopping();
 }));
}
function currentServings(recipe){
 const value=Number(state.servings[recipe.id]);
 return Number.isInteger(value)&&value>=1&&value<=16?value:recipe.baseServings;
}
function renderPortions(recipe){
 const count=currentServings(recipe),factor=count/recipe.baseServings;
 byId("portion-count").textContent=count+" "+(count===1?"Portion":"Portionen");
 byId("portion-minus").disabled=count<=1;
 byId("portion-plus").disabled=count>=16;
 byId("dialog-meta").innerHTML='<span>◷ '+(recipe.prepMinutes+recipe.cookMinutes)+' Min.</span><span>♙ '+count+' '+(count===1?'Portion':'Portionen')+'</span>';
 const list=byId("dialog-ingredients");
 const checked=new Set([...list.querySelectorAll('input:checked')].map(el=>Number(el.dataset.index)));
 list.innerHTML=recipe.ingredients.map((row,i)=>'<li class="'+(checked.has(i)?'done':'')+'"><input type="checkbox" data-index="'+i+'" aria-label="'+escapeHtml(formatIngredient(row,factor))+'" id="ingredient-check-'+i+'"'+(checked.has(i)?' checked':'')+'><label for="ingredient-check-'+i+'">'+escapeHtml(formatIngredient(row,factor))+'</label></li>').join("");
 list.querySelectorAll('input').forEach(input=>input.addEventListener("change",()=>input.parentElement.classList.toggle("done",input.checked)));
}
function adjustPortions(delta){
 const id=state.activeRecipeId,recipe=state.recipes[id];
 if(!recipe)return;
 const next=Math.max(1,Math.min(16,currentServings(recipe)+delta));
 state.servings[id]=next;
 save("wachochemer:recipeServings",state.servings);
 renderPortions(recipe);
}
function bringIcon(){
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 8h14l-1 13H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2"/><path d="m9 14 2 2 4-4"/></svg>';
}
let previouslyFocused;
function openRecipe(item){
 if(!item)return;
 const recipe=state.recipes[item.id];
 state.activeRecipeId=item.id;
 const dialog=byId("recipe-dialog");
 previouslyFocused=document.activeElement;
 byId("dialog-hero").style.backgroundImage=item.image?"url('"+item.image+"')":"linear-gradient(135deg,#35442f,#19231b)";
 byId("dialog-category").textContent=recipe?"FAMILIENREZEPT":item.real?"REZEPT NICHT VERFÜGBAR":"DESIGNBEISPIEL";
 byId("dialog-title").textContent=recipe?.title||item.title;
 byId("dialog-description").textContent=recipe?.description||item.description;
 byId("dialog-meta").innerHTML='<span>◷ '+(recipe?recipe.prepMinutes+recipe.cookMinutes:item.minutes)+' Min.</span><span>♙ '+(recipe?.baseServings||3)+' Portione</span>';
 byId("dialog-favourite").textContent=state.favorites.has(item.id)?"♥":"♡";
 byId("dialog-favourite").classList.toggle("liked",state.favorites.has(item.id));
 byId("dialog-favourite").dataset.id=item.id;
 const actions=byId("dialog-actions");
 if(recipe){
  const live="https://zefad3v.github.io/wachochemer/rezepte/"+encodeURIComponent(recipe.slug)+"/";
  actions.innerHTML='<button class="main-action" type="button" id="jump-to-ingredients">Zutate aaluege</button>'+
  '<a class="bring-action" href="'+live+'" target="_blank" rel="noopener noreferrer" aria-label="Bring! Import auf der veröffentlichten Rezeptseite öffnen" title="Bring! öffnet die Rezeptseite. Die gewählte Portionszahl dort nochmals einstellen.">'+bringIcon()+'</a>';
  byId("jump-to-ingredients").addEventListener("click",()=>byId("dialog-ingredients-section").scrollIntoView({behavior:"smooth",block:"start"}));
  byId("dialog-ingredients").innerHTML="";
  renderPortions(recipe);
  const steps=recipe.instructions?.["de-CH"]||[];
  byId("dialog-instructions").innerHTML=steps.map(step=>'<li>'+escapeHtml(step)+'</li>').join("");
  byId("dialog-ingredients-section").hidden=false;
  byId("dialog-instructions-section").hidden=false;
 }else{
  actions.innerHTML='<div class="notice">'+(item.real?'Das Rezept isch zur Ziit nöd verfügbar. Bitte lade d Siite neu.':'Das isch es Designbeispiel. S vollständige Rezept isch no nöd im Chochchischtli erfasst.')+'</div>';
  byId("dialog-ingredients-section").hidden=true;
  byId("dialog-instructions-section").hidden=true;
 }
 dialog.showModal();
 dialog.querySelector(".dialog-scroll").scrollTop=0;
}
function closeRecipe(){byId("recipe-dialog").close();previouslyFocused?.focus()}
async function fetchJson(path){
 const response=await fetch(path,{cache:"no-store"});
 if(!response.ok)throw new Error(path+" returned "+response.status);
 return response.json();
}
async function loadRecipes(){
 try{
  const {catalog,recipes}=await fetchArchiveData(fetchJson);
  state.names=Object.fromEntries(catalog.ingredients.map(x=>[x.id,x.names["de-CH"]]));
  state.recipes=Object.fromEntries(recipes.map(recipe=>[recipe.id,recipe]));
  state.archiveEntries=archiveEntries(recipes,archiveImages);
  state.archiveStatus="ready";
 }catch(err){
  console.warn("Could not load canonical recipe data",err);
  state.archiveStatus="error";
  state.archiveEntries=[];
  state.recipes={};
  state.names={};
 }
 renderWheel();
 if(state.tab==="shopping")renderShopping();
 if(state.tab==="archive")renderArchive();
}
function init(){
 const days=weekDays();
 const now=new Date();
 const match=days.findIndex(x=>x.date.toDateString()===now.toDateString());
 state.current=match>=0?match:0;
 document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>showTab(btn.dataset.tab)));
 byId("week-prev").addEventListener("click",()=>setWeekOffset(-1));
 byId("week-next").addEventListener("click",()=>setWeekOffset(1));
 byId("day-prev").addEventListener("click",()=>setDay(state.current-1));
 byId("day-next").addEventListener("click",()=>setDay(state.current+1));
 const shell=byId("wheel");
 let startX=0,startY=0,tracking=false;
 shell.addEventListener("touchstart",e=>{
  if(e.touches.length!==1){tracking=false;return}
  startX=e.touches[0].clientX;startY=e.touches[0].clientY;tracking=true;
 },{passive:true});
 shell.addEventListener("touchmove",e=>{
  if(!tracking||e.touches.length!==1)return;
  const dy=e.touches[0].clientY-startY,dx=e.touches[0].clientX-startX;
  if(Math.abs(dy)>7&&Math.abs(dy)>Math.abs(dx))e.preventDefault();
 },{passive:false});
 shell.addEventListener("touchend",e=>{
  if(!tracking)return;tracking=false;
  const dy=e.changedTouches[0].clientY-startY;
  const dx=e.changedTouches[0].clientX-startX;
  if(Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)){
    lastWheelSwipeAt=Date.now();
    e.preventDefault();
    setDay(state.current+(dy<0?1:-1));
  }
 },{passive:false});
 shell.addEventListener("touchcancel",()=>{tracking=false});
 let wheelCooldown=0;
 shell.addEventListener("wheel",e=>{if(state.tab!=="week")return;e.preventDefault();const now=Date.now();if(now-wheelCooldown<400)return;wheelCooldown=now;setDay(state.current+(e.deltaY>0?1:-1))},{passive:false});
 window.addEventListener("keydown",e=>{
  if(byId("recipe-dialog").open)return;
  if(state.tab!=="week")return;
  if(["ArrowDown","ArrowRight"].includes(e.key)){e.preventDefault();setDay(state.current+1)}
  if(["ArrowUp","ArrowLeft"].includes(e.key)){e.preventDefault();setDay(state.current-1)}
 });
 let resizeTimer;
 window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderWheel,150)});
 byId("recipe-search").addEventListener("input",e=>{state.query=e.target.value;renderArchive()});
 const filters=[["all","Alli"],["favorites","Favoritä"]];
 byId("recipe-filters").innerHTML=filters.map(([id,label])=>'<button type="button" class="filter-chip'+(id===state.filter?' active':'')+'" data-filter="'+id+'">'+label+'</button>').join("");
 byId("recipe-filters").addEventListener("click",e=>{const target=e.target.closest("[data-filter]");if(!target)return;state.filter=target.dataset.filter;renderArchive()});
 byId("start-day").value=String(state.startDay);
 byId("start-day").addEventListener("change",e=>{state.startDay=Number(e.target.value);save("wachochemer:weekstart",state.startDay);state.current=0;state.weekOffset=0;renderWheel()});
 byId("portion-minus").addEventListener("click",()=>adjustPortions(-1));
 byId("portion-plus").addEventListener("click",()=>adjustPortions(1));
 byId("dialog-close").addEventListener("click",closeRecipe);
 byId("recipe-dialog").addEventListener("click",e=>{if(e.target===byId("recipe-dialog"))closeRecipe()});
 byId("dialog-favourite").addEventListener("click",()=>{
  const id=byId("dialog-favourite").dataset.id;
  if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);
  save("wachochemer:favorites",[...state.favorites]);
  byId("dialog-favourite").textContent=state.favorites.has(id)?"♥":"♡";
  byId("dialog-favourite").classList.toggle("liked",state.favorites.has(id));
  if(state.tab==="archive")renderArchive();
 });
 showTab("week");loadRecipes();
}
init();
