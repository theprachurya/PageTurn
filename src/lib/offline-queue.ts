import localforage from "localforage";

/**
 * Offline Sync Queue
 * 
 * When the user is offline, mutations (progress saves, session logs,
 * highlight/bookmark writes) are queued in IndexedDB. When connectivity
 * returns, the queue is flushed by calling the corresponding Server Actions.
 */

// ─── Types ─────────────────────────────────────────────────────

export type QueueAction =
  | { type: "syncProgress"; args: { bookId: string; cfi: string; progressPercentage: number } }
  | { type: "logSession"; args: { bookId: string; startTime: string; endTime: string; durationMinutes: number; chapterName: string | null; wordsRead: number } }
  | { type: "addBookmark"; args: { bookId: string; cfi: string; label: string } }
  | { type: "addHighlight"; args: { bookId: string; cfiRange: string; color: string; note: string | null } };

interface QueueEntry {
  id: string;
  action: QueueAction;
  createdAt: string;
}

// ─── Storage ───────────────────────────────────────────────────

const queueStore = localforage.createInstance({
  name: "pageturn",
  storeName: "offline_queue",
});

const QUEUE_KEY = "pending_actions";

async function getQueue(): Promise<QueueEntry[]> {
  return (await queueStore.getItem<QueueEntry[]>(QUEUE_KEY)) || [];
}

async function setQueue(entries: QueueEntry[]): Promise<void> {
  await queueStore.setItem(QUEUE_KEY, entries);
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Enqueue a mutation for later execution. If online, execute immediately.
 * If offline, persist to IndexedDB and flush when connectivity is restored.
 */
export async function enqueue(action: QueueAction): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      await executeAction(action);
      return;
    } catch (err) {
      console.warn("Online execution failed, queuing for retry:", err);
    }
  }

  const queue = await getQueue();
  queue.push({
    id: crypto.randomUUID(),
    action,
    createdAt: new Date().toISOString(),
  });
  await setQueue(queue);
}

/**
 * Flush all pending actions. Called when the browser comes back online.
 */
export async function flushQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueueEntry[] = [];

  for (const entry of queue) {
    try {
      await executeAction(entry.action);
      succeeded++;
    } catch (err) {
      console.error("Failed to flush action:", entry, err);
      remaining.push(entry);
      failed++;
    }
  }

  await setQueue(remaining);
  return { succeeded, failed };
}

/**
 * Returns the number of pending actions in the queue.
 */
export async function pendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// ─── Execution ─────────────────────────────────────────────────

async function executeAction(action: QueueAction): Promise<void> {
  // Lazily import Server Actions so this module can be used in client components
  const {
    syncProgress,
    logReadingSession,
    addBookmark,
    addHighlight,
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
      await addBookmark(action.args.bookId, action.args.cfi, action.args.label);
      break;
    case "addHighlight":
      await addHighlight(action.args.bookId, action.args.cfiRange, action.args.color, action.args.note);
      break;
  }
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

  window.addEventListener("online", async () => {
    console.debug("[PageTurn] Back online — flushing offline queue...");
    const result = await flushQueue();
    console.debug(`[PageTurn] Flushed: ${result.succeeded} succeeded, ${result.failed} failed`);
  });
}
