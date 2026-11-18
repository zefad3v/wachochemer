import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {JSDOM} from 'jsdom';

const dom=new JSDOM(readFileSync('prototype/index.html','utf8'),{url:'https://wachochemer.test/prototype/',runScripts:'outside-only'});
const w=dom.window,context=dom.getInternalVMContext(),modules=new Map(),calls=[];
w.structuredClone=structuredClone;
w.matchMedia=()=>({matches:false,addEventListener(){}});
w.scrollTo=()=>{};
w.confirm=()=>true;
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.setInterval=()=>0;
w.requestAnimationFrame=fn=>fn();
w.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(resolve('prototype',path),'utf8'))});
let session=null,authCallback,aal='aal1',nextAal='aal1',data=null,revision=1,pendingMeal=null;
const ok=value=>({data:value,error:null});
const client={
  auth:{
    onAuthStateChange:fn=>{authCallback=fn},
    getSession:async()=>ok({session}),
    getUser:async()=>ok({user:session?.user}),
    signInWithPassword:async()=>{session={user:{id:'account-1',email:'one@example.test'}};return ok({session})},
    signUp:async args=>{calls.push(['signup',args]);return ok({})},
    resetPasswordForEmail:async()=>ok({}),
    updateUser:async()=>ok({}),
    signOut:async()=>{session=null;authCallback('SIGNED_OUT',null);return ok({})},
    mfa:{
      getAuthenticatorAssuranceLevel:async()=>ok({currentLevel:aal,nextLevel:nextAal}),
      listFactors:async()=>ok({totp:nextAal==='aal2'?[{id:'totp-1',friendly_name:'Phone',status:'verified'}]:[]}),
      challengeAndVerify:async()=>{aal='aal2';return ok({})},
      enroll:async()=>ok({id:'totp-2',totp:{secret:'EXAMPLE',qr_code:'data:image/svg+xml,%3Csvg/%3E'}}),
      unenroll:async()=>ok({})
    }
  },
  from:table=>{
    const query={
      select(){return this},eq(){return this},
      async order(){return ok(data?[{id:'household-1',name:'Üse Haushalt'}]:[])},
      then(fn){return Promise.resolve(ok([])).then(fn)}
    };return query;
  },
  rpc:async(name,args)=>{
    calls.push([name,args]);
    if(name==='create_household'){
      data={household:{id:'household-1',name:args.household_name,revision:'1',adults:0,children:0,babies:0,adults_share:1,children_share:1,babies_share:0,recipe_shares:{},shopping_extras:[]},meals:[]};
      return ok('household-1');
    }
    if(name==='household_snapshot')return ok(structuredClone(data));
    if(name==='household_people')return ok([{user_id:'account-1',email:'one@example.test'}]);
    if(name==='save_household_meal'){
      if(pendingMeal)return new Promise(resolve=>{pendingMeal.resolve=resolve});
      const key=args.meal_day+'|'+args.meal_slot;
      const current=data.meals.find(m=>m.day+'|'+m.slot===key);
      if(String(current?.revision??0)!==String(args.expected_revision))return {data:null,error:{code:'40001',message:'conflict'}};
      data.meals=data.meals.filter(m=>m.day+'|'+m.slot!==key);
      if(args.meal_entry)data.meals.push({day:args.meal_day,slot:args.meal_slot,entry:args.meal_entry,revision:String(++revision)});
      return ok(revision);
    }
    if(name==='save_household_settings'){
      if(args.expected_revision!==data.household.revision)return {data:null,error:{code:'40001',message:'conflict'}};
      const p=args.profile;
      assert.equal(p.name,'Üse Haushalt');
      Object.assign(data.household,{adults:p.adults,children:p.children,babies:p.babies,adults_share:p.adultsShare,
        children_share:p.childrenShare,babies_share:p.babiesShare,recipe_shares:p.recipeShares,shopping_extras:p.extras,
        revision:String(Number(data.household.revision)+1)});
      return ok(null);
    }
    if(name==='invite_household_member')return ok('invite-1');
    return ok(null);
  }
};
async function moduleFor(path){
  if(modules.has(path))return modules.get(path);
  let mod;
  if(path.endsWith('/backend-config.js'))mod=new SyntheticModule(['backendConfig'],function(){this.setExport('backendConfig',{url:'https://project.supabase.co',publishableKey:'public-example'})},{context});
  else if(path.endsWith('/vendor/supabase.js'))mod=new SyntheticModule(['createClient'],function(){this.setExport('createClient',()=>client)},{context});
  else mod=new SourceTextModule(readFileSync(path,'utf8'),{context,identifier:path,
    importModuleDynamically:async spec=>{const m=await moduleFor(resolve(dirname(path),spec));if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m}});
  modules.set(path,mod);return mod;
}
const link=(specifier,parent)=>moduleFor(resolve(dirname(parent.identifier),specifier));
const app=await moduleFor(resolve('prototype/app.js'));await app.link(link);await app.evaluate();
const el=id=>w.document.getElementById(id);
async function settle(){for(let i=0;i<15;i++)await new Promise(r=>setTimeout(r,0))}
async function click(id){el(id).click();await settle()}
async function submit(id){el(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle()}
function fill(id,value){el(id).value=value;el(id).dispatchEvent(new w.Event('input',{bubbles:true}))}
await settle();
assert.equal(el('app').hidden,true);
assert.equal(el('account-login').hidden,false);
el('account-login').elements.email.value='one@example.test';el('account-login').elements.password.value='test-password';
await click('account-register');
assert.equal(el('account-login').hidden,true);
assert.equal(el('account-confirmation').hidden,false);
assert.equal(el('account-confirmation-email').textContent,'one@example.test');
assert.equal(el('account-retry').hidden,true);
assert.equal(w.document.activeElement,el('account-confirmation-title'));
assert.equal(el('account-login').elements.password.value,'');
await click('account-back-to-login');
assert.equal(el('account-login').hidden,false);
assert.equal(el('account-confirmation').hidden,true);
assert.equal(el('account-retry').hidden,false);
el('account-login').elements.password.value='test-password';
await submit('account-login');
assert.equal(el('account-households').hidden,false);
el('account-create').elements.name.value='Üse Haushalt';await submit('account-create');
assert.equal(el('app').hidden,false);
assert.equal(el('account-identity').textContent,'one@example.test · Üse Haushalt');
w.document.querySelector('[data-tab=settings]').click();
fill('household-adults','2');fill('household-children','1');await submit('household-form');
assert.equal(data.household.adults,2);assert.equal(data.household.children,1);
assert.equal(w.localStorage.getItem('wachochemer:household'),null);
// Repeated settings writes retain the household name and use the new revision.
await submit('household-form');
assert.equal(el('household-status').textContent,'Gspeicheret.');
fill('household-adults','3');data.household.revision=String(Number(data.household.revision)+1);
await submit('household-form');
assert.match(el('household-status').textContent,/Zwüscheziitlich/);
assert.equal(el('household-adults').value,'3');assert.equal(data.household.adults,2);
await click('household-reload');assert.equal(el('household-adults').value,'2');
w.document.querySelector('[data-tab=week]').click();
await click('choose-lunch');await click('day-edit');
fill('meal-recipe-search','Kürbis');await settle();
w.document.querySelector('[data-pick-recipe]').click();await settle();
assert.equal(el('meal-need').value,'3');
await submit('meal-form');
assert.equal(el('meal-editor').open,false);
assert.equal(data.meals.length,1);assert.equal(data.meals[0].entry.cookedServings,3);
assert.equal(w.localStorage.getItem('wachochemer:mealPlanV2'),null);

// A remote edit after opening must keep the user's draft and show the conflict.
await click('day-edit');
fill('meal-need','4');
data.meals[0].revision=String(++revision);data.meals[0].entry.cookedServings=5;
await submit('meal-form');
assert.equal(el('meal-editor').open,true);
assert.match(el('meal-editor-error').textContent,/Zwüscheziitlich/);
assert.equal(el('meal-need').value,'4');assert.equal(data.meals[0].entry.cookedServings,5);
await click('meal-reload');assert.equal(el('meal-servings').value,'5');
await click('meal-editor-close');
w.document.querySelector('[data-tab=settings]').click();
el('account-invite').elements.email.value='two@example.test';await submit('account-invite');
assert.match(el('account-link').value,/invite=invite-1/);
await click('account-enroll');
assert.equal(el('account-secret').value,'EXAMPLE');
assert.equal(el('account-enrollment').hidden,false);
await click('account-cancel-enroll');assert.equal(el('account-secret').value,'');
await click('account-logout');assert.equal(el('app').hidden,true);

// Optional MFA challenges precede any household access after a password login.
nextAal='aal2';aal='aal1';
el('account-login').elements.email.value='one@example.test';el('account-login').elements.password.value='test-password';
await submit('account-login');
assert.equal(el('account-challenge').hidden,false);assert.equal(el('app').hidden,true);
el('account-challenge').elements.code.value='123456';await submit('account-challenge');
assert.equal(el('app').hidden,false);
{
  authCallback('PASSWORD_RECOVERY',session);await settle();
  assert.equal(el('account-password').hidden,false);
  el('account-password').elements.password.value='new-test-password';await submit('account-password');
  assert.equal(el('app').hidden,false);
}
// A response arriving after logout may not restore another session's plan.
w.document.querySelector('[data-tab=week]').click();await click('day-edit');
pendingMeal={};
el('meal-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();
await click('account-logout');
pendingMeal.resolve({data:null,error:{code:'42501',message:'access denied'}});await settle();
assert(!el('day-card').textContent.includes('Kürbissuppe'));
assert.equal(el('account-link').value,'');
assert.equal(el('account-members').textContent,'');
dom.window.close();
console.log('PASS online app DOM flows, shared writes, conflict handling, invitation, MFA and recovery');
