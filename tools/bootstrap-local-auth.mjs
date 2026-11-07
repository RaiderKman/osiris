import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaultTokenPath } from '../src/lib/local-auth.mjs';

const path = defaultTokenPath();
const rotate = process.argv.includes('--rotate');

try {
  const info = statSync(path);
  if (info.isFile() && !rotate) {
    console.log(`Local credential file already exists: ${path}`);
    console.log('Leave it in place. Pass --rotate to replace it. This command does not print the credential.');
    process.exit(0);
  }
} catch {
  /* first run */
}

mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const token = randomBytes(32).toString('base64url');
writeFileSync(path, `${token}\n`, { mode: 0o600, flag: rotate ? 'w' : 'wx' });
console.log(`Wrote a new local credential to ${path}`);
console.log('Mode 0600. The value was not printed. Paste it into the local sign-in form, then clear the shell scrollback if you displayed the file.');
