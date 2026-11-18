import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function publicConfig(url, publishableKey) {
  if (!url || !publishableKey) throw Error('Project URL and public key are required.');
  const endpoint = new URL(url);
  const local = ['localhost', '127.0.0.1'].includes(endpoint.hostname);
  if ((endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:'))
    || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/')
    throw Error('Use the HTTPS project origin, without credentials or a path.');
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey);
  if (!publicKey && publishableKey.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url')).role === 'anon'; }
    catch { publicKey = false; }
  }
  if (!publicKey) throw Error('Only a publishable key or legacy anon key may be shipped to the browser.');
  return {url: endpoint.origin, publishableKey};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = publicConfig(process.env.WACHOCHEMER_SUPABASE_URL, process.env.WACHOCHEMER_SUPABASE_PUBLISHABLE_KEY);
  writeFileSync(new URL('../prototype/backend-config.js', import.meta.url),
    '// Public connection settings. Database policies enforce access.\nexport const backendConfig = '
      + JSON.stringify(config, null, 2) + ';\n');
  console.log('Configured Wachochemer for ' + config.url);
}
