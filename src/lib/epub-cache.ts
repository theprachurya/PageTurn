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

export const MAX_CACHED_BOOKS = 10;

export const epubCache = localforage.createInstance({
  name: "pageturn",
  storeName: "epub_cache",
});

// Separate store for access timestamps (keeps the main cache values clean)
export const accessLog = localforage.createInstance({
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
 * Validate that an ArrayBuffer contains valid EPUB/ZIP binary content.
 * EPUB files are standard ZIP archives starting with magic bytes:
 * 0x50, 0x4B, 0x03, 0x04 (PK\x03\x04) or empty archive 0x50, 0x4B, 0x05, 0x06.
 */
export function isValidEpubBuffer(data: unknown): boolean {
  if (!data) return false;
  if (!(data instanceof ArrayBuffer)) return false;
  if (data.byteLength < 4) return false;

  const view = new Uint8Array(data);
  // Check ZIP signature 'PK'
  return (
    view[0] === 0x50 &&
    view[1] === 0x4b &&
    ((view[2] === 0x03 && view[3] === 0x04) ||
      (view[2] === 0x05 && view[3] === 0x06) ||
      (view[2] === 0x07 && view[3] === 0x08))
  );
}

/**
 * Get a cached EPUB ArrayBuffer by book ID.
 * Returns null if not cached or if the cached payload is corrupted.
 * Automatically purges corrupted entries for self-healing local cache recovery.
 */
export async function getCachedEpub(bookId: string): Promise<ArrayBuffer | null> {
  try {
    const data = await epubCache.getItem<unknown>(bookId);
    if (!data) return null;

    if (!isValidEpubBuffer(data)) {
      console.warn(`[PageTurn] Corrupted EPUB detected for book ${bookId}. Self-healing cache by purging.`);
      await removeCachedEpub(bookId);
      return null;
    }

    await touchAccess(bookId);
    return data as ArrayBuffer;
  } catch (err) {
    console.warn("[PageTurn] Failed to read EPUB cache, purging corrupted entry:", err);
    try {
      await removeCachedEpub(bookId);
    } catch {
      /* non-critical */
    }
    return null;
  }
}

/**
 * Cache an EPUB ArrayBuffer by book ID.
 * Evicts the oldest entry if the cache is full.
 * Validates buffer integrity before caching.
 */
export async function cacheEpub(bookId: string, data: ArrayBuffer): Promise<boolean> {
  if (!isValidEpubBuffer(data)) {
    console.warn(`[PageTurn] Refusing to cache corrupted or invalid EPUB buffer for book ${bookId}`);
    return false;
  }

  try {
    await epubCache.setItem(bookId, data);
    await touchAccess(bookId);
    await evictIfNeeded();
    return true;
  } catch (err) {
    console.warn("[PageTurn] Failed to cache EPUB:", err);
    return false;
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

/**
 * Returns cache telemetry statistics (count, capacity, cached IDs).
 */
export async function getCacheStats(): Promise<{
  cachedCount: number;
  maxCapacity: number;
  bookIds: string[];
}> {
  try {
    const keys = await epubCache.keys();
    return {
      cachedCount: keys.length,
      maxCapacity: MAX_CACHED_BOOKS,
      bookIds: keys,
    };
  } catch {
    return {
      cachedCount: 0,
      maxCapacity: MAX_CACHED_BOOKS,
      bookIds: [],
    };
  }
}
