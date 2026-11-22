/**
 * In-memory client cache with TTL and stale-while-revalidate support.
 * Accelerates tab navigation in admin dashboard to instant 0ms switching.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cacheStore = new Map<string, CacheEntry<any>>();

export const adminCache = {
  get<T>(key: string, maxAgeMs = 60000): T | null {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAgeMs) {
      // Stale entry, can still be returned for SWR if needed, but return null for hard expiry
      return null;
    }
    return entry.data as T;
  },

  getAny<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    const isStale = Date.now() - entry.timestamp > 60000;
    return { data: entry.data as T, isStale };
  },

  set<T>(key: string, data: T): void {
    cacheStore.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      cacheStore.clear();
      return;
    }
    for (const key of cacheStore.keys()) {
      if (key.startsWith(keyPrefix)) {
        cacheStore.delete(key);
      }
    }
  },
};
