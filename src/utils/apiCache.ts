/**
 * Client-Side In-Memory Cache & Request Deduplication
 * Implements Stale-While-Revalidate (SWR) and in-flight promise deduplication
 * to make page navigation and data loading instant (0ms delay).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cacheStore = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export interface FetchOptions<T> {
  ttlMs?: number; // Cache validity duration (default: 45 seconds)
  forceFresh?: boolean;
  onBackgroundUpdate?: (freshData: T) => void;
}

/**
 * Retrieves data from cache synchronously if available and not completely expired.
 */
export function getSyncCached<T>(key: string, maxAgeMs: number = 60000): T | undefined {
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    return undefined;
  }
  return entry.data as T;
}

/**
 * Fetches data with in-flight request deduplication and memory caching.
 * If data is already in cache, returns immediately while optionally revalidating in background.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchOptions<T> = {}
): Promise<T> {
  const { ttlMs = 45000, forceFresh = false, onBackgroundUpdate } = options;
  const now = Date.now();
  const cached = cacheStore.get(key);

  // If we have cached data and not forcing fresh
  if (!forceFresh && cached) {
    const age = now - cached.timestamp;
    
    // If within TTL, return cached data immediately
    if (age < ttlMs) {
      return cached.data as T;
    }

    // Stale-While-Revalidate: Return stale data immediately, revalidate in background
    if (onBackgroundUpdate) {
      // Background revalidation
      dedupedFetch(key, fetcher)
        .then((fresh) => {
          cacheStore.set(key, { data: fresh, timestamp: Date.now() });
          onBackgroundUpdate(fresh);
        })
        .catch((err) => {
          console.debug('[apiCache] Background revalidation failed silently:', err);
        });
      return cached.data as T;
    }
  }

  // Otherwise, perform deduped fetch
  const freshData = await dedupedFetch(key, fetcher);
  cacheStore.set(key, { data: freshData, timestamp: Date.now() });
  return freshData;
}

/**
 * Deduplicates multiple concurrent requests to the exact same key.
 * If 4 components request the same endpoint at the same time, only 1 HTTP request is dispatched.
 */
export function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher()
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Invalidates cache by exact key or prefix.
 */
export function invalidateClientCache(prefixOrKey?: string): void {
  if (!prefixOrKey) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey) || key.includes(prefixOrKey)) {
      cacheStore.delete(key);
    }
  }
}
