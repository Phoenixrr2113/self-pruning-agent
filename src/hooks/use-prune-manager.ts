'use client';

import { useCallback, useEffect } from 'react';
import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { usePruneStore } from '@/lib/stores/prune-store';
import { parsePruneSuggestions } from '@/lib/middleware/prune-parser';
import type { ArchivedMessage } from '@/lib/types';
import { countTokens } from '@/lib/middleware/token-counter';

interface UsePruneManagerOptions {
  api?: string;
  autoApprove?: boolean;
}

/**
 * Hook that wraps useChat with pruning management.
 * Automatically handles prune suggestion parsing and archive management.
 */
export function usePruneManager(options: UsePruneManagerOptions = {}) {
  const { api = '/api/chat', autoApprove = true } = options;
  
  const { 
    config, 
    addToArchive, 
    addPendingSuggestions,
    clearPendingSuggestions,
    archive,
    totalTokensReclaimed,
  } = usePruneStore();
  
  const chat = useAIChat({
    transport: new DefaultChatTransport({ api }),
  });
  
  // Process messages for prune suggestions
  const processResponse = useCallback((text: string) => {
    if (!config.enablePruning) return;
    
    const { cleanResponse, suggestions } = parsePruneSuggestions(text);
    
    if (suggestions.length > 0) {
      console.log('[Prune Manager] Suggestions:', suggestions);
      
      // Filter by confidence threshold
      const approved = suggestions.filter(
        s => s.confidence >= config.confidenceThreshold
      );
      
      if (autoApprove && approved.length > 0) {
        // Auto-approve and archive
        const archived: ArchivedMessage[] = approved.map(s => ({
          id: s.id,
          role: 'assistant' as const, // We'll need message context for accurate role
          content: `[Pruned: ${s.reason}]`,
          tokenCount: s.tokens,
          prunedAt: new Date(),
          reason: s.reason,
        }));
        
        addToArchive(archived);
        console.log('[Prune Manager] Auto-archived:', archived);
      } else if (!autoApprove) {
        // Store for manual approval
        addPendingSuggestions(suggestions);
      }
    }
  }, [config, addToArchive, addPendingSuggestions, autoApprove]);
  
  // Calculate token usage
  const tokenUsage = chat.messages.reduce((acc, msg) => {
    const textParts = msg.parts?.filter(p => p.type === 'text') || [];
    const text = textParts.map(p => (p as { text: string }).text).join('');
    return acc + countTokens(text);
  }, 0);
  
  return {
    ...chat,
    tokenUsage,
    archive,
    totalTokensReclaimed,
    config,
    processResponse,
  };
}
