import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYERS } from './default-layers';
import { feedsFor } from './feeds-for';
import { stealthHeaders } from './stealthFetch';

describe('startup feeds', () => {
  it('requests nothing until a person selects a feed', () => {
    expect(feedsFor({
      layers: DEFAULT_LAYERS,
      alertsOpen: false,
      marketsOpen: false,
      cameraRegion: '',
    })).toEqual([]);
    expect(DEFAULT_LAYERS.cctv).toBe(false);
    expect(DEFAULT_LAYERS.satellites).toBe(false);
    expect(DEFAULT_LAYERS.earthquakes).toBe(false);
    expect(DEFAULT_LAYERS.maritime).toBe(false);
  });

  it('names only the selected camera region', () => {
    expect(feedsFor({
      layers: { ...DEFAULT_LAYERS, cctv: true },
      alertsOpen: false,
      marketsOpen: false,
      cameraRegion: 'caltrans',
    })).toEqual(['cctv:caltrans']);
  });
});

describe('public fetch headers', () => {
  it('does not forge an address or a browser identity', () => {
    const headers = stealthHeaders();
    expect(headers['X-Forwarded-For']).toBeUndefined();
    expect(headers['X-Real-IP']).toBeUndefined();
    expect(headers['User-Agent']).toBe('OSIRIS-Local/1.0 (+https://github.com/RaiderKman/osiris)');
  });
});
