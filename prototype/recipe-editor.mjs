import {parseDecimal} from './locale-number.mjs';
import {canonicalSource,parseIngredient,unitLabels,validateDraft} from './household-recipes.mjs';

const el=id=>document.getElementById(id);
const blankIngredient=()=>({name:'',quantity:null,unit:'',optional:false});
const blank=()=>({title:'',description:'',baseServings:null,prepMinutes:null,cookMinutes:null,
  source:'',ingredients:[blankIngredient()],steps:[]});
const messages={
  source:'Dä Link wird nöd unterstützt. Füeg de Rezepttext fürs Iiläse mit KI ii.',
  no_recipe:'Kei vollständigs Rezept gfunde. Prüef de Link oder füeg de Rezepttext ii.',
  page:'D Rezeptsiite het kei lesbare Siite glieferet. Füeg de Rezepttext ii.',
  size:'D Siite isch z gross. Füeg de Rezepttext ii.',
  ai_setup:'D KI isch no nöd iigrichtet. Du chasch s Rezept vo Hand erfasse oder de Link iiläse.',
  limit:'S Importlimit für dä Haushalt isch hüt erreicht.',
  auth:'Bitte d Aameldig und de Haushalt prüefe.',
  ai_busy:'D KI isch grad usglaschtet oder s API-Guthabe längt nöd.',
  ai_failed:'D KI het s Rezept nöd chönne läse. Dini Iigabe bliibt da.'
};
export function recipeEditor({account,household,findRow,onSaved}) {
  const dialog=el('house-recipe-editor'),form=el('house-recipe-form'), fields=form.elements;
  const status=el('house-editor-status'),container=el('house-ingredients');
  let id,revision,target,preview,dirty=false,busy=false,generation=0;
  function ingredient(row) {
    const wrap=document.createElement('div');
    wrap.className='house-ingredient';
    wrap.innerHTML='<label>Zutat<input class="name" required maxlength="200"></label>'+
      '<div class="ingredient-measure"><label>Menge<input class="quantity" inputmode="decimal"></label>'+
      '<label>Einheit<select class="unit" required><option value="">Bitte wähle</option></select></label></div>'+
      '<div class="ingredient-footer"><label><input class="optional" type="checkbox"> Optional</label>'+
      '<button type="button">Entferne</button></div>';
    const name=wrap.querySelector('.name'),qty=wrap.querySelector('.quantity'),unit=wrap.querySelector('.unit');
    for(const [key,label] of Object.entries(unitLabels))unit.add(new Option(label,key));
    name.value=row.name; qty.value=row.quantity??''; unit.value=row.unit;
    wrap.querySelector('.optional').checked=!!row.optional;
    const toggle=()=>{qty.disabled=unit.value==='to_taste';qty.required=!qty.disabled;};
    toggle(); unit.addEventListener('change',toggle);
    wrap.querySelector('button').onclick=()=>{wrap.remove();dirty=true;};
    container.append(wrap);
    return name;
  }
  function edit(d) {
    fields.title.value=d.title; fields.description.value=d.description;
    fields.servings.value=d.baseServings??''; fields.prep.value=d.prepMinutes??'';
    fields.cook.value=d.cookMinutes??''; fields.steps.value=d.steps.join('\n');
    fields.source.value=d.source;container.replaceChildren();d.ingredients.forEach(ingredient);
    el('house-preview').hidden=true;el('house-editor-input').hidden=false;
  }
  function read() {
    return validateDraft({title:fields.title.value.trim(),description:fields.description.value.trim(),
      baseServings:fields.servings.valueAsNumber,prepMinutes:fields.prep.valueAsNumber,cookMinutes:fields.cook.valueAsNumber,
      source:canonicalSource(fields.source.value),steps:fields.steps.value.split(/\n/).map(x=>x.trim()).filter(Boolean),
      ingredients:Array.from(container.children,wrap=>{
        const unit=wrap.querySelector('.unit').value,qty=wrap.querySelector('.quantity').value.trim().replace(',','.');
        return {name:wrap.querySelector('.name').value.trim(),unit,quantity:unit==='to_taste'?null:parseDecimal(qty),
          optional:wrap.querySelector('.optional').checked};
      })});
  }
  function open(row=null) {
    generation++;busy=false;dirty=false;target=household();id=row?.id??crypto.randomUUID();revision=row?.revision??0;
    preview=null;edit(row?.draft??blank());el('house-import').hidden=!!row;el('house-import').open=false;
    el('house-import-url').value='';el('house-ai-text').value='';status.textContent='';
    el('house-reload-recipe').hidden=true;
    el('house-editor-title').textContent=row?'Rezept bearbeite':'Rezept erfasse';
    setBusy(false);if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
  }
  function setBusy(value){
    busy=value;
    for(const key of ['house-read-link','house-read-ai','house-save','house-reload-recipe'])el(key).disabled=value;
    el('house-editor-input').inert=value;el('house-revise').disabled=value;
  }
  function close(){
    if(!busy && (!dirty||confirm('Entwurf verwerfe?')))dialog.close();
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{generation++;preview=null;edit(blank());el('house-ai-text').value='';el('house-import-url').value='';});
  el('house-editor-close').onclick=close;
  form.addEventListener('input',()=>{dirty=true;});
  el('house-add-ingredient').onclick=()=>{dirty=true;ingredient(blankIngredient()).focus();};
  async function job(action) {
    if(busy || !target || target!==household())return;
    const turn=generation;setBusy(true);
    const active=()=>turn===generation && target===household() && dialog.open;
    try{await action(active);}catch(e){
      if(active()){
        status.textContent=messages[e.code] || (e.code==='23505'?'Dä Link isch im Haushalt scho als Rezept gspeicheret.':e.message);
        if(e.code==='40001')el('house-reload-recipe').hidden=false;
      }
    }finally{if(active())setBusy(false);}
  }
  function fromSource(mode) {
    if(dirty && !confirm('Entwurf mit em Import ersetze?'))return;
    job(async active=>{
      const url=canonicalSource(el('house-import-url').value), text=el('house-ai-text').value.trim();
      if(!url && !(mode==='ai'&&text))throw Error('Bitte en Rezeptlink oder für d KI en Rezepttext iifüege.');
      status.textContent='Rezept wird iigläse …';
      const result=await account().importRecipe(target,{url,text:mode==='ai'?text:'',mode});
      if(!active())return;
      const d=result.draft;
      edit({...d,source:canonicalSource(result.source),ingredients:d.lines.map(parseIngredient)});
      dirty=true;el('house-import').open=false;
      status.textContent='Bitte Menge, Einheite, Portione und Schritt prüefe.'+
        (d.totalMinutes!=null && (d.prepMinutes==null||d.cookMinutes==null)?' D Quelle nennt insgesamt '+d.totalMinutes+' Minute.':'');
      fields.title.focus();
    });
  }
  el('house-read-link').onclick=()=>fromSource('link');
  el('house-read-ai').onclick=()=>fromSource('ai');
  function list(id,values){
    el(id).replaceChildren(...values.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  }
  form.onsubmit=event=>{
    event.preventDefault();if(busy)return;
    try{
      preview=read();status.textContent='';
      el('house-preview-name').textContent=preview.title;
      el('house-preview-description').textContent=preview.description;
      el('house-preview-meta').textContent=preview.baseServings+' Portione · '+preview.prepMinutes+' Min. vorbereite · '+preview.cookMinutes+' Min. choche';
      el('house-preview-source').textContent=preview.source;
      list('house-preview-ingredients',preview.ingredients.map(r=>[r.quantity,unitLabels[r.unit],r.name,r.optional?'(optional)':''].filter(x=>x!=null&&x!=='').join(' ')));
      list('house-preview-steps',preview.steps);
      el('house-editor-title').textContent='Rezept prüefe';el('house-editor-input').hidden=true;el('house-preview').hidden=false;
      dialog.scrollTop=0;el('house-revise').focus();
    }catch(e){status.textContent=e.message;}
  };
  el('house-revise').onclick=()=>{
    el('house-editor-title').textContent='Rezept bearbeite';el('house-preview').hidden=true;
    el('house-editor-input').hidden=false;fields.title.focus();
  };
  el('house-reload-recipe').onclick=()=>{
    if(!confirm('Dini Änderige verwerfe und de gspeichereti Stand lade?'))return;
    job(async active=>{await account().refresh();if(active()){const row=findRow(id);if(row)open(row);}});
  };
  el('house-save').onclick=()=>job(async active=>{
    if(!preview)return;
    status.textContent='Rezept wird gspeicheret …';
    await account().saveRecipe(target,id,revision,preview);
    if(active()){dirty=false;dialog.close();onSaved(id);}
  });
  return {open};
}
