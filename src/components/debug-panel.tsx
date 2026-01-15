'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Bug, Trash2 } from 'lucide-react';
import { usePruneStore } from '@/lib/stores/prune-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface DebugEvent {
  id: string;
  timestamp: Date;
  type: 'message' | 'tool_call' | 'tool_result' | 'prune_suggestion' | 'prune_executed' | 'token_update' | 'config_change';
  data: Record<string, unknown>;
}

interface DebugPanelProps {
  events: DebugEvent[];
  onClear: () => void;
}

export function DebugPanel({ events, onClear }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { archive, config, totalTokensReclaimed, pendingSuggestions } = usePruneStore();

  const getEventColor = (type: DebugEvent['type'], data?: Record<string, unknown>) => {
    switch (type) {
      case 'message':
        // Different colors for user vs assistant
        if (data?.role === 'assistant') return 'bg-green-500/10 border-green-500/30 text-green-600';
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'tool_call': return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
      case 'tool_result': return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'prune_suggestion': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600';
      case 'prune_executed': return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'token_update': return 'bg-slate-500/10 border-slate-500/30 text-slate-600';
      case 'config_change': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const getEventIcon = (type: DebugEvent['type']) => {
    switch (type) {
      case 'message': return '💬';
      case 'tool_call': return '🔧';
      case 'tool_result': return '📦';
      case 'prune_suggestion': return '✂️';
      case 'prune_executed': return '🗑️';
      case 'token_update': return '📊';
      case 'config_change': return '⚙️';
      default: return '📝';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="sticky bottom-0 z-40 border-t border-border bg-card shadow-lg">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between rounded-none px-4 py-2 text-sm font-mono"
          >
            <span className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span>Debug Panel</span>
              <Badge variant="secondary">{events.length} events</Badge>
              {pendingSuggestions.length > 0 && (
                <Badge variant="outline" className="text-yellow-600">
                  {pendingSuggestions.length} pending prunes
                </Badge>
              )}
              {totalTokensReclaimed > 0 && (
                <Badge variant="outline" className="text-green-600">
                  {totalTokensReclaimed} tokens saved
                </Badge>
              )}
            </span>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border">
            {/* Stats Row */}
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 text-xs font-mono border-b border-border">
              <span>Threshold: <strong>{config.confidenceThreshold.toFixed(2)}</strong></span>
              <span>Max Context: <strong>{(config.maxContextTokens / 1000).toFixed(0)}K</strong></span>
              <span>Pruning: <strong>{config.enablePruning ? 'ON' : 'OFF'}</strong></span>
              <span>Archived: <strong>{archive.length}</strong></span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-6 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>

            {/* Events Log */}
            <ScrollArea className="h-48">
              <div className="p-2 space-y-1 font-mono text-xs">
                {events.length === 0 ? (
                  <div className="text-muted-foreground text-center py-4">
                    No events yet. Start a conversation to see debug output.
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-start gap-2 p-2 rounded border ${getEventColor(event.type, event.data)}`}
                    >
                      <span>{getEventIcon(event.type)}</span>
                      <span className="text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="uppercase font-semibold text-[10px]">
                        {event.type.replace('_', ' ')}
                      </span>
                      <span className="flex-1 truncate">
                        {JSON.stringify(event.data)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Hook to manage debug events
export function useDebugEvents() {
  const [events, setEvents] = useState<DebugEvent[]>([]);

  const addEvent = (type: DebugEvent['type'], data: Record<string, unknown>) => {
    const event: DebugEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      data,
    };
    setEvents(prev => [...prev, event]);
    console.log(`[Debug] ${type}:`, data);
  };

  const clearEvents = () => setEvents([]);

  return { events, addEvent, clearEvents };
}
