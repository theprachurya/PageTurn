import localforage from "localforage";

/**
 * EPUB Cache
 * 
 * Caches EPUB file ArrayBuffers in IndexedDB so that reopening a book
 * doesn't require re-downloading from Supabase Storage. This also
 * enables offline reading for previously opened books.
 * 
 * Uses LRU eviction: when the cache exceeds MAX_CACHED_BOOKS, the
 * least-recently-accessed entry is evicted.
 */

const MAX_CACHED_BOOKS = 10;

const epubCache = localforage.createInstance({
  name: "pageturn",
  storeName: "epub_cache",
});

// Separate store for access timestamps (keeps the main cache values clean)
const accessLog = localforage.createInstance({
  name: "pageturn",
  storeName: "epub_cache_access",
});

/**
 * Record an access timestamp for LRU tracking.
 */
async function touchAccess(bookId: string): Promise<void> {
  try {
    await accessLog.setItem(bookId, Date.now());
  } catch { /* non-critical */ }
}

/**
 * Evict the least-recently-used entries if the cache exceeds the cap.
 */
async function evictIfNeeded(): Promise<void> {
  try {
    const entries: { key: string; ts: number }[] = [];
    await accessLog.iterate<number, void>((ts, key) => {
      entries.push({ key, ts });
    });

    if (entries.length <= MAX_CACHED_BOOKS) return;

    // Sort oldest-first
    entries.sort((a, b) => a.ts - b.ts);

    const toEvict = entries.slice(0, entries.length - MAX_CACHED_BOOKS);
    for (const entry of toEvict) {
      await epubCache.removeItem(entry.key);
      await accessLog.removeItem(entry.key);
    }
  } catch (err) {
    console.warn("[PageTurn] LRU eviction failed:", err);
  }
}

/**
 * Get a cached EPUB ArrayBuffer by book ID.
 * Returns null if not cached.
 */
export async function getCachedEpub(bookId: string): Promise<ArrayBuffer | null> {
  try {
    const data = await epubCache.getItem<ArrayBuffer>(bookId);
    if (data) await touchAccess(bookId);
    return data;
  } catch (err) {
    console.warn("[PageTurn] Failed to read EPUB cache:", err);
    return null;
  }
}

/**
 * Cache an EPUB ArrayBuffer by book ID.
 * Evicts the oldest entry if the cache is full.
 */
export async function cacheEpub(bookId: string, data: ArrayBuffer): Promise<void> {
  try {
    await epubCache.setItem(bookId, data);
    await touchAccess(bookId);
    await evictIfNeeded();
  } catch (err) {
    console.warn("[PageTurn] Failed to cache EPUB:", err);
  }
}

/**
 * Remove a cached EPUB by book ID.
 */
export async function removeCachedEpub(bookId: string): Promise<void> {
  try {
    await epubCache.removeItem(bookId);
    await accessLog.removeItem(bookId);
  } catch (err) {
    console.warn("[PageTurn] Failed to remove cached EPUB:", err);
  }
}

/**
 * Clear all cached EPUBs.
 */
export async function clearEpubCache(): Promise<void> {
  try {
    await epubCache.clear();
    await accessLog.clear();
  } catch (err) {
    console.warn("[PageTurn] Failed to clear EPUB cache:", err);
  }
}
