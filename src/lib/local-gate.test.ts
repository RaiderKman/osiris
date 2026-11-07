import { createHmac, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { SESSION_COOKIE, resetLocalTokenCache, sessionValue } from './local-auth.mjs';
import { decide, finishLogin } from './local-gate.mjs';

const token = randomBytes(32).toString('base64url');

function req(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return {
    method: init.method || 'GET',
    url: path,
    headers: { host: '127.0.0.1:3000', ...init.headers },
  };
}

afterEach(() => {
  delete process.env.OSIRIS_LOCAL_TOKEN;
  resetLocalTokenCache();
});

describe('local gate', () => {
  it('fails closed when no credential is configured', () => {
    resetLocalTokenCache();
    delete process.env.OSIRIS_LOCAL_TOKEN;
    const decision = decide(req('/api/health')) as { kind: string; status?: number };
    expect(decision.kind).toBe('respond');
    expect(decision.status).toBe(503);
  });

  it('rejects a non-loopback host before looking at the cookie', () => {
    process.env.OSIRIS_LOCAL_TOKEN = token;
    resetLocalTokenCache();
    const decision = decide(req('/api/health', { headers: { host: 'evil.example' } })) as { kind: string; status?: number };
    expect(decision.kind).toBe('respond');
    expect(decision.status).toBe(403);
  });

  it('rejects an unauthenticated API call and a page navigation', () => {
    process.env.OSIRIS_LOCAL_TOKEN = token;
    resetLocalTokenCache();
    const api = decide(req('/api/cctv?region=caltrans'));
    const page = decide(req('/', { headers: { accept: 'text/html' } }));
    const apiStatus = api as { kind: string; status?: number };
    const pageStatus = page as { kind: string; status?: number };
    expect(apiStatus.kind).toBe('respond');
    expect(pageStatus.kind).toBe('respond');
    expect(apiStatus.status).toBe(401);
    expect(pageStatus.status).toBe(303);
  });

  it('accepts a session cookie and refuses a cross-site login', () => {
    process.env.OSIRIS_LOCAL_TOKEN = token;
    resetLocalTokenCache();
    const cookie = `${SESSION_COOKIE}=${sessionValue(token)}`;
    const ok = decide(req('/api/health', { headers: { cookie } }));
    expect(ok.kind).toBe('next');
    const bad = finishLogin({
      token,
      host: '127.0.0.1:3000',
      origin: 'https://evil.example',
      fetchSite: 'cross-site',
    });
    const badStatus = bad as { kind: string; status?: number };
    expect(badStatus.kind).toBe('respond');
    expect(badStatus.status).toBe(403);
    const good = finishLogin({
      token,
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
      fetchSite: 'same-origin',
    }) as { kind: string; status?: number; headers: [string, string][]; body: string };
    expect(good.kind).toBe('respond');
    expect(good.status).toBe(303);
    expect(good.headers.some(([name]) => name === 'set-cookie')).toBe(true);
    expect(good.body).not.toContain(token);
  });

  it('does not treat the raw credential as the cookie', () => {
    process.env.OSIRIS_LOCAL_TOKEN = token;
    resetLocalTokenCache();
    const asCookie = decide(req('/api/health', { headers: { cookie: `${SESSION_COOKIE}=${token}` } }));
    expect(asCookie.kind).toBe('respond');
    expect(sessionValue(token)).not.toBe(token);
    expect(createHmac('sha256', token).update('osiris-local-session-v1').digest('base64url')).toBe(sessionValue(token));
  });
});
