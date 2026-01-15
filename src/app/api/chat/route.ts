import { streamText, tool, UIMessage, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/prompts/system';
import { parsePruneSuggestions } from '@/lib/middleware/prune-parser';
import { injectMetadata, formatWithMetadata } from '@/lib/middleware/metadata-injector';
import { defaultConfig } from '@/lib/config';
import { storeUsage, addPrunedMessage, getPrunedIds, getPruneSummaries } from '@/lib/usage-store';
import type { ContextBudget, ArchivedMessage } from '@/lib/types';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// In-memory archive for demo (would use DB in production)
const pruneArchive: ArchivedMessage[] = [];

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Inject metadata into messages so model can see [msg:xxx][tokens:n][tally:n]
  const taggedMessages = injectMetadata(messages);

  // Get previously pruned message IDs
  const prunedIds = getPrunedIds();
  const pruneSummaries = getPruneSummaries();

  // Filter out pruned messages and convert to model format
  const modelMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  // Add summary breadcrumbs for pruned content if any
  if (pruneSummaries.length > 0) {
    const breadcrumbText = pruneSummaries
      .map(s => `[pruned:${s.id}] ${s.summary}`)
      .join('\n');
    modelMessages.push({
      role: 'system',
      content: `[Context Summary - Previously Pruned]\n${breadcrumbText}`,
    });
  }

  // Add remaining messages (skip pruned ones)
  taggedMessages.forEach((msg, index) => {
    const msgId = `msg:${String(index + 1).padStart(3, '0')}`;
    if (!prunedIds.has(msgId)) {
      modelMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: formatWithMetadata(msg),
      });
    } else {
      console.log(`[Prune] Skipping ${msgId} - previously pruned`);
    }
  });

  // Log what's being sent to model
  console.log('[Metadata] Messages being sent to model:');
  modelMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`);
  });

  // Use running tally from last message for budget
  const usedTokens = taggedMessages.length > 0
    ? taggedMessages[taggedMessages.length - 1].runningTally
    : 0;

  const budget: ContextBudget = {
    total: defaultConfig.maxContextTokens,
    used: usedTokens,
    remaining: defaultConfig.maxContextTokens - usedTokens,
  };

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: buildSystemPrompt(budget),
    messages: modelMessages,
    tools: {
      weather: tool({
        description: 'Get the current weather for a location',
        inputSchema: z.object({
          location: z.string().describe('City name or location'),
        }),
        execute: async ({ location }) => {
          // Simulated weather data
          const temp = 60 + Math.floor(Math.random() * 30);
          const conditions = ['sunny', 'cloudy', 'partly cloudy', 'rainy'][
            Math.floor(Math.random() * 4)
          ];
          return {
            location,
            temperature: temp,
            unit: 'fahrenheit',
            conditions,
            humidity: Math.floor(Math.random() * 100),
          };
        },
      }),
      search: tool({
        description: 'Search the web for information',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
        }),
        execute: async ({ query }) => {
          // Simulated search results
          return {
            query,
            results: [
              { title: `Result 1 for: ${query}`, snippet: 'This is a sample search result...' },
              { title: `Result 2 for: ${query}`, snippet: 'Another relevant result...' },
            ],
          };
        },
      }),
    },
    // Enable multi-step tool execution - model can call tools and synthesize results
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, totalUsage }) => {
      // Capture usage for response
      const usage = {
        inputTokens: totalUsage.inputTokens ?? 0,
        outputTokens: totalUsage.outputTokens ?? 0,
      };

      // Store usage in global store for client access
      storeUsage(usage);

      // Log actual usage from the API
      console.log('[Token Usage]', {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.inputTokens + usage.outputTokens,
      });

      if (!defaultConfig.enablePruning) return;

      // Parse prune suggestions from the response
      const { suggestions } = parsePruneSuggestions(text);

      if (suggestions.length > 0) {
        console.log('[Self-Pruning] Suggestions received:', suggestions);

        // Filter by confidence threshold
        const approved = suggestions.filter(
          s => s.confidence >= defaultConfig.confidenceThreshold
        );

        if (approved.length > 0) {
          console.log('[Self-Pruning] Approved for pruning:', approved);

          // Store approved prunes in global store - they'll be filtered on next request
          approved.forEach(suggestion => {
            addPrunedMessage(suggestion.id, suggestion.reason, suggestion.tokens);
          });

          console.log('[Self-Pruning] Pruned messages will be skipped on next request');
        }
      }
    },
  });
  // Return the UI message stream (actual usage logged server-side)
  // Note: Accurate token usage is logged to server console.
  // Client receives estimation - for production, store usage in DB and fetch separately.
  return result.toUIMessageStreamResponse();
}

// GET endpoint to retrieve pruned messages archive
export async function GET() {
  return Response.json({ archive: pruneArchive });
}
