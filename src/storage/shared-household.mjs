export function unwrap(result) {
  if (result.error) {
    const byCode = {
      '40001': 'Der Eintrag wurde inzwischen geändert. Lade die aktuelle Version und prüfe deine Änderungen erneut.',
      invalid_credentials: 'E-Mail-Adresse oder Passwort ist falsch.',
      email_not_confirmed: 'Bestätige zuerst deine E-Mail-Adresse.',
      mfa_verification_failed: 'Der Code ist ungültig oder abgelaufen. Bitte versuche es erneut.',
      over_email_send_rate_limit: 'Bitte warte, bevor du einen weiteren Link anforderst.',
      same_password: 'Wähle ein anderes Passwort als dein bisheriges.',
      insufficient_aal: 'Bestätige zuerst deinen Authenticator-Code.',
      mfa_challenge_expired: 'Der Code ist abgelaufen. Gib einen aktuellen Authenticator-Code ein.',
      otp_expired: 'Dieser Link ist abgelaufen oder wurde bereits verwendet. Fordere einen neuen Link an.',
      session_not_found: 'Deine Sitzung ist abgelaufen. Melde dich erneut an.',
      session_expired: 'Deine Sitzung ist abgelaufen. Melde dich erneut an.',
      reauthentication_needed: 'Bestätige deine Identität, um das Passwort zu ändern.',
      reauthentication_not_valid: 'Der Bestätigungscode ist ungültig oder abgelaufen.',
      over_request_rate_limit: 'Zu viele Versuche. Warte bitte und versuche es erneut.',
      weak_password: 'Bitte wähle ein stärkeres Passwort.'
    };
    const byMessage = {
      'Sign-in verification required': 'Melde dich an und bestätige deine E-Mail-Adresse oder deinen zweiten Faktor.',
      'Household access denied': 'Du hast keinen Zugriff auf diesen Haushalt. Prüfe deine Mitgliedschaft.',
      'Invitation unavailable for this account': 'Die Einladung ist abgelaufen, wurde zurückgezogen oder gilt für eine andere E-Mail-Adresse.',
      'The household must keep one member': 'Mindestens eine Person muss im Haushalt bleiben.',
      'Import needs an empty household plan': 'Der gemeinsame Plan enthält bereits Menüs. Der Import ist nur in einen leeren Plan möglich.',
      'Not enough leftover portions': 'Es sind zu wenige Resten verfügbar. Lade den aktuellen Plan.',
      'Meal has reserved leftover portions': 'Für dieses Menü sind bereits Resten reserviert.',
      'Invalid household count': 'Prüfe die Personenzahl im Haushalt.',
      'Invalid household portions': 'Prüfe die Portionsgrössen deines Haushalts.',
      'Invalid household preferences': 'Prüfe die Haushaltseinstellungen.',
      'Invalid import': 'Der Plan konnte nicht importiert werden.',
      'Invalid ingredient': 'Prüfe Name, Menge und Einheit der Zutat.',
      'Invalid leftover portions or source': 'Prüfe die Menge und die Herkunft der Resten.',
      'Invalid meal key': 'Prüfe Datum und Mahlzeit.',
      'Invalid meal title': 'Gib einen gültigen Menütitel ein.',
      'Invalid meal type': 'Wähle eine gültige Menüart.',
      'Invalid recipe portions': 'Prüfe die Portionszahl des Rezepts.',
      'Invalid recipe': 'Prüfe die Rezeptangaben.',
      'Invalid shopping item': 'Prüfe den Einkaufsartikel.',
      'Invalid step': 'Prüfe die Zubereitungsschritte.',
      'Invitation unavailable': 'Diese Einladung ist nicht mehr gültig.',
      'Leftovers need an earlier recipe in this household': 'Wähle als Herkunft der Resten eine frühere Mahlzeit aus diesem Haushalt.',
      'Failed to fetch': 'Keine Verbindung. Prüfe deine Internetverbindung und versuche es erneut.'
    };
    const error = new Error(byCode[result.error.code] || byMessage[result.error.message] || result.error.message);
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

export function decodeSnapshot(data) {
  if (!data) throw Object.assign(Error('Der Haushalt ist nicht verfügbar. Prüfe deine Mitgliedschaft.'), {code: '42501'});
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
  async load(previous = null) {
    if (!this.id) throw Error('Wähle einen Haushalt.');
    const target = this.id;
    const data = unwrap(await this.client.rpc('household_snapshot', {target}));
    const snapshot = decodeSnapshot(data), versions = data.recipes || [];
    const rows = new Map((previous?.householdId === target ? previous.recipeRows : []).map(row=>[row.id,row]));
    const changed = versions.filter(v=>rows.get(v.id)?.revision !== v.revision);
    for(let offset=0;offset<changed.length;offset+=50){
      const ids=changed.slice(offset,offset+50).map(row=>row.id);
      const batch=unwrap(await this.client.from('household_recipes').select('id,revision,draft')
        .eq('household_id',target).in('id',ids));
      if(batch.length!==ids.length) throw Error('Die Rezeptdaten wurden geändert. Bitte lade sie neu.');
      for(const row of batch)rows.set(row.id,row);
    }
    snapshot.recipeRows=versions.map(v=>rows.get(v.id));
    snapshot.recipeVersions=versions;
    return snapshot;
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
