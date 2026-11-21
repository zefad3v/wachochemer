import {sessionStorageChoice} from './auth-session.mjs';
import {backendConfig} from './backend-config.js';
import {SharedHousehold, unwrap} from '../src/storage/shared-household.mjs?v=20261121-recipe-management';

export const cloudEnabled = Boolean(backendConfig.url || backendConfig.publishableKey);
const html = `
<section id="account-gate" class="account-gate" hidden>
  <div class="account-panel">
    <h1>Wa chochemer?</h1>
    <section id="account-invitation" class="invitation-preview" hidden>
      <h2 id="account-invitation-title"></h2>
      <p id="account-invitation-detail"></p>
      <button type="button" id="account-dismiss-invitation">Ohni Iiladig wiiter</button>
    </section>
    <p id="account-status" role="status"></p>
    <form id="account-login">
      <h2>Aamelde</h2>
      <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Passwort<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
      <label class="remember-choice"><input name="remember" type="checkbox" role="switch" checked>Aagmeldet bliibe</label>
      <button class="main-action" type="submit">Aamelde</button>
      <p>No kei Konto?</p>
      <button type="button" id="account-register">Neus Konto erstelle</button>
      <button type="button" id="account-reset">Passwort vergesse</button>
    </form>
    <form id="account-signup" hidden>
      <h2>Neus Konto erstelle</h2>
      <p>Wähl es eigets Passwort mit mindestens 8 Zeiche. Danach bestätigsch dini E-Mail und nimmsch d Iiladig aa.</p>
      <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Neus Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Passwort wiederhole<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <label class="remember-choice"><input name="remember" type="checkbox" role="switch" checked>Aagmeldet bliibe</label>
      <button class="main-action" type="submit">Konto erstelle</button>
      <button type="button" id="account-signup-login">Ich ha scho es Konto</button>
    </form>
    <section id="account-confirmation" hidden>
      <h2 id="account-confirmation-title" tabindex="-1">Bitte E-Mail bestätige</h2>
      <p>Öffne d Bestätigungsmail für <strong id="account-confirmation-email"></strong> und tippe uf «E-Mail bestätige».</p>
      <p>Falls d Mail fehlt, lueg au im Spam-Ordner.</p>
      <button type="button" id="account-back-to-login">Zrugg zur Aameldig</button>
    </section>
    <form id="account-password" hidden>
      <p>Wähl es neus Passwort mit mindestens 8 Zeiche.</p>
      <label>Neus Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Passwort wiederhole<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="main-action">Passwort speichere</button>
    </form>
    <form id="account-challenge" hidden>
      <p id="account-challenge-hint">Bestätige dini Aameldig mit dim Authenticator.</p>
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
  <details><summary>Passwort ändere</summary>
    <form id="account-change-password">
      <label>Neus Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Passwort wiederhole<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <label id="account-password-nonce" hidden>Code us de E-Mail<input name="nonce" disabled inputmode="numeric" autocomplete="one-time-code"></label>
      <button>Passwort speichere</button>
    </form>
  </details>
  <details><summary>Mitglieder und Iiladige</summary>
    <div id="account-members"></div>
    <form id="account-invite">
      <label>E-Mail vo de Person<input name="email" type="email" required></label>
      <button type="submit" value="send" class="main-action">Iiladig per E-Mail schicke</button>
      <button type="submit" value="link">Link zum Teile erstelle</button>
    </form>
    <output id="account-invite-status" role="status"></output>
    <label id="account-link-label" hidden>Iiladigslink zum Teile<input id="account-link" readonly></label>
    <button type="button" id="account-copy" hidden>Link kopiere</button>
    <button type="button" id="account-share" hidden>Link teile</button>
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
  // Account tasks get separate panels, with a stable full-width navigation list.
  const account = document.getElementById('account-settings');
  const navigation = document.createElement('nav');
  navigation.className = 'account-navigation';
  navigation.setAttribute('aria-label', 'Kontoiistellige');
  for (const detail of [...account.querySelectorAll(':scope > details')]) {
    const summary = detail.querySelector('summary');
    const label = summary.textContent;
    summary.remove();
    const panel = document.createElement('section');
    panel.className = 'account-task'; panel.hidden = true;
    const heading = document.createElement('h3'); heading.textContent = label; heading.tabIndex = -1;
    const back = document.createElement('button'); back.type = 'button'; back.textContent = 'Kontoiistellige';
    back.addEventListener('click', () => { panel.hidden = true; navigation.hidden = false; open.focus(); });
    panel.append(back, heading, ...detail.childNodes);
    const open = document.createElement('button'); open.type = 'button'; open.textContent = label + ' ›';
    open.addEventListener('click', () => {
      account.querySelectorAll('.account-task').forEach(task => task.hidden = true);
      navigation.hidden = true; panel.hidden = false; heading.focus({preventScroll:true});
    });
    navigation.append(open); detail.replaceWith(panel);
  }
  account.insertBefore(navigation, account.querySelector('.account-task'));
  const el = id => document.getElementById(id);
  const gate = el('account-gate');
  const app = el('app');
  document.querySelector('main').insertAdjacentHTML('afterbegin', '<p id="account-connection" role="status" hidden></p>');
  const status = text => { el('account-status').textContent = text; el('account-settings-status').textContent = text; };
  const recoveryKey = 'wachochemer:passwordRecovery';
  let recoveryUser = sessionStorage.getItem(recoveryKey);
  const callbackRecovery = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
  let authPending = false;
  let client, shared, user, recovery = callbackRecovery || Boolean(recoveryUser), enrollment = null, busy = false, generation = 0;
  let currentSnapshot = null, refreshSequence = 0;
  let storage;
  const invite = new URL(location.href).searchParams.get('invite') || sessionStorage.getItem('wachochemer:invitation');
  if (invite) sessionStorage.setItem('wachochemer:invitation', invite);
  let invitationInfo = null;
  const callbackUrl = new URL(location.pathname, location.origin).href;
  let selectedInvitation = null;
  const inviteStatus = text => { el('account-invite-status').textContent = text; };
  const startup = el('account-startup');
  const startupTimer = setTimeout(() => {
    el('account-startup-status').textContent = 'S Lade dauert länger. Bitte prüef dini Internetverbindig.';
    el('account-startup-retry').hidden = false;
  }, 15000);
  el('account-startup-retry').addEventListener('click', () => location.reload());

  async function loadInvitation() {
    invitationInfo = null;
    const pending = sessionStorage.getItem('wachochemer:invitation');
    el('account-invitation').hidden = !pending;
    el('account-register').hidden = false;
    for (const id of ['account-login', 'account-signup']) el(id).elements.email.readOnly = false;
    if (!pending) return;
    el('account-invitation-title').textContent = 'Dini Iiladig';
    el('account-invitation-detail').textContent = 'Iiladig wird prüeft …';
    try {
      if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pending))
        invitationInfo = unwrap(await client.rpc('household_invitation_preview', {invitation: pending}));
      if (!invitationInfo) {
        el('account-invitation-detail').textContent = 'D Iiladig isch nöd meh gültig. Bitte en neue Link afordere.';
        return;
      }
      el('account-invitation-title').textContent = 'Iiladig zum Haushalt «' + invitationInfo.household_name + '»';
      el('account-invitation-detail').textContent = 'Für ' + invitationInfo.email + '. Meld di aa oder erstell es neus Konto. Danach chasch em Haushalt biiträte.';
      for (const id of ['account-login', 'account-signup']) {
        el(id).elements.email.value = invitationInfo.email;
        el(id).elements.email.readOnly = true;
      }
    } catch {
      el('account-invitation-detail').textContent = 'D Iiladig het sich nöd lade lah. Bitte Internet prüefe und «Erneut lade» wähle.';
    } finally {
      el('account-register').hidden = !invitationInfo;
    }
  }

  function clearInvitationLink() {
    selectedInvitation = null;
    el('account-link').value = '';
    el('account-link-label').hidden = true;
    el('account-copy').hidden = true;
    el('account-share').hidden = true;
    inviteStatus('');
  }

  function showInvitationLink(id) {
    selectedInvitation = id;
    const url = new URL(callbackUrl);
    url.searchParams.set('invite', id);
    el('account-link').value = url.href;
    el('account-link-label').hidden = false;
    el('account-copy').hidden = false;
    el('account-share').hidden = typeof navigator.share !== 'function';
  }

  async function updateInvitationList(version) {
    try { await members(); }
    catch {
      if (version === generation) inviteStatus(el('account-invite-status').textContent + ' D Liste het sich nöd aktualisiere lah.');
    }
  }

  async function sendInvitation(target, invitation, email) {
    const version = generation;
    inviteStatus('Iiladig wird verschickt …');
    let sent = false, wait = false;
    try {
      const {data, error} = await client.functions.invoke('send-household-invitation', {
        body: {householdId: target, invitationId: invitation},
      });
      sent = !error && data?.sent === true;
      wait = error?.context?.status === 429;
    } catch {
      // A lost response can leave SMTP acceptance unknown.
    }
    if (version !== generation || shared.id !== target) return;
    if (sent) inviteStatus('Iiladig per E-Mail verschickt a ' + email + '.');
    else {
      showInvitationLink(invitation);
      inviteStatus(wait
        ? 'Bitte wart es bitz vor em nächste Versand. De Link chasch jetzt teile.'
        : 'De Versand het sich nöd bestätige lah. Du chasch de Link teile oder de Versand nomal probiere.');
    }
    await updateInvitationList(version);
  }

  function lock() {
    app.hidden = true; gate.hidden = false; currentSnapshot = null;
    clearEnrollment();
    el('account-connection').hidden = true;
    for (const id of ['account-members', 'account-invitations', 'account-factors']) el(id).replaceChildren();
    el('account-identity').textContent = '';
    clearInvitationLink();
    onLock();
  }
  function stage(name) {
    for (const id of ['login', 'signup', 'confirmation', 'password', 'challenge', 'households']) el('account-' + id).hidden = id !== name;
    startup.hidden = name !== 'loading';
    gate.hidden = name === 'loading';
    el('account-retry').hidden = name === 'confirmation';
  }
  function clearEnrollment() {
    enrollment = null; el('account-enrollment').hidden = true;
    el('account-secret').value = ''; el('account-qr').removeAttribute('src');
    el('account-enrollment').reset();
  }
  async function action(work, report = status) {
    if (busy) return;
    busy = true;
    const buttons = [...gate.querySelectorAll('button'), ...el('account-settings').querySelectorAll('button')];
    const disabled = buttons.map(button => button.disabled);
    buttons.forEach(button => { button.disabled = true; });
    report('');
    try { await work(); } catch (error) {
      if (!startup.hidden) stage('login');
      report(error.message || 'Verbindig fehlgschlage. Bitte nomal probiere.');
    }
    finally {
      busy = false;
      buttons.forEach((button, index) => { button.disabled = disabled[index]; });
      if (authPending) setTimeout(drainAuth, 0);
    }
  }
  function drainAuth() {
    if (busy || !authPending) return;
    authPending = false;
    action(() => authenticate());
  }
  function clearRecovery() {
    recovery = false; recoveryUser = null; sessionStorage.removeItem(recoveryKey);
  }
  function passwordValue(form) {
    if (!form.reportValidity()) return null;
    if (form.elements.password.value !== form.elements.confirmPassword.value)
      throw Error('D Passwörter stimmed nöd überii.');
    return form.elements.password.value;
  }
  function resetPasswordChange() {
    const form = el('account-change-password');
    form.reset(); el('account-password-nonce').hidden = true;
    form.elements.nonce.disabled = true; form.elements.nonce.required = false;
  }
  function bind(id, event, handler, report = status) {
    el(id).addEventListener(event, e => { e.preventDefault(); action(() => handler(e), report); });
  }
  async function refresh(onlyChanges = false) {
    if (!shared?.id) return;
    const version = generation, target = shared.id, request = ++refreshSequence;
    const snapshot = await shared.load(currentSnapshot);
    if (generation !== version || shared.id !== target || request !== refreshSequence) return;
    el('account-connection').hidden = true;
    if (onlyChanges && currentSnapshot &&
        currentSnapshot.householdRevision === snapshot.householdRevision &&
        JSON.stringify(currentSnapshot.recipeVersions) === JSON.stringify(snapshot.recipeVersions) &&
        JSON.stringify(currentSnapshot.revisions) === JSON.stringify(snapshot.revisions) &&
        JSON.stringify(currentSnapshot.plan) === JSON.stringify(snapshot.plan)) return;
    currentSnapshot = snapshot;
    onSnapshot(snapshot);
    el('account-identity').textContent = user.email + ' · ' + snapshot.household.name;
  }
  async function selectHousehold(id) {
    const version = ++generation;
    shared.id = id;
    lock(); stage('loading');
    await refresh();
    if (version !== generation || shared.id !== id) return;
    localStorage.setItem('wachochemer:activeHousehold:' + user.id, id);
    await members();
    await factors();
    if (version !== generation || shared.id !== id) return;
    startup.hidden = true; app.hidden = false; gate.hidden = true;
  }
  async function members() {
    if (!shared.id) return;
    const target = shared.id, version = generation;
    const people = unwrap(await client.rpc('household_people', {target}));
    const invitations = unwrap(await client.from('household_invitations').select('id,email,expires_at,email_sent_at').eq('household_id', target));
    if (version !== generation || shared.id !== target) return;
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
      const row = document.createElement('div');
      row.className = 'invitation-row';
      const summary = document.createElement('p');
      const expires = new Date(invitation.expires_at);
      const expired = expires.getTime() <= Date.now();
      summary.textContent = invitation.email + (expired ? ' · Abgloffe' : ' · Offe bis ' + expires.toLocaleDateString('de-CH'));
      row.append(summary);
      if (!expired) {
        if (invitation.email_sent_at) {
          const sentAt = new Date(invitation.email_sent_at);
          summary.textContent += ' · Per E-Mail verschickt am ' + sentAt.toLocaleDateString('de-CH');
        }
        const send = document.createElement('button');
        send.type = 'button';
        send.textContent = invitation.email_sent_at ? 'Nomal verschicke' : 'Per E-Mail schicke';
        send.addEventListener('click', () => action(() => {
          el('account-invite-status').scrollIntoView({block: 'nearest'});
          return sendInvitation(target, invitation.id, invitation.email);
        }, inviteStatus));
        row.append(send);
        const share = document.createElement('button');
        share.type = 'button';
        share.textContent = 'Link zum Teile';
        share.addEventListener('click', () => {
          showInvitationLink(invitation.id);
          inviteStatus('Link für ' + invitation.email + ' bereit zum Teile.');
          el('account-invite-status').scrollIntoView({block: 'nearest'});
        });
        row.append(share);
      }
      const revoke = document.createElement('button');
      revoke.type = 'button';
      revoke.textContent = 'Iiladig zruggzieh';
      revoke.addEventListener('click', () => action(async () => {
        unwrap(await client.rpc('revoke_household_invitation', {target, invitation: invitation.id}));
        if (version !== generation) return;
        if (selectedInvitation === invitation.id) clearInvitationLink();
        await members();
        if (version === generation) inviteStatus('Iiladig isch zruggzoge.');
      }, inviteStatus));
      row.append(revoke);
      el('account-invitations').append(row);
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
    const version = ++generation;
    lock(); stage('loading'); clearEnrollment();
    const identity = await client.auth.getUser();
    if (version !== generation) return;
    user = identity.error?.name === 'AuthSessionMissingError' ? null : unwrap(identity).user;
    el('account-gate-logout').hidden = !user;
    if (!user) { clearRecovery(); stage('login'); return; }
    if (recoveryUser && recoveryUser !== user.id) clearRecovery();
    const assurance = unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel());
    if (version !== generation) return;
    if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
      stage('challenge');
      el('account-challenge-hint').textContent = recovery
        ? 'Bestätige zuerst din Authenticator-Code. Danach chasch es neus Passwort wähle.'
        : 'Bestätige dini Aameldig mit dim Authenticator.';
      const list = unwrap(await client.auth.mfa.listFactors()).totp.filter(f => f.status === 'verified');
      if (version !== generation) return;
      el('account-factor').replaceChildren(...list.map(f => new Option(f.friendly_name || 'Authenticator', f.id)));
      return;
    }
    if (recovery) { stage('password'); return; }
    const households = await shared.list();
    if (version !== generation) return;
    stage('households');
    const pending = sessionStorage.getItem('wachochemer:invitation');
    const matchesInvitation = invitationInfo && user.email.toLowerCase() === invitationInfo.email.toLowerCase();
    el('account-accept').hidden = !pending || !matchesInvitation;
    el('account-accept').textContent = invitationInfo ? 'Em Haushalt «' + invitationInfo.household_name + '» biiträte' : 'Iiladig aanäh';
    el('account-create').hidden = Boolean(pending);
    if (pending && invitationInfo && !matchesInvitation)
      status('Du bisch als ' + user.email + ' aagmeldet. Die Iiladig isch für ' + invitationInfo.email + '. Bitte abmelde und mit däre E-Mail wiiterfahre.');
    else if (pending && matchesInvitation) status('Du bisch als ' + user.email + ' aagmeldet. Nimm jetzt d Iiladig aa.');
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
    user = null; clearRecovery(); authPending = false;
    el('account-password').reset(); resetPasswordChange();
    el('account-gate-logout').hidden = true;
  }
  lock(); stage('loading');
  el('account-startup-status').textContent = 'Aameldig wird prüeft …';
  try {
    if (!backendConfig.url || !backendConfig.publishableKey) throw Error('De gemeinsame Haushalt isch no nöd fertig iigrichtet.');
    const {createClient} = await import('./vendor/supabase.js');
    const storageKey = 'sb-' + new URL(backendConfig.url).hostname.split('.')[0] + '-auth-token';
    storage = sessionStorageChoice(localStorage, sessionStorage, storageKey);
    el('account-login').elements.remember.checked = storage.remembers();
    el('account-signup').elements.remember.checked = storage.remembers();
    client = createClient(backendConfig.url, backendConfig.publishableKey, {auth: {storage, storageKey, persistSession: true, autoRefreshToken: true}});
    shared = new SharedHousehold(client);
    // The callback itself stays synchronous to avoid holding the SDK auth lock.
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        generation++;
        recovery = true; recoveryUser = session?.user.id || null;
        if (recoveryUser) sessionStorage.setItem(recoveryKey, recoveryUser);
        authPending = true;
        setTimeout(drainAuth, 0);
      }
      if (event === 'SIGNED_OUT') {
        generation++; shared.id = null; user = null; clearRecovery(); authPending = false;
        lock(); stage('login'); el('account-password').reset(); resetPasswordChange(); el('account-gate-logout').hidden = true;
      }
    });
    bind('account-login', 'submit', async () => {
      const form = el('account-login');
      storage.setRemember(form.elements.remember.checked);
      unwrap(await client.auth.signInWithPassword({email: form.elements.email.value, password: form.elements.password.value}));
      form.elements.password.value = '';
      await authenticate();
    });
    bind('account-register', 'click', () => {
      const form = el('account-signup');
      form.elements.email.value = invitationInfo?.email || el('account-login').elements.email.value;
      el('account-login').elements.password.value = '';
      stage('signup');
      status('Erstell dis eigets Konto. Wenn du scho es Konto hesch, wähl «Ich ha scho es Konto».');
      (form.elements.email.value ? form.elements.password : form.elements.email).focus();
    });
    bind('account-signup-login', 'click', () => {
      el('account-signup').elements.password.value = '';
      el('account-signup').elements.confirmPassword.value = '';
      stage('login'); status('Meld di mit dim bestehende Konto aa.');
    });
    bind('account-signup', 'submit', async () => {
      const form = el('account-signup'), password = passwordValue(form);
      if (!password) return;
      storage.setRemember(form.elements.remember.checked);
      const url = new URL(callbackUrl);
      const pending = sessionStorage.getItem('wachochemer:invitation');
      if (pending) url.searchParams.set('invite', pending);
      const result = unwrap(await client.auth.signUp({email: form.elements.email.value.trim(), password,
        options: {emailRedirectTo: url.href}}));
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
      el('account-login').elements.email.value = form.elements.email.value;
      if (result.session) { await authenticate(); return; }
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
      const form = el('account-password'), password = passwordValue(form);
      if (!password) return;
      const assurance = unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel());
      if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
        await authenticate(); return;
      }
      unwrap(await client.auth.updateUser({password}));
      form.reset(); clearRecovery(); stage('households');
      try { await authenticate(); status('Dis Passwort isch gänderet.'); }
      catch (error) { status('Dis Passwort isch gänderet. ' + error.message); }
    });
    bind('account-change-password', 'submit', async () => {
      const form = el('account-change-password'), password = passwordValue(form);
      if (!password) return;
      const result = await client.auth.updateUser({password, ...(form.elements.nonce.value ? {nonce: form.elements.nonce.value} : {})});
      if (result.error?.code === 'reauthentication_needed') {
        unwrap(await client.auth.reauthenticate());
        el('account-password-nonce').hidden = false;
        form.elements.nonce.disabled = false; form.elements.nonce.required = true;
        form.elements.nonce.focus();
        status('Bestätige de Passwortwechsel mit em Code us de E-Mail.');
        return;
      }
      if (result.error?.code === 'insufficient_aal') {
        recovery = true; recoveryUser = user.id; sessionStorage.setItem(recoveryKey, user.id);
        el('account-password').elements.password.value = password;
        el('account-password').elements.confirmPassword.value = password;
        resetPasswordChange(); await authenticate(); return;
      }
      unwrap(result);
      resetPasswordChange();
      status('Dis Passwort isch gänderet.');
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
      invitationInfo = null; el('account-invitation').hidden = true;
      for (const form of ['account-login', 'account-signup']) el(form).elements.email.readOnly = false;
      const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url);
      await selectHousehold(id);
    });
    bind('account-switch', 'click', () => { shared.id = null; return authenticate(false); });
    bind('account-retry', 'click', async () => { await loadInvitation(); await authenticate(); });
    bind('account-dismiss-invitation', 'click', async () => {
      sessionStorage.removeItem('wachochemer:invitation'); invitationInfo = null;
      const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url);
      el('account-invitation').hidden = true;
      el('account-register').hidden = false;
      for (const id of ['account-login', 'account-signup']) el(id).elements.email.readOnly = false;
      await authenticate();
    });
    bind('account-logout', 'click', logout); bind('account-gate-logout', 'click', logout);
    bind('account-invite', 'submit', async event => {
      const form = el('account-invite');
      if (!form.reportValidity()) return;
      const email = form.elements.email.value.trim().toLowerCase();
      const version = generation, target = shared.id;
      const id = unwrap(await client.rpc('invite_household_member', {target, target_email: email}));
      if (version !== generation || shared.id !== target) return;
      form.reset();
      clearInvitationLink();
      if (event.submitter?.value !== 'link') {
        await sendInvitation(target, id, email);
        return;
      }
      showInvitationLink(id);
      inviteStatus('Link für ' + email + ' bereit zum Teile.');
      await updateInvitationList(version);
    }, inviteStatus);
    bind('account-copy', 'click', async () => {
      try {
        await navigator.clipboard.writeText(el('account-link').value);
        inviteStatus('Link kopiert. Jetzt chasch ihn i dini Nachricht iifüege.');
      } catch {
        el('account-link').select();
        inviteStatus('Kopier de markierti Link im Textfeld.');
      }
    }, inviteStatus);
    bind('account-share', 'click', async () => {
      try {
        await navigator.share({title: 'Iiladig zu Wa chochemer?', url: el('account-link').value});
      } catch (error) {
        if (error.name !== 'AbortError') inviteStatus('Teile het nöd klappt. Du chasch de Link kopiere.');
      }
    }, inviteStatus);
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
      try { await refresh(true); }
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
    await loadInvitation();
    if (session) await authenticate();
    else { stage('login'); status('Meld di aa oder erstell mit diner Iiladig es neus Konto.'); }
  } catch (error) { stage('login'); status(error.message); }
  finally { clearTimeout(startupTimer); }
  return {
    async importRecipe(target, input) {
      if (!target || shared.id!==target || !currentSnapshot || !gate.hidden) throw Error('Bitte zuerst de Haushalt lade.');
      const result=await client.functions.invoke('recipe-import',{body:{...input,householdId:target}});
      if (result.error) {
        const body=await result.error.context?.json?.().catch(()=>null);
        throw Object.assign(Error('Import fehlgschlage. Bitte Verbindig prüefe.'),{code:body?.code});
      }
      return result.data;
    },
    async saveRecipe(target,id,revision,draft) {
      if (!target || shared.id!==target || !currentSnapshot || !gate.hidden) throw Error('Bitte zuerst de Haushalt lade.');
      const version=generation;
      unwrap(await client.rpc('save_household_recipe',{target,recipe_id:id,expected:revision,draft}));
      if(version!==generation)return {refreshed:false};
      try{await refresh();return {refreshed:true};}catch{return {refreshed:false};}
    },
    async deleteRecipe(target,id,revision) {
      if (!target || shared.id!==target || !currentSnapshot || !gate.hidden) throw Error('Bitte zuerst de Haushalt lade.');
      const version=generation;
      unwrap(await client.rpc('delete_household_recipe',{target,recipe_id:id,expected:revision}));
      if(version!==generation)return {refreshed:false};
      try{await refresh();return {refreshed:true};}catch{return {refreshed:false};}
    },
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
