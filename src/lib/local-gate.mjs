import {
  LOGIN_PATH,
  SESSION_COOKIE,
  cookieHeader,
  isLoopbackHost,
  loadLocalToken,
  safeEqual,
  sessionOk,
} from './local-auth.mjs';

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OSIRIS local sign-in</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b0d10; color: #e8e6e3; font: 15px/1.45 system-ui, sans-serif; }
    form { width: min(28rem, calc(100% - 2rem)); display: grid; gap: 0.75rem; }
    h1 { font-size: 1.1rem; font-weight: 650; margin: 0; }
    p { margin: 0; color: #b7b3ad; }
    input { font: inherit; padding: 0.55rem 0.65rem; border-radius: 6px; border: 1px solid #3a3f46; background: #14181d; color: inherit; }
    button { font: inherit; padding: 0.55rem 0.75rem; border-radius: 6px; border: 0; background: #d4af37; color: #1a1404; font-weight: 650; }
  </style>
</head>
<body>
  <form method="post" action="/local-login">
    <h1>OSIRIS local sign-in</h1>
    <p>Paste the credential from this machine's local token file. It is not sent in the address bar.</p>
    <label>Credential <input name="token" type="password" autocomplete="current-password" required></label>
    <button type="submit">Continue</button>
  </form>
</body>
</html>
`;

function text(status, body, extraHeaders = []) {
  return {
    kind: 'respond',
    status,
    headers: [['content-type', 'text/plain; charset=utf-8'], ['cache-control', 'no-store'], ...extraHeaders],
    body,
  };
}

function originAllowed(origin, host) {
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Decide what the loopback server should do before Next.js runs.
 * `next` means the request may be forwarded. Nothing here performs egress.
 */
export function decide(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const path = url.pathname;
  const host = req.headers?.host;
  const cookie = req.headers?.cookie;
  const origin = req.headers?.origin;
  const fetchSite = req.headers?.['sec-fetch-site'];

  if (!isLoopbackHost(host)) return text(403, 'This server only accepts loopback hosts.');

  const secret = loadLocalToken();
  if (!secret) return text(503, 'Local credential is not configured.');

  if (method === 'GET' && path === LOGIN_PATH) {
    return {
      kind: 'respond',
      status: 200,
      headers: [['content-type', 'text/html; charset=utf-8'], ['cache-control', 'no-store']],
      body: LOGIN_HTML,
    };
  }

  if (method === 'POST' && path === LOGIN_PATH) {
    return { kind: 'login', host, origin, fetchSite };
  }

  if (method === 'POST' && path === '/local-logout') {
    if (!sessionOk(cookie, secret)) return text(401, 'Authentication required.');
    return {
      kind: 'respond',
      status: 303,
      headers: [
        ['location', LOGIN_PATH],
        ['set-cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`],
        ['cache-control', 'no-store'],
      ],
      body: '',
    };
  }

  if (sessionOk(cookie, secret)) return { kind: 'next' };

  if (method === 'GET' && (path === '/' || String(req.headers?.accept || '').includes('text/html'))) {
    return {
      kind: 'respond',
      status: 303,
      headers: [['location', LOGIN_PATH], ['cache-control', 'no-store']],
      body: '',
    };
  }
  return text(401, 'Authentication required.');
}

export function finishLogin({ token, host, origin, fetchSite }) {
  const secret = loadLocalToken();
  if (!secret) return text(503, 'Local credential is not configured.');
  if (!isLoopbackHost(host)) return text(403, 'This server only accepts loopback hosts.');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return text(403, 'Cross-site sign-in is refused.');
  }
  if (!originAllowed(origin, host)) return text(403, 'Cross-site sign-in is refused.');
  if (!safeEqual(token, secret)) return text(401, 'Authentication required.');
  return {
    kind: 'respond',
    status: 303,
    headers: [
      ['location', '/'],
      ['set-cookie', cookieHeader(secret)],
      ['cache-control', 'no-store'],
    ],
    body: '',
  };
}
