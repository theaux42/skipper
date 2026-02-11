
/**
 * Lightweight server-side in-memory cache with TTL.
 * Each key stores a value, a timestamp, and a maxAge.
 * Requests within maxAge get the cached value instantly.
 * A background warmer keeps critical entries hot.
 */

interface CacheEntry<T> {
    data: T
    timestamp: number
    maxAge: number
}

const cache = new Map<string, CacheEntry<any>>()
const warmers = new Map<string, { fetcher: () => Promise<any>; intervalMs: number; timer?: NodeJS.Timeout }>()

/**
 * Get a cached value, or fetch it fresh if the cache is stale/empty.
 * @param key   Unique cache key
 * @param fetcher  Async function that produces the value
 * @param maxAge   Milliseconds before the value is considered stale
 */
export async function getCached<T>(key: string, fetcher: () => Promise<T>, maxAge: number): Promise<T> {
    const entry = cache.get(key) as CacheEntry<T> | undefined

    if (entry && (Date.now() - entry.timestamp) < entry.maxAge) {
        return entry.data
    }

    // Cache miss or stale — fetch fresh
    const data = await fetcher()
    cache.set(key, { data, timestamp: Date.now(), maxAge })
    return data
}

/**
 * Invalidate a specific cache key so the next request fetches fresh data.
 */
export function invalidateCache(key: string) {
    cache.delete(key)
}

/**
 * Register a background warmer that refreshes a cache entry on a fixed interval.
 * Call this once at startup for critical entries.
 */
export function registerWarmer(key: string, fetcher: () => Promise<any>, maxAge: number, intervalMs: number) {
    // Stop existing warmer for this key, if any
    const existing = warmers.get(key)
    if (existing?.timer) clearInterval(existing.timer)

    const warmer = {
        fetcher,
        intervalMs,
        timer: setInterval(async () => {
            try {
                const data = await fetcher()
                cache.set(key, { data, timestamp: Date.now(), maxAge })
            } catch (e) {
                console.error(`[Cache] Warmer for '${key}' failed:`, e)
            }
        }, intervalMs)
    }
    warmers.set(key, warmer)

    // Also fetch immediately to warm the cache
    fetcher().then(data => {
        cache.set(key, { data, timestamp: Date.now(), maxAge })
        console.log(`[Cache] Warmed '${key}' (TTL: ${maxAge}ms, refresh: ${intervalMs}ms)`)
    }).catch(e => {
        console.error(`[Cache] Initial warm for '${key}' failed:`, e)
    })
}

/**
 * Stop all background warmers (for graceful shutdown).
 */
export function stopAllWarmers() {
    for (const [key, warmer] of warmers) {
        if (warmer.timer) clearInterval(warmer.timer)
    }
    warmers.clear()
}
