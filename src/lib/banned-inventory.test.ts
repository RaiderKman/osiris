import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const API = join(process.cwd(), 'src/app/api');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name === 'route.ts') out.push(path);
  }
  return out;
}

function isBanned(path: string): boolean {
  const rel = path.slice(API.length + 1).replaceAll('\\', '/');
  return rel.startsWith('osint/')
    || rel.startsWith('oi/')
    || rel === 'scanner/route.ts'
    || rel === 'crypto/route.ts'
    || rel === 'chain/daily/route.ts'
    || rel === 'mcp/route.ts'
    || rel === 'entity/expand/route.ts'
    || rel === 'geo/route.ts';
}

const VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;

describe('every banned route handler', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns 404 and does not call fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const files = walk(API).filter(isBanned);
    expect(files.length).toBe(35);
    let calls = 0;
    for (const file of files) {
      const mod = await import(file) as Record<string, unknown>;
      for (const verb of VERBS) {
        const handler = mod[verb];
        if (typeof handler !== 'function') continue;
        calls += 1;
        const init: RequestInit = { method: verb };
        if (verb !== 'GET' && verb !== 'HEAD') init.body = '{}';
        const response = await (handler as (...args: unknown[]) => Promise<Response>)(
          new Request('http://127.0.0.1/banned', init),
          { params: Promise.resolve({ id: 'example' }) },
        );
        expect(response.status, `${file} ${verb}`).toBe(404);
      }
    }
    expect(calls).toBeGreaterThanOrEqual(35);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
