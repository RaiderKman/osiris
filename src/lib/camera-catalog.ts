export type CatalogCamera = { id: string | number; [key: string]: unknown };

/** Partial retries must add cameras, not erase previously loaded regions. */
export function mergeCameraCatalog<T extends { id: string | number }>(previous: T[], incoming: T[]): T[] {
  const merged = new Map(previous.map(camera => [String(camera.id), camera]));
  for (const camera of incoming) merged.set(String(camera.id), camera);
  return [...merged.values()];
}

/** Load one selected region. An empty or worldwide id does not fetch. */
export function loadCameraCatalog(region: string, onBatch: (cameras: CatalogCamera[]) => void, onError: () => void) {
  if (!/^[a-z0-9-]+$/.test(region)) return () => {};
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  const load = async () => {
    attempts++;
    let again = false;
    try {
      const query = new URLSearchParams({ region });
      const response = await fetch(`/api/cctv?${query}`, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Camera catalogue HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.cameras)) throw new Error('Invalid camera catalogue');
      if (controller.signal.aborted) return;
      if (data.cameras.length) onBatch(data.cameras);
      again = Array.isArray(data.pendingRegions) && data.pendingRegions.includes(region);
    } catch {
      if (controller.signal.aborted) return;
      onError();
      again = true;
    }
    if (again && attempts < 3 && !controller.signal.aborted) {
      timer = setTimeout(() => void load(), attempts * 15_000);
    }
  };
  void load();
  return () => { controller.abort(); clearTimeout(timer); };
}
