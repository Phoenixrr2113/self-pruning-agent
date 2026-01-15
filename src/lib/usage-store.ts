// Shared usage store - uses a global to persist across requests in the same process
// In production, use Redis or database for multi-instance support

interface PrunedMessage {
  id: string;
  summary: string;
  tokensReclaimed: number;
  prunedAt: number;
}

declare global {
  var __usageStore: {
    latest: { inputTokens: number; outputTokens: number; totalTokens: number; timestamp: number } | null;
    session: { totalInputTokens: number; totalOutputTokens: number; requestCount: number };
    prunedIds: Set<string>;
    pruneSummaries: PrunedMessage[];
  } | undefined;
}

// Initialize global store
if (!globalThis.__usageStore) {
  globalThis.__usageStore = {
    latest: null,
    session: { totalInputTokens: 0, totalOutputTokens: 0, requestCount: 0 },
    prunedIds: new Set(),
    pruneSummaries: [],
  };
}

export function storeUsage(usage: { inputTokens: number; outputTokens: number }) {
  globalThis.__usageStore!.latest = {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.inputTokens + usage.outputTokens,
    timestamp: Date.now(),
  };
  
  globalThis.__usageStore!.session.totalInputTokens += usage.inputTokens;
  globalThis.__usageStore!.session.totalOutputTokens += usage.outputTokens;
  globalThis.__usageStore!.session.requestCount += 1;
  
  console.log('[Usage Store] Stored:', globalThis.__usageStore!.latest);
}

export function getLatestUsage() {
  return globalThis.__usageStore!.latest;
}

export function getSessionUsage() {
  return globalThis.__usageStore!.session;
}

export function resetSessionUsage() {
  globalThis.__usageStore!.session = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    requestCount: 0,
  };
}

// Prune functions
export function addPrunedMessage(id: string, summary: string, tokens: number) {
  globalThis.__usageStore!.prunedIds.add(id);
  globalThis.__usageStore!.pruneSummaries.push({
    id,
    summary,
    tokensReclaimed: tokens,
    prunedAt: Date.now(),
  });
  console.log('[Prune Store] Added:', id, '| Summary:', summary);
}

export function getPrunedIds(): Set<string> {
  return globalThis.__usageStore!.prunedIds;
}

export function getPruneSummaries(): PrunedMessage[] {
  return globalThis.__usageStore!.pruneSummaries;
}

export function resetPruneState() {
  globalThis.__usageStore!.prunedIds = new Set();
  globalThis.__usageStore!.pruneSummaries = [];
}

