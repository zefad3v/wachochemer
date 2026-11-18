import {readFileSync,readdirSync,writeFileSync} from 'node:fs';

// Supabase packages share the MIT notice distributed with auth-js. Include
// notices for every production dependency, including any build-only types.
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const notices = [];
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path || info.dev) continue;
  const pkg = JSON.parse(readFileSync(path + '/package.json', 'utf8'));
  const files = readdirSync(path).filter(name => /^licen[cs]e(?:\.[\w-]+)?$/i.test(name));
  let notice;
  if (files.length) notice = files.map(name => readFileSync(path + '/' + name, 'utf8')).join('\n');
  else if (pkg.name.startsWith('@supabase/')) notice = readFileSync('node_modules/@supabase/auth-js/LICENSE', 'utf8');
  else throw Error('License notice missing for ' + pkg.name);
  notices.push(pkg.name + ' ' + pkg.version + '\n\n' + notice.trim());
}
writeFileSync('prototype/vendor/THIRD_PARTY_LICENSES.txt', notices.join('\n\n' + '='.repeat(72) + '\n\n') + '\n');
