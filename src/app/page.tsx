'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContextBudgetDisplay } from '@/components/context-budget';
import { PruneArchive } from '@/components/prune-archive';
import { PruneSettings } from '@/components/prune-settings';
import { DebugPanel, useDebugEvents } from '@/components/debug-panel';
import { usePruneStore } from '@/lib/stores/prune-store';
import { parsePruneSuggestions } from '@/lib/middleware/prune-parser';
import type { ContextBudget } from '@/lib/types';

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const [input, setInput] = useState('');
  const [sessionTokens, setSessionTokens] = useState(0);
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());
  const [lastStatus, setLastStatus] = useState(status);

  const { config, addPendingSuggestions } = usePruneStore();
  const { events, addEvent, clearEvents } = useDebugEvents();

  // Log events when streaming completes
  useEffect(() => {
    if (lastStatus === 'streaming' && status === 'ready' && messages.length > 0) {
      // Process new messages
      messages.forEach(msg => {
        if (seenMessageIds.has(msg.id)) return;

        // Get text content
        const textParts = msg.parts?.filter(p => p.type === 'text') || [];
        const text = textParts.map(p => (p as { text: string }).text).join('');
        const preview = text.substring(0, 100);

        // Log message event
        addEvent('message', {
          id: msg.id,
          role: msg.role,
          preview,
        });

        // Log tool events for assistant messages
        if (msg.role === 'assistant') {
          const allParts = msg.parts || [];
          allParts.forEach(part => {
            // AI SDK v6: tool parts have type like "tool-weather"
            if (part.type.startsWith('tool-') && part.type !== 'tool-call' && part.type !== 'tool-result') {
              const toolPart = part as {
                type: string;
                toolCallId: string;
                input?: unknown;
                output?: unknown;
                state: string;
              };
              const toolName = part.type.replace('tool-', '');

              addEvent('tool_call', {
                toolName,
                toolCallId: toolPart.toolCallId,
                input: toolPart.input,
                state: toolPart.state,
              });

              if (toolPart.output !== undefined) {
                addEvent('tool_result', {
                  toolName,
                  toolCallId: toolPart.toolCallId,
                  output: toolPart.output,
                });
              }
            }
          });

          // Fetch actual usage from API endpoint (with small delay to ensure server has stored it)
          setTimeout(() => {
            fetch('/api/usage')
              .then(res => res.json())
              .then((data: { latest: { inputTokens: number; outputTokens: number; totalTokens: number } | null }) => {
                console.log('[Debug] /api/usage result:', data);
                if (data.latest) {
                  addEvent('token_update', {
                    inputTokens: data.latest.inputTokens,
                    outputTokens: data.latest.outputTokens,
                    totalTokens: data.latest.totalTokens,
                    source: 'api',
                  });
                }
              });
          }, 500);

          // Check for prune suggestions
          const { suggestions } = parsePruneSuggestions(text);
          if (suggestions.length > 0) {
            suggestions.forEach(s => {
              addEvent('prune_suggestion', {
                id: s.id,
                confidence: s.confidence,
                tokens: s.tokens,
                reason: s.reason,
              });
            });

            const approved = suggestions.filter(s => s.confidence >= config.confidenceThreshold);
            if (approved.length > 0) {
              addPendingSuggestions(approved);
              approved.forEach(s => {
                addEvent('prune_executed', {
                  id: s.id,
                  tokens: s.tokens,
                  reason: s.reason,
                });
              });
            }
          }
        }

        setSeenMessageIds(prev => new Set([...prev, msg.id]));
      });

      // Update session tokens from API
      fetch('/api/usage')
        .then(res => res.json())
        .then((data: { session: { totalInputTokens: number; totalOutputTokens: number } }) => {
          if (data.session) {
            setSessionTokens(data.session.totalInputTokens + data.session.totalOutputTokens);
          }
        });
    }

    setLastStatus(status);
  }, [status, messages.length, seenMessageIds, lastStatus, addEvent, config.confidenceThreshold, addPendingSuggestions, messages]);

  // Calculate budget from actual session usage
  const budget: ContextBudget = {
    total: config.maxContextTokens,
    used: sessionTokens,
    remaining: config.maxContextTokens - sessionTokens,
  };

  const isReady = status === 'ready';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isReady) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header with budget - fixed height */}
      <header className="flex-shrink-0 border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Self-Pruning Agent</h1>
            <p className="text-sm text-muted-foreground">
              An agent that manages its own context window
            </p>
          </div>
          <PruneSettings />
        </div>
        <ContextBudgetDisplay budget={budget} />
      </header>

      {/* Messages - scrollable middle section */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation. Try asking about the weather!</p>
              <p className="text-sm mt-2">Example: "What&apos;s the weather in New York?"</p>
            </div>
          )}

          {messages.map((msg) => {
            const textParts = msg.parts?.filter(p => p.type === 'text') || [];
            const rawText = textParts.map(p => (p as { text: string }).text).join('');

            // Strip prune_suggestions XML from displayed text
            const text = rawText.replace(/<prune_suggestions>[\s\S]*?<\/prune_suggestions>/g, '').trim();

            // Skip assistant messages that are empty after stripping (prune-only responses)
            if (!text && msg.role === 'assistant') {
              return null;
            }

            // Check for tool parts
            const toolParts = msg.parts?.filter(p =>
              p.type.startsWith('tool-') && p.type !== 'tool-call' && p.type !== 'tool-result'
            ) || [];

            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                  }`}
                >
                  {/* Show tool calls */}
                  {toolParts.length > 0 && (
                    <div className="mb-2 text-xs opacity-70 border-b border-current/20 pb-2">
                      {toolParts.map((part, i) => {
                        const toolPart = part as { type: string; input?: unknown; output?: unknown };
                        const toolName = part.type.replace('tool-', '');
                        return (
                          <div key={i} className="flex items-center gap-1">
                            <span>🔧</span>
                            <span className="font-mono">{toolName}</span>
                            {toolPart.input !== undefined && (
                              <span className="opacity-60">
                                ({JSON.stringify(toolPart.input)})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message text */}
                  <p className="whitespace-pre-wrap">{text || '...'}</p>
                </div>
              </div>
            );
          })}

          {status === 'streaming' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <span className="animate-pulse">●●●</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prune Archive */}
      <PruneArchive />

      {/* Input - fixed height footer */}
      <div className="flex-shrink-0 border-t border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={!isReady}
            className="flex-1"
          />
          <Button type="submit" disabled={!isReady || !input.trim()}>
            Send
          </Button>
        </form>
      </div>

      {/* Debug Panel */}
      <DebugPanel events={events} onClear={clearEvents} />
    </div>
  );
}
