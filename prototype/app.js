"use strict";
import {fetchArchiveData,archiveEntries,filterArchive} from "./catalog.mjs";
import {displayClass,viewForClass,moveDay,swipeDirection} from "./responsive-planner.mjs";
import {addDays,formatDay,parseDay,mealKey,mealFor,datesBetween,shoppingWindow} from "./planner.mjs";
import {householdNeed,portion,assessPlan,updateMeal,cookingTotals} from "../src/domain/planning.mjs";
import {loadPlan,storePlan,restorePlan} from "../src/storage/meal-plan.mjs";
import {buildTransferManifest,serializeManifest,manifestText} from "../src/integrations/bring.mjs";
const weekdays=["Sunntig","Mäntig","Zischtig","Mittwuch","Dunschtig","Friitig","Samschtig"];
const weekdayShort=["SO","MO","DI","MI","DO","FR","SA"];
const units={g:"g",kg:"kg",ml:"ml",l:"l",piece:"",tbsp:"EL",tsp:"TL"};
import {recipeImages,imageFor} from "./recipe-images.mjs";
const archiveImages=recipeImages;
let imageDemo=new URLSearchParams(location.search).get("imageDemo")==="1";
const state={
 tab:"week",returnTab:"week",current:0,weekOffset:0,startDay:4,activeRecipeId:null,servings:{},
 recipes:{},names:{},archiveEntries:[],archiveStatus:"loading",favorites:new Set(),checked:new Set(),filter:"all",query:"",
 plan:{version:2,entries:{}},editingDate:null,shopping:null,extras:[],selectedMeal:null
};
function readSaved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
state.household=readSaved("wachochemer:household",null);
state.recipeShares=readSaved("wachochemer:recipeShares",{});
state.planBlocked=false;
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
function itemForDay(date,requestedMeal=null){
 const iso=formatDay(new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),12)));
 const dinner=mealFor(state.plan.entries,iso,"dinner");
 const lunch=mealFor(state.plan.entries,iso,"lunch");
 const entry=requestedMeal?(requestedMeal==="lunch"?lunch:dinner):dinner||lunch;
 const mealLabel=requestedMeal?(requestedMeal==="lunch"?"Zmittag":"Znacht"):(dinner?"Znacht":"Zmittag");
 if(!entry){
  return {id:"empty-"+iso,title:"No nüt plant",description:"Wähl es Rezept, es eigenes Menü oder Reschte.",minutes:0,image:null,real:false,planned:false,mealLabel:""};
 }
 if(entry.type==="recipe"){
  const recipe=state.recipes[entry.recipeId],meta=state.archiveEntries.find(x=>x.id===entry.recipeId);
  return {id:entry.recipeId,title:recipe?.title||"Rezept nöd verfügbar",description:recipe?.description||"",minutes:(recipe?.prepMinutes||0)+(recipe?.cookMinutes||0),image:meta?.image||null,imageDemo:meta?.imageDemo||false,real:!!recipe,planned:true,mealLabel,servings:entry.cookedServings??entry.servings};
 }
 if(entry.type==="manual")return {id:"manual-"+iso,title:entry.title,description:"Eigenes Menü",minutes:0,image:null,real:false,planned:true,mealLabel};
 return {id:"leftover-"+iso,title:"Reschte vom "+(entry.sourceKey||entry.sourceDate||"Ursprung bitte kläre"),description:"Scho kocht, kei zweite Iichauf nötig.",minutes:0,image:null,real:false,planned:true,mealLabel};
}
function weekDays(){
 const start=baseWeek();
 return Array.from({length:7},(_,i)=>{
  const date=new Date(start);date.setDate(date.getDate()+i);
  return {date,day:date.getDay(),item:itemForDay(date)};
 });
}
const mealForTime=()=>new Date().getHours()<14?"lunch":"dinner";
let calendarDay=localToday();
const displayedMeal=()=>{
 if(calendarDay!==localToday()){calendarDay=localToday();state.selectedMeal=null}
 return state.selectedMeal||mealForTime();
};
function showTab(tab){
 if(tab==="settings"&&state.tab==="settings")tab=state.returnTab||"week";
 else if(tab==="settings")state.returnTab=state.tab;
 state.tab=tab;
 byId("app").dataset.tab=tab;
 byId("mobile-page-title").textContent=({week:"Üse Wucheplan",archive:"Chochchischtli",shopping:"Für Bring!",settings:"Iistellige"})[tab];
 document.querySelectorAll(".screen").forEach(el=>el.classList.toggle("active",el.id==="screen-"+tab));
 document.querySelectorAll("[data-tab]").forEach(el=>{
   const yes=el.dataset.tab===tab;
   el.classList.toggle("active",yes);
   if(yes)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
 });
 if(tab==="week")renderPlanner();
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
const savedViews=readSaved("wachochemer:plannerViews",{});
const viewPreferences=savedViews&&typeof savedViews==="object"&&!Array.isArray(savedViews)?savedViews:{};
let currentClass="",plannerView="day",lastSwipeAt=0;
function updateDisplay(){
 const next=displayClass(document.documentElement.clientWidth);
 if(next!==currentClass){currentClass=next;plannerView=viewForClass(next,viewPreferences)}
 renderPlanner();
}
function setWeekOffset(inc){state.weekOffset+=inc;renderPlanner()}
function setDay(idx){
 const next=moveDay(state.current,state.weekOffset,idx-state.current);
 state.current=next.current;state.weekOffset=next.weekOffset;renderPlanner();
}
function mealSummary(date){
 const iso=localISO(date);
 return ["lunch","dinner"].map(meal=>{
  const entry=mealFor(state.plan.entries,iso,meal);
  const title=!entry?"No nüt plant":entry.type==="recipe"?(state.recipes[entry.recipeId]?.title||"Rezept nöd verfügbar")+((entry.cookedServings??entry.servings)?" · "+(entry.cookedServings??entry.servings)+" Portione":""):entry.type==="manual"?entry.title+" · Eigenes Menü":"Reschte vom "+(entry.sourceKey||entry.sourceDate||"Ursprung bitte kläre");
  return '<span>'+escapeHtml((meal==="lunch"?"Zmittag: ":"Znacht: ")+title)+'</span>';
 }).join("");
}
function localISO(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-")}
function picture(item,label=false){return item.image?'<img src="'+escapeHtml(item.image)+'" alt="" decoding="async" draggable="false">'+(item.imageDemo&&label?'<span class="image-demo-badge">Bild-Demo · KI-Beispiel</span>':''):'<span class="planner-placeholder" aria-hidden="true"></span>'}
function renderPlanner(){
 const days=weekDays(),selected=days[state.current],meal=displayedMeal(),item=itemForDay(selected.date,meal);
 byId("week-range").textContent=weekLabel();
 const atmosphere=byId("app");
 if(item.image)atmosphere.style.setProperty("--meal-atmosphere",'url("'+item.image+'")');else atmosphere.style.removeProperty("--meal-atmosphere");
 byId("screen-week").dataset.view=plannerView;
 document.querySelectorAll("button[data-view]").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.view===plannerView)));
 byId("week-strip").innerHTML=days.map(({date,item},i)=>'<button type="button" data-day="'+i+'" aria-pressed="'+(i===state.current)+'" '+(localISO(date)===localToday()?'aria-current="date" ':'')+'aria-label="'+escapeHtml(weekdays[date.getDay()]+', '+niceDate(date)+(item.planned?', Menü geplant':', ungeplant'))+'"><span>'+weekdayShort[date.getDay()]+'</span><strong>'+date.getDate()+'</strong><span class="plan-dot" data-planned="'+item.planned+'" aria-hidden="true"></span></button>').join("");
 byId("week-overview").innerHTML=days.map(({date,item},i)=>'<article class="week-row'+(i===state.current?' selected':'')+'"><button type="button" class="day-select" data-day="'+i+'" '+(localISO(date)===localToday()?'aria-current="date" ':'')+'aria-pressed="'+(i===state.current)+'">'+picture(item)+'<span class="row-content"><strong>'+escapeHtml(weekdays[date.getDay()]+" · "+niceDate(date))+'</strong>'+mealSummary(date)+(item.imageDemo?'<span class="demo-tag">Bild-Demo · KI-Beispiel</span>':'')+'</span></button><button type="button" class="row-edit" data-edit-day="'+i+'" aria-label="Menü für '+escapeHtml(weekdays[date.getDay()])+ ' bearbeiten">✎</button></article>').join("");
 byId("day-card").innerHTML=picture(item,true)+'<span class="day-card-content"><span>'+escapeHtml(weekdays[selected.date.getDay()]+" · "+niceDate(selected.date))+'</span><strong>'+escapeHtml(item.title)+'</strong><span>'+escapeHtml(item.planned?(item.mealLabel+" · "+(item.real?item.minutes+" Min. · "+item.servings+" Portione":item.description)):"Ungeplant")+'</span></span>';
 byId("day-card").setAttribute("aria-label",(meal==="lunch"?"Zmittag: ":"Znacht: ")+item.title+(item.real?", Rezept aaluege":", Menü bearbeiten"));
 for(const btn of document.querySelectorAll("[data-meal-page]")){
  const active=btn.dataset.mealPage===meal;
  btn.setAttribute("aria-pressed",String(active));
  btn.classList.toggle("active",active);
 }
 byId("day-meals").innerHTML="";
}
function searchThumbnail(item){
 return item.image?'<img class="suggestion-thumb" src="'+escapeHtml(item.image)+'" alt="" width="52" height="52" loading="lazy" decoding="async">':'<span class="suggestion-thumb suggestion-placeholder" aria-hidden="true"></span>';
}
function renderArchive(){
 const grid=byId("recipe-grid");
 grid.classList.remove("search-results");
 if(state.archiveStatus!=="ready"){
  grid.innerHTML='<p role="status">'+(state.archiveStatus==="error"
   ?"Rezepte chönd grad nöd glade werde. Bitte Verbindig prüefe und d Siite neu lade."
   :"Rezepte werded glade…")+'</p>';
  return;
 }
 const all=filterArchive(state.archiveEntries,{query:state.query,filter:state.filter,favorites:state.favorites});
 const searching=Boolean(state.query.trim());
 grid.classList.toggle("search-suggestions",searching);
 grid.innerHTML=searching
  ?(all.length?all.map(item=>'<button type="button" class="archive-suggestion" data-recipe="'+escapeHtml(item.id)+'">'+
     searchThumbnail(item)+'<span><strong>'+escapeHtml(item.title)+'</strong><small>'+item.minutes+' Min. · Rezept'+(item.imageDemo?' · Bild-Demo':'')+'</small></span></button>').join("")
     :'<p class="empty-message">Kei passende Rezepte gfunde.</p>')
  :(all.length?all.map(item=>'<button type="button" class="archive-card" data-recipe="'+escapeHtml(item.id)+'">'+
     (item.image?'<img src="'+escapeHtml(item.image)+'" alt="" loading="lazy">':
      '<span class="archive-image-placeholder" aria-hidden="true"><span>Rezeptbild folgt</span></span>')+
     '<span class="archive-caption"><strong>'+escapeHtml(item.title)+'</strong><small>'+item.minutes+' Min. · Rezept'+
     (item.imageDemo?' · Bild-Demo':'')+(state.favorites.has(item.id)?' ♡':'')+'</small></span></button>').join(""):'<p>Kei Rezepte gfunde.</p>');
 grid.querySelectorAll("[data-recipe]").forEach(btn=>btn.addEventListener("click",()=>{
  const item=state.archiveEntries.find(recipe=>recipe.id===btn.dataset.recipe);
  if(item)openRecipe(item);
 }));
 document.querySelectorAll(".filter-chip").forEach(btn=>btn.classList.toggle("active",btn.dataset.filter===state.filter));
}
function persistPlan(){
 if(state.archiveStatus!=="ready")throw Error("Rezepte bitte zuerst vollständig lade.");
 if(state.planBlocked)throw Error("Originalplan bitte zuerst wiederherstelle.");
 storePlan(localStorage,state.plan);
 renderPlanner();
 byId("plan-status").textContent=assessPlan(state.plan,state.recipes).issues.map(x=>x.key+": "+x.message).join("\n");
 if(state.tab==="shopping")renderShopping();
}
function openMealEditor(date,meal="dinner",recipeId=null){
 const localDate=typeof date==="string"?date:[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
 state.editingDate=localDate;
 state.editorRecipeId=recipeId;
 byId("meal-date").value=localDate;
 byId("meal-recipe-search").value="";
 byId("meal-type").value=meal;
 loadMealEditor();
 if(recipeId){byId("meal-kind").value="recipe";byId("meal-recipe").value=recipeId;suggestMealPortions();renderMealRecipeOptions();updateMealEditorFields()}
 byId("meal-editor").showModal();
 byId("meal-editor-title").focus({preventScroll:true});
}
function loadMealEditor(){
 const entry=mealFor(state.plan.entries,state.editingDate,byId("meal-type").value);
 byId("meal-recipe-search").value="";
 byId("meal-kind").value=entry?.type||"recipe";
 byId("meal-recipe").value=entry?.recipeId||"";
 renderMealRecipeOptions();
 let need;
 try{need=householdNeed(state.household,state.recipeShares[entry?.recipeId]||{})}catch{need=state.recipes[entry?.recipeId]?.baseServings||""}
 byId("meal-servings").value=entry?.cookedServings??entry?.servings??need;
 byId("meal-consumed").value=entry?.consumedServings===null?"":entry?.consumedServings??need;
 byId("meal-advanced").open=entry?.consumedServings===null;
 reflectMealPortions();
 byId("meal-leftover-portions").value=entry?.portions??need;
 byId("meal-leftover-source-meal").value=entry?.sourceKey?.split("|")[1]||"";

 byId("meal-manual").value=entry?.type==="manual"?entry.title:"";
 byId("meal-leftover-source").value=entry?.type==="leftover"?(entry.sourceKey?.split("|")[0]||entry.sourceDate||""):addDays(state.editingDate,-1);
 byId("meal-remove").disabled=!entry;
 byId("meal-editor-error").hidden=true;
 updateMealEditorFields();
}
function renderMealRecipeOptions(){
 const query=byId("meal-recipe-search").value.trim().toLocaleLowerCase("de-CH");
 const selected=byId("meal-recipe").value;
 const current=state.archiveEntries.find(item=>item.id===selected);
 byId("meal-recipe-selected").textContent=current?current.title:"Bitte es Rezept wähle";
 byId("meal-recipe-change").textContent=current?"Rezept ändern":"Rezept ussueche";
 byId("meal-recipe-search").hidden=!!current&&!query;
 byId("meal-recipe-options").hidden=!query;
 if(!query){byId("meal-recipe-options").innerHTML="";return}
 const matching=state.archiveEntries.filter(item=>item.title.toLocaleLowerCase("de-CH").includes(query));
 byId("meal-recipe-options").innerHTML=matching.length?matching.map(item=>
  '<button type="button" role="option" aria-selected="'+(item.id===selected)+'" data-pick-recipe="'+escapeHtml(item.id)+'">'+
  escapeHtml(item.title)+'</button>').join(""):'<p>Kei Rezepte gfunde</p>';
}
// Presentation adapters only: all writes still pass through updateMeal.
function portionNote(){
 const recipe=state.recipes[byId("meal-recipe").value];
 byId("meal-portion-note").textContent=state.household?"Vorschlag us dim Haushalt; frei aapassbar.":recipe?"Kein Haushalt erfasst. Vorschlag: "+recipe.baseServings+" Basisportione vom Rezept. Haushalt i de Iistellige erfasse.":"Zuerst es Rezept wähle oder de Haushalt i de Iistellige erfasse.";
}
function suggestMealPortions(){
 const id=byId("meal-recipe").value;
 let need;try{need=householdNeed(state.household,state.recipeShares[id]||{})}catch{need=state.recipes[id]?.baseServings??""}
 byId("meal-consumed").value=need;byId("meal-servings").value=need;reflectMealPortions();
}
function reflectMealPortions(){
 const consumed=byId("meal-consumed").value,cooked=Number(byId("meal-servings").value);
 byId("meal-need").value=consumed;
 const extra=consumed===""?0:Math.max(0,cooked-Number(consumed));
 byId("meal-extra").value=extra;byId("meal-extra-enabled").checked=extra>0;
 byId("meal-extra-line").hidden=extra<=0;
 byId("meal-total").textContent="Total choche: "+cooked+" Portione";portionNote();
}
function syncMealPortions(){
 const need=byId("meal-need").value,extra=byId("meal-extra-enabled").checked?Number(byId("meal-extra").value):0;
 byId("meal-extra-line").hidden=!byId("meal-extra-enabled").checked;
 byId("meal-consumed").value=need;byId("meal-servings").value=need===""?"":Number(need)+extra;
 byId("meal-total").textContent="Total choche: "+byId("meal-servings").value+" Portione";
}
function renderSourceChoices(){
 const target=mealKey(state.editingDate,byId("meal-type").value),plan=structuredClone(state.plan);
 delete plan.entries[target]; // Editing a reservation must release its own portions for the picker.
 const {balances,issues}=assessPlan(plan,state.recipes);
 const order=k=>k.slice(0,10)+(k.endsWith("|lunch")?"0":"1");
 const selected=byId("meal-leftover-source").value+"|"+byId("meal-leftover-source-meal").value;
 const sources=Object.entries(balances).filter(([key,b])=>order(key)<order(target)&&b.available>0&&!issues.some(i=>i.key===key));
 byId("meal-source-choice").innerHTML='<option value="">Reschte bewusst wähle</option>'+sources.map(([key,b])=>'<option value="'+escapeHtml(key)+'">'+escapeHtml(key.slice(0,10)+' · '+(key.endsWith('lunch')?'Zmittag':'Znacht')+' · '+state.recipes[plan.entries[key].recipeId].title+' · '+b.available+' frei')+'</option>').join('');
 byId("meal-source-choice").value=sources.some(([key])=>key===selected)?selected:"";
}
function setCookingMode(active){
 byId("cooking-mode").hidden=!active;byId("dialog-instructions-section").hidden=active;
 byId("recipe-dialog").classList.toggle("is-cooking",active);
 if(active){renderCookingStep();byId("cooking-status").focus()}else byId("dialog-title").focus();
}
function renderCookingStep(){
 const steps=state.recipes[state.activeRecipeId]?.instructions?.["de-CH"]||[];
 byId("cooking-status").textContent=steps.length?"Schritt "+(state.cookingStep+1)+" vo "+steps.length:"Kei Zuebereitig erfasst";
 byId("cooking-step").textContent=steps[state.cookingStep]||"";
 byId("cooking-prev").disabled=state.cookingStep===0;
 byId("cooking-next").textContent=state.cookingStep>=steps.length-1?"Fertig – zum Rezept":"Wiiter";
}
function renderMealBalance(){
 let key=mealKey(state.editingDate,byId("meal-type").value);
 if(byId("meal-kind").value==="leftover"){
  try{key=mealKey(byId("meal-leftover-source").value,byId("meal-leftover-source-meal").value)}
  catch{byId("meal-balance").textContent="Ursprungsdatum und Mahlziit wähle.";return}
 }
 const balance=assessPlan(state.plan,state.recipes).balances[key];
 byId("meal-balance").textContent=balance?"Kocht: "+balance.cooked+" · Verzehrt: "+(balance.consumed??"bitte kläre")+" · Reserviert: "+balance.reserved+" · Verfügbar: "+(balance.available??"bitte kläre"):"Kei Kochmenge für die Mahlziit erfasst.";
}
function updateMealEditorFields(){
 const kind=byId("meal-kind").value;
 byId("meal-recipe-line").hidden=kind!=="recipe";
 byId("meal-servings-line").hidden=kind!=="recipe";
 byId("meal-consumed-line").hidden=kind!=="recipe";
 byId("meal-simple-portions").hidden=kind!=="recipe";
 byId("meal-advanced").hidden=kind!=="recipe";
 byId("meal-source-choice-line").hidden=kind!=="leftover";
 byId("meal-source-advanced").hidden=kind!=="leftover";
 renderSourceChoices();
 byId("meal-consumed").disabled=kind!=="recipe";
 byId("meal-servings").disabled=kind!=="recipe";
 byId("meal-leftover-details").hidden=kind!=="leftover";
 byId("meal-manual-line").hidden=kind!=="manual";
 byId("meal-leftover-line").hidden=kind!=="leftover";
 byId("meal-leftover-tip").hidden=kind!=="leftover";
 renderMealBalance();
}
function saveMealEditor(event){
 event.preventDefault();
 const date=byId("meal-date").value,meal=byId("meal-type").value;
 state.editingDate=date;
 const kind=byId("meal-kind").value;
 const previousPlan=state.plan;
 try{
  const key=mealKey(date,meal);
  if(kind==="none")state.plan=updateMeal(state.plan,key,null,state.recipes);
  else{
   let entry;
   if(kind==="recipe"&&!state.recipes[byId("meal-recipe").value])throw Error("Bitte es gültigs Rezept ussueche.");
   if(kind==="recipe"&&(byId("meal-servings").value===""||byId("meal-consumed").value===""))throw Error("Bitte Kochmenge und Verzehr kläre.");
   if(kind==="recipe")entry={type:"recipe",recipeId:byId("meal-recipe").value,cookedServings:Number(byId("meal-servings").value),consumedServings:Number(byId("meal-consumed").value)};
   if(kind==="manual")entry={type:"manual",title:byId("meal-manual").value.trim()};
   if(kind==="leftover"){
    const sourceDate=byId("meal-leftover-source").value;
    entry={type:"leftover",sourceKey:mealKey(sourceDate,byId("meal-leftover-source-meal").value),portions:Number(byId("meal-leftover-portions").value)};
   }
   state.plan=updateMeal(state.plan,key,entry,state.recipes);
  }
  persistPlan();
  byId("meal-editor").close();
 }catch(err){
  state.plan=previousPlan;
  byId("meal-editor-error").hidden=false;
  byId("meal-editor-error").textContent=err.message;
  byId("meal-editor-error").scrollIntoView({block:"nearest"});
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
function transferManifest(){
 if(state.planBlocked||state.archiveStatus!=="ready")throw Error("Plan/Rezeptdate bitte zuerst wiederherstelle oder lade.");
 return buildTransferManifest(state.plan,state.recipes,state.shopping.from,state.shopping.to,{
  includeOptional:byId("shopping-optional").checked,extras:state.extras,
  publicRecipeUrl:recipe=>recipe.slug?"https://zefad3v.github.io/wachochemer/rezepte/"+encodeURIComponent(recipe.slug)+"/":null
 });
}
function shoppingTransferText(){return manifestText(transferManifest(),state.names)}
function renderShopping(){
 byId("shopping-from").value=state.shopping.from;
 byId("shopping-to").value=state.shopping.to;
 const {from,to}=state.shopping;
 let totals;
 try{totals=transferManifest()}
 catch(err){
  byId("shopping-window-error").textContent=err.message;
  byId("shopping-window-error").hidden=false;
  return;
 }
 const {items}=totals;
 const skipped=totals.warnings;
 byId("bring-imports").innerHTML=totals.cooking.map(row=>'<p>'+escapeHtml(row.mealKey+" · "+row.title+" · "+row.cookedServings+" Portione")+(row.officialImport?' <a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(row.officialImport.importUrl)+'">Einzelrezept in Bring! öffne</a>':' · Kei Einzelimport verfügbar')+'</p>').join("");
 byId("bring-warnings").textContent=totals.warnings.map(x=>x.key+": "+x.message).join("\n");
 const days=new Set(datesBetween(from,to));
 const extras=state.extras.filter(x=>days.has(x.date));
 byId("shopping-progress").textContent=items.length+" Rezept-Zutate · "+extras.length+" Zusatzartikel";
 const rows=items.length?items.map(row=>{
  const label=state.names[row.ingredientId]||row.ingredientId;
  const unit=units[row.unit]||row.unit;
  const quantity=row.quantity===null?"Nach Gschmack":moneyLike(Math.round(row.quantity*100)/100)+(unit?" "+unit:"");
  return '<div class="shopping-row"><span class="shopping-name">'+escapeHtml(label)+'</span>'+
   '<span class="shopping-amount">'+escapeHtml(quantity)+'</span></div>';
 }).join(""):'<p class="empty-message">Kei Rezept-Zutate i däm Ziitruum.</p>';
 const extraRows=extras.map(row=>'<div class="shopping-row"><span class="shopping-name">'+escapeHtml(row.title)+'</span>'+
  '<button type="button" class="remove-extra" data-remove-extra="'+escapeHtml(row.id)+'" aria-label="'+escapeHtml(row.title)+' entferne">✕</button></div>').join("");
 byId("shopping-items").innerHTML='<section class="shopping-group"><h3>Für Bring! vorbereite</h3>'+rows+'</section>'+
  (extraRows?'<section class="shopping-group"><h3>Zusätzlechi Sache</h3>'+extraRows+'</section>':'')+
  (skipped.length?'<p class="shopping-disclaimer">Warnige obe bitte prüefe.</p>':'');
 byId("shopping-items").querySelectorAll("[data-remove-extra]").forEach(btn=>btn.addEventListener("click",()=>{
  state.extras=state.extras.filter(x=>x.id!==btn.dataset.removeExtra);
  save("wachochemer:shoppingExtras",state.extras);
  renderShopping();
 }));
}
function currentServings(recipe){
 if(state.plannedServings!==null)return state.plannedServings;
 const value=Number(state.servings[recipe.id]);
 return Number.isFinite(value)&&value>0&&value<=1000?value:recipe.baseServings;
}
function renderPortions(recipe){
 const count=currentServings(recipe),factor=count/recipe.baseServings;
 byId("portion-count").textContent=count+" "+(count===1?"Portion":"Portionen");
 byId("portion-minus").disabled=state.plannedServings!==null||count<=0.5;
 byId("portion-plus").disabled=state.plannedServings!==null||count>=1000;
 byId("dialog-meta").innerHTML='<span>◷ '+(recipe.prepMinutes+recipe.cookMinutes)+' Min.</span><span>♙ '+count+' '+(count===1?'Portion':'Portionen')+'</span>';
 const list=byId("dialog-ingredients");
 const checked=new Set([...list.querySelectorAll('input:checked')].map(el=>Number(el.dataset.index)));
 list.innerHTML=recipe.ingredients.map((row,i)=>'<li class="'+(checked.has(i)?'done':'')+'"><input type="checkbox" data-index="'+i+'" aria-label="'+escapeHtml(formatIngredient(row,factor))+'" id="ingredient-check-'+i+'"'+(checked.has(i)?' checked':'')+'><label for="ingredient-check-'+i+'">'+escapeHtml(formatIngredient(row,factor))+'</label></li>').join("");
 list.querySelectorAll('input').forEach(input=>input.addEventListener("change",()=>input.parentElement.classList.toggle("done",input.checked)));
}
function adjustPortions(delta){
 const id=state.activeRecipeId,recipe=state.recipes[id];
 if(!recipe||state.plannedServings!==null)return;
 const next=Math.max(0.5,Math.min(1000,currentServings(recipe)+delta));
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
 state.plannedServings=item.planned?item.servings:null;
 state.cookingStep=0;
 byId("cooking-mode").hidden=true;
 byId("recipe-dialog").classList.remove("is-cooking");
 const dialog=byId("recipe-dialog");
 previouslyFocused=document.activeElement;
 byId("dialog-hero").style.backgroundImage=item.image?"url('"+item.image+"')":"linear-gradient(135deg,#35442f,#19231b)";
 byId("dialog-category").textContent=recipe?(item.imageDemo?"FAMILIENREZEPT · BILD-DEMO (KI)":"FAMILIENREZEPT"):item.real?"REZEPT NICHT VERFÜGBAR":"DESIGNBEISPIEL";
 byId("dialog-title").textContent=recipe?.title||item.title;
 byId("dialog-description").textContent=recipe?.description||item.description;
 byId("dialog-meta").innerHTML='<span>◷ '+(recipe?recipe.prepMinutes+recipe.cookMinutes:item.minutes)+' Min.</span><span>♙ '+(recipe?.baseServings||3)+' Portione</span>';
 byId("dialog-favourite").textContent=state.favorites.has(item.id)?"♥":"♡";
 byId("dialog-favourite").classList.toggle("liked",state.favorites.has(item.id));
 byId("dialog-favourite").dataset.id=item.id;
 const actions=byId("dialog-actions");
 if(recipe){
  const live="https://zefad3v.github.io/wachochemer/rezepte/"+encodeURIComponent(recipe.slug)+"/";
  actions.innerHTML='<button class="main-action" type="button" id="jump-to-ingredients">Chochmodus starte</button>'+
  '<a class="bring-action" href="'+live+'" target="_blank" rel="noopener noreferrer" aria-label="Bring! Import auf der veröffentlichten Rezeptseite öffnen" title="Bring! öffnet die Rezeptseite. Die gewählte Portionszahl dort nochmals einstellen.">'+bringIcon()+'</a>';
  byId("jump-to-ingredients").addEventListener("click",()=>setCookingMode(true));
  const planBtn=document.createElement("button");
  planBtn.type="button";
  planBtn.className="plan-recipe-action";
  planBtn.textContent="I Wucheplan";
  actions.append(planBtn);
  planBtn.addEventListener("click",()=>{
   closeRecipe();
   openMealEditor(weekDays()[state.current].date,displayedMeal(),recipe.id);
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
  state.archiveEntries=archiveEntries(recipes,archiveImages).map(item=>({...item,...imageFor(item.id,imageDemo)}));
  state.archiveStatus="ready";
  const loaded=loadPlan(localStorage);
  state.planBlocked=!!loaded.error;
  if(loaded.plan)state.plan=loaded.plan;
  byId("plan-status").textContent=loaded.error||assessPlan(state.plan,state.recipes).issues.map(x=>x.key+": "+x.message).join("\n");
  byId("plan-restore").hidden=!loaded.error;

  }catch(err){
  console.warn("Could not load canonical recipe data",err);
  state.archiveStatus="error";
  state.archiveEntries=[];
  state.recipes={};
  state.names={};
 }
 renderPlanner();
 if(state.tab==="shopping")renderShopping();
 if(state.tab==="archive")renderArchive();
}
function init(){
 byId("meal-recipe-change").addEventListener("click",()=>{byId("meal-recipe-search").hidden=false;byId("meal-recipe-search").focus()});
 for(const id of ["meal-need","meal-extra","meal-extra-enabled"])byId(id).addEventListener("input",syncMealPortions);
 for(const id of ["meal-servings","meal-consumed"])byId(id).addEventListener("input",reflectMealPortions);
 for(const [id,delta] of [["meal-minus",-0.5],["meal-plus",0.5]])byId(id).addEventListener("click",()=>{byId("meal-need").value=Math.max(0,Math.min(1000,Number(byId("meal-need").value)+delta));syncMealPortions()});
 byId("meal-source-choice").addEventListener("change",e=>{const [date,meal]=e.target.value.split("|");byId("meal-leftover-source").value=date||"";byId("meal-leftover-source-meal").value=meal||"";renderMealBalance()});
 byId("meal-date").addEventListener("change",()=>{if(byId("meal-date").value){state.editingDate=byId("meal-date").value;renderSourceChoices()}});
 byId("cooking-prev").addEventListener("click",()=>{state.cookingStep=Math.max(0,state.cookingStep-1);renderCookingStep()});
 byId("cooking-next").addEventListener("click",()=>{const steps=state.recipes[state.activeRecipeId].instructions["de-CH"];if(state.cookingStep>=steps.length-1)setCookingMode(false);else{state.cookingStep++;renderCookingStep()}});
 byId("cooking-exit").addEventListener("click",()=>setCookingMode(false));
 for(const id of ["meal-leftover-source","meal-leftover-source-meal"])byId(id).addEventListener("change",renderMealBalance);
 byId("shopping-optional").addEventListener("change",renderShopping);
 byId("shopping-manifest").addEventListener("click",()=>{
  try{
   if(state.planBlocked)throw Error("Plan bitte zuerst wiederherstelle.");
   const blob=new Blob([serializeManifest(transferManifest())],{type:"application/json"});
   const url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="wachochemer-bring-"+state.shopping.from+"-"+state.shopping.to+".json";link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   byId("shopping-copy-status").textContent="Manifest vorbereitet. Nüt automatisch a Bring! übertrage.";
  }catch(err){byId("shopping-copy-status").textContent=err.message}
 });

 byId("plan-restore").addEventListener("click",()=>{
  try{state.plan=restorePlan(localStorage);state.planBlocked=false;persistPlan();byId("plan-restore").hidden=true}
  catch(err){byId("plan-status").textContent=err.message}
 });
 const fields=["adults","children","babies","adultsShare","childrenShare","babiesShare"];
 for(const field of fields)byId("household-"+field).value=state.household?.[field]??(field==="adultsShare"?1:0);
 byId("household-form").addEventListener("submit",e=>{
  e.preventDefault();
  try{
   const profile=Object.fromEntries(fields.map(f=>[f,Number(byId("household-"+f).value)]));
   const need=householdNeed(profile);
   if(!save("wachochemer:household",profile))throw Error("Speichere fehlgschlage.");
   state.household=profile;byId("household-status").textContent=need+" Portione pro Mahlziit";
  }catch(err){byId("household-status").textContent=err.message}
 });
 byId("recipe-share-save").addEventListener("click",()=>{
  try{
   const id=byId("meal-recipe").value;if(!state.recipes[id])throw Error("Zuerst es Rezept wähle.");
   const share=Number(byId("recipe-child-share").value);portion(share,true);
   const next={...state.recipeShares,[id]:{childrenShare:share}};
   if(!save("wachochemer:recipeShares",next))throw Error("Speichere fehlgschlage.");
   state.recipeShares=next;
   const need=householdNeed(state.household,next[id]);byId("meal-consumed").value=need;byId("meal-servings").value=need;reflectMealPortions();
  }catch(err){byId("meal-editor-error").hidden=false;byId("meal-editor-error").textContent=err.message}
 });

 const days=weekDays();
 const now=new Date();
 const match=days.findIndex(x=>x.date.toDateString()===now.toDateString());
 state.current=match>=0?match:0;
 document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>showTab(btn.dataset.tab)));
 byId("week-prev").addEventListener("click",()=>setWeekOffset(-1));
 byId("week-next").addEventListener("click",()=>setWeekOffset(1));
 byId("screen-week").addEventListener("click",event=>{
  const day=event.target.closest("[data-day]"),edit=event.target.closest("[data-edit-day]"),view=event.target.closest("button[data-view]");
  if(day)setDay(Number(day.dataset.day));
  if(edit){setDay(Number(edit.dataset.editDay));openMealEditor(weekDays()[state.current].date,displayedMeal())}
  if(view){plannerView=view.dataset.view;viewPreferences[currentClass]=plannerView;save("wachochemer:plannerViews",viewPreferences);renderPlanner()}
 });
 byId("day-card").addEventListener("click",()=>{if(Date.now()-lastSwipeAt<420)return;const date=weekDays()[state.current].date,item=itemForDay(date,displayedMeal());if(item.real)openRecipe(item);else openMealEditor(date,displayedMeal())});
 byId("day-edit").addEventListener("click",()=>openMealEditor(weekDays()[state.current].date,displayedMeal()));
 document.querySelectorAll("[data-meal-page]").forEach(btn=>btn.addEventListener("click",()=>{
  state.selectedMeal=btn.dataset.mealPage;renderPlanner();
 }));
 byId("open-week-overview").addEventListener("click",()=>{
  plannerView="week";renderPlanner();
 });
 byId("prepare-bring").addEventListener("click",()=>showTab("shopping"));
 byId("shopping-back").addEventListener("click",()=>showTab("week"));
 byId("settings-back").addEventListener("click",()=>showTab(state.returnTab||"week"));
 byId("meal-recipe-search").addEventListener("input",renderMealRecipeOptions);
 byId("meal-recipe-options").addEventListener("click",event=>{
  const btn=event.target.closest("[data-pick-recipe]");
  if(!btn)return;
  byId("meal-recipe").value=btn.dataset.pickRecipe;
  suggestMealPortions();

  byId("meal-recipe-search").value="";
  renderMealRecipeOptions();
 });
 byId("meal-date").addEventListener("change",event=>{
  try{parseDay(event.target.value);state.editingDate=event.target.value}
  catch{
   byId("meal-editor-error").hidden=false;
   byId("meal-editor-error").textContent="Bitte es gültigs Datum wähle.";
  }
 });
 byId("meal-editor-close").addEventListener("click",()=>byId("meal-editor").close());
 byId("meal-form").addEventListener("submit",saveMealEditor);
 byId("meal-type").addEventListener("change",()=>{if(!state.editorRecipeId)loadMealEditor()});
 byId("meal-kind").addEventListener("change",updateMealEditorFields);
 byId("meal-remove").addEventListener("click",()=>{
  const key=mealKey(state.editingDate,byId("meal-type").value),previous=state.plan.entries[key];
  const oldPlan=state.plan;
  try{state.plan=updateMeal(state.plan,key,null,state.recipes);persistPlan();byId("meal-editor").close()}
  catch(err){
   state.plan=oldPlan;
   byId("meal-editor-error").hidden=false;byId("meal-editor-error").textContent=err.message;
  }
 });
 for(const id of ["shopping-from","shopping-to"]){
  byId(id).addEventListener("change",()=>changeShoppingRange(byId("shopping-from").value,byId("shopping-to").value));
 }
 byId("shopping-copy").addEventListener("click",async()=>{
  const status=byId("shopping-copy-status");
  try{
   if(!navigator.clipboard?.writeText)throw Error("Zwüschespeicher isch i däm Browser nöd verfügbar");
   await navigator.clipboard.writeText(shoppingTransferText());
   status.textContent="Zutate kopiert. In Bring! müend si no übernoh werde. En direkte Gesamtimport isch no nöd bestätigt.";
  }catch(err){
   status.textContent="Kopiere nöd möglich: "+err.message;
  }
 });
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
 const shell=byId("day-card");
 let startX=0,startY=0,tracking=false;
 shell.addEventListener("touchstart",e=>{tracking=e.touches.length===1;if(tracking){startX=e.touches[0].clientX;startY=e.touches[0].clientY}},{passive:true});
 shell.addEventListener("touchmove",e=>{if(e.touches.length!==1)tracking=false},{passive:true});
 shell.addEventListener("touchend",e=>{
  if(!tracking)return;tracking=false;
  const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
  if(Math.max(Math.abs(dx),Math.abs(dy))>7)lastSwipeAt=Date.now();
  const direction=swipeDirection(dx,dy);
  if(direction){state.selectedMeal=direction>0?"dinner":"lunch";renderPlanner()}
 },{passive:true});
 shell.addEventListener("touchcancel",()=>{tracking=false;lastSwipeAt=Date.now()});
 window.addEventListener("keydown",e=>{
  if(state.tab!=="week"||document.querySelector("dialog[open]")||e.target.closest("input,select,textarea,[contenteditable]"))return;
  if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();setDay(state.current+(e.key==="ArrowRight"?1:-1))}
 });
 window.addEventListener("resize",updateDisplay);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderPlanner()});
 let lastClockState=localToday()+":"+displayedMeal();
 setInterval(()=>{
  const next=localToday()+":"+displayedMeal();
  if(next!==lastClockState){lastClockState=next;if(!document.hidden&&state.tab==="week")renderPlanner()}
 },30000);
 updateDisplay();
 byId("recipe-search").addEventListener("input",e=>{state.query=e.target.value;renderArchive()});
 const filters=[["all","Alli"],["favorites","Favoritä"]];
 byId("recipe-filters").innerHTML=filters.map(([id,label])=>'<button type="button" class="filter-chip'+(id===state.filter?' active':'')+'" data-filter="'+id+'">'+label+'</button>').join("");
 byId("recipe-filters").addEventListener("click",e=>{const target=e.target.closest("[data-filter]");if(!target)return;state.filter=target.dataset.filter;renderArchive()});
 byId("image-demo").checked=imageDemo;
 byId("image-demo").addEventListener("change",event=>{
  imageDemo=event.target.checked;
  const url=new URL(location.href);if(imageDemo)url.searchParams.set("imageDemo","1");else url.searchParams.delete("imageDemo");history.replaceState(null,"",url);
  state.archiveEntries=state.archiveEntries.map(item=>({...item,...imageFor(item.id,imageDemo)}));renderPlanner();
 });
 byId("start-day").value=String(state.startDay);
 byId("start-day").addEventListener("change",e=>{state.startDay=Number(e.target.value);save("wachochemer:weekstart",state.startDay);state.current=0;state.weekOffset=0;renderPlanner()});
 byId("portion-minus").addEventListener("click",()=>adjustPortions(-0.5));
 byId("portion-plus").addEventListener("click",()=>adjustPortions(0.5));
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
