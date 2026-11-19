import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionStorageChoice} from '../prototype/auth-session.mjs';

const memory = () => {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
};

test('existing persistent sessions survive, temporary sessions stay in their tab', () => {
  const local = memory(), tab = memory();
  local.setItem('sdk-session', 'existing-token');
  const storage = sessionStorageChoice(local, tab, 'sdk-session');
  assert.equal(storage.getItem('sdk-session'), 'existing-token');
  storage.setRemember(false);
  assert.equal(local.getItem('sdk-session'), null);
  assert.equal(tab.getItem('sdk-session'), 'existing-token');
  storage.setItem('sdk-session', 'refreshed-token');
  assert.equal(sessionStorageChoice(local, tab, 'sdk-session').getItem('sdk-session'), 'refreshed-token');
  assert.equal(sessionStorageChoice(local, memory(), 'sdk-session').getItem('sdk-session'), null);
  storage.setRemember(true);
  assert.equal(local.getItem('sdk-session'), 'refreshed-token');
  assert.equal(tab.getItem('sdk-session'), null);
  storage.removeItem('sdk-session');
  assert.equal(storage.getItem('sdk-session'), null);
});
