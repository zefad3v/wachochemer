"use strict";
import {cloudEnabled,startAccount} from "./account.mjs?v=20261122-import-polish";
import {fetchArchiveData,archiveEntries,filterArchive} from "./catalog.mjs";
import {displayClass,viewForClass,moveDay,swipeDirection} from "./responsive-planner.mjs";
import {addDays,parseDay,mealKey,mealFor,datesBetween,shoppingWindow} from "./planner.mjs";
import {householdNeed,portion,assessPlan,updateMeal,cookingTotals} from "../src/domain/planning.mjs";
import {parseDecimal,decimalText} from "./locale-number.mjs";
import {loadPlan,storePlan,restorePlan} from "../src/storage/meal-plan.mjs";
import {buildTransferManifest,serializeManifest,manifestText} from "../src/integrations/bring.mjs";
import {householdRecipe} from './household-recipes.mjs';
import {recipeEditor} from './recipe-editor.mjs';
import {mealLabels,mealKeyLabel,planDateLabel,unitLabels} from "../locales/format-de-CH.mjs";
let publicRecipes=[],publicNames={},editor;
const weekdays=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const weekdayShort=["SO","MO","DI","MI","DO","FR","SA"];
import {recipeImages,imageFor} from "./recipe-images.mjs?v=20261119-photos";
const archiveImages=recipeImages;

const state={
 tab:"week",returnTab:"week",current:0,weekOffset:0,startDay:4,activeRecipeId:null,plannedServings:null,recipeViewServings:null,servings:{},
 recipes:{},names:{},archiveEntries:[],archiveStatus:"loading",favorites:new Set(),checked:new Set(),filter:"all",query:"",sort:"title",duration:"all",
 plan:{version:2,entries:{}},editingDate:null,shopping:null,extras:[],selectedMeal:null
};
function readSaved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
state.household=cloudEnabled?null:readSaved("wachochemer:household",null);
state.recipeShares=cloudEnabled?{}:readSaved("wachochemer:recipeShares",{});
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
state.extras=!cloudEnabled&&Array.isArray(savedExtras)?savedExtras.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string").slice(0,200):[];
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
 const unit=row.unit==="piece"?"":unitLabels[row.unit];
 const quantity=scaledQuantity(row.quantity,row.unit,factor);
 const amount=row.unit==="unspecified"?"":row.quantity===null||row.unit==="to_taste" ? "Etwas" : moneyLike(quantity)+(row.quantityMax!=null?'–'+moneyLike(scaledQuantity(row.quantityMax,row.unit,factor)):'')+(unit?" "+unit:"");
 const plurals={wheat_tortilla_small:"kleine Weizentortillas",toast_bread_slice:"Scheiben Toastbrot"};
 return (amount?amount+" ":"")+(plurals[row.ingredientId]||name)+(row.optional?" (optional)":"");
}
function niceDate(date){return new Intl.DateTimeFormat("de-CH",{day:"numeric",month:"short"}).format(date)}
function leftoverDisplay(entry){
 const origin=mealKeyLabel(entry.sourceKey);
 const source=origin?state.plan.entries[entry.sourceKey]:null;
 const recipe=source?.type==="recipe"?state.archiveEntries.find(item=>item.id===source.recipeId):null;
 const date=origin||planDateLabel(entry.sourceDate);
 return {
  title:recipe?"Resten · "+recipe.title:"Resten",
  description:date?"Vom "+date:"Herkunft klären",
  image:recipe?.image??null,
  imageDemo:recipe?.imageDemo??false,
  imageGenerated:recipe?.imageGenerated??false
 };
}
function baseWeek(){
 const now=new Date();
 const anchor=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0);
 anchor.setDate(anchor.getDate()-(anchor.getDay()-state.startDay+7)%7+state.weekOffset*7);
 return anchor;
}
function itemForDay(date,requestedMeal=null){
 const iso=localISO(date);
 const dinner=mealFor(state.plan.entries,iso,"dinner");
 const lunch=mealFor(state.plan.entries,iso,"lunch");
 const entry=requestedMeal?(requestedMeal==="lunch"?lunch:dinner):dinner||lunch;
 const mealLabel=mealLabels[requestedMeal||(dinner?"dinner":"lunch")];
 if(!entry){
  return {id:"empty-"+iso,title:"Noch nichts geplant",description:"Wähle ein Rezept, ein eigenes Menü oder Resten.",minutes:0,image:null,real:false,planned:false,mealLabel:""};
 }
 if(entry.type==="recipe"){
  const recipe=state.recipes[entry.recipeId],meta=state.archiveEntries.find(x=>x.id===entry.recipeId);
  return {id:entry.recipeId,title:recipe?.title||"Rezept nicht verfügbar",description:recipe?.description||"",minutes:recipe?.totalMinutes??((recipe?.prepMinutes||0)+(recipe?.cookMinutes||0)),image:meta?.image||null,imageDemo:meta?.imageDemo||false,imageGenerated:meta?.imageGenerated||false,real:!!recipe,planned:true,mealLabel,servings:entry.cookedServings??entry.servings};
 }
 if(entry.type==="manual")return {id:"manual-"+iso,title:entry.title,description:"Eigenes Menü",minutes:0,image:null,real:false,planned:true,mealLabel};
 return {id:"leftover-"+iso,...leftoverDisplay(entry),minutes:0,real:false,planned:true,mealLabel};
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
 if(state.tab==="settings" && (tab!=="settings" || state.returnTab) && householdDirty){
  if(!confirm("Ungespeicherte Änderungen am Haushalt verwerfen?"))return;
  householdDirty=false;
  if(state.household){
   for(const field of ["adults","children","babies","adultsShare","childrenShare","babiesShare"])
    byId("household-"+field).value=state.household[field];
   byId("household-form").dispatchEvent(new Event("household-refresh"));
  }
 }
 if(tab==="settings"&&state.tab==="settings")tab=state.returnTab||"week";
 else if(tab==="settings")state.returnTab=state.tab;
 state.tab=tab;
 byId("app").dataset.tab=tab;
 byId("mobile-page-title").textContent=({week:"Wucheplan",archive:"Kochbuch",shopping:"Für Bring!",settings:"Einstellungen"})[tab];
 document.querySelectorAll(".screen").forEach(el=>el.classList.toggle("active",el.id==="screen-"+tab));
 document.querySelectorAll("[data-tab]").forEach(el=>{
   const yes=el.dataset.tab===tab;
   el.classList.toggle("active",yes);
   if(yes)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
 });
 if(tab==="week")renderPlanner();
 if(tab==="archive")renderArchive();
 if(tab==="shopping")renderShopping();
 byId("main").scrollTop=0;
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
 if(next===currentClass)return;
 currentClass=next;plannerView=viewForClass(next,viewPreferences);
 renderPlanner();
}
function setWeekOffset(inc){state.weekOffset+=inc;renderPlanner()}
function setDay(idx){
 const next=moveDay(state.current,state.weekOffset,idx-state.current);
 state.current=next.current;state.weekOffset=next.weekOffset;renderPlanner();
}
function mealSummary(date){
 return ["lunch","dinner"].map(meal=>{
  const item=itemForDay(date,meal);
  const detail=item.servings?item.servings+" Portionen":item.planned&&!item.real?item.description:"";
  return '<span>'+escapeHtml(mealLabels[meal]+": "+item.title+(detail?" · "+detail:""))+'</span>';
 }).join("");
}
function localISO(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-")}
function picture(item,label=false){return item.image?'<img src="'+escapeHtml(item.image)+'" alt="" decoding="async" draggable="false">':'<span class="planner-placeholder" aria-hidden="true"></span>'}
function renderPlanner(){
 const days=weekDays(),selected=days[state.current],meal=displayedMeal(),item=itemForDay(selected.date,meal);
 byId("week-range").textContent=weekLabel();
 const atmosphere=byId("app");
 if(item.image)atmosphere.style.setProperty("--meal-atmosphere",'url("'+item.image+'")');else atmosphere.style.removeProperty("--meal-atmosphere");
 byId("screen-week").dataset.view=plannerView;
 byId("plan-next-week").hidden=plannerView==="week";
 document.querySelectorAll("button[data-view]").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.view===plannerView)));
 byId("week-strip").innerHTML=days.map(({date,item},i)=>'<button type="button" data-day="'+i+'" aria-pressed="'+(i===state.current)+'" '+(localISO(date)===localToday()?'aria-current="date" ':'')+'aria-label="'+escapeHtml(weekdays[date.getDay()]+', '+niceDate(date)+(item.planned?', Menü geplant':', ungeplant'))+'"><span>'+weekdayShort[date.getDay()]+'</span><strong>'+date.getDate()+'</strong><span class="plan-dot" data-planned="'+item.planned+'" aria-hidden="true"></span></button>').join("");
 byId("week-overview").innerHTML=days.map(({date,item},i)=>'<article class="week-row'+(i===state.current?' selected':'')+'"><button type="button" class="day-select" data-day="'+i+'" '+(localISO(date)===localToday()?'aria-current="date" ':'')+'aria-pressed="'+(i===state.current)+'">'+picture(item)+'<span class="row-content"><strong>'+escapeHtml(weekdays[date.getDay()]+" · "+niceDate(date))+'</strong>'+mealSummary(date)+'</span></button><button type="button" class="row-edit" data-edit-day="'+i+'" aria-label="Menü für '+escapeHtml(weekdays[date.getDay()])+ ' bearbeiten">✎</button></article>').join("");
 byId("day-card").innerHTML=picture(item,true)+'<span class="day-card-content"><span>'+escapeHtml(weekdays[selected.date.getDay()]+" · "+niceDate(selected.date))+'</span><strong>'+escapeHtml(item.title)+'</strong><span>'+escapeHtml(item.planned?(item.mealLabel+" · "+(item.real?item.minutes+" Min. · "+item.servings+" Portionen":item.description)):"Ungeplant")+'</span></span>';
 byId("day-card").setAttribute("aria-label",(meal==="lunch"?"Mittagessen: ":"Abendessen: ")+item.title+(item.real?", Rezept ansehen":", Menü bearbeiten"));
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
   ?"Rezepte konnten nicht geladen werden. Prüfe die Verbindung und lade die Seite neu."
   :"Rezepte werden geladen …")+'</p>';
  return;
 }
 const all=filterArchive(state.archiveEntries,{query:state.query,filter:state.filter,favorites:state.favorites,sort:state.sort,duration:state.duration});
 const searching=Boolean(state.query.trim());
 grid.classList.toggle("search-suggestions",searching);
 grid.innerHTML=searching
  ?(all.length?all.map(item=>'<button type="button" class="archive-suggestion" data-recipe="'+escapeHtml(item.id)+'">'+
     searchThumbnail(item)+'<span><strong>'+escapeHtml(item.title)+'</strong><small>'+item.minutes+' Min. · Rezept'+'</small></span></button>').join("")
     :'<p class="empty-message">Keine passenden Rezepte gefunden.</p>')
  :(all.length?all.map(item=>'<button type="button" class="archive-card" data-recipe="'+escapeHtml(item.id)+'">'+
     (item.image?'<img src="'+escapeHtml(item.image)+'" alt="" loading="lazy">':
      '<span class="archive-image-placeholder" aria-hidden="true"><span>Rezeptbild folgt</span></span>')+
     '<span class="archive-caption"><strong>'+escapeHtml(item.title)+'</strong><small>'+item.minutes+' Min. · Rezept'+
     (state.favorites.has(item.id)?' ♡':'')+'</small></span></button>').join(""):'<p>Keine Rezepte gefunden.</p>');
 grid.querySelectorAll("[data-recipe]").forEach(btn=>btn.addEventListener("click",()=>{
  const item=state.archiveEntries.find(recipe=>recipe.id===btn.dataset.recipe);
  if(item)openRecipe(item);
 }));
 document.querySelectorAll(".filter-chip").forEach(btn=>btn.classList.toggle("active",btn.dataset.filter===state.filter));
}
function updatePlanNotice(error=null){
 const details=byId("plan-review"),summary=byId("plan-review-summary"),list=byId("plan-status");
 const issues=error?[]:assessPlan(state.plan,state.recipes).issues;
 details.hidden=!error&&issues.length===0;
 if(details.hidden){details.open=false;list.replaceChildren();return}
 if(error){
  details.open=true;summary.textContent="Der Menüplan konnte nicht geladen werden";
  list.textContent=error;return;
 }
 summary.textContent=issues.length+" ältere oder unvollständige Menüeinträge prüfen";
 list.innerHTML=issues.map(issue=>{
  const key=String(issue.key??""),[date,meal]=key.split("|");
  const canEdit=/^\d{4}-\d{2}-\d{2}$/.test(date)&&["lunch","dinner"].includes(meal);
  const label=canEdit?date.slice(8)+"."+date.slice(5,7)+"."+date.slice(0,4)+" · "+(meal==="lunch"?"Mittagessen":"Abendessen"):key;
  return '<div class="plan-review-row"><span><strong>'+escapeHtml(label)+'</strong> · '+escapeHtml(issue.message)+'</span>'+
   (canEdit?'<button type="button" data-review-key="'+escapeHtml(key)+'">Prüfen</button>':'')+'</div>';
 }).join("");
}
let account;
let householdDirty=false,settingsRevision=null,sessionEpoch=0;
function disableFormWhileSaving(form){
 const controls=[...form.querySelectorAll("input,select,button")],disabled=controls.map(control=>control.disabled);
 controls.forEach(control=>{control.disabled=true});form.setAttribute("aria-busy","true");
 return ()=>{controls.forEach((control,index)=>{control.disabled=disabled[index]});form.removeAttribute("aria-busy")};
}
async function persistPlan(key){
 if(state.archiveStatus!=="ready")throw Error("Bitte lade zuerst alle Rezepte.");
 if(state.planBlocked)throw Error("Bitte stelle zuerst den ursprünglichen Plan wieder her.");
 if(cloudEnabled) await account.saveMeal(key,state.plan.entries[key]??null,state.editorRevisions?.[key]??"0");
 else storePlan(localStorage,state.plan);
 renderPlanner();
 updatePlanNotice();
 if(state.tab==="shopping")renderShopping();
}
function openMealEditor(date,meal="dinner",recipeId=null){
 if(cloudEnabled&&state.planBlocked)return;
 state.editorRevisions={...state.revisions};
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
 byId("meal-reload").hidden=true;
 updateMealEditorFields();
}
function renderMealRecipeOptions(){
 const query=byId("meal-recipe-search").value.trim().toLocaleLowerCase("de-CH");
 const selected=byId("meal-recipe").value;
 const current=state.archiveEntries.find(item=>item.id===selected);
 byId("meal-recipe-selected").textContent=current?current.title:"Bitte ein Rezept wählen";
 byId("meal-recipe-options").hidden=false;
 const matching=state.archiveEntries.filter(item=>item.title.toLocaleLowerCase("de-CH").includes(query));
 byId("meal-recipe-options").innerHTML=matching.length?matching.map(item=>
  '<button type="button" role="option" aria-selected="'+(item.id===selected)+'" data-pick-recipe="'+escapeHtml(item.id)+'">'+
  searchThumbnail(item)+'<span>'+escapeHtml(item.title)+'<small>'+item.minutes+' Min.</small></span></button>').join(""):'<p>Keine Rezepte gefunden</p>';
}
// Presentation adapters only: all writes still pass through updateMeal.
function portionNote(){
 const recipe=state.recipes[byId("meal-recipe").value];
 byId("meal-portion-note").textContent=state.household?"Vorschlag gemäss deinen Haushaltseinstellungen. Du kannst die Menge anpassen.":recipe?"Kein Haushalt erfasst. Vorschlag: "+recipe.baseServings+" Portionen gemäss Rezept. Erfasse deinen Haushalt in den Einstellungen.":"Wähle ein Rezept oder erfasse deinen Haushalt in den Einstellungen.";
}
function suggestMealPortions(){
 const id=byId("meal-recipe").value;
 let need;try{need=householdNeed(state.household,state.recipeShares[id]||{})}catch{need=state.recipes[id]?.baseServings??""}
 byId("meal-consumed").value=need;byId("meal-servings").value=need;reflectMealPortions();
}
function reflectMealPortions(){
 const consumed=parseDecimal(byId("meal-consumed").value),cooked=parseDecimal(byId("meal-servings").value);
 byId("meal-need").value=decimalText(consumed);
 const extra=Number.isFinite(consumed)&&Number.isFinite(cooked)?Math.max(0,cooked-consumed):0;
 byId("meal-extra").value=decimalText(extra);byId("meal-extra-enabled").checked=extra>0;
 byId("meal-extra-line").hidden=extra<=0;
 byId("meal-total").textContent=Number.isFinite(cooked)?"Kochmenge: "+decimalText(cooked)+" Portionen":"Bitte gib die Portionszahl ein";portionNote();
}
function syncMealPortions(){
 const need=parseDecimal(byId("meal-need").value),enabled=byId("meal-extra-enabled").checked;
 const extra=enabled?parseDecimal(byId("meal-extra").value):0;
 byId("meal-extra-line").hidden=!enabled;
 byId("meal-consumed").value=decimalText(need);
 const valid=Number.isFinite(need)&&Number.isFinite(extra)&&need>0&&extra>=0;
 byId("meal-servings").value=valid?decimalText(need+extra):"";
 byId("meal-total").textContent=valid?"Kochmenge: "+decimalText(need+extra)+" Portionen":"Bitte gib eine gültige Portionszahl ein";
}
function renderSourceChoices(){
 const target=mealKey(state.editingDate,byId("meal-type").value),plan=structuredClone(state.plan);
 delete plan.entries[target]; // Editing a reservation must release its own portions for the picker.
 const {balances,issues}=assessPlan(plan,state.recipes);
 const order=k=>k.slice(0,10)+(k.endsWith("|lunch")?"0":"1");
 const selected=byId("meal-leftover-source").value+"|"+byId("meal-leftover-source-meal").value;
 const sources=Object.entries(balances).filter(([key,b])=>order(key)<order(target)&&b.available>0&&!issues.some(i=>i.key===key));
 byId("meal-source-choice").innerHTML='<option value="">Resten auswählen</option>'+sources.map(([key,b])=>'<option value="'+escapeHtml(key)+'">'+escapeHtml(mealKeyLabel(key)+' · '+state.recipes[plan.entries[key].recipeId].title+' · '+b.available+' frei')+'</option>').join('');
 byId("meal-source-choice").value=sources.some(([key])=>key===selected)?selected:"";
}
function focusRecipeStart(){
 const dialog=byId("recipe-dialog"),scroll=dialog.querySelector(".dialog-scroll");
 dialog.focus({preventScroll:true});
 scroll.scrollTop=0;
 // Safari can restore a previous scroll offset during the modal's opening frame.
 requestAnimationFrame(()=>{if(dialog.open)scroll.scrollTop=0});
}
function setCookingMode(active){
 byId("recipe-dialog").classList.toggle("is-cooking",active);
 byId("cooking-exit").hidden=!active;
 byId("dialog-close").hidden=active;
 byId("dialog-favourite").hidden=active;
 byId("dialog-ingredients-section").open=!active;
 focusRecipeStart();
}
function renderMealBalance(){
 let key=mealKey(state.editingDate,byId("meal-type").value);
 if(byId("meal-kind").value==="leftover"){
  try{key=mealKey(byId("meal-leftover-source").value,byId("meal-leftover-source-meal").value)}
  catch{byId("meal-balance").textContent="Wähle das Datum und die Mahlzeit, von der die Resten stammen.";return}
 }
 const balance=assessPlan(state.plan,state.recipes).balances[key];
 byId("meal-balance").textContent=balance?"Gekocht: "+balance.cooked+" · Verzehrt: "+(balance.consumed??"bitte klären")+" · Reserviert: "+balance.reserved+" · Verfügbar: "+(balance.available??"bitte klären"):"Für diese Mahlzeit ist keine Kochmenge erfasst.";
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
async function saveMealEditor(event){
 event.preventDefault();
 const date=byId("meal-date").value,meal=byId("meal-type").value;
 state.editingDate=date;
 const kind=byId("meal-kind").value;
 if(state.savingMeal)return;
 state.savingMeal=true;
 const epoch=sessionEpoch;
 const enableForm=disableFormWhileSaving(byId("meal-form"));
 const previousPlan=state.plan;
 try{
  const key=mealKey(date,meal);
  if(kind==="none")state.plan=updateMeal(state.plan,key,null,state.recipes);
  else{
   let entry;
   if(kind==="recipe"&&!state.recipes[byId("meal-recipe").value])throw Error("Bitte wähle ein gültiges Rezept.");
   if(kind==="recipe"&&(!Number.isFinite(parseDecimal(byId("meal-servings").value))||!Number.isFinite(parseDecimal(byId("meal-consumed").value))))throw Error("Bitte gib eine gültige Portionszahl ein. Punkt und Komma sind möglich.");
   if(kind==="recipe")entry={type:"recipe",recipeId:byId("meal-recipe").value,cookedServings:parseDecimal(byId("meal-servings").value),consumedServings:parseDecimal(byId("meal-consumed").value)};
   if(kind==="manual")entry={type:"manual",title:byId("meal-manual").value.trim()};
   if(kind==="leftover"){
    const sourceDate=byId("meal-leftover-source").value;
    entry={type:"leftover",sourceKey:mealKey(sourceDate,byId("meal-leftover-source-meal").value),portions:parseDecimal(byId("meal-leftover-portions").value)};
   }
   state.plan=updateMeal(state.plan,key,entry,state.recipes);
  }
  await persistPlan(key);
  if(epoch!==sessionEpoch)return;
  byId("meal-editor").close();
 }catch(err){
  if(epoch!==sessionEpoch)return;
  state.plan=previousPlan;
  byId("meal-editor-error").hidden=false;
  byId("meal-editor-error").textContent=err.message;
  byId("meal-reload").hidden=!cloudEnabled;
  byId("meal-editor-error").scrollIntoView({block:"nearest"});
 }finally{state.savingMeal=false;enableForm()}
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
 if(state.planBlocked||state.archiveStatus!=="ready")throw Error("Lade zuerst den Plan und die Rezepte oder stelle die Daten wieder her.");
 return buildTransferManifest(state.plan,state.recipes,state.shopping.from,state.shopping.to,{
  includeOptional:byId("shopping-optional").checked,extras:state.extras,
  publicRecipeUrl:recipe=>!recipe.householdRecipe&&recipe.slug?"https://zefad3v.github.io/wachochemer/rezepte/"+encodeURIComponent(recipe.slug)+"/":null
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
 byId("bring-imports").innerHTML=totals.cooking.map(row=>'<p>'+escapeHtml(mealKeyLabel(row.mealKey)+" · "+row.title+" · "+row.cookedServings+" Portionen")+(row.officialImport?' <a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(row.officialImport.importUrl)+'">Einzelrezept in Bring! öffnen</a>':' · Kein Einzelimport verfügbar')+'</p>').join("");
 byId("bring-warnings").textContent=totals.warnings.map(x=>(mealKeyLabel(x.key)||state.names[x.key]||x.key)+": "+x.message).join("\n");
 const days=new Set(datesBetween(from,to));
 const extras=state.extras.filter(x=>days.has(x.date));
 byId("shopping-progress").textContent=items.length+" Rezeptzutaten · "+extras.length+" Zusatzartikel";
 const rows=items.length?items.map(row=>{
  const label=state.names[row.ingredientId]||row.ingredientId;
  const unit=unitLabels[row.unit];
  const quantity=row.unit==="unspecified"?"Ohne Mengenangabe":row.quantity===null?"Nach Geschmack":moneyLike(Math.round(row.quantity*100)/100)+(row.quantityMax!=null?'–'+moneyLike(Math.round(row.quantityMax*100)/100):'')+(unit?" "+unit:"");
  return '<div class="shopping-row"><span class="shopping-name">'+escapeHtml(label)+'</span>'+
   '<span class="shopping-amount">'+escapeHtml(quantity)+'</span></div>';
 }).join(""):'<p class="empty-message">Keine Rezeptzutaten in diesem Zeitraum.</p>';
 const extraRows=extras.map(row=>'<div class="shopping-row"><span class="shopping-name">'+escapeHtml(row.title)+'</span>'+
  '<button type="button" class="remove-extra" data-remove-extra="'+escapeHtml(row.id)+'" aria-label="'+escapeHtml(row.title)+' entfernen">✕</button></div>').join("");
 byId("shopping-items").innerHTML='<section class="shopping-group"><h3>Für Bring! vorbereiten</h3>'+rows+'</section>'+
  (extraRows?'<section class="shopping-group"><h3>Zusätzliche Artikel</h3>'+extraRows+'</section>':'')+
  (skipped.length?'<p class="shopping-disclaimer">Bitte prüfe die Hinweise oben.</p>':'');
 byId("shopping-items").querySelectorAll("[data-remove-extra]").forEach(btn=>btn.addEventListener("click",async()=>{
  const epoch=sessionEpoch;
  const extras=state.extras.filter(x=>x.id!==btn.dataset.removeExtra);
  try{
   if(cloudEnabled)await saveSharedSettings({extras});
   else{state.extras=extras;save("wachochemer:shoppingExtras",state.extras)}
   if(epoch!==sessionEpoch)return;
   renderShopping();
  }catch(err){if(epoch===sessionEpoch)byId("shopping-copy-status").textContent=err.message}
 }));
}
function currentServings(recipe){
 if(state.recipeViewServings!==null)return state.recipeViewServings;
 if(state.plannedServings!==null)return state.plannedServings;
 const value=Number(state.servings[recipe.id]);
 return Number.isFinite(value)&&value>0&&value<=1000?value:recipe.baseServings;
}
function renderPortions(recipe){
 const count=currentServings(recipe),factor=count/recipe.baseServings;
 byId("portion-count").textContent=count+" "+(count===1?"Portion":"Portionen");
 byId("portion-minus").disabled=count<=0.5;
 byId("portion-plus").disabled=count>=1000;
 byId("dialog-meta").innerHTML='<span>◷ '+(recipe.totalMinutes??((recipe.prepMinutes||0)+(recipe.cookMinutes||0)))+' Min.</span>'+ (recipe?.activeMinutes!=null?'<span>'+recipe.activeMinutes+' Min. aktiv</span>':'')+'<span>♙ '+count+' '+(count===1?'Portion':'Portionen')+'</span>';
 byId("portion-session-note").hidden=state.plannedServings===null||count===state.plannedServings;
 const list=byId("dialog-ingredients");
 const checked=new Set([...list.querySelectorAll('input:checked')].map(el=>Number(el.dataset.index)));
 list.innerHTML=recipe.ingredients.map((row,i)=>'<li class="'+(checked.has(i)?'done':'')+'"><input type="checkbox" data-index="'+i+'" aria-label="'+escapeHtml(formatIngredient(row,factor))+'" id="ingredient-check-'+i+'"'+(checked.has(i)?' checked':'')+'><label for="ingredient-check-'+i+'">'+escapeHtml(formatIngredient(row,factor))+'</label></li>').join("");
 list.querySelectorAll('input').forEach(input=>input.addEventListener("change",()=>input.parentElement.classList.toggle("done",input.checked)));
}
function adjustPortions(delta){
 const id=state.activeRecipeId,recipe=state.recipes[id];
 if(!recipe)return;
 const next=Math.max(0.5,Math.min(1000,currentServings(recipe)+delta));
 state.recipeViewServings=next;
 if(state.plannedServings===null){
  state.servings[id]=next;
  save("wachochemer:recipeServings",state.servings);
 }
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
 state.recipeViewServings=null;
 byId("cooking-exit").hidden=true;
 byId("dialog-close").hidden=false;
 byId("dialog-favourite").hidden=false;
 byId("dialog-ingredients-section").open=true;
 byId("recipe-dialog").classList.remove("is-cooking");
 const dialog=byId("recipe-dialog");
 previouslyFocused=document.activeElement;
 const image=byId("dialog-image");
 byId("dialog-hero").hidden=!item.image;
 if(item.image)image.src=item.image;
 else image.removeAttribute("src");
 byId("dialog-category").textContent=recipe?(recipe.householdRecipe?"HAUSHALTSREZEPT":(item.imageGenerated?"STARTREZEPT · KI-BILD":"STARTREZEPT")):"REZEPT NICHT VERFÜGBAR";
 byId("dialog-title").textContent=recipe?.title||item.title;
 byId("dialog-description").textContent=recipe?.description||item.description;
 byId("dialog-meta").innerHTML='<span>◷ '+(recipe?(recipe.totalMinutes??((recipe.prepMinutes||0)+(recipe.cookMinutes||0))):item.minutes)+' Min.</span>'+ (recipe?.activeMinutes!=null?'<span>'+recipe.activeMinutes+' Min. aktiv</span>':'')+'<span>♙ '+(recipe?.baseServings||3)+' Portionen</span>';
 byId("dialog-favourite").textContent=state.favorites.has(item.id)?"♥":"♡";
 byId("dialog-favourite").classList.toggle("liked",state.favorites.has(item.id));
 byId("dialog-favourite").dataset.id=item.id;
 const actions=byId("dialog-actions");
 if(recipe){
  const live="https://zefad3v.github.io/wachochemer/rezepte/"+encodeURIComponent(recipe.slug)+"/";
  actions.innerHTML='<button class="main-action" type="button" id="jump-to-ingredients">Kochmodus starten</button>'+
  (recipe.householdRecipe?'':'<a class="bring-action" href="'+live+'" target="_blank" rel="noopener noreferrer" aria-label="Bring! Import auf der veröffentlichten Rezeptseite öffnen" title="Bring! öffnet die Rezeptseite. Die gewählte Portionszahl dort nochmals einstellen.">'+bringIcon()+'</a>');
  if(recipe.householdRecipe){
   const row=state.recipeRows.find(r=>'haushalt-'+r.id===item.id);
   const edit=document.createElement('button');edit.type='button';edit.className='plan-recipe-action';edit.textContent='Rezept bearbeiten';
   edit.onclick=()=>{closeRecipe();editor.open(row)};actions.append(edit);
  }
  byId("jump-to-ingredients").addEventListener("click",()=>setCookingMode(true));
  const planBtn=document.createElement("button");
  planBtn.type="button";
  planBtn.className="plan-recipe-action";
  planBtn.textContent="Zum Wochenplan hinzufügen";
  if(!item.planned)actions.append(planBtn);
  planBtn.addEventListener("click",()=>{
   closeRecipe();
   openMealEditor(weekDays()[state.current].date,displayedMeal(),recipe.id);
  });
  byId("dialog-portion-picker").hidden=false;
  byId("ingredients-summary").textContent="Zutaten ("+recipe.ingredients.length+")";
  byId("dialog-ingredients").innerHTML="";
  renderPortions(recipe);
  const steps=recipe.instructions?.["de-CH"]||[];
  byId("dialog-instructions").innerHTML=steps.map(step=>'<li>'+escapeHtml(step)+'</li>').join("");
  byId("dialog-ingredients-section").hidden=false;
  byId("dialog-instructions-section").hidden=false;
 }else{
  byId("dialog-portion-picker").hidden=true;
  byId("portion-session-note").hidden=true;
  actions.innerHTML='<div class="notice">'+(item.real?'Dieses Rezept ist zurzeit nicht verfügbar. Bitte lade die Seite neu.':'Das vollständige Rezept fehlt noch im Kochbuch.')+'</div>';
  byId("dialog-ingredients-section").hidden=true;
  byId("dialog-instructions-section").hidden=true;
 }
 dialog.querySelector(".dialog-scroll").scrollTop=0;
 dialog.showModal();
 focusRecipeStart();
}
function closeRecipe(){byId("recipe-dialog").close();resetRecipeSession();previouslyFocused?.focus({preventScroll:true})}
function resetRecipeSession(){
 state.recipeViewServings=null;
 state.plannedServings=null;
}
async function fetchJson(path){
 const response=await fetch(path,{cache:"no-store"});
 if(!response.ok)throw new Error(path+" returned "+response.status);
 return response.json();
}
function setRecipeCatalog(rows){
 const recipes=[...publicRecipes],names={...publicNames};
 for(const row of rows){
  const custom=householdRecipe(row,publicNames);
  recipes.push(custom.recipe);Object.assign(names,custom.names);
 }
 state.names=names;
 state.recipes=Object.fromEntries(recipes.map(recipe=>[recipe.id,recipe]));
 state.archiveEntries=archiveEntries(recipes,archiveImages).map(item=>({...item,...imageFor(item.id),image:item.image||imageFor(item.id).image}));
}
async function loadRecipes(){
 try{
  const {catalog,recipes}=await fetchArchiveData(fetchJson);
  publicNames=Object.fromEntries(catalog.ingredients.map(x=>[x.id,x.names["de-CH"]]));
  publicRecipes=recipes;setRecipeCatalog([]);
  state.archiveStatus="ready";
  const loaded=cloudEnabled?{plan:{version:2,entries:{}},error:null}:loadPlan(localStorage);
  state.planBlocked=cloudEnabled||!!loaded.error;
  if(loaded.plan)state.plan=loaded.plan;
  updatePlanNotice(loaded.error);
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

function lockSharedPlan(){
 sessionEpoch++;
 state.recipeRows=[];setRecipeCatalog([]);
 byId("new-house-recipe").hidden=true;
 byId("recipe-grid").replaceChildren();
 state.planBlocked=true;state.plan={version:2,entries:{}};state.revisions={};
 state.householdId=null;
 state.household=null;state.recipeShares={};state.extras=[];
 householdDirty=false;settingsRevision=null;
 for(const dialog of document.querySelectorAll("dialog[open]"))dialog.close();
 for(const input of byId("household-form").querySelectorAll("input"))input.value="";
 byId("household-total").textContent="";byId("household-status").textContent="";
 byId("shopping-items").replaceChildren();
 renderPlanner();
}
function applySharedSnapshot(snapshot){
 Object.assign(state,snapshot);
 setRecipeCatalog(snapshot.recipeRows);
 byId("new-house-recipe").hidden=false;
 if(state.tab==="archive")renderArchive();
 state.planBlocked=false;
 if(!householdDirty){
  for(const field of ["adults","children","babies","adultsShare","childrenShare","babiesShare"])
   byId("household-"+field).value=state.household[field];
  byId("household-form").dispatchEvent(new Event("household-refresh"));
  settingsRevision=state.householdRevision;
 }
 renderPlanner();updatePlanNotice();
 if(state.tab==="shopping")renderShopping();
}
async function saveSharedSettings(changes,revision=state.householdRevision){
 const household={...state.household,...changes.household};
 await account.saveSettings({...household,recipeShares:changes.recipeShares??state.recipeShares,extras:changes.extras??state.extras},revision);
}
async function importLocalPlan(shared){
 const loaded=loadPlan(localStorage);
 if(loaded.error)throw Error(loaded.error);
 const issues=assessPlan(loaded.plan,state.recipes).issues;
 if(issues.length)throw Error("Prüfe vor dem Import die offenen Angaben zu Portionen und Resten im lokalen Plan.");
 if(!Object.keys(loaded.plan.entries).length)throw Error("Auf diesem Gerät ist kein lokaler Plan vorhanden.");
 const key="wachochemer:import:"+shared.id;
 let id=localStorage.getItem(key);
 if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}
 await shared.importPlan(loaded.plan.entries,id);
}

function bindHouseholdForm(){
 const form=byId("household-form"),total=byId("household-total"),status=byId("household-status");
 const groups=["adults","children","babies"];
 const countInput=group=>byId("household-"+group);
 const shareInput=group=>byId("household-"+group+"Share");
 const portionLabel=need=>new Intl.NumberFormat("de-CH",{maximumFractionDigits:12,useGrouping:false}).format(need)+(need===1?" Portion":" Portionen")+" pro Mahlzeit";
 function readForm(){
  const profile={};
  for(const group of groups){
   profile[group]=countInput(group).valueAsNumber;
   profile[group+"Share"]=parseDecimal(shareInput(group).value);
  }
  return profile;
 }
 function showTotal(){
  try{total.textContent=portionLabel(householdNeed(readForm()))}
  catch{total.textContent="Bitte gib die Personenzahl und die Portionen an."}
 }
 function onEdit(){
  if(!householdDirty)settingsRevision=state.householdRevision;
  householdDirty=true;status.textContent="";showTotal();
 }
 form.addEventListener("household-refresh",showTotal);
 for(const group of groups){
  countInput(group).value=state.household?.[group]??0;
  const defaultShare=group==="adults"||(!state.household&&group==="children")?1:0;
  const input=shareInput(group);
  input.value=state.household?.[group+"Share"]??defaultShare;
  input.addEventListener("blur",()=>{
   const value=parseDecimal(input.value);
   if(Number.isFinite(value))input.value=decimalText(value);
  });
 }
 for(const button of form.querySelectorAll("[data-count]"))button.addEventListener("click",()=>{
  const input=countInput(button.dataset.count);
  const next=Math.trunc(input.valueAsNumber||0)+Number(button.dataset.step);
  input.value=Math.max(0,Math.min(100,next));
  onEdit();
 });
 form.addEventListener("input",onEdit);
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(form.getAttribute("aria-busy")==="true")return;
  const enableForm=disableFormWhileSaving(form);
  const epoch=sessionEpoch;
  try{
   const profile=readForm();
   householdNeed(profile);
   if(cloudEnabled)await saveSharedSettings({household:profile},settingsRevision??state.householdRevision);
   else if(!save("wachochemer:household",profile))throw Error("Speichern fehlgeschlagen.");
   if(epoch!==sessionEpoch)return;
   householdDirty=false;
   state.household={...state.household,...profile};
   settingsRevision=state.householdRevision;
   status.textContent="Gespeichert.";
   byId("household-reload").hidden=true;
  }catch(err){if(epoch===sessionEpoch){status.textContent=err.message;if(err.code==="40001")byId("household-reload").hidden=false}}
  finally{enableForm()}
 });
 showTotal();
}
function init(){
 editor=recipeEditor({account:()=>account,household:()=>state.householdId,
  findRow:id=>state.recipeRows?.find(r=>r.id===id),
  findSource:source=>state.recipeRows?.find(r=>r.draft.source===source),
  onSaved:(id,refreshed)=>{showTab("archive");byId("archive-status").textContent=(id?"Rezept gespeichert.":"Rezept gelöscht.")+(refreshed?"":" Lade die Seite neu, um den aktuellen Stand zu sehen.");}});
 byId("new-house-recipe").onclick=()=>editor.open();
 byId("plan-status").addEventListener("click",event=>{
  const button=event.target.closest("[data-review-key]");
  if(!button)return;
  const [date,meal]=button.dataset.reviewKey.split("|");
  showTab("week");openMealEditor(date,meal);
 });
 for(const id of ["meal-need","meal-extra","meal-servings","meal-consumed","meal-leftover-portions","recipe-child-share"]){
  byId(id).addEventListener("blur",()=>{
   const value=parseDecimal(byId(id).value);
   if(Number.isFinite(value))byId(id).value=decimalText(value);
  });
 }
 for(const id of ["meal-need","meal-extra","meal-extra-enabled"])byId(id).addEventListener("input",syncMealPortions);
 for(const id of ["meal-servings","meal-consumed"])byId(id).addEventListener("input",reflectMealPortions);
 for(const [id,delta] of [["meal-minus",-0.5],["meal-plus",0.5]])byId(id).addEventListener("click",()=>{byId("meal-need").value=decimalText(Math.max(0,Math.min(1000,(parseDecimal(byId("meal-need").value)||0)+delta)));syncMealPortions()});
 byId("meal-source-choice").addEventListener("change",e=>{const [date,meal]=e.target.value.split("|");byId("meal-leftover-source").value=date||"";byId("meal-leftover-source-meal").value=meal||"";renderMealBalance()});
 byId("meal-date").addEventListener("change",()=>{if(byId("meal-date").value){state.editingDate=byId("meal-date").value;renderSourceChoices()}});
 byId("cooking-exit").addEventListener("click",()=>setCookingMode(false));
 for(const id of ["meal-leftover-source","meal-leftover-source-meal"])byId(id).addEventListener("change",renderMealBalance);
 byId("shopping-optional").addEventListener("change",renderShopping);
 byId("shopping-manifest").addEventListener("click",()=>{
  try{
   if(state.planBlocked)throw Error("Bitte stelle zuerst den Plan wieder her.");
   const blob=new Blob([serializeManifest(transferManifest())],{type:"application/json"});
   const url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="wachochemer-bring-"+state.shopping.from+"-"+state.shopping.to+".json";link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   byId("shopping-copy-status").textContent="Exportdatei vorbereitet. Du kannst sie jetzt für den Einkauf verwenden.";
  }catch(err){byId("shopping-copy-status").textContent=err.message}
 });

 byId("plan-restore").addEventListener("click",async()=>{
  if(cloudEnabled)return;
  try{state.plan=restorePlan(localStorage);state.planBlocked=false;await persistPlan();byId("plan-restore").hidden=true}
  catch(err){updatePlanNotice(err.message)}
 });
 bindHouseholdForm();
 byId("household-reload").hidden=true;
 byId("household-reload").addEventListener("click",async()=>{
  if(householdDirty&&!confirm("Ungespeicherte Einstellungen verwerfen und den aktuellen Stand laden?"))return;
  householdDirty=false;
  try{await account.refresh();byId("household-status").textContent="Aktueller Stand geladen.";byId("household-reload").hidden=true}
  catch(err){byId("household-status").textContent=err.message}
 });
 byId("meal-reload").addEventListener("click",async()=>{
  if(!confirm("Diesen Entwurf verwerfen und den aktuellen Stand laden?"))return;
  try{await account.refresh();state.editorRevisions={...state.revisions};loadMealEditor()}
  catch(err){byId("meal-editor-error").textContent=err.message}
 });
 byId("recipe-share-save").addEventListener("click",async()=>{
  const epoch=sessionEpoch;
  try{
   const id=byId("meal-recipe").value;if(!state.recipes[id])throw Error("Wähle zuerst ein Rezept.");
   const share=parseDecimal(byId("recipe-child-share").value);portion(share,true);
   const next={...state.recipeShares,[id]:{childrenShare:share}};
   if(cloudEnabled)await saveSharedSettings({recipeShares:next});
   else if(!save("wachochemer:recipeShares",next))throw Error("Speichern fehlgeschlagen.");
   if(epoch!==sessionEpoch)return;
   state.recipeShares=next;
   const need=householdNeed(state.household,next[id]);byId("meal-consumed").value=need;byId("meal-servings").value=need;reflectMealPortions();
  }catch(err){if(epoch===sessionEpoch){byId("meal-editor-error").hidden=false;byId("meal-editor-error").textContent=err.message}}
 });

 const days=weekDays();
 const now=new Date();
 const match=days.findIndex(x=>x.date.toDateString()===now.toDateString());
 state.current=match>=0?match:0;
 document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>showTab(btn.dataset.tab)));
 byId("week-prev").addEventListener("click",()=>setWeekOffset(-1));
 byId("week-next").addEventListener("click",()=>setWeekOffset(1));
 byId("plan-next-week").addEventListener("click",()=>{
  state.weekOffset=1;state.current=0;
  plannerView="week";viewPreferences[currentClass]=plannerView;
  save("wachochemer:plannerViews",viewPreferences);
  renderPlanner();
  byId("week-range").focus({preventScroll:true});
 });
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
   byId("meal-editor-error").textContent="Bitte wähle ein gültiges Datum.";
  }
 });
 byId("meal-editor-close").addEventListener("click",()=>byId("meal-editor").close());
 byId("meal-form").addEventListener("submit",saveMealEditor);
 byId("meal-type").addEventListener("change",()=>{if(!state.editorRecipeId)loadMealEditor()});
 byId("meal-kind").addEventListener("change",updateMealEditorFields);
 byId("meal-remove").addEventListener("click",async()=>{
  if(state.savingMeal)return;state.savingMeal=true;
  const epoch=sessionEpoch;
  const enableForm=disableFormWhileSaving(byId("meal-form"));
  const key=mealKey(state.editingDate,byId("meal-type").value),previous=state.plan.entries[key];
  const oldPlan=state.plan;
  try{state.plan=updateMeal(state.plan,key,null,state.recipes);await persistPlan(key);if(epoch===sessionEpoch)byId("meal-editor").close()}
  catch(err){
   if(epoch!==sessionEpoch)return;
   state.plan=oldPlan;
   byId("meal-editor-error").hidden=false;byId("meal-editor-error").textContent=err.message;
   byId("meal-reload").hidden=!cloudEnabled;
  }finally{state.savingMeal=false;enableForm()}
 });
 for(const id of ["shopping-from","shopping-to"]){
  byId(id).addEventListener("change",()=>changeShoppingRange(byId("shopping-from").value,byId("shopping-to").value));
 }
 byId("shopping-copy").addEventListener("click",async()=>{
  const status=byId("shopping-copy-status");
  try{
   if(!navigator.clipboard?.writeText)throw Error("Die Zwischenablage ist in diesem Browser nicht verfügbar");
   await navigator.clipboard.writeText(shoppingTransferText());
   status.textContent="Zutaten kopiert. Übernimm sie jetzt in deine Bring!-Liste.";
  }catch(err){
   status.textContent="Kopieren fehlgeschlagen: "+err.message;
  }
 });
 byId("shopping-seven").addEventListener("click",()=>{const w=shoppingWindow(localToday());changeShoppingRange(w.from,w.to)});
 byId("shopping-following").addEventListener("click",()=>{const from=addDays(state.shopping.to,1);changeShoppingRange(from,addDays(from,6))});
 byId("shopping-plan-week").addEventListener("click",()=>{
  const days=weekDays();
  const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  changeShoppingRange(local(days[0].date),local(days[6].date));
 });
 byId("shopping-add-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const epoch=sessionEpoch;
  const input=byId("shopping-extra"),title=input.value.trim();
  if(!title)return;
  const extras=[...state.extras,{id:crypto.randomUUID(),date:state.shopping.from,title}];
  try{
   if(cloudEnabled)await saveSharedSettings({extras});
   else{state.extras=extras;save("wachochemer:shoppingExtras",extras)}
   if(epoch!==sessionEpoch)return;
   input.value="";renderShopping();
  }catch(err){if(epoch===sessionEpoch)byId("shopping-copy-status").textContent=err.message}
 });
 const shell=byId("day-card");
 let startX=0,startY=0,tracking=false;
 shell.addEventListener("touchstart",e=>{tracking=e.touches.length===1;if(tracking){lastSwipeAt=0;startX=e.touches[0].clientX;startY=e.touches[0].clientY}},{passive:true});
 shell.addEventListener("touchmove",e=>{if(e.touches.length!==1)tracking=false},{passive:true});
 shell.addEventListener("touchend",e=>{
  if(!tracking)return;tracking=false;
  const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
  const direction=swipeDirection(dx,dy);
  if(direction){lastSwipeAt=Date.now();state.selectedMeal=direction>0?"dinner":"lunch";renderPlanner()}
 },{passive:true});
 shell.addEventListener("touchcancel",()=>{tracking=false;lastSwipeAt=0});
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
 for(const [id,key] of [["archive-sort","sort"],["archive-duration","duration"]])byId(id).addEventListener("change",event=>{state[key]=event.target.value;renderArchive()});
 byId("recipe-search").addEventListener("input",e=>{state.query=e.target.value;renderArchive()});
 const filters=[["all","Alle"],["favorites","Favoriten"],["household","Haushalt"],["starter","Startrezepte"]];
 byId("recipe-filters").innerHTML=filters.map(([id,label])=>'<button type="button" class="filter-chip'+(id===state.filter?' active':'')+'" data-filter="'+id+'">'+label+'</button>').join("");
 byId("recipe-filters").addEventListener("click",e=>{const target=e.target.closest("[data-filter]");if(!target)return;state.filter=target.dataset.filter;renderArchive()});
 byId("start-day").value=String(state.startDay);
 byId("start-day").addEventListener("change",e=>{state.startDay=Number(e.target.value);save("wachochemer:weekstart",state.startDay);state.current=0;state.weekOffset=0;renderPlanner()});
 byId("portion-minus").addEventListener("click",()=>adjustPortions(-0.5));
 byId("portion-plus").addEventListener("click",()=>adjustPortions(0.5));
 byId("dialog-close").addEventListener("click",closeRecipe);
 byId("recipe-dialog").addEventListener("close",resetRecipeSession);
 byId("recipe-dialog").addEventListener("click",e=>{if(e.target===byId("recipe-dialog"))closeRecipe()});
 byId("dialog-favourite").addEventListener("click",()=>{
  const id=byId("dialog-favourite").dataset.id;
  if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);
  save("wachochemer:favorites",[...state.favorites]);
  byId("dialog-favourite").textContent=state.favorites.has(id)?"♥":"♡";
  byId("dialog-favourite").classList.toggle("liked",state.favorites.has(id));
  if(state.tab==="archive")renderArchive();
 });
 showTab("week");
 loadRecipes().then(async()=>{
  if(cloudEnabled)account=await startAccount({onSnapshot:applySharedSnapshot,onLock:lockSharedPlan,onImport:importLocalPlan});
  else{byId("account-startup").hidden=true;byId("app").hidden=false;}
 });
}
if(cloudEnabled)document.getElementById("app").hidden=true;
init();


// WebKit can retain the document offset after dismissing a modal keyboard.
if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) {
 function restoreDocumentOrigin(){
  requestAnimationFrame(()=>{
   if(document.querySelector("dialog[open]"))return;
   window.scrollTo({top:0,left:0,behavior:"instant"});
  });
 }
 document.querySelectorAll("dialog").forEach(dialog=>dialog.addEventListener("close",restoreDocumentOrigin));
 window.visualViewport?.addEventListener("resize",()=>{
  if(window.visualViewport.scale===1 &&
     Math.abs(window.visualViewport.height-window.innerHeight)<2)restoreDocumentOrigin();
 });
}


// Show installation guidance only while running in the browser.
const installedMode=matchMedia("(display-mode: standalone)");
function updateInstallHelp(){
 byId("install-help").hidden=installedMode.matches || navigator.standalone === true;
}
if (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
 byId("install-help-text").textContent='Öffne die Seite in Safari. Tippe auf «Teilen», dann auf «Zum Home-Bildschirm» und «Hinzufügen».';
installedMode.addEventListener("change",updateInstallHelp);
updateInstallHelp();

const helpPages=[
 ["Woche planen","Tippe am Mittwoch auf «Nächste Woche planen». Wähle einen Tag und bearbeite das Menü über das Stiftsymbol. Alle im Haushalt sehen den gemeinsamen Plan."],
 ["Mittagessen und Abendessen","Wische auf der Tageskarte nach links zum Abendessen oder nach rechts zum Mittagessen. Du kannst die Mahlzeit auch unten antippen. Den Tag wählst du oben. In der installierten App kommst du aus Untermenüs zurück, indem du vom linken Rand nach rechts wischst."],
 ["Rezept und Kochmodus","Öffne ein Rezept im Kochbuch und tippe auf «Kochmodus starten». Dort kannst du Portionen anpassen, Zutaten abhaken und die Zubereitung Schritt für Schritt lesen."],
 ["Rezept erfassen","Tippe im Kochbuch auf das Plus neben der Suche. Erfasse dein Rezept von Hand oder importiere einen Link. Für kopierten Rezepttext kannst du die KI verwenden. Prüfe Zutaten, Portionen und Schritte in der Vorschau. Tippe auf «Im Haushalt speichern», um das Rezept mit deinem Haushalt zu teilen."],
 ["Gemeinsam planen","Unter «Einstellungen» findest du «Mitglieder und Einladungen». Sende eine Einladung oder teile den Link. Die eingeladene Person kann mit ihrem Konto dem Haushalt beitreten. Diese Hilfe findest du jederzeit in den Einstellungen."]
];
let helpPage=0;
function renderHelp(){
 byId("help-title").textContent=helpPages[helpPage][0];
 byId("help-content").textContent=helpPages[helpPage][1];
 byId("help-next").textContent=helpPage===helpPages.length-1?"Los geht’s":"Weiter";
}
function openHelp(){
 helpPage=0;renderHelp();byId("help-dialog").showModal();
}
byId("open-help").addEventListener("click",openHelp);
byId("help-close").addEventListener("click",()=>byId("help-dialog").close());
byId("help-next").addEventListener("click",()=>{
 if(helpPage===helpPages.length-1)byId("help-dialog").close();
 else{helpPage++;renderHelp()}
});
byId("help-dialog").addEventListener("close",()=>save("wachochemer:introSeen",true));
if(!readSaved("wachochemer:introSeen",false) && !cloudEnabled)openHelp();
const introObserver=new MutationObserver(()=>{
 if(!byId("app").hidden && !readSaved("wachochemer:introSeen",false) && !document.querySelector("dialog[open]"))openHelp();
});
introObserver.observe(byId("app"),{attributes:true,attributeFilter:["hidden"]});

// Installed apps have no Safari toolbar back control.
let backTouch=null;
document.addEventListener("touchstart",event=>{
 const touch=event.touches[0];
 backTouch=(installedMode.matches || navigator.standalone === true) &&
  event.touches.length===1 && touch.clientX<=48 &&
  !event.target.closest("input,select,textarea,button,a") ? {x:touch.clientX,y:touch.clientY} : null;
},{passive:true});
document.addEventListener("touchmove",event=>{if(event.touches.length!==1)backTouch=null},{passive:true});
document.addEventListener("touchcancel",()=>{backTouch=null},{passive:true});
document.addEventListener("touchend",event=>{
 const start=backTouch;backTouch=null;
 if(!start || !event.changedTouches.length)return;
 const touch=event.changedTouches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y;
 if(dx<70 || dx<Math.abs(dy)*1.5)return;
 const modal=document.querySelector("dialog[open]");
 if(modal){
  if(modal.id==="recipe-dialog")closeRecipe();
  else if(modal.id==="house-recipe-editor")byId("house-editor-close").click();
  else if(modal.id==="meal-editor")byId("meal-editor-close").click();
  else modal.close();
  return;
 }
 if(state.tab!=="settings")return;
 const task=byId("account-settings")?.querySelector(".account-task:not([hidden])");
 if(task)task.querySelector("button").click();
 else showTab(state.returnTab||"week");
},{passive:true});
