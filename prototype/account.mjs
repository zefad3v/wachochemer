import {backendConfig} from './backend-config.js';
import {SharedHousehold, unwrap} from '../src/storage/shared-household.mjs';

export const cloudEnabled = Boolean(backendConfig.url || backendConfig.publishableKey);
const html = `
<section id="account-gate" class="account-gate" hidden>
  <div class="account-panel">
    <h1>Wa chochemer?</h1>
    <p id="account-status" role="status"></p>
    <form id="account-login">
      <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Passwort<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
      <button class="main-action" type="submit">Aamelde</button>
      <button type="button" id="account-register">Konto mit Iiladig erstelle</button>
      <button type="button" id="account-reset">Passwort vergesse</button>
    </form>
    <section id="account-confirmation" hidden>
      <h2 id="account-confirmation-title" tabindex="-1">Bitte E-Mail bestätige</h2>
      <p>Öffne d Bestätigungsmail für <strong id="account-confirmation-email"></strong> und tippe uf «E-Mail bestätige».</p>
      <p>Falls d Mail fehlt, lueg au im Spam-Ordner.</p>
      <button type="button" id="account-back-to-login">Zrugg zur Aameldig</button>
    </section>
    <form id="account-password" hidden>
      <label>Neus Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="main-action">Passwort speichere</button>
    </form>
    <form id="account-challenge" hidden>
      <label>Authenticator<select id="account-factor"></select></label>
      <label>Bestätigungscode<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" required></label>
      <button class="main-action">Bestätige</button>
    </form>
    <section id="account-households" hidden>
      <h2>Din Haushalt</h2><div id="account-household-list"></div>
      <button type="button" id="account-accept" hidden>Iiladig aanäh</button>
      <form id="account-create">
        <label>Haushaltsname<input name="name" maxlength="100" required placeholder="Üse Haushalt"></label>
        <button class="main-action">Haushalt erstelle</button>
      </form>
    </section>
    <button type="button" id="account-retry">Erneut lade</button>
    <button type="button" id="account-gate-logout" hidden>Abmelde</button>
  </div>
</section>`;
const settings = `
<section id="account-settings" class="settings-card account-panel">
  <h2>Konto und Haushalt</h2><p id="account-identity"></p>
  <output id="account-settings-status" role="status"></output>
  <button type="button" id="account-switch">Haushalt wechsle</button>
  <button type="button" id="account-logout">Abmelde</button>
  <details><summary>Mitglieder und Iiladige</summary>
    <div id="account-members"></div>
    <form id="account-invite">
      <label>E-Mail vo de Person<input name="email" type="email" required></label>
      <button>Iiladigslink erstelle</button>
    </form>
    <label id="account-link-label" hidden>Iiladigslink zum Teile<input id="account-link" readonly></label>
    <button type="button" id="account-copy" hidden>Link kopiere</button>
    <div id="account-invitations"></div>
  </details>
  <details><summary>Zwei-Faktor-Aameldig</summary>
    <p>Füg en Authenticator hinzu. Mit eme zweite Authenticator hesch en Ersatzzuegang.</p>
    <div id="account-factors"></div>
    <button type="button" id="account-enroll">Authenticator hinzuefüege</button>
    <form id="account-enrollment" hidden>
      <img id="account-qr" alt="QR-Code für de Authenticator">
      <label>Schlüssel zum manuell Iitrage<input id="account-secret" readonly></label>
      <label>Bestätigungscode<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" required></label>
      <button>Aktiviere</button><button type="button" id="account-cancel-enroll">Abbräche</button>
    </form>
  </details>
  <details><summary>Plan vo däm Grät übernäh</summary>
    <p>Übernimmt de bisherige lokale Plan in en leere gemeinsame Wucheplan.</p>
    <button type="button" id="account-import">Lokale Plan übernäh</button>
  </details>
</section>`;

export async function startAccount({onSnapshot, onLock, onImport}) {
  document.body.insertAdjacentHTML('afterbegin', html);
  document.querySelector('#household-form').insertAdjacentHTML('afterend', settings);
  document.querySelector('.settings-note').textContent = 'De Haushalt und Wucheplan werded online gspeicheret. D Aazeige-Iistellige gelted für dä Browser.';
  const el = id => document.getElementById(id);
  const gate = el('account-gate');
  const app = el('app');
  document.querySelector('main').insertAdjacentHTML('afterbegin', '<p id="account-connection" role="status" hidden></p>');
  const status = text => { el('account-status').textContent = text; el('account-settings-status').textContent = text; };
  let client, shared, user, recovery = false, enrollment = null, busy = false, generation = 0;
  let currentSnapshot = null, refreshSequence = 0;
  const invite = new URL(location.href).searchParams.get('invite') || sessionStorage.getItem('wachochemer:invitation');
  if (invite) sessionStorage.setItem('wachochemer:invitation', invite);
  const callbackUrl = new URL(location.pathname, location.origin).href;
  function lock() {
    app.hidden = true; gate.hidden = false; currentSnapshot = null;
    clearEnrollment();
    el('account-connection').hidden = true;
    for (const id of ['account-members', 'account-invitations', 'account-factors']) el(id).replaceChildren();
    el('account-identity').textContent = '';
    el('account-link').value = ''; el('account-link-label').hidden = true; el('account-copy').hidden = true;
    onLock();
  }
  function stage(name) {
    for (const id of ['login', 'confirmation', 'password', 'challenge', 'households']) el('account-' + id).hidden = id !== name;
    el('account-retry').hidden = name === 'confirmation';
  }
  function clearEnrollment() {
    enrollment = null; el('account-enrollment').hidden = true;
    el('account-secret').value = ''; el('account-qr').removeAttribute('src');
    el('account-enrollment').reset();
  }
  async function action(work) {
    if (busy) return;
    busy = true;
    const buttons = [...gate.querySelectorAll('button'), ...el('account-settings').querySelectorAll('button')];
    const disabled = buttons.map(button => button.disabled);
    buttons.forEach(button => { button.disabled = true; });
    status('');
    try { await work(); } catch (error) { status(error.message || 'Verbindig fehlgschlage. Bitte nomal probiere.'); }
    finally { busy = false; buttons.forEach((button, index) => { button.disabled = disabled[index]; }); }
  }
  function bind(id, event, handler) {
    el(id).addEventListener(event, e => { e.preventDefault(); action(() => handler(e)); });
  }
  async function refresh() {
    if (!shared?.id) return;
    const version = generation, target = shared.id, request = ++refreshSequence;
    const snapshot = await shared.load();
    if (generation !== version || shared.id !== target || request !== refreshSequence) return;
    currentSnapshot = snapshot;
    el('account-connection').hidden = true;
    onSnapshot(snapshot);
    el('account-identity').textContent = user.email + ' · ' + snapshot.household.name;
  }
  async function selectHousehold(id) {
    generation++;
    shared.id = id;
    lock();
    await refresh();
    localStorage.setItem('wachochemer:activeHousehold:' + user.id, id);
    app.hidden = false; gate.hidden = true;
    await members();
    await factors();
  }
  async function members() {
    if (!shared.id) return;
    const people = unwrap(await client.rpc('household_people', {target: shared.id}));
    const invitations = unwrap(await client.from('household_invitations').select('id,email,expires_at').eq('household_id', shared.id));
    el('account-members').replaceChildren();
    for (const person of people) {
      const row = document.createElement('p'), button = document.createElement('button');
      row.append(document.createTextNode(person.email + ' '));
      button.textContent = person.user_id === user.id ? 'Haushalt verlah' : 'Entferne';
      button.disabled = people.length === 1;
      button.addEventListener('click', () => {
        if (people.length === 1 || !confirm(person.email + ' us däm Haushalt entferne?')) return;
        action(async () => {
          unwrap(await client.rpc('remove_household_member', {target: shared.id, member_id: person.user_id}));
          if (person.user_id === user.id) { shared.id = null; await authenticate(false); }
          else await members();
        });
      });
      row.append(button); el('account-members').append(row);
    }
    el('account-invitations').replaceChildren();
    for (const invitation of invitations) {
      const row = document.createElement('p'), button = document.createElement('button');
      row.append(document.createTextNode(invitation.email + ' · ' + new Date(invitation.expires_at).toLocaleDateString('de-CH') + ' '));
      button.textContent = 'Iiladig zruggzieh';
      button.addEventListener('click', () => action(async () => {
        unwrap(await client.rpc('revoke_household_invitation', {target: shared.id, invitation: invitation.id}));
        await members();
      }));
      row.append(button); el('account-invitations').append(row);
    }
  }
  async function factors() {
    const list = unwrap(await client.auth.mfa.listFactors()).totp;
    el('account-factors').replaceChildren();
    for (const factor of list.filter(f => f.status === 'verified')) {
      const row = document.createElement('p'), button = document.createElement('button');
      row.append(document.createTextNode((factor.friendly_name || 'Authenticator') + ' '));
      button.textContent = 'Entferne';
      button.addEventListener('click', () => {
        if (!confirm('Dä Authenticator entferne?')) return;
        action(async () => { unwrap(await client.auth.mfa.unenroll({factorId: factor.id})); await factors(); });
      });
      row.append(button); el('account-factors').append(row);
    }
  }
  async function authenticate(chooseSaved = true) {
    generation++;
    lock(); clearEnrollment();
    user = unwrap(await client.auth.getUser()).user;
    el('account-gate-logout').hidden = !user;
    if (!user) { stage('login'); return; }
    const assurance = unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel());
    if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
      stage('challenge');
      const list = unwrap(await client.auth.mfa.listFactors()).totp.filter(f => f.status === 'verified');
      el('account-factor').replaceChildren(...list.map(f => new Option(f.friendly_name || 'Authenticator', f.id)));
      return;
    }
    if (recovery) { stage('password'); return; }
    const households = await shared.list();
    stage('households');
    el('account-accept').hidden = !sessionStorage.getItem('wachochemer:invitation');
    el('account-household-list').replaceChildren(...households.map(h => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = h.name;
      button.addEventListener('click', () => action(() => selectHousehold(h.id)));
      return button;
    }));
    const saved = localStorage.getItem('wachochemer:activeHousehold:' + user.id);
    if (chooseSaved && !sessionStorage.getItem('wachochemer:invitation')) {
      const selected = households.find(h => h.id === saved) || (households.length === 1 ? households[0] : null);
      if (selected) await selectHousehold(selected.id);
    }
  }
  async function logout() {
    generation++; shared.id = null; currentSnapshot = null; clearEnrollment();
    lock(); stage('login');
    unwrap(await client.auth.signOut({scope: 'local'}));
    user = null; recovery = false;
    el('account-gate-logout').hidden = true;
  }
  lock(); stage('login');
  try {
    if (!backendConfig.url || !backendConfig.publishableKey) throw Error('De gemeinsame Haushalt isch no nöd fertig iigrichtet.');
    const {createClient} = await import('./vendor/supabase.js');
    client = createClient(backendConfig.url, backendConfig.publishableKey);
    shared = new SharedHousehold(client);
    // The callback itself stays synchronous to avoid holding the SDK auth lock.
    client.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') recovery = true;
      if (event === 'SIGNED_OUT') {
        generation++; shared.id = null; user = null; recovery = false;
        lock(); stage('login'); el('account-gate-logout').hidden = true;
      }
      if (event === 'PASSWORD_RECOVERY') setTimeout(() => action(() => authenticate()), 0);
    });
    bind('account-login', 'submit', async () => {
      const form = el('account-login');
      unwrap(await client.auth.signInWithPassword({email: form.elements.email.value, password: form.elements.password.value}));
      form.elements.password.value = '';
      await authenticate();
    });
    bind('account-register', 'click', async () => {
      const form = el('account-login');
      if (!form.reportValidity()) return;
      const url = new URL(callbackUrl);
      const pending = sessionStorage.getItem('wachochemer:invitation');
      if (pending) url.searchParams.set('invite', pending);
      unwrap(await client.auth.signUp({email: form.elements.email.value, password: form.elements.password.value,
        options: {emailRedirectTo: url.href}}));
      form.elements.password.value = '';
      el('account-confirmation-email').textContent = form.elements.email.value;
      stage('confirmation');
      el('account-confirmation-title').focus();
    });
    bind('account-back-to-login', 'click', () => { stage('login'); el('account-login').elements.password.focus(); });
    bind('account-reset', 'click', async () => {
      const email = el('account-login').elements.email;
      if (!email.reportValidity()) return;
      unwrap(await client.auth.resetPasswordForEmail(email.value, {redirectTo: callbackUrl}));
      status('Wenn es Konto existiert, bechunsch en Link per E-Mail.');
    });
    bind('account-password', 'submit', async () => {
      unwrap(await client.auth.updateUser({password: el('account-password').elements.password.value}));
      el('account-password').reset(); recovery = false; await authenticate();
    });
    bind('account-challenge', 'submit', async () => {
      unwrap(await client.auth.mfa.challengeAndVerify({factorId: el('account-factor').value, code: el('account-challenge').elements.code.value}));
      el('account-challenge').reset(); await authenticate();
    });
    bind('account-create', 'submit', async () => {
      const id = unwrap(await client.rpc('create_household', {household_name: el('account-create').elements.name.value}));
      await selectHousehold(id);
    });
    bind('account-accept', 'click', async () => {
      const id = unwrap(await client.rpc('accept_household_invitation', {invitation: sessionStorage.getItem('wachochemer:invitation')}));
      sessionStorage.removeItem('wachochemer:invitation');
      const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url);
      await selectHousehold(id);
    });
    bind('account-switch', 'click', () => { shared.id = null; return authenticate(false); });
    bind('account-retry', 'click', () => authenticate());
    bind('account-logout', 'click', logout); bind('account-gate-logout', 'click', logout);
    bind('account-invite', 'submit', async () => {
      const id = unwrap(await client.rpc('invite_household_member', {target: shared.id, target_email: el('account-invite').elements.email.value}));
      const url = new URL(callbackUrl); url.searchParams.set('invite', id);
      el('account-link').value = url.href;
      el('account-link-label').hidden = false; el('account-copy').hidden = false;
      status('Link erstellt. Teile ihn mit de iigladene Person.'); await members();
    });
    bind('account-copy', 'click', async () => { await navigator.clipboard.writeText(el('account-link').value); status('Link kopiert.'); });
    bind('account-enroll', 'click', async () => {
      if (enrollment) unwrap(await client.auth.mfa.unenroll({factorId: enrollment.id}));
      enrollment = unwrap(await client.auth.mfa.enroll({factorType: 'totp', friendlyName: 'Wachochemer ' + new Date().toISOString()}));
      el('account-secret').value = enrollment.totp.secret;
      el('account-qr').src = enrollment.totp.qr_code;
      el('account-enrollment').hidden = false;
    });
    bind('account-cancel-enroll', 'click', async () => {
      if (enrollment) unwrap(await client.auth.mfa.unenroll({factorId: enrollment.id}));
      clearEnrollment();
    });
    bind('account-enrollment', 'submit', async () => {
      unwrap(await client.auth.mfa.challengeAndVerify({factorId: enrollment.id, code: el('account-enrollment').elements.code.value}));
      clearEnrollment(); status('Zwei-Faktor-Aameldig aktiviert.'); await factors();
    });
    bind('account-import', 'click', async () => { await onImport(shared); await refresh(); status('Lokale Plan übernoh.'); });
    const poll = async () => {
      if (busy || document.hidden || !shared.id || !gate.hidden || document.querySelector('dialog[open]')) return;
      const version = generation;
      try { await refresh(); }
      catch (error) {
        if (version !== generation) return;
        if (error.code === '42501' || error.code === 'PGRST301') {
          generation++; lock(); stage('households'); status(error.message);
        } else {
          el('account-connection').textContent = 'Kei aktuelli Verbindig. Bitte Internet prüefe; Änderige chönd im Moment nöd gspeicheret werde.';
          el('account-connection').hidden = false;
        }
      }
    };
    setInterval(poll, 10000);
    window.addEventListener('focus', poll);
    document.addEventListener('visibilitychange', poll);
    const session = unwrap(await client.auth.getSession()).session;
    if (session) await authenticate();
    else status('Meld di für din gemeinsame Haushalt aa.');
  } catch (error) { status(error.message); }
  return {
    async saveMeal(key, entry, revision) {
      if (!shared?.id || !currentSnapshot || !gate.hidden) throw Error('Bitte zuerst aamelde und de Haushalt lade.');
      const version = generation;
      await shared.saveMeal(key, entry, revision);
      if (version !== generation) return;
      await refresh();
    },
    async saveSettings(profile, revision) {
      if (!shared?.id || !currentSnapshot || !gate.hidden) throw Error('Bitte zuerst de Haushalt lade.');
      const version = generation;
      await shared.saveSettings(profile, revision);
      if (version !== generation) return;
      await refresh();
    },
    refresh
  };
}
