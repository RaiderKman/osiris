import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/osint/portscan', () => {
  it('refuses before any fetch, with or without a key', async () => {
    vi.stubEnv('SHODAN_API_KEY', 'present');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await GET(new Request('http://127.0.0.1:3000/api/osint/portscan?target=1.1.1.1'));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
