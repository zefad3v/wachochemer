import {sessionStorageChoice} from './auth-session.mjs';
import {backendConfig} from './backend-config.js';
import {SharedHousehold, unwrap} from '../src/storage/shared-household.mjs?v=20261122-import-polish';

export const cloudEnabled = Boolean(backendConfig.url || backendConfig.publishableKey);
const html = `
<section id="account-gate" class="account-gate" hidden>
  <div class="account-panel">
    <h1>Wa chochemer</h1>
    <section id="account-invitation" class="invitation-preview" hidden>
      <h2 id="account-invitation-title"></h2>
      <p id="account-invitation-detail"></p>
      <button type="button" id="account-dismiss-invitation">Ohne Einladung fortfahren</button>
    </section>
    <p id="account-status" role="status"></p>
    <form id="account-login">
      <h2>Anmelden</h2>
      <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Passwort<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
      <label class="remember-choice"><input name="remember" type="checkbox" role="switch" checked>Angemeldet bleiben</label>
      <button class="main-action" type="submit">Anmelden</button>
      <p>Noch kein Konto?</p>
      <button type="button" id="account-register">Neues Konto erstellen</button>
      <button type="button" id="account-reset">Passwort vergessen</button>
    </form>
    <form id="account-signup" hidden>
      <h2>Neues Konto erstellen</h2>
      <p>Wähle ein Passwort mit mindestens 8 Zeichen. Bestätige danach deine E-Mail-Adresse und nimm die Einladung an.</p>
      <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Neues Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Passwort wiederholen<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <label class="remember-choice"><input name="remember" type="checkbox" role="switch" checked>Angemeldet bleiben</label>
      <button class="main-action" type="submit">Konto erstellen</button>
      <button type="button" id="account-signup-login">Ich habe bereits ein Konto</button>
    </form>
    <section id="account-confirmation" hidden>
      <h2 id="account-confirmation-title" tabindex="-1">Bitte E-Mail-Adresse bestätigen</h2>
      <p>Öffne die Bestätigungsmail für <strong id="account-confirmation-email"></strong> und tippe auf «E-Mail-Adresse bestätigen».</p>
      <p>Schau auch im Spamordner nach, falls die E-Mail fehlt.</p>
      <button type="button" id="account-back-to-login">Zurück zur Anmeldung</button>
    </section>
    <form id="account-password" hidden>
      <p>Wähle ein neues Passwort mit mindestens 8 Zeichen.</p>
      <label>Neues Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Passwort wiederholen<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="main-action">Passwort speichern</button>
    </form>
    <form id="account-challenge" hidden>
      <p id="account-challenge-hint">Bestätige deine Anmeldung mit deiner Authenticator-App.</p>
      <label>Authenticator<select id="account-factor"></select></label>
      <label>Bestätigungscode<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" required></label>
      <button class="main-action">Bestätigen</button>
    </form>
    <section id="account-households" hidden>
      <h2>Dein Haushalt</h2><div id="account-household-list"></div>
      <button type="button" id="account-accept" hidden>Einladung annehmen</button>
      <form id="account-create">
        <label>Haushaltsname<input name="name" maxlength="100" required placeholder="Unser Haushalt"></label>
        <button class="main-action">Haushalt erstellen</button>
      </form>
    </section>
    <button type="button" id="account-retry">Neu laden</button>
    <button type="button" id="account-gate-logout" hidden>Abmelden</button>
  </div>
</section>`;
const settings = `
<section id="account-settings" class="settings-card account-panel">
  <h2>Konto und Haushalt</h2><p id="account-identity"></p>
  <output id="account-settings-status" role="status"></output>
  <button type="button" id="account-switch">Haushalt wechseln</button>
  <button type="button" id="account-logout">Abmelden</button>
  <details><summary>Passwort ändern</summary>
    <form id="account-change-password">
      <label>Neues Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Passwort wiederholen<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <label id="account-password-nonce" hidden>Code aus der E-Mail<input name="nonce" disabled inputmode="numeric" autocomplete="one-time-code"></label>
      <button>Passwort speichern</button>
    </form>
  </details>
  <details><summary>Mitglieder und Einladungen</summary>
    <div id="account-members"></div>
    <form id="account-invite">
      <label>E-Mail-Adresse der Person<input name="email" type="email" required></label>
      <button type="submit" value="send" class="main-action">Einladung per E-Mail senden</button>
      <button type="submit" value="link">Link zum Teilen erstellen</button>
    </form>
    <output id="account-invite-status" role="status"></output>
    <label id="account-link-label" hidden>Einladungslink zum Teilen<input id="account-link" readonly></label>
    <button type="button" id="account-copy" hidden>Link kopieren</button>
    <button type="button" id="account-share" hidden>Link teilen</button>
    <div id="account-invitations"></div>
  </details>
  <details><summary>Zwei-Faktor-Anmeldung</summary>
    <p>Füge eine Authenticator-App hinzu. Mit einer zweiten hast du bei einem Geräteverlust weiterhin Zugang.</p>
    <div id="account-factors"></div>
    <button type="button" id="account-enroll">Authenticator hinzufügen</button>
    <form id="account-enrollment" hidden>
      <img id="account-qr" alt="QR-Code für die Authenticator-App">
      <label>Schlüssel zur manuellen Eingabe<input id="account-secret" readonly></label>
      <label>Bestätigungscode<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" required></label>
      <button>Aktivieren</button><button type="button" id="account-cancel-enroll">Abbrechen</button>
    </form>
  </details>
  <details><summary>Plan von diesem Gerät übernehmen</summary>
    <p>Übernimm den lokalen Plan in den leeren Wochenplan deines Haushalts.</p>
    <button type="button" id="account-import">Lokalen Plan übernehmen</button>
  </details>
</section>`;

export async function startAccount({onSnapshot, onLock, onImport}) {
  document.body.insertAdjacentHTML('afterbegin', html);
  document.querySelector('#household-form').insertAdjacentHTML('afterend', settings);
  document.querySelector('.settings-note').textContent = 'Dein Haushalt und der Wochenplan werden online gespeichert. Die Anzeigeeinstellungen gelten für diesen Browser.';
  // Account tasks get separate panels, with a stable full-width navigation list.
  const account = document.getElementById('account-settings');
  const navigation = document.createElement('nav');
  navigation.className = 'account-navigation';
  navigation.setAttribute('aria-label', 'Kontoeinstellungen');
  for (const detail of [...account.querySelectorAll(':scope > details')]) {
    const summary = detail.querySelector('summary');
    const label = summary.textContent;
    summary.remove();
    const panel = document.createElement('section');
    panel.className = 'account-task'; panel.hidden = true;
    const heading = document.createElement('h3'); heading.textContent = label; heading.tabIndex = -1;
    const back = document.createElement('button'); back.type = 'button'; back.textContent = 'Kontoeinstellungen';
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
    el('account-startup-status').textContent = 'Das Laden dauert länger. Bitte prüfe deine Internetverbindung.';
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
    el('account-invitation-title').textContent = 'Deine Einladung';
    el('account-invitation-detail').textContent = 'Einladung wird geprüft …';
    try {
      if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pending))
        invitationInfo = unwrap(await client.rpc('household_invitation_preview', {invitation: pending}));
      if (!invitationInfo) {
        el('account-invitation-detail').textContent = 'Diese Einladung ist abgelaufen oder wurde zurückgezogen. Bitte fordere einen neuen Link an.';
        return;
      }
      el('account-invitation-title').textContent = 'Einladung zum Haushalt «' + invitationInfo.household_name + '»';
      el('account-invitation-detail').textContent = 'Für ' + invitationInfo.email + '. Melde dich an oder erstelle ein Konto. Danach kannst du dem Haushalt beitreten.';
      for (const id of ['account-login', 'account-signup']) {
        el(id).elements.email.value = invitationInfo.email;
        el(id).elements.email.readOnly = true;
      }
    } catch {
      el('account-invitation-detail').textContent = 'Die Einladung konnte nicht geladen werden. Prüfe deine Internetverbindung und tippe auf «Neu laden».';
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
      if (version === generation) inviteStatus(el('account-invite-status').textContent + ' Die Liste konnte nicht aktualisiert werden.');
    }
  }

  async function sendInvitation(target, invitation, email) {
    const version = generation;
    inviteStatus('Einladung wird gesendet …');
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
    if (sent) inviteStatus('Einladung per E-Mail gesendet an ' + email + '.');
    else {
      showInvitationLink(invitation);
      inviteStatus(wait
        ? 'Bitte warte vor dem nächsten Versand. Du kannst den Link bereits teilen.'
        : 'Der Versand wurde nicht bestätigt. Teile den Link oder versuche es erneut.');
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
      report(error.message || 'Verbindung fehlgeschlagen. Bitte versuche es erneut.');
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
      throw Error('Die Passwörter stimmen nicht überein.');
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
      button.textContent = person.user_id === user.id ? 'Haushalt verlassen' : 'Entfernen';
      button.disabled = people.length === 1;
      button.addEventListener('click', () => {
        if (people.length === 1 || !confirm(person.email + ' aus diesem Haushalt entfernen?')) return;
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
      summary.textContent = invitation.email + (expired ? ' · Abgelaufen' : ' · Offen bis ' + expires.toLocaleDateString('de-CH'));
      row.append(summary);
      if (!expired) {
        if (invitation.email_sent_at) {
          const sentAt = new Date(invitation.email_sent_at);
          summary.textContent += ' · Per E-Mail verschickt am ' + sentAt.toLocaleDateString('de-CH');
        }
        const send = document.createElement('button');
        send.type = 'button';
        send.textContent = invitation.email_sent_at ? 'Erneut senden' : 'Per E-Mail senden';
        send.addEventListener('click', () => action(() => {
          el('account-invite-status').scrollIntoView({block: 'nearest'});
          return sendInvitation(target, invitation.id, invitation.email);
        }, inviteStatus));
        row.append(send);
        const share = document.createElement('button');
        share.type = 'button';
        share.textContent = 'Link zum Teilen';
        share.addEventListener('click', () => {
          showInvitationLink(invitation.id);
          inviteStatus('Link für ' + invitation.email + ' ist bereit zum Teilen.');
          el('account-invite-status').scrollIntoView({block: 'nearest'});
        });
        row.append(share);
      }
      const revoke = document.createElement('button');
      revoke.type = 'button';
      revoke.textContent = 'Einladung zurückziehen';
      revoke.addEventListener('click', () => action(async () => {
        unwrap(await client.rpc('revoke_household_invitation', {target, invitation: invitation.id}));
        if (version !== generation) return;
        if (selectedInvitation === invitation.id) clearInvitationLink();
        await members();
        if (version === generation) inviteStatus('Einladung zurückgezogen.');
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
      button.textContent = 'Entfernen';
      button.addEventListener('click', () => {
        if (!confirm('Diesen Authenticator entfernen?')) return;
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
        ? 'Bestätige zuerst deinen Authenticator-Code. Danach kannst du ein neues Passwort wählen.'
        : 'Bestätige deine Anmeldung mit deiner Authenticator-App.';
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
    el('account-accept').textContent = invitationInfo ? 'Dem Haushalt «' + invitationInfo.household_name + '» beitreten' : 'Einladung annehmen';
    el('account-create').hidden = Boolean(pending);
    if (pending && invitationInfo && !matchesInvitation)
      status('Du bist als ' + user.email + ' angemeldet. Die Einladung ist für ' + invitationInfo.email + '. Bitte melde dich ab und verwende diese E-Mail-Adresse.');
    else if (pending && matchesInvitation) status('Du bist als ' + user.email + ' angemeldet. Du kannst die Einladung jetzt annehmen.');
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
  el('account-startup-status').textContent = 'Anmeldung wird geprüft …';
  try {
    if (!backendConfig.url || !backendConfig.publishableKey) throw Error('Der gemeinsame Haushalt ist noch nicht eingerichtet.');
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
      status('Erstelle dein eigenes Konto. Hast du schon eines, wähle «Ich habe bereits ein Konto».');
      (form.elements.email.value ? form.elements.password : form.elements.email).focus();
    });
    bind('account-signup-login', 'click', () => {
      el('account-signup').elements.password.value = '';
      el('account-signup').elements.confirmPassword.value = '';
      stage('login'); status('Melde dich mit deinem bestehenden Konto an.');
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
      status('Wenn ein Konto mit dieser Adresse existiert, erhältst du einen Link per E-Mail.');
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
      try { await authenticate(); status('Dein Passwort wurde geändert.'); }
      catch (error) { status('Dein Passwort wurde geändert. ' + error.message); }
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
        status('Bestätige die Passwortänderung mit dem Code aus der E-Mail.');
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
      status('Dein Passwort wurde geändert.');
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
      inviteStatus('Link für ' + email + ' ist bereit zum Teilen.');
      await updateInvitationList(version);
    }, inviteStatus);
    bind('account-copy', 'click', async () => {
      try {
        await navigator.clipboard.writeText(el('account-link').value);
        inviteStatus('Link kopiert. Du kannst ihn jetzt in deine Nachricht einfügen.');
      } catch {
        el('account-link').select();
        inviteStatus('Kopiere den markierten Link im Textfeld.');
      }
    }, inviteStatus);
    bind('account-share', 'click', async () => {
      try {
        await navigator.share({title: 'Einladung zu Wa chochemer', url: el('account-link').value});
      } catch (error) {
        if (error.name !== 'AbortError') inviteStatus('Der Link konnte nicht geteilt werden. Du kannst ihn kopieren.');
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
      clearEnrollment(); status('Zwei-Faktor-Anmeldung aktiviert.'); await factors();
    });
    bind('account-import', 'click', async () => { await onImport(shared); await refresh(); status('Lokaler Plan übernommen.'); });
    const poll = async () => {
      if (busy || document.hidden || !shared.id || !gate.hidden || document.querySelector('dialog[open]')) return;
      const version = generation;
      try { await refresh(true); }
      catch (error) {
        if (version !== generation) return;
        if (error.code === '42501' || error.code === 'PGRST301') {
          generation++; lock(); stage('households'); status(error.message);
        } else {
          el('account-connection').textContent = 'Die Verbindung ist unterbrochen. Änderungen können im Moment nicht gespeichert werden.';
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
    else { stage('login'); status('Melde dich an oder erstelle mit deiner Einladung ein Konto.'); }
  } catch (error) { stage('login'); status(error.message); }
  finally { clearTimeout(startupTimer); }
  return {
    async importRecipe(target, input) {
      if (!target || shared.id!==target || !currentSnapshot || !gate.hidden) throw Error('Bitte lade zuerst deinen Haushalt.');
      const result=await client.functions.invoke('recipe-import',{body:{...input,householdId:target}});
      if (result.error) {
        const body=await result.error.context?.json?.().catch(()=>null);
        throw Object.assign(Error('Import fehlgeschlagen. Bitte prüfe deine Internetverbindung.'),{code:body?.code});
      }
      return result.data;
    },
    async saveRecipe(target,id,revision,draft) {
      if (!target || shared.id!==target || !currentSnapshot || !gate.hidden) throw Error('Bitte lade zuerst deinen Haushalt.');
      const version=generation;
      unwrap(await client.rpc('save_household_recipe',{target,recipe_id:id,expected:revision,draft}));
      if(version!==generation)return {refreshed:false};
      try{await refresh();return {refreshed:true};}catch{return {refreshed:false};}
    },
    async deleteRecipe(target,id,revision) {
      if (!target || shared.id!==target || !currentSnapshot || !gate.hidden) throw Error('Bitte lade zuerst deinen Haushalt.');
      const version=generation;
      unwrap(await client.rpc('delete_household_recipe',{target,recipe_id:id,expected:revision}));
      if(version!==generation)return {refreshed:false};
      try{await refresh();return {refreshed:true};}catch{return {refreshed:false};}
    },
    async saveMeal(key, entry, revision) {
      if (!shared?.id || !currentSnapshot || !gate.hidden) throw Error('Bitte melde dich an und lade deinen Haushalt.');
      const version = generation;
      await shared.saveMeal(key, entry, revision);
      if (version !== generation) return;
      await refresh();
    },
    async saveSettings(profile, revision) {
      if (!shared?.id || !currentSnapshot || !gate.hidden) throw Error('Bitte lade zuerst deinen Haushalt.');
      const version = generation;
      await shared.saveSettings(profile, revision);
      if (version !== generation) return;
      await refresh();
    },
    refresh
  };
}
