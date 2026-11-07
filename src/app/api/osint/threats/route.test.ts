import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET, onTorExitList } from './route';

describe('onTorExitList', () => {
  const list = '11.1.1.10\n8.8.8.8\n185.220.101.1\n';

  it('matches an address only as a whole line', () => {
    expect(onTorExitList(list, '8.8.8.8')).toBe(true);
    expect(onTorExitList(list, '185.220.101.1')).toBe(true);
    // Contained in 11.1.1.10 and in 185.220.101.1, but on neither line itself.
    expect(onTorExitList(list, '1.1.1.1')).toBe(false);
    expect(onTorExitList(list, '5.220.101.1')).toBe(false);
  });

  it('tolerates CRLF line endings', () => {
    expect(onTorExitList('8.8.8.8\r\n9.9.9.9\r\n', '8.8.8.8')).toBe(true);
  });
});

describe('GET /api/osint/threats', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not call a reputation service', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await GET(new Request('http://127.0.0.1/api/osint/threats?query=1.1.1.1'));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
