import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {JSDOM} from 'jsdom';

const dom=new JSDOM(readFileSync('prototype/index.html','utf8'),{url:'https://wachochemer.test/prototype/',runScripts:'outside-only'});
const w=dom.window,context=dom.getInternalVMContext(),modules=new Map(),calls=[];
w.structuredClone=structuredClone;
w.matchMedia=query=>({matches:query.includes('display-mode: standalone'),addEventListener(){}});
const scrolls=[];
w.scrollTo=options=>scrolls.push(options);
w.confirm=()=>true;
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
w.setInterval=()=>0;
w.requestAnimationFrame=fn=>fn();
w.fetch=async path=>({ok:true,json:async()=>JSON.parse(readFileSync(resolve('prototype',path),'utf8'))});
let nextUpdateError=null, recoverOnLogin=false;
let invitations=[];
let session=null,authCallback,aal='aal1',nextAal='aal1',data=null,revision=1,pendingMeal=null;
const ok=value=>({data:value,error:null});
const client={
  auth:{
    onAuthStateChange:fn=>{authCallback=fn},
    getSession:async()=>ok({session}),
    getUser:async()=>ok({user:session?.user}),
    signInWithPassword:async()=>{session={user:{id:'account-1',email:'one@example.test'}};if(recoverOnLogin){recoverOnLogin=false;authCallback('PASSWORD_RECOVERY',session)}return ok({session})},
    signUp:async args=>{calls.push(['signup',args]);return ok({})},
    resetPasswordForEmail:async()=>ok({}),
    updateUser:async args=>{
      calls.push(['updateUser',args]);
      if(nextUpdateError){const error=nextUpdateError;nextUpdateError=null;return {data:null,error}}
      return ok({});
    },
    reauthenticate:async()=>ok({}),
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
      then(fn){return Promise.resolve(ok(table==='household_invitations'?invitations:[])).then(fn)}
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
    if(name==='invite_household_member'){
      invitations=[{id:'invite-1',email:args.target_email,expires_at:new Date(Date.now()+86400000).toISOString()}];
      return ok('invite-1');
    }
    if(name==='revoke_household_invitation'){
      invitations=invitations.filter(invitation=>invitation.id!==args.invitation);
      return ok(true);
    }
    return ok(null);
  }
};
async function moduleFor(path){
  path=path.split("?")[0];
  if(modules.has(path))return modules.get(path);
  let mod;
  if(path.endsWith('/backend-config.js'))mod=new SyntheticModule(['backendConfig'],function(){this.setExport('backendConfig',{url:'https://project.supabase.co',publishableKey:'public-example'})},{context});
  else if(path.endsWith('/vendor/supabase.js'))mod=new SyntheticModule(['createClient'],function(){this.setExport('createClient',()=>client)},{context});
  else mod=new SourceTextModule(readFileSync(path,'utf8'),{context,identifier:path,
    importModuleDynamically:async spec=>{const m=await moduleFor(resolve(dirname(path),spec));if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m}});
  modules.set(path,mod);return mod;
}
const link=(specifier,parent)=>moduleFor(resolve(dirname(parent.identifier),specifier));
if(process.env.RECOVERY_RELOAD){
 session={user:{id:'account-1',email:'one@example.test'}};
 nextAal='aal2';aal='aal1';
 w.sessionStorage.setItem('wachochemer:passwordRecovery','account-1');
}
const app=await moduleFor(resolve('prototype/app.js'));await app.link(link);await app.evaluate();
const el=id=>w.document.getElementById(id);
async function settle(){for(let i=0;i<15;i++)await new Promise(r=>setTimeout(r,0))}
async function click(id){el(id).click();await settle()}
async function submit(id){el(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle()}
function fill(id,value){el(id).value=value;el(id).dispatchEvent(new w.Event('input',{bubbles:true}))}
await settle();
if(process.env.RECOVERY_RELOAD){
 assert.equal(el('account-challenge').hidden,false);
 assert.equal(el('app').hidden,true);
 el('account-challenge').elements.code.value='123456';
 await submit('account-challenge');
 assert.equal(el('account-password').hidden,false);
 assert.equal(el('app').hidden,true);
 assert.equal(w.sessionStorage.getItem('wachochemer:passwordRecovery'),'account-1');
 dom.window.close();
 console.log('PASS recovery reload retains password flow after MFA');
 process.exit(0);
}
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
assert.equal(el('help-dialog').open,true);
for(let i=0;i<5;i++)await click('help-next');
assert.equal(el('help-dialog').open,false);
assert.equal(w.localStorage.getItem('wachochemer:introSeen'),'true');
await click('open-help');
assert.equal(el('help-dialog').open,true);
await click('help-close');
assert.equal(el('account-settings').querySelectorAll(':scope > details').length,0);
const taskButton=el('account-settings').querySelector('.account-navigation button');
taskButton.click();
assert.equal(el('account-settings').querySelector('.account-task').hidden,false);
w.document.querySelector('[data-tab=settings]').click();
const taskPanel=el('account-settings').querySelector('.account-task');
taskPanel.dispatchEvent(Object.assign(new w.Event('touchstart',{bubbles:true}),{touches:[{clientX:20,clientY:250}]}));
taskPanel.dispatchEvent(Object.assign(new w.Event('touchend',{bubbles:true}),{changedTouches:[{clientX:150,clientY:255}]}));
assert.equal(el('account-settings').querySelector('.account-task').hidden,true);
// The shortcut targets next calendar week regardless of the browsed week and performs no writes.
const beforeShortcut=JSON.stringify(data);
await click('week-prev');await click('week-prev');
w.document.querySelector('button[data-view=day]').click();
assert.equal(el('plan-next-week').hidden,false);
const card=el('day-card');
function gesture(dx){
 for(const [type,touches,changedTouches] of [
  ['touchstart',[{clientX:10,clientY:10}],[]],
  ['touchend',[],[{clientX:10+dx,clientY:10}]]
 ])card.dispatchEvent(Object.assign(new w.Event(type),{touches,changedTouches}));
 card.click();
}
gesture(85);
assert.equal(el('meal-editor').open,false);
gesture(8);
assert.equal(el('meal-editor').open,true);
await click('meal-editor-close');
assert.equal(scrolls.at(-1).top,0);
await click('plan-next-week');
assert.equal(el('plan-next-week').hidden,true);
const targetRange=el('week-range').textContent;
const nextThursday=new Date();
nextThursday.setDate(nextThursday.getDate()+((4-nextThursday.getDay()+7)%7||7));
assert.equal(el('week-strip').querySelector('[data-day="0"] strong').textContent,String(nextThursday.getDate()));
assert.equal(el('screen-week').dataset.view,'week');
assert.equal(el('week-strip').querySelector('[data-day="0"]').getAttribute('aria-pressed'),'true');
assert.equal(w.document.activeElement,el('week-range'));
await click('week-next');
w.document.querySelector('button[data-view=day]').click();
assert.equal(el('plan-next-week').hidden,false);
await click('plan-next-week');
assert.equal(el('week-range').textContent,targetRange);
assert.equal(JSON.stringify(data),beforeShortcut);
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
assert.equal(el('meal-recipe-options').hidden,false);
assert.equal(el('meal-recipe-options').querySelectorAll('[data-pick-recipe]').length,3);
assert.equal(el('meal-recipe-options').querySelectorAll('img').length,3);
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
el('account-invite').elements.email.value='two+invite@example.test';await submit('account-invite');
const inviteLink=el('account-link').value;
assert.match(inviteLink,/invite=invite-1/);
assert.match(el('account-invite-status').textContent,/verschickt kei E-Mail automatisch/);
const mail=new URL(el('account-mail').href);
assert.equal(mail.protocol,'mailto:');
assert.equal(decodeURIComponent(mail.pathname),'two+invite@example.test');
assert.ok(mail.searchParams.get('body').includes(inviteLink));
assert.match(el('account-invitations').textContent,/Offe bis/);
await click('account-enroll');
assert.equal(el('account-secret').value,'EXAMPLE');
assert.equal(el('account-enrollment').hidden,false);
await click('account-cancel-enroll');assert.equal(el('account-secret').value,'');
await click('account-logout');assert.equal(el('app').hidden,true);
assert.equal(el('account-mail').getAttribute('href'),null);
assert.equal(el('account-link').value,'');

// Optional MFA challenges precede any household access after a password login.
nextAal='aal2';aal='aal1';
el('account-login').elements.email.value='one@example.test';el('account-login').elements.password.value='test-password';
await submit('account-login');
assert.equal(el('account-challenge').hidden,false);assert.equal(el('app').hidden,true);
el('account-challenge').elements.code.value='123456';await submit('account-challenge');
assert.equal(el('app').hidden,false);
assert.equal(el('account-mail').hidden,true);
const inviteButtons=el('account-invitations').querySelectorAll('button');
assert.equal(inviteButtons[0].textContent,'Link zum Teile');
inviteButtons[0].click();
assert.equal(el('account-link').value,inviteLink);
assert.equal(calls.filter(([name])=>name==='invite_household_member').length,1);
inviteButtons[1].click();await settle();
assert.equal(el('account-mail').hidden,true);
assert.equal(el('account-invitations').children.length,0);
{
  authCallback('PASSWORD_RECOVERY',session);await settle();
  assert.equal(el('account-password').hidden,false);
  const form=el('account-password');
  form.elements.password.value='new-test-password';
  form.elements.confirmPassword.value='different-password';
  const writes=calls.filter(x=>x[0]==='updateUser').length;
  await submit('account-password');
  assert.equal(calls.filter(x=>x[0]==='updateUser').length,writes);
  assert.match(el('account-status').textContent,/stimmed nöd/);
  form.elements.confirmPassword.value='new-test-password';
  nextUpdateError={code:'same_password',message:'New password should be different from the old password.'};
  await submit('account-password');
  assert.match(el('account-status').textContent,/anders sii/);
  assert.equal(form.elements.password.value,'new-test-password');
  await submit('account-password');
  assert.equal(el('app').hidden,false);
}
w.document.querySelector('[data-tab=settings]').click();
const change=el('account-change-password');
change.elements.password.value='changed-in-settings';
change.elements.confirmPassword.value='changed-in-settings';
nextUpdateError={code:'reauthentication_needed',message:'Reauthentication required'};
await submit('account-change-password');
assert.equal(el('account-password-nonce').hidden,false);
change.elements.nonce.value='123456';
await submit('account-change-password');
assert.equal(change.elements.password.value,'');
assert.match(el('account-settings-status').textContent,/gänderet/);
assert.equal(el('account-password-nonce').hidden,true);
await click('account-logout');
aal='aal1';nextAal='aal2';recoverOnLogin=true;
el('account-login').elements.email.value='one@example.test';
el('account-login').elements.password.value='test-password';
el('account-login').elements.remember.checked=false;
await submit('account-login');
assert.equal(w.localStorage.getItem('wachochemer:remember'),'false');
assert.equal(el('account-challenge').hidden,false);
assert.equal(el('account-password').hidden,true);
assert.equal(el('app').hidden,true);
assert.equal(w.sessionStorage.getItem('wachochemer:passwordRecovery'),'account-1');
el('account-challenge').elements.code.value='123456';
await submit('account-challenge');
assert.equal(el('account-password').hidden,false);
el('account-password').elements.password.value='reset-after-mfa';
el('account-password').elements.confirmPassword.value='reset-after-mfa';
await submit('account-password');
assert.equal(w.sessionStorage.getItem('wachochemer:passwordRecovery'),null);
assert.equal(el('app').hidden,false);
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
