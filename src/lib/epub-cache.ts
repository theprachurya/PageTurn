import localforage from "localforage";

/**
 * EPUB Cache
 * 
 * Caches EPUB file ArrayBuffers in IndexedDB so that reopening a book
 * doesn't require re-downloading from Supabase Storage. This also
 * enables offline reading for previously opened books.
 */

const epubCache = localforage.createInstance({
  name: "pageturn",
  storeName: "epub_cache",
});

/**
 * Get a cached EPUB ArrayBuffer by book ID.
 * Returns null if not cached.
 */
export async function getCachedEpub(bookId: string): Promise<ArrayBuffer | null> {
  try {
    return await epubCache.getItem<ArrayBuffer>(bookId);
  } catch (err) {
    console.warn("[PageTurn] Failed to read EPUB cache:", err);
    return null;
  }
}

/**
 * Cache an EPUB ArrayBuffer by book ID.
 */
export async function cacheEpub(bookId: string, data: ArrayBuffer): Promise<void> {
  try {
    await epubCache.setItem(bookId, data);
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
  } catch (err) {
    console.warn("[PageTurn] Failed to clear EPUB cache:", err);
  }
}
