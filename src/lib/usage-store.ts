// Shared usage store - uses a global to persist across requests in the same process
// In production, use Redis or database for multi-instance support

declare global {
  var __usageStore: {
    latest: { inputTokens: number; outputTokens: number; totalTokens: number; timestamp: number } | null;
    session: { totalInputTokens: number; totalOutputTokens: number; requestCount: number };
  } | undefined;
}

// Initialize global store
if (!globalThis.__usageStore) {
  globalThis.__usageStore = {
    latest: null,
    session: { totalInputTokens: 0, totalOutputTokens: 0, requestCount: 0 },
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
