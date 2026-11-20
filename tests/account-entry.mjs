import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {JSDOM} from 'jsdom';

const invitation='50000000-0000-4000-8000-000000000001';
const invitedEmail='invited@example.test';
const householdName='Zefaja <Familie>';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const ok=data=>({data,error:null});
async function settle(){for(let i=0;i<12;i++)await new Promise(r=>setTimeout(r,0))}

async function boot({invite=invitation,existing=false,wrongAccount=false,preview=true,previewError=false,userError=false}={}) {
  const url=new URL('https://wachochemer.test/prototype/');
  if(invite)url.searchParams.set('invite',invite);
  const dom=new JSDOM(readFileSync('prototype/index.html','utf8'),{url:url.href,runScripts:'outside-only'});
  const w=dom.window,context=dom.getInternalVMContext(),modules=new Map(),calls=[];
  w.setInterval=()=>0;
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.structuredClone=structuredClone;
  const sessionReady=deferred(),userReady=deferred();
  let session=existing?{user:{id:'account-1',email:wrongAccount?'other@example.test':invitedEmail}}:null;
  const snapshot={household:{id:'household-1',name:householdName,revision:1,adults:2,children:1,babies:0,
    adults_share:1,children_share:1,babies_share:0,recipe_shares:{},shopping_extras:[]},meals:[]};
  let snapshots=0;
  const client={
    auth:{
      onAuthStateChange(fn){this.callback=fn},
      async getSession(){await sessionReady.promise;return ok({session})},
      async getUser(){
        if(existing)await userReady.promise;
        if(userError)return {error:{message:'Kei Verbindig'},data:null};
        return ok({user:session?.user});
      },
      async signInWithPassword(args){calls.push(['signin',args]);session={user:{id:'account-1',email:args.email}};return ok({session})},
      async signUp(args){calls.push(['signup',args]);return ok({session:null})},
      async signOut(){session=null;this.callback('SIGNED_OUT',null);return ok({})},
      mfa:{
        async getAuthenticatorAssuranceLevel(){return ok({currentLevel:'aal1',nextLevel:'aal1'})},
        async listFactors(){return ok({totp:[]})}
      }
    },
    from(table){return {select(){return this},eq(){return this},async order(){return ok([{id:'household-1',name:householdName}])},
      then(fn){assert.equal(table,'household_invitations');return Promise.resolve(ok([])).then(fn)}}},
    async rpc(name,args){
      calls.push([name,args]);
      if(name==='household_invitation_preview')return previewError?{data:null,error:{message:'network'}}:ok(preview?{email:invitedEmail,household_name:householdName}:null);
      if(name==='accept_household_invitation')return ok('household-1');
      if(name==='household_snapshot')return ok(snapshot);
      if(name==='household_people')return ok([{user_id:'account-1',email:invitedEmail}]);
      throw Error('Unexpected RPC '+name);
    }
  };
  async function moduleFor(path){
    path=path.split('?')[0];
    if(modules.has(path))return modules.get(path);
    let mod;
    if(path.endsWith('/backend-config.js'))mod=new SyntheticModule(['backendConfig'],function(){this.setExport('backendConfig',{url:'https://project.supabase.co',publishableKey:'public-example'})},{context});
    else if(path.endsWith('/vendor/supabase.js'))mod=new SyntheticModule(['createClient'],function(){this.setExport('createClient',()=>client)},{context});
    else mod=new SourceTextModule(readFileSync(path,'utf8'),{context,identifier:path,
      importModuleDynamically:async spec=>{const m=await moduleFor(resolve(dirname(path),spec));if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m}});
    modules.set(path,mod);return mod;
  }
  const link=(specifier,parent)=>moduleFor(resolve(dirname(parent.identifier),specifier));
  const mod=await moduleFor(resolve('prototype/account.mjs'));await mod.link(link);await mod.evaluate();
  const ready=mod.namespace.startAccount({onSnapshot(){snapshots++},onLock(){},onImport(){}});
  const el=id=>w.document.getElementById(id);
  const click=async id=>{el(id).click();await settle()};
  const submit=async id=>{el(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle()};
  await settle();
  assert.equal(el('account-startup').hidden,false);
  assert.equal(el('app').hidden,true);
  assert.equal(el('account-gate').hidden,true);
  assert.equal(el('account-login').hidden,true);
  return {w,el,ready,sessionReady,userReady,calls,click,submit,close:()=>w.close(),snapshots:()=>snapshots};
}

// Opening registration needs no credentials; submission validates separately.
{
  const b=await boot();b.sessionReady.resolve();await b.ready;
  const {el}=b;
  assert.equal(el('account-startup').hidden,true);
  assert.match(el('account-invitation-title').textContent,/Zefaja <Familie>/);
  assert.equal(el('account-invitation-title').children.length,0);
  assert.equal(el('account-login').elements.email.value,invitedEmail);
  assert.equal(el('account-login').elements.email.readOnly,true);
  assert.equal(el('account-signup').elements.email.value,invitedEmail);
  await b.click('account-register');
  assert.equal(el('account-signup').hidden,false);
  assert.equal(el('account-login').hidden,true);
  assert.equal(b.calls.filter(([name])=>name==='signup').length,0);
  const signup=el('account-signup');
  signup.elements.password.value='test-password';signup.elements.confirmPassword.value='different-password';
  await b.submit('account-signup');
  assert.equal(b.calls.filter(([name])=>name==='signup').length,0);
  assert.match(el('account-status').textContent,/stimmed nöd/);
  signup.elements.confirmPassword.value='test-password';await b.submit('account-signup');
  const args=b.calls.find(([name])=>name==='signup')[1];
  assert.equal(args.email,invitedEmail);
  assert.equal(new URL(args.options.emailRedirectTo).searchParams.get('invite'),invitation);
  assert.equal(el('account-confirmation').hidden,false);
  assert.equal(el('account-confirmation-email').textContent,invitedEmail);
  assert.equal(signup.elements.password.value,'');
  await b.click('account-back-to-login');
  assert.equal(el('account-login').elements.email.value,invitedEmail);
  el('account-login').elements.password.value='test-password';await b.submit('account-login');
  assert.equal(el('account-households').hidden,false);
  assert.equal(el('account-create').hidden,true);
  assert.equal(el('account-accept').hidden,false);
  assert.match(el('account-accept').textContent,/Zefaja <Familie>/);
  assert.equal(el('app').hidden,true);
  await b.click('account-accept');
  assert.equal(el('app').hidden,false);
  assert.equal(el('account-startup').hidden,true);
  assert.equal(el('account-invitation').hidden,true);
  assert.equal(b.w.sessionStorage.getItem('wachochemer:invitation'),null);
  assert.equal(new URL(b.w.location.href).searchParams.has('invite'),false);
  assert.equal(b.snapshots(),1);
  b.close();
}

// An existing session must resolve identity and household before exposing the UI.
{
  const b=await boot({invite:null,existing:true});b.sessionReady.resolve();await settle();
  assert.equal(b.el('account-startup').hidden,false);
  assert.equal(b.el('account-login').hidden,true);
  assert.equal(b.snapshots(),0);
  b.userReady.resolve();await b.ready;
  assert.equal(b.el('app').hidden,false);
  assert.equal(b.el('account-startup').hidden,true);
  assert.equal(b.snapshots(),1);
  b.close();
}

// A different logged-in account cannot join or silently switch households.
{
  const b=await boot({existing:true,wrongAccount:true});b.sessionReady.resolve();b.userReady.resolve();await b.ready;
  assert.equal(b.el('account-households').hidden,false);
  assert.equal(b.el('account-accept').hidden,true);
  assert.match(b.el('account-status').textContent,/other@example.test.*invited@example.test/);
  assert.equal(b.el('account-gate-logout').hidden,false);
  assert.equal(b.el('app').hidden,true);
  assert.equal(b.snapshots(),0);
  b.close();
}

// Invalid, expired and unavailable previews stay explicit and can be dismissed.
for(const options of [{preview:false},{invite:'not-a-uuid'},{previewError:true}]){
  const b=await boot(options);b.sessionReady.resolve();await b.ready;
  assert.match(b.el('account-invitation-detail').textContent,/nöd meh gültig|nöd lade/);
  assert.equal(b.el('account-register').hidden,true);
  assert.equal(b.el('account-login').elements.email.value,'');
  assert.equal(b.el('account-startup').hidden,true);
  await b.click('account-dismiss-invitation');
  assert.equal(b.el('account-invitation').hidden,true);
  assert.equal(b.el('account-register').hidden,false);
  assert.equal(b.w.sessionStorage.getItem('wachochemer:invitation'),null);
  b.close();
}

// A failed automatic login releases the loading screen with a retryable error.
{
  const b=await boot({invite:null,existing:true,userError:true});b.sessionReady.resolve();b.userReady.resolve();await b.ready;
  assert.equal(b.el('account-startup').hidden,true);
  assert.equal(b.el('account-login').hidden,false);
  assert.match(b.el('account-status').textContent,/Verbindig/);
  assert.equal(b.el('app').hidden,true);
  b.close();
}
console.log('PASS invitation entry, registration, household preview and delayed session restoration');
