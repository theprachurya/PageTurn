import "fake-indexeddb/auto";
import { performance } from "node:perf_hooks";
import {
  enqueue,
  flushQueue,
  clearQueue,
  deduplicateQueue,
  resolveConflict,
  saveLocalReadingPosition,
  getLocalReadingPosition,
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
} from "../src/lib/epub-cache";

function createEpubBuffer(sizeBytes: number): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buffer);
  view[0] = 0x50; // 'P'
  view[1] = 0x4b; // 'K'
  view[2] = 0x03;
  view[3] = 0x04;
  return buffer;
}

function calculateStats(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { mean, p50, p95, p99, min, max };
}

async function runBenchmarks() {
  console.log("================================================================================");
  console.log("       PAGETURN OFFLINE SYNCHRONIZATION & INDEXEDDB PERFORMANCE BENCHMARK       ");
  console.log("================================================================================\n");

  await clearQueue();
  await appliedStore.clear();
  await positionStore.clear();
  await bookmarksStore.clear();
  await highlightsStore.clear();
  await clearEpubCache();

  // 1. IndexedDB EPUB Cache Write Latency
  console.log("--- 1. IndexedDB EPUB Cache Write Latency ---");
  const sizes = [
    { label: "500 KB EPUB", bytes: 500 * 1024 },
    { label: "2.0 MB EPUB", bytes: 2 * 1024 * 1024 },
    { label: "5.0 MB EPUB", bytes: 5 * 1024 * 1024 },
  ];

  for (const { label, bytes } of sizes) {
    const runs = 10;
    const latencies: number[] = [];
    const buf = createEpubBuffer(bytes);

    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      await cacheEpub(`bench-write-${label}-${i}`, buf);
      latencies.push(performance.now() - start);
    }
    const stats = calculateStats(latencies);
    console.log(
      `  • ${label.padEnd(14)}: mean = ${stats.mean.toFixed(2)}ms | p50 = ${stats.p50.toFixed(2)}ms | p95 = ${stats.p95.toFixed(2)}ms | min = ${stats.min.toFixed(2)}ms | max = ${stats.max.toFixed(2)}ms`
    );
  }

  // 2. IndexedDB EPUB Cache Read Latency
  console.log("\n--- 2. IndexedDB EPUB Cache Read Latency ---");
  for (const { label, bytes } of sizes) {
    const key = `bench-read-${label}`;
    await cacheEpub(key, createEpubBuffer(bytes));

    const runs = 20;
    const latencies: number[] = [];
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      const readBuf = await getCachedEpub(key);
      latencies.push(performance.now() - start);
      if (!readBuf) throw new Error("Cache read failed");
    }
    const stats = calculateStats(latencies);
    console.log(
      `  • ${label.padEnd(14)}: mean = ${stats.mean.toFixed(2)}ms | p50 = ${stats.p50.toFixed(2)}ms | p95 = ${stats.p95.toFixed(2)}ms | min = ${stats.min.toFixed(2)}ms | max = ${stats.max.toFixed(2)}ms`
    );
  }

  // 3. Offline Position Write & Read Latency
  console.log("\n--- 3. Offline Reading Position Latency ---");
  const posWrites: number[] = [];
  const posReads: number[] = [];

  for (let i = 0; i < 50; i++) {
    const startW = performance.now();
    await saveLocalReadingPosition(`book-${i}`, `epubcfi(/6/4[ch${i}]!/4/2/10)`, i);
    posWrites.push(performance.now() - startW);

    const startR = performance.now();
    await getLocalReadingPosition(`book-${i}`);
    posReads.push(performance.now() - startR);
  }

  const writeStats = calculateStats(posWrites);
  const readStats = calculateStats(posReads);
  console.log(
    `  • Write Position : mean = ${writeStats.mean.toFixed(2)}ms | p50 = ${writeStats.p50.toFixed(2)}ms | p95 = ${writeStats.p95.toFixed(2)}ms`
  );
  console.log(
    `  • Read Position  : mean = ${readStats.mean.toFixed(2)}ms | p50 = ${readStats.p50.toFixed(2)}ms | p95 = ${readStats.p95.toFixed(2)}ms`
  );

  // 4. Offline Queue Mutation Enqueue Latency
  console.log("\n--- 4. Offline Queue Mutation Enqueue Latency ---");
  await clearQueue();
  const enqueueLatencies: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await enqueue(
      {
        type: "syncProgress",
        args: { bookId: `book-${i}`, cfi: `cfi-${i}`, progressPercentage: (i % 100) },
      },
      { skipOnlineCheck: true }
    );
    enqueueLatencies.push(performance.now() - start);
  }

  const enqStats = calculateStats(enqueueLatencies);
  console.log(
    `  • Enqueue (100 ops): mean = ${enqStats.mean.toFixed(2)}ms | p50 = ${enqStats.p50.toFixed(2)}ms | p95 = ${enqStats.p95.toFixed(2)}ms | min = ${enqStats.min.toFixed(2)}ms | max = ${enqStats.max.toFixed(2)}ms`
  );

  // 5. Offline Queue Batch Flush Latency
  console.log("\n--- 5. Offline Queue Batch Flush Latency (Reconnection) ---");
  const batchSizes = [10, 50, 100];

  for (const batchSize of batchSizes) {
    await clearQueue();
    await appliedStore.clear();

    for (let i = 0; i < batchSize; i++) {
      await enqueue(
        {
          type: "syncProgress",
          args: { bookId: `batch-book-${i}`, cfi: `cfi-${i}`, progressPercentage: i },
        },
        { customId: `batch-${batchSize}-${i}`, skipOnlineCheck: true }
      );
    }

    const startFlush = performance.now();
    const result = await flushQueue({
      customExecutor: async () => {
        // Simulated network transmission overhead (0ms CPU execution)
      },
    });
    const flushDuration = performance.now() - startFlush;
    const perItem = flushDuration / batchSize;

    console.log(
      `  • Batch ${batchSize.toString().padStart(3)} items : total = ${flushDuration.toFixed(2)}ms | avg per item = ${perItem.toFixed(2)}ms | succeeded = ${result.succeeded}`
    );
  }

  // 6. Queue Coalescing and Deduplication Throughput
  console.log("\n--- 6. Queue Coalescing & Deduplication Throughput ---");
  const syntheticQueue: QueueEntry[] = [];
  for (let i = 0; i < 500; i++) {
    const bookIdx = i % 20; // 20 distinct books with 25 progress updates each
    syntheticQueue.push({
      id: `syn-${i}`,
      action: {
        type: "syncProgress",
        args: { bookId: `syn-book-${bookIdx}`, cfi: `cfi-${i}`, progressPercentage: (i % 100) },
      },
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
    });
  }

  const startDedup = performance.now();
  const coalesced = deduplicateQueue(syntheticQueue);
  const dedupDuration = performance.now() - startDedup;

  console.log(
    `  • Coalesce 500 mutations -> ${coalesced.length} entries : ${dedupDuration.toFixed(3)}ms (${(
      (500 / dedupDuration) *
      1000
    ).toFixed(0)} ops/sec)`
  );

  // 7. Last-Write-Wins Conflict Resolution Throughput
  console.log("\n--- 7. Last-Write-Wins (LWW) Conflict Resolution Throughput ---");
  const lwwStart = performance.now();
  const iterations = 1000;
  for (let i = 0; i < iterations; i++) {
    resolveConflict(
      { id: "rec-1", progressPercentage: 60, timestamp: "2026-10-16T15:30:00Z" },
      { id: "rec-1", progressPercentage: 55, timestamp: "2026-10-16T15:00:00Z" },
      { timestampField: "timestamp" }
    );
  }
  const lwwDuration = performance.now() - lwwStart;
  console.log(
    `  • 1,000 LWW resolutions: total = ${lwwDuration.toFixed(3)}ms | avg = ${(
      (lwwDuration / iterations) *
      1000
    ).toFixed(2)}µs/op (${((iterations / lwwDuration) * 1000).toFixed(0)} ops/sec)`
  );

  console.log("\n================================================================================");
  console.log("                           BENCHMARK EXECUTION COMPLETE                         ");
  console.log("================================================================================\n");
}

void runBenchmarks();
