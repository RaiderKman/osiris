/**
 * Ordinary fetch headers for public data sources.
 * This build does not invent a browser identity or a forwarding address.
 */
const USER_AGENT = 'OSIRIS-Local/1.0 (+https://github.com/RaiderKman/osiris)';

export function stealthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    'User-Agent': USER_AGENT,
    'Accept-Language': 'en-US,en;q=0.9',
    ...extraHeaders,
  };
}

/**
 * fetch() with the honest local User-Agent. Callers still pass this name.
 */
export async function stealthFetch(
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = stealthHeaders(
    init?.headers ? Object.fromEntries(
      init.headers instanceof Headers
        ? init.headers.entries()
        : Array.isArray(init.headers)
          ? init.headers
          : Object.entries(init.headers)
    ) : undefined
  );

  const controller = new AbortController();
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  const timeoutId = setTimeout(() => controller.abort(new Error('stealthFetch Hard Timeout')), 30000);

  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
