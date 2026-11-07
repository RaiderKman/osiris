import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, clearCctvRefreshes } from './route';
import { stealthFetch } from '@/lib/stealthFetch';
import { clearSourceCache } from '@/lib/sourceCache';
import { join } from 'node:path';

/* GET reads the saved catalogue before it dispatches anything. That is real
   disk I/O, so a case must let it settle before advancing fake time —
   otherwise the timers it is waiting on are set after the clock moved. */
const flushIO = () => vi.advanceTimersByTimeAsync(0);

vi.mock('@/lib/stealthFetch', () => ({ stealthFetch: vi.fn(), stealthHeaders: vi.fn(() => ({})) }));
/* Keep these cases on the live fetch path; a saved catalogue would answer
   for them before any upstream was asked. */
beforeEach(() => { process.env.OSIRIS_CCTV_SNAPSHOT = 'off'; vi.useFakeTimers(); vi.resetAllMocks(); clearSourceCache(); clearCctvRefreshes(); });
/* Drain first: a mock that never settles is holding a pool slot, and the pool
   is module state shared with the next case. */
afterEach(async () => { await flushIO(); await vi.advanceTimersByTimeAsync(30_000); vi.useRealTimers(); });

describe('CCTV partial responses', () => {
  it('returns a completed region without scheduling unnecessary retries', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(Response.json([
      { id: 'JamCams_1', lat: 51.5, lon: -0.1, commonName: 'London' },
    ]));
    const response = await GET(new Request('http://localhost/api/cctv?region=uk'));
    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.pendingRegions).toEqual([]);
  });

  it('marks slow regions as pending instead of silently treating them as complete', async () => {
    vi.mocked(stealthFetch).mockReturnValue(new Promise(() => {}));
    const pending = GET(new Request('http://localhost/api/cctv?region=uk'));
    await vi.advanceTimersByTimeAsync(12_000);
    const response = await pending;
    expect((await response.json()).pendingRegions).toEqual(['uk']);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  /* Measured against production: asking for every region at once opened 60+
     connections, and upstreams that answer in under a second on their own
     started failing on connect. Eleven regions were missing from every
     response because of it. */
  it('lets Georgia finish a slow first inventory instead of backing off at 12 seconds', async () => {
    vi.mocked(stealthFetch).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 16_000));
      return Response.json({
        recordsTotal: 1,
        data: [{
          id: 1, location: 'I-75 at Main St',
          latLng: { geography: { wellKnownText: 'POINT (-84.4 33.7)' } },
          images: [{ imageUrl: '/map/Cctv/1' }],
        }],
      });
    });
    const pending = GET(new Request('http://localhost/api/cctv?region=georgia'));
    await flushIO();
    await vi.advanceTimersByTimeAsync(16_000);
    const body = await (await pending).json();
    expect(body.total).toBe(1);
    expect(body.pendingRegions).toEqual([]);
  });

  it('does not fan out for region=all or a missing region', async () => {
    const all = await GET(new Request('http://localhost/api/cctv?region=all'));
    const missing = await GET(new Request('http://localhost/api/cctv'));
    expect(all.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(vi.mocked(stealthFetch)).not.toHaveBeenCalled();
  });

  it('loads a selected Caltrans fixture without a forged forwarding header', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(Response.json({
      features: [{ attributes: {
        OBJECTID: 7, latitude: 34.05, longitude: -118.25, locationName: 'Test cam',
        nearbyPlace: 'Los Angeles', county: 'Los Angeles', inService: 'True',
        currentImageURL: 'https://cwwp2.dot.ca.gov/still.jpg',
        streamingVideoURL: 'https://wzmedia.dot.ca.gov/D7/test.stream/playlist.m3u8',
      } }],
    }));
    const body = await (await GET(new Request('http://localhost/api/cctv?region=caltrans'))).json();
    expect(body.total).toBe(1);
    expect(body.cameras[0]).toMatchObject({
      source: 'Caltrans',
      feed_url: 'https://cwwp2.dot.ca.gov/still.jpg',
      stream_url: 'https://wzmedia.dot.ca.gov/D7/test.stream/playlist.m3u8',
      stream_type: 'hls',
    });
    expect(String(vi.mocked(stealthFetch).mock.calls[0][0])).toContain('caltrans-gis.dot.ca.gov');
    expect(vi.mocked(stealthFetch)).toHaveBeenCalledTimes(1);
  });

  it('serves an already-cached region without going upstream again', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(Response.json([
      { id: 'JamCams_1', lat: 51.5, lon: -0.1, commonName: 'London' },
    ]));
    expect((await (await GET(new Request('http://localhost/api/cctv?region=uk'))).json()).total).toBe(1);
    const callsAfterFirst = vi.mocked(stealthFetch).mock.calls.length;

    const second = await (await GET(new Request('http://localhost/api/cctv?region=uk'))).json();
    expect(second.total).toBe(1);
    expect(second.pendingRegions).toEqual([]);
    expect(vi.mocked(stealthFetch).mock.calls.length).toBe(callsAfterFirst);
  });

  /* The bug behind "the cameras took a very long time": one upstream that
     hangs made every visitor wait out the full budget, even with a catalogue
     already holding tens of thousands of cameras. */
  it('does not hold a warm catalogue hostage to a region that hangs', async () => {
    // us-east answers from static data, so it is the warm half of the catalogue.
    vi.mocked(stealthFetch).mockResolvedValue(Response.json([]));
    const warm = await (await GET(new Request('http://localhost/api/cctv?region=us-east'))).json();
    expect(warm.total).toBeGreaterThan(0);

    vi.mocked(stealthFetch).mockReturnValue(new Promise(() => {})); // uk now hangs
    const pending = GET(new Request('http://localhost/api/cctv?region=us-east,uk'));
    await flushIO();
    // Resolving here at all is the point: before this fix the caller waited the
    // full 12s slot budget even though the catalogue was already warm.
    await vi.advanceTimersByTimeAsync(2_000);

    const body = await (await pending).json();
    expect(body.total).toBe(warm.total);
    expect(body.pendingRegions).toEqual(['uk']);
  });

  it('allows a bounded retry for an empty/failed provider response', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(new Response('', { status: 503 }));
    const response = await GET(new Request('http://localhost/api/cctv?region=uk'));
    expect((await response.json()).pendingRegions).toEqual(['uk']);
  });
});
