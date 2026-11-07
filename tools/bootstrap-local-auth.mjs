import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { defaultTokenPath } from '../src/lib/local-auth.mjs';

const path = defaultTokenPath();
const rotate = process.argv.includes('--rotate');

if (!path || !isAbsolute(path)) {
  console.error('Set OSIRIS_LOCAL_TOKEN_FILE to an absolute file path inside this project, for example "$PWD/.local-auth/local-token".');
  console.error('This command does not create or read a shared home-directory token.');
  process.exit(1);
}

const sharedHome = `${homedir()}/.config/osiris`;
if (path === sharedHome || path.startsWith(`${sharedHome}/`)) {
  console.error('Refusing a shared home-directory token path. Use a project-private OSIRIS_LOCAL_TOKEN_FILE.');
  process.exit(1);
}

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

const directory = dirname(path);
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
const token = randomBytes(32).toString('base64url');
writeFileSync(path, `${token}\n`, { mode: 0o600, flag: rotate ? 'w' : 'wx' });
chmodSync(path, 0o600);
console.log(`Wrote a new local credential to ${path}`);
console.log('Directory mode 0700, file mode 0600. The value was not printed.');
