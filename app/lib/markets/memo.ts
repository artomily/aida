/**
 * In-process cache with single-flight, shared by every request on this server.
 *
 * Next's fetch cache is not enough on its own: in `next dev` it is skipped entirely whenever
 * the browser sends `Cache-Control: no-cache` (DevTools "Disable cache", hard reload), and it
 * never merges concurrent misses — ten simultaneous cold requests make ten upstream calls.
 * Entries live on globalThis so dev hot-reloads don't drop them.
 */
type Entry = { expires: number; value?: unknown; error?: unknown; pending?: Promise<unknown> };

const g = globalThis as typeof globalThis & { __divergenceMemo?: Map<string, Entry> };
const store = (g.__divergenceMemo ??= new Map());

/** Failed lookups are remembered too, so a 404 (still billed) or an outage isn't retried per request. */
const ERROR_TTL_MS = 10 * 60_000;

export async function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit?.pending) return hit.pending as Promise<T>;
  if (hit && hit.expires > now) {
    if ("error" in hit) throw hit.error;
    return hit.value as T;
  }

  const pending = load().then(
    (value) => {
      store.set(key, { expires: Date.now() + ttlMs, value });
      return value;
    },
    (error: unknown) => {
      store.set(key, { expires: Date.now() + Math.min(ttlMs, ERROR_TTL_MS), error });
      throw error;
    },
  );
  store.set(key, { expires: 0, pending });
  return pending;
}

/** Most recent good value for a key even if expired — for serving stale data when over budget. */
export function stale<T>(key: string): T | undefined {
  const hit = store.get(key);
  return hit && "value" in hit ? (hit.value as T) : undefined;
}
