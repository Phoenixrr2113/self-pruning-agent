import type { UIMessage } from 'ai';
import type { TaggedMessage } from '../types';
import { countTokens } from './token-counter';

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
 * Injects metadata into messages for the model to see:
 * [msg:001][tokens:45][tally:1245] <original content>
 */
export function injectMetadata(messages: UIMessage[]): TaggedMessage[] {
  let runningTally = 0;

  return messages.map((msg, index) => {
    const text = getTextFromMessage(msg);
    const tokenCount = countTokens(text);
    runningTally += tokenCount;

    const id = `msg:${String(index + 1).padStart(3, '0')}`;

    return {
      id,
      role: msg.role,
      content: text,
      tokenCount,
      runningTally,
    };
  });
}

/**
 * Formats a tagged message with metadata prefix for the model
 */
export function formatWithMetadata(msg: TaggedMessage): string {
  const prefix = `[${msg.id}][tokens:${msg.tokenCount}][tally:${msg.runningTally}]`;
  return `${prefix} ${msg.content}`;
}

/**
 * Prepares messages for API call with metadata injected into content
 */
export function prepareMessagesWithMetadata(
  messages: UIMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const tagged = injectMetadata(messages);

  return tagged
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: formatWithMetadata(msg),
    }));
}
