import { afterEach, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => vi.unstubAllGlobals());

it('does not geolocate and does not call a provider', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const res = await GET(new Request('http://127.0.0.1/api/geo', { headers: { 'cf-connecting-ip': '81.2.69.142' } }));
  expect(res.status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});
