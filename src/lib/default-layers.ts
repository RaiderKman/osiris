/** Initial map layers. Every feed that leaves the machine starts off. */
export const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  flights: false,
  private: false,
  jets: false,
  military: false,
  maritime: false,
  transit: false,
  satellites: false,
  sat_comms: false,
  sat_military: false,
  sat_navigation: false,
  sat_earth: false,
  sat_science: false,
  balloons: false,
  cctv: false,
  cctv_previews: false,
  live_news: false,
  earthquakes: false,
  fires: false,
  weather: false,
  radiation: false,
  infrastructure: false,
  global_incidents: false,
  alert_pins: false,
  war_alerts: false,
  day_night: true,
  cables: false,
  sdk_sea: false,
  sdk_air: false,
  sdk_naval: false,
  live_clouds: false,
  wind: false,
  rain: false,
  wind_controls: false,
  rain_controls: false,
  wind_particles: false,
  terrain_3d: false,
  terrain_elevation: false,
  malware: false,
  cyber_attacks: false,
  gdelt_events: false,
  cf_outages: false,
  cf_attacks: false,
};

export type LayerKey =
  | 'flights' | 'private' | 'jets' | 'military' | 'maritime' | 'transit'
  | 'satellites' | 'sat_comms' | 'sat_military' | 'sat_navigation' | 'sat_earth' | 'sat_science'
  | 'balloons' | 'cctv' | 'cctv_previews' | 'live_news' | 'earthquakes' | 'fires'
  | 'weather' | 'radiation' | 'infrastructure' | 'global_incidents' | 'alert_pins' | 'war_alerts'
  | 'day_night' | 'cables' | 'sdk_sea' | 'sdk_air' | 'sdk_naval' | 'live_clouds'
  | 'wind' | 'rain' | 'wind_controls' | 'rain_controls' | 'wind_particles'
  | 'terrain_3d' | 'terrain_elevation' | 'malware' | 'cyber_attacks' | 'gdelt_events'
  | 'cf_outages' | 'cf_attacks';
