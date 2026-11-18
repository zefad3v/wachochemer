import test from 'node:test';
import assert from 'node:assert/strict';
import {publicConfig} from '../scripts/configure-backend.mjs';

test('browser configuration accepts public keys and rejects administrative secrets', () => {
  const url = 'https://wachochemer.supabase.co';
  assert.equal(publicConfig(url, 'sb_publishable_example').url, url);
  const jwt = role => 'header.' + Buffer.from(JSON.stringify({role})).toString('base64url') + '.signature';
  assert.equal(publicConfig(url, jwt('anon')).publishableKey, jwt('anon'));
  for (const key of ['sb_secret_example', jwt('service_role'), jwt('authenticated'), 'invalid', ''])
    assert.throws(() => publicConfig(url, key));
  for (const target of ['http://example.org', url + '/auth', 'https://user:password@example.org', url + '?key=secret'])
    assert.throws(() => publicConfig(target, 'sb_publishable_example'));
});
