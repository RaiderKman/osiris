import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { isLoopbackAddress, loadLocalToken, resetLocalTokenCache } from '../src/lib/local-auth.mjs';
import { decide, finishLogin } from '../src/lib/local-gate.mjs';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || 3000);
const hostname = '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer from 1 to 65535.');
  process.exit(1);
}

resetLocalTokenCache();
if (!loadLocalToken()) {
  console.error('Local credential is not configured.');
  console.error('Run: node tools/bootstrap-local-auth.mjs');
  console.error('Then start again so this process can read that file, or set OSIRIS_LOCAL_TOKEN_FILE to its path.');
  process.exit(1);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, decision) {
  res.writeHead(decision.status, Object.fromEntries(decision.headers));
  res.end(decision.body);
}

const app = next({ dev, hostname, port });
await app.prepare();
const handle = app.getRequestHandler();
const upgrade = app.getUpgradeHandler();

const server = createServer(async (req, res) => {
  try {
    if (!isLoopbackAddress(req.socket.remoteAddress)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('This server only accepts loopback connections.');
      return;
    }
    const decision = decide(req);
    if (decision.kind === 'login') {
      let raw = '';
      try {
        raw = (await readBody(req, 4096)).toString('utf8');
      } catch {
        send(res, { kind: 'respond', status: 400, headers: [['content-type', 'text/plain; charset=utf-8'], ['cache-control', 'no-store']], body: 'Sign-in body was not accepted.' });
        return;
      }
      const token = new URLSearchParams(raw).get('token')?.trim() || '';
      send(res, finishLogin({
        token,
        host: decision.host,
        origin: decision.origin,
        fetchSite: decision.fetchSite,
      }));
      return;
    }
    if (decision.kind === 'respond') {
      send(res, decision);
      return;
    }
    const parsed = parse(req.url || '/', true);
    await handle(req, res, parsed);
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Request failed.');
  }
});

server.on('upgrade', (req, socket) => {
  if (!isLoopbackAddress(socket.remoteAddress)) {
    socket.destroy();
    return;
  }
  const decision = decide(req);
  if (decision.kind !== 'next') {
    socket.destroy();
    return;
  }
  upgrade(req, socket, Buffer.alloc(0));
});

server.listen(port, hostname, () => {
  console.log(`OSIRIS local server listening on http://${hostname}:${port}`);
});
