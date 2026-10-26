import localforage from "localforage";

/**
 * Offline Sync Queue & Offline-First Storage Engine
 * 
 * Provides resilient offline synchronization for PageTurn:
 * - Offline mutation queueing (progress, reading sessions, highlights, bookmarks)
 * - Strict FIFO replay on network reconnection
 * - Mutation coalescing & idempotency deduplication
 * - Timestamp-based Last-Write-Wins (LWW) conflict resolution
 * - Exponential backoff retry logic for transient Supabase / network errors
 * - Self-healing local cache recovery for corrupted entries
 * - Immediate local IndexedDB persistence for offline CFI reading positions & annotations
 */

// ─── Types ─────────────────────────────────────────────────────

export type QueueAction =
  | {
      type: "syncProgress";
      args: {
        bookId: string;
        cfi: string;
        progressPercentage: number;
        clientUpdatedAt?: string;
      };
    }
  | {
      type: "logSession";
      args: {
        bookId: string;
        startTime: string;
        endTime: string;
        durationMinutes: number;
        chapterName: string | null;
        wordsRead: number;
      };
    }
  | {
      type: "addBookmark";
      args: {
        id?: string;
        bookId: string;
        cfi: string;
        label: string;
        createdAt?: string;
      };
    }
  | {
      type: "removeBookmark";
      args: {
        id: string;
        bookId?: string;
      };
    }
  | {
      type: "addHighlight";
      args: {
        id?: string;
        bookId: string;
        cfiRange: string;
        color: string;
        note?: string | null;
        text?: string;
        createdAt?: string;
      };
    }
  | {
      type: "updateHighlight";
      args: {
        id: string;
        bookId?: string;
        color?: string;
        note?: string | null;
        updatedAt?: string;
      };
    }
  | {
      type: "deleteHighlight";
      args: {
        id: string;
        bookId?: string;
      };
    };

export interface QueueEntry {
  id: string;
  action: QueueAction;
  createdAt: string;
  retryCount?: number;
  lastError?: string;
}

export interface FlushOptions {
  maxRetries?: number;
  customExecutor?: (action: QueueAction) => Promise<unknown>;
}

export interface FlushResult {
  succeeded: number;
  failed: number;
  retried: number;
  remaining: number;
  executedActions: string[];
}

export interface LocalReadingPosition {
  bookId: string;
  cfi: string;
  progressPercentage: number;
  timestamp: string;
}

export interface LocalBookmark {
  id: string;
  bookId: string;
  cfi: string;
  label: string;
  createdAt: string;
}

export interface LocalHighlight {
  id: string;
  bookId: string;
  cfiRange: string;
  color: string;
  note?: string | null;
  text?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConflictResolution<T> {
  winner: "local" | "remote";
  resolved: T;
  reason: string;
}

// ─── Storage Stores ────────────────────────────────────────────

export const queueStore = localforage.createInstance({
  name: "pageturn",
  storeName: "offline_queue",
});

export const positionStore = localforage.createInstance({
  name: "pageturn",
  storeName: "reading_positions",
});

export const bookmarksStore = localforage.createInstance({
  name: "pageturn",
  storeName: "local_bookmarks",
});

export const highlightsStore = localforage.createInstance({
  name: "pageturn",
  storeName: "local_highlights",
});

export const appliedStore = localforage.createInstance({
  name: "pageturn",
  storeName: "applied_sync_actions",
});

const QUEUE_KEY = "pending_actions";
export const DEFAULT_MAX_RETRIES = 3;

// ─── Queue Read / Write & Self-Healing Recovery ─────────────────

/**
 * Reads pending queue entries from IndexedDB.
 * Detects corrupted data (non-array, null items, malformed records),
 * automatically salvages valid entries, repairs the store, and recovers gracefully.
 */
export async function getQueue(): Promise<QueueEntry[]> {
  try {
    const raw = await queueStore.getItem<unknown>(QUEUE_KEY);
    if (!raw) return [];

    if (!Array.isArray(raw)) {
      console.warn("[PageTurn] Corrupted offline queue detected (expected array). Self-healing reset.");
      await queueStore.setItem(QUEUE_KEY, []);
      return [];
    }

    // Validate each entry
    const validEntries: QueueEntry[] = [];
    let hasCorrupted = false;

    for (const item of raw) {
      if (item && typeof item === "object") {
        const candidate = item as Record<string, unknown>;
        if (
          typeof candidate.id === "string" &&
          candidate.action &&
          typeof candidate.action === "object" &&
          typeof (candidate.action as Record<string, unknown>).type === "string"
        ) {
          validEntries.push(item as QueueEntry);
          continue;
        }
      }
      hasCorrupted = true;
    }

    if (hasCorrupted) {
      console.warn(`[PageTurn] Repaired corrupted queue: salvaged ${validEntries.length} of ${raw.length} entries.`);
      await queueStore.setItem(QUEUE_KEY, validEntries);
    }

    return validEntries;
  } catch (err) {
    console.warn("[PageTurn] Failed to read queue from storage, recovering:", err);
    try {
      await queueStore.setItem(QUEUE_KEY, []);
    } catch {
      /* ignore */
    }
    return [];
  }
}

export async function setQueue(entries: QueueEntry[]): Promise<void> {
  await queueStore.setItem(QUEUE_KEY, entries);
}

export async function clearQueue(): Promise<void> {
  await queueStore.setItem(QUEUE_KEY, []);
}

/**
 * Explicitly triggers recovery of corrupted queue storage.
 */
export async function recoverCorruptedQueue(): Promise<QueueEntry[]> {
  return await getQueue();
}

// ─── Deduplication & Coalescing ────────────────────────────────

/**
 * Deduplicates and coalesces queue mutations:
 * 1. Removes duplicate action IDs (ensures idempotency).
 * 2. Coalesces intermediate progress updates for the same book, keeping
 *    the latest progress update while preserving overall FIFO ordering for
 *    reading sessions, highlights, and bookmarks.
 */
export function deduplicateQueue(entries: QueueEntry[]): QueueEntry[] {
  if (entries.length <= 1) return [...entries];

  const seenIds = new Set<string>();
  const idDeduped: QueueEntry[] = [];

  for (const entry of entries) {
    if (!seenIds.has(entry.id)) {
      seenIds.add(entry.id);
      idDeduped.push(entry);
    }
  }

  // Find index of the latest syncProgress for each bookId
  const latestProgressIndex = new Map<string, number>();
  for (let i = 0; i < idDeduped.length; i++) {
    const entry = idDeduped[i];
    if (entry.action.type === "syncProgress") {
      latestProgressIndex.set(entry.action.args.bookId, i);
    }
  }

  const result: QueueEntry[] = [];
  for (let i = 0; i < idDeduped.length; i++) {
    const entry = idDeduped[i];
    if (entry.action.type === "syncProgress") {
      const latestIdx = latestProgressIndex.get(entry.action.args.bookId);
      if (i === latestIdx) {
        result.push(entry);
      }
    } else {
      result.push(entry);
    }
  }

  return result;
}

// ─── Conflict Resolution (Last-Write-Wins) ─────────────────────

/**
 * Resolves conflicts between a local mutation and remote Supabase state
 * using deterministic timestamp-based Last-Write-Wins (LWW).
 */
export function resolveConflict<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  options?: { timestampField?: string; preferLocalOnTie?: boolean }
): ConflictResolution<T> {
  const preferLocal = options?.preferLocalOnTie ?? true;

  const extractTimestamp = (record: T): number => {
    if (options?.timestampField && record[options.timestampField]) {
      return new Date(String(record[options.timestampField])).getTime();
    }
    const val =
      record.updatedAt ||
      record.clientUpdatedAt ||
      record.last_read_at ||
      record.lastReadAt ||
      record.timestamp ||
      record.created_at ||
      record.createdAt;
    return val ? new Date(String(val)).getTime() : 0;
  };

  const localTime = extractTimestamp(local);
  const remoteTime = extractTimestamp(remote);

  if (localTime > remoteTime) {
    return {
      winner: "local",
      resolved: local,
      reason: `Local mutation (${localTime}) is newer than remote state (${remoteTime}) [Last-Write-Wins]`,
    };
  } else if (remoteTime > localTime) {
    return {
      winner: "remote",
      resolved: remote,
      reason: `Remote state (${remoteTime}) is newer than local mutation (${localTime}) [Remote-Wins]`,
    };
  } else {
    const winner = preferLocal ? "local" : "remote";
    return {
      winner,
      resolved: preferLocal ? local : remote,
      reason: `Timestamps identical (${localTime}); tie-breaker selected ${winner}`,
    };
  }
}

/**
 * Specialized helper for reading progress conflict resolution.
 */
export function resolveProgressConflict(
  local: { cfi: string; progressPercentage: number; timestamp: string },
  remote: { cfi: string; progressPercentage: number; timestamp: string }
): ConflictResolution<{ cfi: string; progressPercentage: number; timestamp: string }> {
  return resolveConflict(local, remote, { timestampField: "timestamp" });
}

// ─── Transient Error Detection & Retry Backoff ─────────────────

/**
 * Determines whether an error is transient (network timeout, 5xx, rate limit)
 * and should be retried, or permanent (4xx validation/auth) and should be dropped.
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  // Network or socket disconnection
  if (
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("etimedout") ||
    msg.includes("abort") ||
    msg.includes("offline")
  ) {
    return true;
  }

  // HTTP status codes and Postgres error codes
  if (err && typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    const status = errorObj.status || errorObj.statusCode;
    if (typeof status === "number") {
      if (status === 429) return true; // Rate limiting
      if (status >= 500 && status <= 599) return true; // Supabase 5xx server errors
      if (status >= 400 && status < 500) return false; // Client 4xx errors
    }

    const code = errorObj.code;
    if (typeof code === "string") {
      if (code === "57014") return true; // Statement query timeout
      if (code.startsWith("08")) return true; // Connection exception
      if (code === "40001") return true; // Serialization failure
      if (code === "40P01") return true; // Deadlock
    }
  }

  return false;
}

export function calculateBackoffMs(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 10000);
}

// ─── Local Storage Operations (Offline-First State) ────────────

export async function saveLocalReadingPosition(
  bookId: string,
  cfi: string,
  progressPercentage: number
): Promise<LocalReadingPosition> {
  const record: LocalReadingPosition = {
    bookId,
    cfi,
    progressPercentage: Math.min(progressPercentage, 100),
    timestamp: new Date().toISOString(),
  };
  await positionStore.setItem(bookId, record);
  return record;
}

export async function getLocalReadingPosition(
  bookId: string
): Promise<LocalReadingPosition | null> {
  try {
    const record = await positionStore.getItem<LocalReadingPosition>(bookId);
    if (record && typeof record.cfi === "string") {
      return record;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearLocalReadingPosition(bookId: string): Promise<void> {
  await positionStore.removeItem(bookId);
}

export async function saveLocalBookmark(bookmark: LocalBookmark): Promise<void> {
  await bookmarksStore.setItem(bookmark.id, bookmark);
}

export async function getLocalBookmarks(bookId: string): Promise<LocalBookmark[]> {
  const result: LocalBookmark[] = [];
  await bookmarksStore.iterate<LocalBookmark, void>((value) => {
    if (value && value.bookId === bookId) {
      result.push(value);
    }
  });
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function removeLocalBookmark(id: string): Promise<void> {
  await bookmarksStore.removeItem(id);
}

export async function saveLocalHighlight(highlight: LocalHighlight): Promise<void> {
  await highlightsStore.setItem(highlight.id, highlight);
}

export async function getLocalHighlights(bookId: string): Promise<LocalHighlight[]> {
  const result: LocalHighlight[] = [];
  await highlightsStore.iterate<LocalHighlight, void>((value) => {
    if (value && value.bookId === bookId) {
      result.push(value);
    }
  });
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateLocalHighlight(
  id: string,
  updates: Partial<LocalHighlight>
): Promise<LocalHighlight | null> {
  const existing = await highlightsStore.getItem<LocalHighlight>(id);
  if (!existing) return null;

  const updated: LocalHighlight = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await highlightsStore.setItem(id, updated);
  return updated;
}

export async function removeLocalHighlight(id: string): Promise<void> {
  await highlightsStore.removeItem(id);
}

// ─── Action Execution & Pluggable Executor ──────────────────────

export type ActionExecutor = (action: QueueAction) => Promise<unknown>;

let customExecutor: ActionExecutor | null = null;

export function setActionExecutor(executor: ActionExecutor | null): void {
  customExecutor = executor;
}

export function getActionExecutor(): ActionExecutor | null {
  return customExecutor;
}

// Serialize queue read/modify/write operations so a concurrent enqueue cannot
// be overwritten by a flush that is saving its remaining entries.
let queueOperation = Promise.resolve();

function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = queueOperation.then(operation, operation);
  queueOperation = result.then(() => undefined, () => undefined);
  return result;
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleQueueRetry(delayMs: number): void {
  if (typeof window === "undefined" || !navigator.onLine || retryTimer) return;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (navigator.onLine) void flushQueue();
  }, delayMs);
}

async function executeAction(action: QueueAction): Promise<void> {
  if (customExecutor) {
    await customExecutor(action);
    return;
  }

  // Lazily import Server Actions in browser runtime
  const {
    syncProgress,
    logReadingSession,
    addBookmark,
    removeBookmark,
    addHighlight,
    updateHighlight,
    removeHighlight,
  } = await import("@/app/actions/reader.actions");

  switch (action.type) {
    case "syncProgress":
      await syncProgress(action.args.bookId, action.args.cfi, action.args.progressPercentage);
      break;
    case "logSession":
      await logReadingSession(
        action.args.bookId,
        action.args.startTime,
        action.args.endTime,
        action.args.durationMinutes,
        action.args.chapterName,
        action.args.wordsRead
      );
      break;
    case "addBookmark":
      await addBookmark(action.args.bookId, action.args.cfi, action.args.label, action.args.id, action.args.createdAt);
      break;
    case "removeBookmark":
      await removeBookmark(action.args.id);
      break;
    case "addHighlight":
      await addHighlight(
        action.args.bookId,
        action.args.cfiRange,
        action.args.color,
        action.args.note ?? null,
        action.args.id,
        action.args.text,
        action.args.createdAt,
      );
      break;
    case "updateHighlight":
      await updateHighlight(action.args.id, {
        color: action.args.color,
        note: action.args.note,
      });
      break;
    case "deleteHighlight":
      await removeHighlight(action.args.id);
      break;
  }
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Enqueue a mutation.
 * Also immediately persists the mutation to local IndexedDB stores
 * so reading state is instantaneous even when completely offline.
 */
export async function enqueue(
  action: QueueAction,
  options?: { customId?: string; skipOnlineCheck?: boolean }
): Promise<QueueEntry> {
  const queuedAction: QueueAction = action.type === "addBookmark"
    ? {
        ...action,
        args: {
          ...action.args,
          id: action.args.id || crypto.randomUUID(),
          createdAt: action.args.createdAt || new Date().toISOString(),
        },
      }
    : action.type === "addHighlight"
      ? {
          ...action,
          args: {
            ...action.args,
            id: action.args.id || crypto.randomUUID(),
            createdAt: action.args.createdAt || new Date().toISOString(),
          },
        }
      : action;

  // Update local offline cache immediately
  try {
    if (queuedAction.type === "syncProgress") {
      await saveLocalReadingPosition(
        queuedAction.args.bookId,
        queuedAction.args.cfi,
        queuedAction.args.progressPercentage
      );
    } else if (queuedAction.type === "addBookmark") {
      const bookmarkId = queuedAction.args.id!;
      await saveLocalBookmark({
        id: bookmarkId,
        bookId: queuedAction.args.bookId,
        cfi: queuedAction.args.cfi,
        label: queuedAction.args.label,
        createdAt: queuedAction.args.createdAt!,
      });
    } else if (queuedAction.type === "removeBookmark") {
      await removeLocalBookmark(queuedAction.args.id);
    } else if (queuedAction.type === "addHighlight") {
      const highlightId = queuedAction.args.id!;
      await saveLocalHighlight({
        id: highlightId,
        bookId: queuedAction.args.bookId,
        cfiRange: queuedAction.args.cfiRange,
        color: queuedAction.args.color,
        note: queuedAction.args.note,
        text: queuedAction.args.text,
        createdAt: queuedAction.args.createdAt!,
      });
    } else if (queuedAction.type === "updateHighlight") {
      await updateLocalHighlight(queuedAction.args.id, {
        color: queuedAction.args.color,
        note: queuedAction.args.note,
        updatedAt: queuedAction.args.updatedAt,
      });
    } else if (queuedAction.type === "deleteHighlight") {
      await removeLocalHighlight(queuedAction.args.id);
    }
  } catch (err) {
    console.warn("[PageTurn] Failed to update local offline store:", err);
  }

  let wasQueued = false;
  const entry = await withQueueLock(async () => {
    const queue = await getQueue();

    // Avoid bypassing older mutations already waiting in the queue. Direct
    // execution is safe only when it cannot overtake a pending action.
    if (
      queue.length === 0 &&
      !options?.skipOnlineCheck &&
      typeof navigator !== "undefined" &&
      navigator.onLine
    ) {
      try {
        await executeAction(queuedAction);
        const entry: QueueEntry = {
          id: options?.customId || crypto.randomUUID(),
          action: queuedAction,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        };
        await appliedStore.setItem(entry.id, Date.now());
        return entry;
      } catch (err) {
        console.warn("[PageTurn] Online execution failed, enqueuing for offline retry:", err);
      }
    }

    const entry: QueueEntry = {
      id: options?.customId || crypto.randomUUID(),
      action: queuedAction,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(entry);
    const deduplicated = deduplicateQueue(queue);
    await setQueue(deduplicated);
    wasQueued = true;

    return entry;
  });

  if (wasQueued && !options?.skipOnlineCheck) {
    scheduleQueueRetry(calculateBackoffMs(0));
  }

  return entry;
}

/**
 * Flush all pending actions in strict FIFO sequence.
 * - Deduplicates intermediate redundant progress updates.
 * - Enforces idempotency via applied actions tracker.
 * - Retries transient errors up to maxRetries with backoff tracking.
 * - Discards or logs non-transient errors to prevent blocking.
 */
export function flushQueue(options?: FlushOptions): Promise<FlushResult> {
  return withQueueLock(async () => {
    const result = await flushQueueLocked(options);
    if (options?.customExecutor) return result;

    if (result.retried > 0 && typeof window !== "undefined" && navigator.onLine) {
      const entries = await getQueue();
      const nextRetryCount = entries[0]?.retryCount || 1;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      scheduleQueueRetry(calculateBackoffMs(Math.max(0, nextRetryCount - 1)));
    } else if (result.remaining === 0 && retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    return result;
  });
}

async function flushQueueLocked(options?: FlushOptions): Promise<FlushResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const executor = options?.customExecutor;

  const queue = await getQueue();
  if (queue.length === 0) {
    return { succeeded: 0, failed: 0, retried: 0, remaining: 0, executedActions: [] };
  }

  const dedupedQueue = deduplicateQueue(queue);
  let succeeded = 0;
  let failed = 0;
  let retried = 0;
  const remaining: QueueEntry[] = [];
  const executedActions: string[] = [];

  for (let index = 0; index < dedupedQueue.length; index++) {
    const entry = dedupedQueue[index];
    // Idempotency check: has this action already been applied?
    const alreadyApplied = await appliedStore.getItem(entry.id);
    if (alreadyApplied) {
      succeeded++;
      executedActions.push(entry.id);
      continue;
    }

    try {
      if (executor) {
        await executor(entry.action);
      } else {
        await executeAction(entry.action);
      }

      await appliedStore.setItem(entry.id, Date.now());
      succeeded++;
      executedActions.push(entry.id);
    } catch (err) {
      const isTransient = isTransientError(err);
      const currentRetries = (entry.retryCount || 0) + 1;

      if (isTransient && currentRetries <= maxRetries) {
        entry.retryCount = currentRetries;
        entry.lastError = err instanceof Error ? err.message : String(err);
        remaining.push(entry);
        remaining.push(...dedupedQueue.slice(index + 1));
        retried++;
        // Keep strict FIFO: later mutations must wait until this one succeeds.
        break;
      } else {
        console.error(`[PageTurn] Dropping failed non-transient or exhausted action ${entry.id}:`, err);
        failed++;
      }
    }
  }

  await setQueue(remaining);
  return {
    succeeded,
    failed,
    retried,
    remaining: remaining.length,
    executedActions,
  };
}

/**
 * Returns the number of pending actions in the queue.
 */
export async function pendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// ─── Connectivity Listener ─────────────────────────────────────

let listenerAttached = false;

/**
 * Attach a global "online" listener that auto-flushes the queue.
 * Call this once from a top-level client component (e.g., the layout).
 */
export function initOfflineSync(): void {
  if (typeof window === "undefined" || listenerAttached) return;
  listenerAttached = true;

  const flushIfOnline = async () => {
    if (!navigator.onLine) return;

    console.debug("[PageTurn] Online — flushing offline queue...");
    const result = await flushQueue();
    console.debug(
      `[PageTurn] Flushed: ${result.succeeded} succeeded, ${result.failed} failed, ${result.retried} retried`
    );
  };

  window.addEventListener("online", flushIfOnline);
  void flushIfOnline();
}
