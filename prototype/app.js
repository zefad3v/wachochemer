"use strict";
import {fetchArchiveData,archiveEntries,filterArchive} from "./catalog.mjs";
import {addDays,formatDay,parseDay,mealKey,mealFor,normalizePlan,validateEntry,ingredientTotals,datesBetween,shoppingWindow} from "./planner.mjs";

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
 recipes:{},names:{},archiveEntries:[],archiveStatus:"loading",favorites:new Set(),checked:new Set(),filter:"all",query:"",
 plan:{version:1,entries:{}},planRevision:0,editingDate:null,shopping:null,extras:[]
};
function readSaved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
state.startDay=Number(readSaved("wachochemer:weekstart",4));
if(!Number.isInteger(state.startDay)||state.startDay<0||state.startDay>6)state.startDay=4;
state.favorites=new Set(readSaved("wachochemer:favorites",[]));
state.checked=new Set(readSaved("wachochemer:shoppingChecked",[]));
state.servings=readSaved("wachochemer:recipeServings",{});
const localToday=()=>{const n=new Date();return [n.getFullYear(),String(n.getMonth()+1).padStart(2,"0"),String(n.getDate()).padStart(2,"0")].join("-")};
function safeShoppingRange(value){
 try{datesBetween(value?.from,value?.to);return {from:value.from,to:value.to}}catch{return shoppingWindow(localToday())}
}
state.shopping=safeShoppingRange(readSaved("wachochemer:shoppingRange",null));
const savedExtras=readSaved("wachochemer:shoppingExtras",[]);
state.extras=Array.isArray(savedExtras)?savedExtras.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string").slice(0,200):[];
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
function itemForDay(date){
 const iso=formatDay(new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),12)));
 const dinner=mealFor(state.plan.entries,iso,"dinner");
 const lunch=mealFor(state.plan.entries,iso,"lunch");
 const entry=dinner||lunch;
 const mealLabel=dinner?"Znacht":"Zmittag";
 const bothMeals=!!(dinner&&lunch);
 if(!entry){
  // Visual sample only; never persist this as a meal or count it in shopping.
  const sample=demos.find(x=>x.weekday===date.getDay());
  return {id:"preview-"+iso,title:sample?.title||"No nüt plant",
   description:"Designbeispiel, kei gspeicherts Menü. Tippe uf d Charte zum plane.",
   minutes:sample?.minutes||0,image:sample?.image||null,
   real:false,planned:false,preview:true,mealLabel:"",bothMeals:false};
 }
 if(entry.type==="recipe"){
  const recipe=state.recipes[entry.recipeId],meta=state.archiveEntries.find(x=>x.id===entry.recipeId);
  return {id:entry.recipeId,title:recipe?.title||"Rezept nöd verfügbar",description:recipe?.description||"",minutes:(recipe?.prepMinutes||0)+(recipe?.cookMinutes||0),image:meta?.image||null,real:!!recipe,planned:true,mealLabel,bothMeals,servings:entry.servings};
 }
 if(entry.type==="manual")return {id:"manual-"+iso,title:entry.title,description:"Eigenes Menü",minutes:0,image:null,real:false,planned:true,mealLabel,bothMeals};
 return {id:"leftover-"+iso,title:"Reschte vom "+entry.sourceDate,description:"Scho kocht, kei zweite Iichauf nötig.",minutes:0,image:null,real:false,planned:true,mealLabel,bothMeals};
}
function weekDays(){
 const start=baseWeek();
 return Array.from({length:7},(_,i)=>{
  const date=new Date(start);date.setDate(date.getDate()+i);
  return {date,day:date.getDay(),item:itemForDay(date)};
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
 const bg=item.image?"url('"+item.image+"')":"linear-gradient(140deg,#344832,#15251c)";
 byId("ambient").style.backgroundImage=bg;
 byId("ambient-backdrop").style.backgroundImage=bg;
 const wheel=byId("wheel");
 const weekKey=days.map(day=>day.date.toDateString()).join("|")+"|"+state.planRevision;
 const rebuilding=wheel.dataset.weekKey!==weekKey||wheel.children.length!==7;
 if(rebuilding){
  wheel.classList.add("wheel-initial");
  wheel.innerHTML=days.map(({item,date},i)=>{
   const day=escapeHtml(weekdays[date.getDay()]);
   const label=escapeHtml(item.title);
   const meta=item.planned?(item.mealLabel+(item.bothMeals?" + Zmittag":"")+" · "+(item.servings?item.servings+" Portione":item.real?item.minutes+" Min.":"Eigenes Menü")):"Demo · Menü plane";
   return '<button type="button" class="recipe-card'+(!item.image?' no-photo':'')+'" data-day="'+i+'" aria-label="'+day+', '+label+'" aria-current="false">'+
    (item.image?'<img src="'+escapeHtml(item.image)+'" alt="" loading="'+(Math.abs(i-state.current)<2?"eager":"lazy")+'">':'<span class="card-no-photo" aria-hidden="true">✳</span>')+
    '<span class="card-content"><span class="card-day">'+day+" · "+niceDate(date)+'</span><span class="card-bottom"><span class="card-title">'+label+'</span><span class="card-meta">'+escapeHtml(meta)+'</span></span></span></button>';
  }).join("");
  wheel.dataset.weekKey=weekKey;
  wheel.querySelectorAll(".recipe-card").forEach(card=>{
   card.addEventListener("click",()=>{
    if(Date.now()-lastWheelSwipeAt<420)return;
    const i=Number(card.dataset.day);
    if(i!==state.current){setDay(i);return}
    const target=weekDays()[i];
    if(target.item.real)openRecipe(target.item);
    else openMealEditor(target.date,"dinner");
   });
  });
 }
 const wide=window.matchMedia("(min-width: 1040px)").matches;
 const height=wheel.clientHeight;
 const travel=Math.max(100,Math.min(290,height*.42));
 Array.from(wheel.children).forEach((element,i)=>{
  const d=distance(i),a=Math.abs(d),isCurrent=i===state.current;
  const angle=d*25*Math.PI/180;
  const y=Math.sin(angle)*travel;
  const depth=(Math.cos(angle)-1)*310;
  const size=1-a*.075;
  element.classList.toggle("current",isCurrent);
  element.setAttribute("aria-current",String(isCurrent));
  element.setAttribute("aria-label",weekdays[days[i].date.getDay()]+", "+days[i].item.title+
   (isCurrent?", Rezept öffnen oder Menü bearbeiten":", Tag auswählen"));
  element.style.zIndex=String(10-a);
  element.style.opacity=String(.99-a*.16);
  element.style.pointerEvents="auto";
  element.style.borderRadius=(19/size).toFixed(2)+"px";
  element.style.borderWidth=(1/size).toFixed(2)+"px";
  element.style.transform=wide
   ?"translate(-50%,-50%) translate3d("+(d*118)+"px,0,"+depth+"px) rotateY("+(-10-d*8)+"deg) scale("+size+")"
   :"translate(-50%,-50%) translate3d(-12px,"+y.toFixed(1)+"px,"+depth.toFixed(1)+"px) rotateX("+(-d*14)+"deg) rotateY(-11deg) scale("+size+")";
 });
 if(rebuilding)requestAnimationFrame(()=>requestAnimationFrame(()=>wheel.classList.remove("wheel-initial")));
 const spot=byId("desktop-spotlight");
 const date=days[state.current].date;
 spot.innerHTML='<span class="spot-day">'+escapeHtml(weekdays[date.getDay()])+' · '+niceDate(date)+'</span>'+
 '<h2>'+escapeHtml(item.title)+'</h2><p>'+escapeHtml(item.description||"Menü im Kalender bearbeite")+'</p>'+
 '<div class="detail-actions"><button type="button" class="main-action" id="spot-edit">Menü bearbeite</button></div>';
 byId("spot-edit").addEventListener("click",()=>openMealEditor(date,"dinner"));
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
function persistPlan(){
 save("wachochemer:mealPlanV1",state.plan);
 state.planRevision++;
 byId("wheel").dataset.weekKey="";
 renderWheel();
 if(state.tab==="shopping")renderShopping();
}
function openMealEditor(date,meal="dinner",recipeId=null){
 const localDate=typeof date==="string"?date:[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
 state.editingDate=localDate;
 byId("meal-editor-date").textContent=localDate;
 byId("meal-recipe").innerHTML=state.archiveEntries.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(x.title)+'</option>').join("");
 byId("meal-type").value=meal;
 loadMealEditor();
 if(recipeId){byId("meal-kind").value="recipe";byId("meal-recipe").value=recipeId;updateMealEditorFields()}
 byId("meal-editor").showModal();
 byId("meal-kind").focus({preventScroll:true});
}
function loadMealEditor(){
 const entry=mealFor(state.plan.entries,state.editingDate,byId("meal-type").value);
 byId("meal-kind").value=entry?.type||"recipe";
 byId("meal-recipe").value=entry?.recipeId||state.archiveEntries[0]?.id||"";
 byId("meal-servings").value=entry?.servings||3;
 byId("meal-manual").value=entry?.type==="manual"?entry.title:"";
 byId("meal-leftover-source").value=entry?.type==="leftover"?entry.sourceDate:addDays(state.editingDate,-1);
 byId("meal-remove").disabled=!entry;
 byId("meal-editor-error").hidden=true;
 updateMealEditorFields();
}
function updateMealEditorFields(){
 const kind=byId("meal-kind").value;
 byId("meal-recipe-line").hidden=kind!=="recipe";
 byId("meal-servings-line").hidden=kind!=="recipe";
 byId("meal-manual-line").hidden=kind!=="manual";
 byId("meal-leftover-line").hidden=kind!=="leftover";
}
function saveMealEditor(event){
 event.preventDefault();
 const date=state.editingDate,meal=byId("meal-type").value;
 const key=mealKey(date,meal),kind=byId("meal-kind").value;
 try{
  if(kind==="none")delete state.plan.entries[key];
  else{
   let entry;
   if(kind==="recipe")entry={type:"recipe",recipeId:byId("meal-recipe").value,servings:Number(byId("meal-servings").value)};
   if(kind==="manual")entry={type:"manual",title:byId("meal-manual").value.trim()};
   if(kind==="leftover"){
    const sourceDate=byId("meal-leftover-source").value;
    if(sourceDate>=date)throw Error("Reschte müend vo eme früehere Tag sii.");
    entry={type:"leftover",sourceDate};
   }
   validateEntry(entry,state.recipes);
   state.plan.entries[key]=entry;
  }
  persistPlan();
  byId("meal-editor").close();
 }catch(err){
  byId("meal-editor-error").hidden=false;
  byId("meal-editor-error").textContent=err.message;
 }
}
function changeShoppingRange(from,to){
 try{
  datesBetween(from,to);
  state.shopping={from,to};
  save("wachochemer:shoppingRange",state.shopping);
  byId("shopping-window-error").hidden=true;
  renderShopping();
 }catch(err){
  byId("shopping-window-error").hidden=false;
  byId("shopping-window-error").textContent=err.message;
 }
}
function renderShopping(){
 byId("shopping-from").value=state.shopping.from;
 byId("shopping-to").value=state.shopping.to;
 const {from,to}=state.shopping;
 let result;
 try{result=ingredientTotals(state.plan.entries,state.recipes,from,to)}
 catch(err){byId("shopping-window-error").textContent=err.message;byId("shopping-window-error").hidden=false;return}
 const {items,skipped}=result;
 const range=from+"|"+to;
 const purchased=items.filter(row=>state.checked.has(range+"|"+row.key)).length;
 const rangeDays=new Set(datesBetween(from,to));
 const relevantExtras=state.extras.filter(row=>rangeDays.has(row.date));
 const checkedExtra=relevantExtras.filter(row=>state.checked.has("extra|"+row.id)).length;
 byId("shopping-progress").textContent=(purchased+checkedExtra)+" vo "+(items.length+relevantExtras.length)+
   " Sache abghakt · "+from+" bis "+to;
 const ingredientHtml=items.length?items.map(row=>{
  const checked=state.checked.has(range+"|"+row.key);
  const label=state.names[row.ingredientId]||row.ingredientId;
  const quantity=row.quantity===null?"Nach Gschmack":moneyLike(Math.round(row.quantity*100)/100)+(units[row.unit]?" "+units[row.unit]:"");
  return '<label class="shopping-row'+(checked?' checked':'')+'"><input type="checkbox" data-shopping="'+escapeHtml(range+"|"+row.key)+'"'+(checked?' checked':'')+'><span class="shopping-name">'+escapeHtml(label)+'</span><span class="shopping-amount">'+escapeHtml(quantity)+'</span></label>';
 }).join(""):'<p class="empty-message">Kei Rezept-Zutate i dem Ziitruum. Plan dini Menü im Wucheplan.</p>';
 const extrasHtml=relevantExtras.map(row=>{
  const checked=state.checked.has("extra|"+row.id);
  return '<div class="shopping-row'+(checked?' checked':'')+'"><input type="checkbox" aria-label="'+escapeHtml(row.title)+' abghakt" data-shopping="extra|'+escapeHtml(row.id)+'"'+(checked?' checked':'')+'><span class="shopping-name">'+escapeHtml(row.title)+'</span><button type="button" class="remove-extra" data-remove-extra="'+escapeHtml(row.id)+'" aria-label="'+escapeHtml(row.title)+' entferne">✕</button></div>';
 }).join("");
 byId("shopping-items").innerHTML='<section class="shopping-group"><h3>Zutate us de Menüs</h3>'+ingredientHtml+'</section>'+
  '<section class="shopping-group"><h3>Zusätzlich</h3>'+(extrasHtml||'<p class="empty-message">No nüt ergänzt.</p>')+'</section>'+
  (skipped.length?'<p class="shopping-disclaimer">'+skipped.length+' eigenes Menü ohni Rezept-Zutate. Falls nötig, ergänze d Sache obe.</p>':'');
 byId("shopping-items").querySelectorAll("[data-shopping]").forEach(input=>input.addEventListener("change",()=>{
  if(input.checked)state.checked.add(input.dataset.shopping);else state.checked.delete(input.dataset.shopping);
  save("wachochemer:shoppingChecked",[...state.checked]);renderShopping();
 }));
 byId("shopping-items").querySelectorAll("[data-remove-extra]").forEach(btn=>btn.addEventListener("click",()=>{
  state.extras=state.extras.filter(x=>x.id!==btn.dataset.removeExtra);
  state.checked.delete("extra|"+btn.dataset.removeExtra);
  save("wachochemer:shoppingExtras",state.extras);
  save("wachochemer:shoppingChecked",[...state.checked]);
  renderShopping();
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
  const planBtn=document.createElement("button");
  planBtn.type="button";
  planBtn.className="plan-recipe-action";
  planBtn.textContent="I Wucheplan";
  actions.append(planBtn);
  planBtn.addEventListener("click",()=>{
   closeRecipe();
   openMealEditor(weekDays()[state.current].date,"dinner",recipe.id);
  });
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
 // Focus the recipe title rather than the first dialog button, which iOS outlines.
 // This also closes the keyboard when a recipe is opened from search.
 byId("dialog-title").focus({preventScroll:true});
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
  state.plan=normalizePlan(readSaved("wachochemer:mealPlanV1",null),state.recipes);
  state.planRevision++;
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
 byId("edit-day").addEventListener("click",()=>openMealEditor(weekDays()[state.current].date,"dinner"));
 byId("meal-editor-close").addEventListener("click",()=>byId("meal-editor").close());
 byId("meal-form").addEventListener("submit",saveMealEditor);
 byId("meal-type").addEventListener("change",loadMealEditor);
 byId("meal-kind").addEventListener("change",updateMealEditorFields);
 byId("meal-remove").addEventListener("click",()=>{
  delete state.plan.entries[mealKey(state.editingDate,byId("meal-type").value)];
  persistPlan();
  byId("meal-editor").close();
 });
 for(const id of ["shopping-from","shopping-to"]){
  byId(id).addEventListener("change",()=>changeShoppingRange(byId("shopping-from").value,byId("shopping-to").value));
 }
 byId("shopping-seven").addEventListener("click",()=>{const w=shoppingWindow(localToday());changeShoppingRange(w.from,w.to)});
 byId("shopping-following").addEventListener("click",()=>{const from=addDays(state.shopping.to,1);changeShoppingRange(from,addDays(from,6))});
 byId("shopping-plan-week").addEventListener("click",()=>{
  const days=weekDays();
  const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  changeShoppingRange(local(days[0].date),local(days[6].date));
 });
 byId("shopping-add-form").addEventListener("submit",e=>{
  e.preventDefault();
  const input=byId("shopping-extra"),title=input.value.trim();
  if(!title)return;
  state.extras.push({id:String(Date.now())+"-"+Math.random().toString(36).slice(2,8),date:state.shopping.from,title});
  save("wachochemer:shoppingExtras",state.extras);
  input.value="";renderShopping();
 });
 const shell=byId("wheel");
 let startX=0,startY=0,tracking=false;
 shell.addEventListener("touchstart",e=>{
  if(e.touches.length!==1){tracking=false;return}
  startX=e.touches[0].clientX;startY=e.touches[0].clientY;tracking=true;
 },{passive:true});
 shell.addEventListener("touchmove",e=>{
  if(!tracking||e.touches.length!==1||state.tab!=="week")return;
  const dy=e.touches[0].clientY-startY,dx=e.touches[0].clientX-startX;
  // Claim vertical drags early so iOS never cancels the ending gesture.
  if(Math.abs(dy)>7&&Math.abs(dy)>Math.abs(dx)&&e.cancelable)e.preventDefault();
 },{passive:false});
 shell.addEventListener("touchend",e=>{
  if(!tracking)return;
  tracking=false;
  if(state.tab!=="week"||e.changedTouches.length!==1)return;
  const dy=e.changedTouches[0].clientY-startY;
  const dx=e.changedTouches[0].clientX-startX;
  if(Math.abs(dy)>35&&Math.abs(dy)>Math.abs(dx)){
    lastWheelSwipeAt=Date.now();
    if(e.cancelable)e.preventDefault();
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
