/**
 * Server-side token counting.
 * 
 * Attempts to use tiktoken for exact counts, falls back to word-based estimation
 * if WASM loading fails (common in some Next.js environments).
 * 
 * @module tiktoken.server
 */

const TOKENS_PER_WORD = 1.3;

// Lazy-loaded tiktoken encoder (any to avoid type issues with Tiktoken)
let tiktokenEncoder: { encode: (text: string) => ArrayLike<number> } | null = null;
let tiktokenLoadAttempted = false;

/**
 * Attempt to load tiktoken encoder lazily.
 */
async function getTiktokenEncoder() {
  if (tiktokenLoadAttempted) return tiktokenEncoder;

  tiktokenLoadAttempted = true;

  try {
    const { encoding_for_model } = await import('tiktoken');
    tiktokenEncoder = encoding_for_model('gpt-4o');
    console.log('[tiktoken] Loaded successfully');
  } catch (error) {
    console.warn('[tiktoken] Failed to load, using word-based estimation:', error);
    tiktokenEncoder = null;
  }

  return tiktokenEncoder;
}

/**
 * Word-based token estimation fallback.
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  const specialChars = (text.match(/[{}\[\]<>:,;]/g) || []).length;
  return Math.ceil(words.length * TOKENS_PER_WORD + specialChars * 0.5);
}

/**
 * Count tokens - uses tiktoken if available, otherwise word-based estimation.
 */
export async function countTokensExact(text: string): Promise<number> {
  if (!text) return 0;

  const encoder = await getTiktokenEncoder();

  if (encoder) {
    try {
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch {
      return estimateTokens(text);
    }
  }

  return estimateTokens(text);
}

/**
 * Count tokens for multiple texts in batch.
 */
export async function countTokensBatch(texts: string[]): Promise<number[]> {
  const encoder = await getTiktokenEncoder();

  return texts.map(text => {
    if (!text) return 0;

    if (encoder) {
      try {
        const tokens = encoder.encode(text);
        return tokens.length;
      } catch {
        return estimateTokens(text);
      }
    }

    return estimateTokens(text);
  });
}

/**
 * Synchronous version using only word-based estimation.
 * Use when you can't await.
 */
export function countTokensSync(text: string): number {
  return estimateTokens(text);
}
