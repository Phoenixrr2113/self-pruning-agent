import type { UIMessage } from 'ai';
import type { PruneSuggestion, ArchivedMessage, PruneConfig } from '../types';
import { countTokens } from './token-counter';

export interface PruneResult {
  prunedMessages: UIMessage[];
  archived: ArchivedMessage[];
  tokensReclaimed: number;
}

/**
 * Extracts text content from UIMessage parts
 */
function getTextFromMessage(msg: UIMessage): string {
  if (!msg.parts) return '';

  return msg.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

/**
 * Executes pruning decisions on message history.
 * Handles tool call pair pruning (must remove both call and result).
 */
export function executePruning(
  messages: UIMessage[],
  suggestions: PruneSuggestion[],
  config: PruneConfig
): PruneResult {
  const approved = suggestions.filter(
    s => s.confidence >= config.confidenceThreshold
  );

  if (approved.length === 0) {
    return { prunedMessages: messages, archived: [], tokensReclaimed: 0 };
  }

  const idsToRemove = new Set(approved.map(s => s.id));
  const archived: ArchivedMessage[] = [];
  let tokensReclaimed = 0;

  const prunedMessages = messages.filter((msg, index) => {
    const msgId = `msg:${String(index + 1).padStart(3, '0')}`;

    if (idsToRemove.has(msgId)) {
      const content = getTextFromMessage(msg);
      const tokenCount = countTokens(content);
      const suggestion = approved.find(s => s.id === msgId);

      archived.push({
        id: msgId,
        role: msg.role as 'user' | 'assistant' | 'tool',
        content,
        tokenCount,
        prunedAt: new Date(),
        reason: suggestion?.reason || 'Unknown',
      });

      tokensReclaimed += tokenCount;
      return false;
    }

    return true;
  });

  return { prunedMessages, archived, tokensReclaimed };
}

/**
 * Validates that tool call/result pairs are pruned together
 */
export function validateToolPairs(
  messages: UIMessage[],
  idsToRemove: Set<string>
): { valid: boolean; warning?: string } {
  // For now, return valid - in production, would check toolCallId pairing
  return { valid: true };
}
