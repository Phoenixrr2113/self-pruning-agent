/**
 * Token counting utilities.
 * 
 * Client-side: Uses word-based estimation (fast, approximate)
 * Server-side: Can use tiktoken via API for exact counts
 */

const TOKENS_PER_WORD = 1.3; // Conservative estimate for English text

/**
 * Estimate tokens using word-based approximation.
 * Fast and works client-side without WASM.
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  // Count words (split on whitespace and filter empty strings)
  const words = text.split(/\s+/).filter(Boolean);

  // Add overhead for special characters and punctuation
  const specialChars = (text.match(/[{}\[\]<>:,;]/g) || []).length;

  return Math.ceil(words.length * TOKENS_PER_WORD + specialChars * 0.5);
}

/**
 * Count tokens for any content type.
 */
export function countMessageTokens(content: string | unknown): number {
  if (typeof content === 'string') {
    return countTokens(content);
  }
  // For complex content (tool calls, etc.), stringify and count
  return countTokens(JSON.stringify(content));
}

/**
 * Fetch exact token count from server API.
 * Use sparingly - for display purposes, word-based estimation is usually sufficient.
 */
export async function countTokensExactClient(text: string): Promise<number> {
  try {
    const response = await fetch(`/api/tokens?text=${encodeURIComponent(text)}`);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.count;
  } catch {
    // Fallback to estimation
    return countTokens(text);
  }
}

/**
 * Batch count tokens via API.
 */
export async function countTokensBatchClient(texts: string[]): Promise<number[]> {
  try {
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.counts;
  } catch {
    // Fallback to estimation
    return texts.map(countTokens);
  }
}
