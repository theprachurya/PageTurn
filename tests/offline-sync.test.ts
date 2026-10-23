import "fake-indexeddb/auto";
import test, { describe, beforeEach } from "node:test";
import assert from "node:assert";
import {
  enqueue,
  flushQueue,
  getQueue,
  setQueue,
  clearQueue,
  pendingCount,
  deduplicateQueue,
  resolveConflict,
  resolveProgressConflict,
  isTransientError,
  calculateBackoffMs,
  saveLocalReadingPosition,
  getLocalReadingPosition,
  saveLocalBookmark,
  getLocalBookmarks,
  removeLocalBookmark,
  saveLocalHighlight,
  getLocalHighlights,
  updateLocalHighlight,
  removeLocalHighlight,
  setActionExecutor,
  queueStore,
  appliedStore,
  positionStore,
  bookmarksStore,
  highlightsStore,
  type QueueEntry,
} from "../src/lib/offline-queue";

import {
  cacheEpub,
  getCachedEpub,
  clearEpubCache,
  isValidEpubBuffer,
  getCacheStats,
  MAX_CACHED_BOOKS,
  epubCache,
} from "../src/lib/epub-cache";

// Helper to generate a dummy valid EPUB ArrayBuffer (ZIP magic header: PK\x03\x04)
function createValidEpubBuffer(sizeBytes = 64): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buffer);
  view[0] = 0x50; // 'P'
  view[1] = 0x4b; // 'K'
  view[2] = 0x03;
  view[3] = 0x04;
  for (let i = 4; i < sizeBytes; i++) {
    view[i] = i % 256;
  }
  return buffer;
}

// Helper to generate a corrupted non-EPUB ArrayBuffer
function createCorruptedBuffer(sizeBytes = 64): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buffer);
  view.fill(0x00); // No ZIP signature
  return buffer;
}

beforeEach(async () => {
  // Clear all IndexedDB stores before each test
  await clearQueue();
  await appliedStore.clear();
  await positionStore.clear();
  await bookmarksStore.clear();
  await highlightsStore.clear();
  await clearEpubCache();
  setActionExecutor(null);
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 1: Offline Queueing of Mutations When Disconnected
// ─────────────────────────────────────────────────────────────
describe("Scenario 1: Offline queueing of mutations when disconnected", () => {
  test("1.1 should queue progress mutation when disconnected", async () => {
    const entry = await enqueue(
      {
        type: "syncProgress",
        args: {
          bookId: "book-001",
          cfi: "epubcfi(/6/2[chap01]!/4/2/4)",
          progressPercentage: 25.5,
        },
      },
      { skipOnlineCheck: true }
    );

    assert.ok(entry.id);
    assert.strictEqual(entry.action.type, "syncProgress");

    const queue = await getQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].id, entry.id);
    assert.strictEqual(queue[0].action.type, "syncProgress");
    if (queue[0].action.type === "syncProgress") {
      assert.strictEqual(queue[0].action.args.bookId, "book-001");
      assert.strictEqual(queue[0].action.args.progressPercentage, 25.5);
    }
  });

  test("1.2 should queue highlight creation when disconnected", async () => {
    const entry = await enqueue(
      {
        type: "addHighlight",
        args: {
          id: "hl-101",
          bookId: "book-001",
          cfiRange: "epubcfi(/6/2!/4/2/10,/4/2/20)",
          color: "electric-yellow",
          note: "Important insight on page 12",
          text: "The universe is under no obligation to make sense to you.",
        },
      },
      { skipOnlineCheck: true }
    );

    const queue = await getQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].id, entry.id);
    assert.strictEqual(queue[0].action.type, "addHighlight");
    if (queue[0].action.type === "addHighlight") {
      assert.strictEqual(queue[0].action.args.color, "electric-yellow");
    }
  });

  test("1.3 should queue bookmark mutation when disconnected", async () => {
    await enqueue(
      {
        type: "addBookmark",
        args: {
          id: "bm-201",
          bookId: "book-001",
          cfi: "epubcfi(/6/6[chap03]!/4/2/2)",
          label: "Chapter 3: Quantum Foundations",
        },
      },
      { skipOnlineCheck: true }
    );

    const count = await pendingCount();
    assert.strictEqual(count, 1);

    const queue = await getQueue();
    assert.strictEqual(queue[0].action.type, "addBookmark");
    if (queue[0].action.type === "addBookmark") {
      assert.strictEqual(queue[0].action.args.label, "Chapter 3: Quantum Foundations");
    }
  });

  test("1.4 should queue reading session logs when disconnected", async () => {
    await enqueue(
      {
        type: "logSession",
        args: {
          bookId: "book-001",
          startTime: "2026-10-16T10:00:00.000Z",
          endTime: "2026-10-16T10:45:00.000Z",
          durationMinutes: 45,
          chapterName: "Chapter 2",
          wordsRead: 4500,
        },
      },
      { skipOnlineCheck: true }
    );

    const queue = await getQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].action.type, "logSession");
    if (queue[0].action.type === "logSession") {
      assert.strictEqual(queue[0].action.args.durationMinutes, 45);
      assert.strictEqual(queue[0].action.args.wordsRead, 4500);
    }
  });

  test("1.5 should accumulate multiple distinct mutations in pending queue", async () => {
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-001", cfi: "cfi-1", progressPercentage: 10 },
      },
      { skipOnlineCheck: true }
    );
    await enqueue(
      {
        type: "addBookmark",
        args: { bookId: "book-001", cfi: "cfi-1", label: "Start" },
      },
      { skipOnlineCheck: true }
    );
    await enqueue(
      {
        type: "logSession",
        args: {
          bookId: "book-001",
          startTime: "2026-10-16T09:00:00Z",
          endTime: "2026-10-16T09:30:00Z",
          durationMinutes: 30,
          chapterName: null,
          wordsRead: 3000,
        },
      },
      { skipOnlineCheck: true }
    );

    assert.strictEqual(await pendingCount(), 3);
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 2: Replaying Sync Queue in Strict FIFO Sequence
// ─────────────────────────────────────────────────────────────
describe("Scenario 2: Replaying sync queue in strict FIFO order on reconnection", () => {
  test("2.1 should replay queued mutations in exact FIFO order", async () => {
    const executionLog: string[] = [];

    // Setup actions
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-001", cfi: "cfi-step-1", progressPercentage: 10 },
      },
      { customId: "action-1", skipOnlineCheck: true }
    );
    await enqueue(
      {
        type: "addBookmark",
        args: { id: "bm-1", bookId: "book-001", cfi: "cfi-step-1", label: "Step 1" },
      },
      { customId: "action-2", skipOnlineCheck: true }
    );
    await enqueue(
      {
        type: "logSession",
        args: {
          bookId: "book-001",
          startTime: "2026-10-16T10:00:00Z",
          endTime: "2026-10-16T10:15:00Z",
          durationMinutes: 15,
          chapterName: "Intro",
          wordsRead: 1500,
        },
      },
      { customId: "action-3", skipOnlineCheck: true }
    );
    await enqueue(
      {
        type: "addHighlight",
        args: {
          id: "hl-1",
          bookId: "book-001",
          cfiRange: "range-1",
          color: "blue",
          note: null,
        },
      },
      { customId: "action-4", skipOnlineCheck: true }
    );

    const result = await flushQueue({
      customExecutor: async (action) => {
        executionLog.push(action.type);
      },
    });

    assert.strictEqual(result.succeeded, 4);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.remaining, 0);

    // Verify exact FIFO sequence
    assert.deepStrictEqual(executionLog, [
      "syncProgress",
      "addBookmark",
      "logSession",
      "addHighlight",
    ]);
  });

  test("2.2 should completely drain queue after successful replay", async () => {
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-A", cfi: "cfi-A", progressPercentage: 50 },
      },
      { skipOnlineCheck: true }
    );
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-B", cfi: "cfi-B", progressPercentage: 75 },
      },
      { skipOnlineCheck: true }
    );

    assert.strictEqual(await pendingCount(), 2);

    const result = await flushQueue({
      customExecutor: async () => {
        /* succeed */
      },
    });

    assert.strictEqual(result.succeeded, 2);
    assert.strictEqual(await pendingCount(), 0);
  });

  test("2.3 should safely handle flush on empty queue", async () => {
    const result = await flushQueue({
      customExecutor: async () => {
        throw new Error("Should not be called");
      },
    });

    assert.deepStrictEqual(result, {
      succeeded: 0,
      failed: 0,
      retried: 0,
      remaining: 0,
      executedActions: [],
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 3: Idempotency and Mutation Deduplication
// ─────────────────────────────────────────────────────────────
describe("Scenario 3: Idempotency and deduplication of applied sync actions", () => {
  test("3.1 should reject duplicate action IDs via applied actions tracker", async () => {
    let callCount = 0;
    const testExecutor = async () => {
      callCount++;
    };

    // Pre-mark action-id-100 as already applied
    await appliedStore.setItem("action-id-100", Date.now());

    // Inject entry with action-id-100 into queue
    await setQueue([
      {
        id: "action-id-100",
        action: {
          type: "syncProgress",
          args: { bookId: "book-1", cfi: "cfi-1", progressPercentage: 10 },
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    const result = await flushQueue({ customExecutor: testExecutor });
    assert.strictEqual(callCount, 0, "Executor must not be called for already-applied action");
    assert.strictEqual(result.succeeded, 1);
    assert.strictEqual(await pendingCount(), 0);
  });

  test("3.2 should coalesce intermediate progress updates for same book", async () => {
    const entries = [
      {
        id: "p1",
        action: {
          type: "syncProgress" as const,
          args: { bookId: "book-1", cfi: "cfi-10", progressPercentage: 10 },
        },
        createdAt: "2026-10-16T12:00:00Z",
      },
      {
        id: "b1",
        action: {
          type: "addBookmark" as const,
          args: { bookId: "book-1", cfi: "cfi-10", label: "Ch 1" },
        },
        createdAt: "2026-10-16T12:01:00Z",
      },
      {
        id: "p2",
        action: {
          type: "syncProgress" as const,
          args: { bookId: "book-1", cfi: "cfi-20", progressPercentage: 20 },
        },
        createdAt: "2026-10-16T12:05:00Z",
      },
      {
        id: "p3",
        action: {
          type: "syncProgress" as const,
          args: { bookId: "book-1", cfi: "cfi-35", progressPercentage: 35 },
        },
        createdAt: "2026-10-16T12:10:00Z",
      },
    ];

    const coalesced = deduplicateQueue(entries);

    // Should keep b1 and only the latest progress (p3)
    assert.strictEqual(coalesced.length, 2);
    assert.strictEqual(coalesced[0].id, "b1");
    assert.strictEqual(coalesced[1].id, "p3");
    if (coalesced[1].action.type === "syncProgress") {
      assert.strictEqual(coalesced[1].action.args.progressPercentage, 35);
    }
  });

  test("3.3 should preserve distinct books during progress coalescing", async () => {
    const entries = [
      {
        id: "b1-p1",
        action: {
          type: "syncProgress" as const,
          args: { bookId: "book-1", cfi: "cfi-1", progressPercentage: 10 },
        },
        createdAt: "2026-10-16T12:00:00Z",
      },
      {
        id: "b2-p1",
        action: {
          type: "syncProgress" as const,
          args: { bookId: "book-2", cfi: "cfi-A", progressPercentage: 40 },
        },
        createdAt: "2026-10-16T12:01:00Z",
      },
      {
        id: "b1-p2",
        action: {
          type: "syncProgress" as const,
          args: { bookId: "book-1", cfi: "cfi-2", progressPercentage: 25 },
        },
        createdAt: "2026-10-16T12:05:00Z",
      },
    ];

    const coalesced = deduplicateQueue(entries);
    assert.strictEqual(coalesced.length, 2);
    assert.strictEqual(coalesced[0].id, "b2-p1");
    assert.strictEqual(coalesced[1].id, "b1-p2");
    if (coalesced[1].action.type === "syncProgress") {
      assert.strictEqual(coalesced[1].action.args.progressPercentage, 25);
    }
  });

  test("3.4 should deduplicate duplicate action IDs within the same queue", () => {
    const entries = [
      {
        id: "action-dup",
        action: {
          type: "addBookmark" as const,
          args: { bookId: "book-1", cfi: "cfi-1", label: "Note 1" },
        },
        createdAt: "2026-10-16T12:00:00Z",
      },
      {
        id: "action-dup",
        action: {
          type: "addBookmark" as const,
          args: { bookId: "book-1", cfi: "cfi-1", label: "Note 1" },
        },
        createdAt: "2026-10-16T12:01:00Z",
      },
    ];

    const deduped = deduplicateQueue(entries);
    assert.strictEqual(deduped.length, 1);
    assert.strictEqual(deduped[0].id, "action-dup");
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 4: Conflict Resolution (Last-Write-Wins)
// ─────────────────────────────────────────────────────────────
describe("Scenario 4: Conflict resolution (timestamp-based Last-Write-Wins / local vs remote)", () => {
  test("4.1 should select local mutation when local timestamp is newer", () => {
    const local = {
      cfi: "epubcfi(/6/12!/4/2/8)",
      progressPercentage: 60,
      timestamp: "2026-10-16T15:30:00.000Z",
    };
    const remote = {
      cfi: "epubcfi(/6/10!/4/2/2)",
      progressPercentage: 45,
      timestamp: "2026-10-16T14:00:00.000Z",
    };

    const resolution = resolveConflict(local, remote, { timestampField: "timestamp" });
    assert.strictEqual(resolution.winner, "local");
    assert.strictEqual(resolution.resolved.progressPercentage, 60);
    assert.strictEqual(resolution.resolved.cfi, local.cfi);
    assert.ok(resolution.reason.includes("Last-Write-Wins"));
  });

  test("4.2 should select remote state when remote timestamp is newer", () => {
    const local = {
      cfi: "epubcfi(/6/4!/4/2/1)",
      progressPercentage: 15,
      timestamp: "2026-10-16T10:00:00.000Z",
    };
    const remote = {
      cfi: "epubcfi(/6/8!/4/2/10)",
      progressPercentage: 35,
      timestamp: "2026-10-16T13:45:00.000Z",
    };

    const resolution = resolveConflict(local, remote, { timestampField: "timestamp" });
    assert.strictEqual(resolution.winner, "remote");
    assert.strictEqual(resolution.resolved.progressPercentage, 35);
    assert.strictEqual(resolution.resolved.cfi, remote.cfi);
  });

  test("4.3 should use deterministic tie-breaker on identical timestamps", () => {
    const local = {
      cfi: "epubcfi(/6/4!/4/2/1)",
      progressPercentage: 50,
      timestamp: "2026-10-16T12:00:00.000Z",
    };
    const remote = {
      cfi: "epubcfi(/6/4!/4/2/1)",
      progressPercentage: 50,
      timestamp: "2026-10-16T12:00:00.000Z",
    };

    const tieLocal = resolveConflict(local, remote, {
      timestampField: "timestamp",
      preferLocalOnTie: true,
    });
    assert.strictEqual(tieLocal.winner, "local");

    const tieRemote = resolveConflict(local, remote, {
      timestampField: "timestamp",
      preferLocalOnTie: false,
    });
    assert.strictEqual(tieRemote.winner, "remote");
  });

  test("4.4 should resolve conflict using resolveProgressConflict helper", () => {
    const local = {
      cfi: "epubcfi(/6/20!/4)",
      progressPercentage: 90,
      timestamp: "2026-10-16T18:00:00Z",
    };
    const remote = {
      cfi: "epubcfi(/6/18!/4)",
      progressPercentage: 80,
      timestamp: "2026-10-16T17:00:00Z",
    };

    const res = resolveProgressConflict(local, remote);
    assert.strictEqual(res.winner, "local");
    assert.strictEqual(res.resolved.progressPercentage, 90);
  });

  test("4.5 should extract fallback timestamp properties (updatedAt, last_read_at, createdAt)", () => {
    const local: { id: string; note: string; updatedAt?: string; createdAt?: string } = {
      id: "hl-1",
      note: "Updated locally",
      updatedAt: "2026-10-16T16:00:00Z",
    };
    const remote: { id: string; note: string; updatedAt?: string; createdAt?: string } = {
      id: "hl-1",
      note: "Initial cloud version",
      createdAt: "2026-10-16T12:00:00Z",
    };

    const res = resolveConflict(local, remote);
    assert.strictEqual(res.winner, "local");
    assert.strictEqual(res.resolved.note, "Updated locally");
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 5: Network Retry Logic on Transient Supabase Errors
// ─────────────────────────────────────────────────────────────
describe("Scenario 5: Network retry logic on transient Supabase errors", () => {
  test("5.1 should accurately identify transient network and server errors", () => {
    assert.ok(isTransientError(new Error("fetch failed")));
    assert.ok(isTransientError(new Error("NetworkError when attempting to fetch resource")));
    assert.ok(isTransientError(new Error("ETIMEDOUT: Connection timed out")));
    assert.ok(isTransientError(new Error("ECONNRESET: socket hang up")));
    assert.ok(isTransientError({ status: 500, message: "Internal Server Error" }));
    assert.ok(isTransientError({ status: 503, message: "Service Unavailable" }));
    assert.ok(isTransientError({ status: 429, message: "Too Many Requests" }));
    assert.ok(isTransientError({ code: "57014", message: "query_canceled" }));
    assert.ok(isTransientError({ code: "08006", message: "connection_failure" }));
  });

  test("5.2 should identify permanent 4xx client errors as non-transient", () => {
    assert.strictEqual(isTransientError({ status: 400, message: "Bad Request" }), false);
    assert.strictEqual(isTransientError({ status: 401, message: "Unauthorized" }), false);
    assert.strictEqual(isTransientError({ status: 403, message: "Forbidden" }), false);
    assert.strictEqual(isTransientError({ status: 404, message: "Not Found" }), false);
    assert.strictEqual(isTransientError({ status: 422, message: "Unprocessable Entity" }), false);
  });

  test("5.3 should calculate exponential backoff delay correctly", () => {
    assert.strictEqual(calculateBackoffMs(0), 1000);
    assert.strictEqual(calculateBackoffMs(1), 2000);
    assert.strictEqual(calculateBackoffMs(2), 4000);
    assert.strictEqual(calculateBackoffMs(3), 8000);
    assert.strictEqual(calculateBackoffMs(4), 10000); // Capped at 10,000ms
  });

  test("5.4 should retain transiently failed action in queue with incremented retry count", async () => {
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-1", cfi: "cfi-1", progressPercentage: 10 },
      },
      { customId: "retry-act-1", skipOnlineCheck: true }
    );

    const result = await flushQueue({
      customExecutor: async () => {
        const transientErr = new Error("fetch failed");
        Object.assign(transientErr, { status: 503 });
        throw transientErr;
      },
    });

    assert.strictEqual(result.succeeded, 0);
    assert.strictEqual(result.retried, 1);
    assert.strictEqual(result.remaining, 1);

    const queue = await getQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].retryCount, 1);
    assert.strictEqual(queue[0].lastError, "fetch failed");
  });

  test("5.5 should succeed on subsequent retry when service recovers", async () => {
    let attempts = 0;
    await enqueue(
      {
        type: "addBookmark",
        args: { bookId: "book-1", cfi: "cfi-1", label: "Bm 1" },
      },
      { customId: "recover-act", skipOnlineCheck: true }
    );

    // 1st attempt: fails with 503
    await flushQueue({
      customExecutor: async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("fetch failed: 503 Service Unavailable");
        }
      },
    });

    assert.strictEqual(await pendingCount(), 1);

    // 2nd attempt: succeeds
    const recoveryResult = await flushQueue({
      customExecutor: async () => {
        attempts++;
        // Success
      },
    });

    assert.strictEqual(recoveryResult.succeeded, 1);
    assert.strictEqual(recoveryResult.remaining, 0);
    assert.strictEqual(await pendingCount(), 0);
  });

  test("5.6 should drop non-transient 400 errors without infinite blocking", async () => {
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-bad", cfi: "invalid", progressPercentage: -50 },
      },
      { customId: "bad-request-act", skipOnlineCheck: true }
    );

    const result = await flushQueue({
      customExecutor: async () => {
        const clientErr = new Error("Invalid CFI syntax");
        Object.assign(clientErr, { status: 400 });
        throw clientErr;
      },
    });

    assert.strictEqual(result.succeeded, 0);
    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.remaining, 0, "Non-transient action must be dropped from active queue");
    assert.strictEqual(await pendingCount(), 0);
  });

  test("5.7 should drop action after exceeding max retries", async () => {
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: "book-1", cfi: "cfi-1", progressPercentage: 10 },
      },
      { customId: "exhausted-act", skipOnlineCheck: true }
    );

    // Simulate 3 prior retries
    const queue = await getQueue();
    queue[0].retryCount = 3;
    await setQueue(queue);

    // Flush with maxRetries = 3
    const result = await flushQueue({
      maxRetries: 3,
      customExecutor: async () => {
        throw new Error("network timeout");
      },
    });

    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.retried, 0);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(await pendingCount(), 0);
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 6: Local Cache Recovery on Corrupted Data
// ─────────────────────────────────────────────────────────────
describe("Scenario 6: Local cache recovery on corrupted data", () => {
  test("6.1 should safely self-heal when queue store contains corrupted non-array data", async () => {
    // Write corrupted string instead of an array
    await queueStore.setItem("pending_actions", "CORRUPTED_STRING_NOT_AN_ARRAY" as unknown as QueueEntry[]);

    const queue = await getQueue();
    assert.deepStrictEqual(queue, []);

    // Verify it repaired storage with empty array
    const rawAfter = await queueStore.getItem("pending_actions");
    assert.deepStrictEqual(rawAfter, []);
  });

  test("6.2 should salvage valid entries and filter out corrupted items from queue", async () => {
    const mixedQueue = [
      {
        id: "valid-1",
        action: {
          type: "syncProgress",
          args: { bookId: "b1", cfi: "cfi-1", progressPercentage: 10 },
        },
        createdAt: "2026-10-16T12:00:00Z",
      },
      null, // Corrupted item
      "invalid-string-item", // Corrupted item
      { bad: "object without id" }, // Corrupted item
      {
        id: "valid-2",
        action: {
          type: "addBookmark",
          args: { bookId: "b1", cfi: "cfi-2", label: "Ch 2" },
        },
        createdAt: "2026-10-16T12:05:00Z",
      },
    ];

    await queueStore.setItem("pending_actions", mixedQueue as unknown as QueueEntry[]);

    const salvaged = await getQueue();
    assert.strictEqual(salvaged.length, 2);
    assert.strictEqual(salvaged[0].id, "valid-1");
    assert.strictEqual(salvaged[1].id, "valid-2");
  });

  test("6.3 should validate EPUB buffer signatures and reject invalid data", () => {
    assert.strictEqual(isValidEpubBuffer(null), false);
    assert.strictEqual(isValidEpubBuffer(undefined), false);
    assert.strictEqual(isValidEpubBuffer("string-data"), false);
    assert.strictEqual(isValidEpubBuffer(new ArrayBuffer(2)), false); // Less than 4 bytes
    assert.strictEqual(isValidEpubBuffer(createCorruptedBuffer(128)), false);
    assert.strictEqual(isValidEpubBuffer(createValidEpubBuffer(128)), true);
  });

  test("6.4 should automatically purge corrupted cached EPUB and return null", async () => {
    const corruptedBuffer = createCorruptedBuffer(256);

    // Bypass cacheEpub validator to simulate storage corruption at rest
    await epubCache.setItem("corrupted-book", corruptedBuffer);

    // Reading should detect invalid EPUB, purge entry, and return null safely
    const result = await getCachedEpub("corrupted-book");
    assert.strictEqual(result, null);

    // Verify it was purged from cache
    const checkStore = await epubCache.getItem("corrupted-book");
    assert.strictEqual(checkStore, null);
  });

  test("6.5 should refuse to cache invalid buffer in cacheEpub", async () => {
    const invalidBuffer = createCorruptedBuffer(100);
    const success = await cacheEpub("invalid-book", invalidBuffer);
    assert.strictEqual(success, false);

    const cached = await getCachedEpub("invalid-book");
    assert.strictEqual(cached, null);
  });

  test("6.6 should evict least recently used book when exceeding MAX_CACHED_BOOKS", async () => {
    // Fill cache up to capacity (10 books)
    for (let i = 1; i <= MAX_CACHED_BOOKS; i++) {
      const buf = createValidEpubBuffer(64);
      await cacheEpub(`book-${i}`, buf);
    }

    let stats = await getCacheStats();
    assert.strictEqual(stats.cachedCount, MAX_CACHED_BOOKS);

    // Access book-1 so it becomes recently used
    await getCachedEpub("book-1");

    // Add 11th book to trigger LRU eviction
    const buf11 = createValidEpubBuffer(64);
    await cacheEpub("book-11", buf11);

    stats = await getCacheStats();
    assert.strictEqual(stats.cachedCount, MAX_CACHED_BOOKS);
    assert.ok(stats.bookIds.includes("book-11"));
    assert.ok(stats.bookIds.includes("book-1")); // book-1 was recently accessed, should be kept!
    assert.ok(!stats.bookIds.includes("book-2")); // book-2 was least recently accessed, evicted!
  });

  test("6.7 should report accurate cache stats telemetry", async () => {
    await cacheEpub("stat-book-1", createValidEpubBuffer(64));
    await cacheEpub("stat-book-2", createValidEpubBuffer(64));

    const stats = await getCacheStats();
    assert.strictEqual(stats.cachedCount, 2);
    assert.strictEqual(stats.maxCapacity, MAX_CACHED_BOOKS);
    assert.deepStrictEqual(stats.bookIds.sort(), ["stat-book-1", "stat-book-2"]);
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 7: Offline CFI Reading Position Bookmarking & Restoration
// ─────────────────────────────────────────────────────────────
describe("Scenario 7: Offline CFI reading position bookmarking and restoration", () => {
  test("7.1 should save and restore reading position offline in IndexedDB", async () => {
    const saved = await saveLocalReadingPosition(
      "book-quantum",
      "epubcfi(/6/14[chap05]!/4/2/18)",
      42.8
    );

    assert.strictEqual(saved.bookId, "book-quantum");
    assert.strictEqual(saved.cfi, "epubcfi(/6/14[chap05]!/4/2/18)");
    assert.strictEqual(saved.progressPercentage, 42.8);
    assert.ok(saved.timestamp);

    // Simulate reader reopen / app restart
    const restored = await getLocalReadingPosition("book-quantum");
    assert.ok(restored);
    assert.strictEqual(restored.cfi, "epubcfi(/6/14[chap05]!/4/2/18)");
    assert.strictEqual(restored.progressPercentage, 42.8);
  });

  test("7.2 should overwrite older local position with newer position", async () => {
    await saveLocalReadingPosition("book-history", "cfi-page-10", 10.0);
    await saveLocalReadingPosition("book-history", "cfi-page-25", 25.0);

    const position = await getLocalReadingPosition("book-history");
    assert.ok(position);
    assert.strictEqual(position.cfi, "cfi-page-25");
    assert.strictEqual(position.progressPercentage, 25.0);
  });

  test("7.3 should create, list, and delete bookmarks offline", async () => {
    await saveLocalBookmark({
      id: "bm-1",
      bookId: "book-deep-work",
      cfi: "epubcfi(/6/4!/4/2)",
      label: "Rule #1: Work Deeply",
      createdAt: "2026-10-16T08:00:00Z",
    });

    await saveLocalBookmark({
      id: "bm-2",
      bookId: "book-deep-work",
      cfi: "epubcfi(/6/8!/4/2)",
      label: "Rule #2: Embrace Boredom",
      createdAt: "2026-10-16T09:00:00Z",
    });

    const bookmarks = await getLocalBookmarks("book-deep-work");
    assert.strictEqual(bookmarks.length, 2);
    // Should be sorted descending by createdAt
    assert.strictEqual(bookmarks[0].id, "bm-2");
    assert.strictEqual(bookmarks[1].id, "bm-1");

    // Remove one bookmark offline
    await removeLocalBookmark("bm-1");
    const updated = await getLocalBookmarks("book-deep-work");
    assert.strictEqual(updated.length, 1);
    assert.strictEqual(updated[0].id, "bm-2");
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 8: Offline Highlight Creation, Color Update, and Deletion Sync
// ─────────────────────────────────────────────────────────────
describe("Scenario 8: Offline highlight creation, color update, and deletion sync", () => {
  test("8.1 should store highlights locally with CFI range and color", async () => {
    await saveLocalHighlight({
      id: "hl-atom-1",
      bookId: "book-atomic-habits",
      cfiRange: "epubcfi(/6/2!/4/2/4,/4/2/14)",
      color: "signal-green",
      note: "Compound interest of self-improvement",
      text: "Habits are the compound interest of self-improvement.",
      createdAt: "2026-10-16T10:00:00Z",
    });

    const highlights = await getLocalHighlights("book-atomic-habits");
    assert.strictEqual(highlights.length, 1);
    assert.strictEqual(highlights[0].id, "hl-atom-1");
    assert.strictEqual(highlights[0].color, "signal-green");
    assert.strictEqual(highlights[0].note, "Compound interest of self-improvement");
  });

  test("8.2 should update highlight color and notes offline", async () => {
    await saveLocalHighlight({
      id: "hl-update-1",
      bookId: "book-1",
      cfiRange: "range-1",
      color: "electric-yellow",
      note: "Draft note",
      createdAt: "2026-10-16T11:00:00Z",
    });

    const updated = await updateLocalHighlight("hl-update-1", {
      color: "electric-purple",
      note: "Refined note after second reading",
    });

    assert.ok(updated);
    assert.strictEqual(updated.color, "electric-purple");
    assert.strictEqual(updated.note, "Refined note after second reading");
    assert.ok(updated.updatedAt);

    const fetched = await getLocalHighlights("book-1");
    assert.strictEqual(fetched[0].color, "electric-purple");
  });

  test("8.3 should delete highlight offline from local storage", async () => {
    await saveLocalHighlight({
      id: "hl-del-1",
      bookId: "book-1",
      cfiRange: "range-1",
      color: "yellow",
      createdAt: "2026-10-16T11:00:00Z",
    });

    await removeLocalHighlight("hl-del-1");
    const highlights = await getLocalHighlights("book-1");
    assert.strictEqual(highlights.length, 0);
  });

  test("8.4 should sync full highlight lifecycle (create -> update -> delete) via sync queue", async () => {
    const lifecycleLog: string[] = [];

    // 1. Queue offline creation
    await enqueue(
      {
        type: "addHighlight",
        args: {
          id: "hl-sync-1",
          bookId: "book-1",
          cfiRange: "range-A",
          color: "electric-yellow",
          note: "Initial note",
        },
      },
      { customId: "action-create", skipOnlineCheck: true }
    );

    // 2. Queue offline update
    await enqueue(
      {
        type: "updateHighlight",
        args: {
          id: "hl-sync-1",
          bookId: "book-1",
          color: "signal-green",
          note: "Updated note",
        },
      },
      { customId: "action-update", skipOnlineCheck: true }
    );

    // 3. Queue offline deletion
    await enqueue(
      {
        type: "deleteHighlight",
        args: {
          id: "hl-sync-1",
          bookId: "book-1",
        },
      },
      { customId: "action-delete", skipOnlineCheck: true }
    );

    assert.strictEqual(await pendingCount(), 3);

    // Flush on reconnection
    const flushResult = await flushQueue({
      customExecutor: async (action) => {
        lifecycleLog.push(action.type);
      },
    });

    assert.strictEqual(flushResult.succeeded, 3);
    assert.strictEqual(flushResult.remaining, 0);
    assert.deepStrictEqual(lifecycleLog, [
      "addHighlight",
      "updateHighlight",
      "deleteHighlight",
    ]);
  });
});
