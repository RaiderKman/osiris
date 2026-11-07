import { describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('GET /api/oi/runs/[id]/events', () => {
  it('does not open a stream or call fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await GET(
      new Request('http://127.0.0.1/api/oi/runs/example/events'),
      { params: Promise.resolve({ id: 'example' }) },
    );
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
