import { mkdtempSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { loadLocalToken, resetLocalTokenCache } from './local-auth.mjs';

const scratch: string[] = [];

afterEach(() => {
  delete process.env.OSIRIS_LOCAL_TOKEN;
  delete process.env.OSIRIS_LOCAL_TOKEN_FILE;
  resetLocalTokenCache();
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('project credential file', () => {
  it('uses the file and ignores a conflicting environment value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'osiris-auth-'));
    chmodSync(dir, 0o700);
    scratch.push(dir);
    const file = join(dir, 'local-token');
    const fileSecret = randomBytes(32).toString('base64url');
    const envSecret = randomBytes(32).toString('base64url');
    writeFileSync(file, `${fileSecret}\n`, { mode: 0o600 });
    process.env.OSIRIS_LOCAL_TOKEN_FILE = file;
    process.env.OSIRIS_LOCAL_TOKEN = envSecret;
    resetLocalTokenCache();
    const loaded = loadLocalToken();
    expect(loaded === fileSecret).toBe(true);
    expect(loaded === envSecret).toBe(false);
  });

  it('does not invent a home-directory path when no file is configured', () => {
    delete process.env.OSIRIS_LOCAL_TOKEN_FILE;
    delete process.env.OSIRIS_LOCAL_TOKEN;
    resetLocalTokenCache();
    expect(loadLocalToken()).toBeNull();
  });
});
