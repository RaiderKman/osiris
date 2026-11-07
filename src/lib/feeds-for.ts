import type { LayerKey } from './default-layers';

export interface FeedSelection {
  layers: Partial<Record<LayerKey, boolean>>;
  alertsOpen: boolean;
  marketsOpen: boolean;
  cameraRegion: string;
}

/**
 * Live feeds the page may request for a given selection.
 * The default selection returns an empty list.
 */
export function feedsFor(input: FeedSelection): string[] {
  const layers = input.layers;
  const out: string[] = [];
  if (layers.earthquakes) out.push('earthquakes');
  if (input.alertsOpen || layers.live_news) out.push('news');
  if (layers.weather || input.alertsOpen) out.push('weather');
  if (input.marketsOpen) out.push('markets', 'space-weather');
  if (layers.cctv && /^[a-z0-9-]+$/.test(input.cameraRegion)) out.push(`cctv:${input.cameraRegion}`);
  if (layers.flights || layers.military || layers.jets || layers.private) out.push('flights');
  if (layers.satellites || layers.sat_comms || layers.sat_military || layers.sat_navigation || layers.sat_earth || layers.sat_science) out.push('satellites');
  if (layers.maritime) out.push('maritime');
  if (layers.fires) out.push('fires');
  if (layers.balloons) out.push('balloons');
  if (layers.radiation) out.push('radiation');
  if (layers.infrastructure) out.push('infrastructure');
  if (layers.global_incidents) out.push('gdelt');
  if (layers.cyber_attacks) out.push('cyber');
  if (layers.gdelt_events) out.push('gdelt-events');
  if (layers.cf_outages || layers.cf_attacks) out.push('cloudflare');
  if (layers.malware) out.push('malware');
  return out;
}
