export function unwrap(result) {
  if (result.error) {
    const byCode = {
      '40001': 'Zwüscheziitlich geändert. Bitte neu lade und dini Änderig nomal prüefe.',
      invalid_credentials: 'E-Mail oder Passwort stimmt nöd.',
      email_not_confirmed: 'Bitte zuerst dini E-Mail bestätige.',
      mfa_verification_failed: 'De Code stimmt nöd oder isch abgloffe. Bitte nomal probiere.',
      over_email_send_rate_limit: 'Bitte warte, bevor du nomal en E-Mail-Link aforderisch.',
      same_password: 'S neue Passwort muess anders sii als dis bisherigs.',
      insufficient_aal: 'Bitte zuerst din Authenticator-Code bestätige.',
      mfa_challenge_expired: 'De Code isch abgloffe. Bitte en aktuelle Authenticator-Code iigäh.',
      otp_expired: 'Dä Link isch abgloffe oder scho verwendet. Bitte en neue Link afordere.',
      session_not_found: 'Dini Aameldig isch abgloffe. Bitte nomal aamelde.',
      session_expired: 'Dini Aameldig isch abgloffe. Bitte nomal aamelde.',
      reauthentication_needed: 'Bitte bestätige dini Identität, zum s Passwort z ändere.',
      reauthentication_not_valid: 'De Bestätigungscode stimmt nöd oder isch abgloffe.',
      over_request_rate_limit: 'Z viel Versüech. Bitte warte und nomal probiere.',
      weak_password: 'Bitte es stärkeres Passwort wähle.'
    };
    const byMessage = {
      'Sign-in verification required': 'Bitte aamelde und dini E-Mail beziehungsweise de zweite Faktor bestätige.',
      'Household access denied': 'Du hesch kei Zuegang zu däm Haushalt. Bitte Mitgliedschaft prüefe.',
      'Invitation unavailable for this account': 'D Iiladig isch abgloffe, zruggzoge oder für e anderi E-Mail.',
      'The household must keep one member': 'Mindestens ei Person muess im Haushalt bliibe.',
      'Import needs an empty household plan': 'De gemeinsame Plan enthält scho Menüs. De Import brucht en leere Plan.',
      'Not enough leftover portions': 'Es sind nöd gnueg Reschte verfügbar. Bitte de aktuelle Plan lade.',
      'Meal has reserved leftover portions': 'Vo däm Menü sind bereits Reschte reserviert.',
      'Failed to fetch': 'Kei Verbindig. Bitte Internet prüefe und nomal probiere.'
    };
    const error = new Error(byCode[result.error.code] || byMessage[result.error.message] || result.error.message);
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

export function decodeSnapshot(data) {
  if (!data) throw Object.assign(Error('Haushalt nöd verfügbar. Bitte Mitgliedschaft prüefe.'), {code: '42501'});
  const h = data.household;
  return {
    householdId: h.id,
    householdRevision: String(h.revision),
    household: {
      name: h.name, adults: h.adults, children: h.children, babies: h.babies,
      adultsShare: Number(h.adults_share), childrenShare: Number(h.children_share), babiesShare: Number(h.babies_share)
    },
    recipeShares: h.recipe_shares, extras: h.shopping_extras,
    plan: {version: 2, entries: Object.fromEntries(data.meals.map(m => [m.day + '|' + m.slot, m.entry]))},
    revisions: Object.fromEntries(data.meals.map(m => [m.day + '|' + m.slot, String(m.revision)]))
  };
}

export class SharedHousehold {
  constructor(client) { this.client = client; this.id = null; }
  async list() {
    return unwrap(await this.client.from('households').select('id,name').order('name'));
  }
  async load() {
    if (!this.id) throw Error('Bitte en Haushalt wähle.');
    return decodeSnapshot(unwrap(await this.client.rpc('household_snapshot', {target: this.id})));
  }
  async saveMeal(key, entry, revision) {
    const [day, slot] = key.split('|');
    unwrap(await this.client.rpc('save_household_meal', {
      target: this.id, meal_day: day, meal_slot: slot, expected_revision: revision ?? '0', meal_entry: entry
    }));
  }
  async saveSettings(profile, revision) {
    unwrap(await this.client.rpc('save_household_settings', {
      target: this.id, expected_revision: revision, profile
    }));
  }
  async importPlan(entries, importId) {
    unwrap(await this.client.rpc('import_household_plan', {target: this.id, entries, import_id: importId}));
  }
}
