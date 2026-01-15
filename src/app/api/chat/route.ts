import { streamText, tool, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/prompts/system';
import { countMessageTokens } from '@/lib/middleware/token-counter';
import { parsePruneSuggestions } from '@/lib/middleware/prune-parser';
import { defaultConfig } from '@/lib/config';
import { storeUsage } from '@/lib/usage-store';
import type { ContextBudget, ArchivedMessage } from '@/lib/types';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// In-memory archive for demo (would use DB in production)
const pruneArchive: ArchivedMessage[] = [];

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(messages);

  // Calculate current token usage  
  const usedTokens = modelMessages.reduce(
    (acc, msg) => acc + countMessageTokens(
      typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    ),
    0
  );

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
          // In production: would execute pruning and update message history
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
