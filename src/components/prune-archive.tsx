'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, RotateCcw } from 'lucide-react';
import { usePruneStore } from '@/lib/stores/prune-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PruneArchive() {
  const [isOpen, setIsOpen] = useState(false);
  const { archive, totalTokensReclaimed, removeFromArchive, clearArchive } = usePruneStore();
  
  if (archive.length === 0) {
    return null;
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-t border-border bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between rounded-none px-4 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span>Pruned Messages</span>
              <Badge variant="secondary">{archive.length}</Badge>
              <Badge variant="outline" className="text-green-600">
                {totalTokensReclaimed.toLocaleString()} tokens saved
              </Badge>
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
              <span className="text-xs text-muted-foreground">
                Pruned content archive (can be restored)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearArchive()}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            
            <ScrollArea className="max-h-48">
              <div className="divide-y divide-border">
                {archive.map((item) => (
                  <div
                    key={`${item.id}-${item.prunedAt.toString()}`}
                    className="flex items-start gap-3 px-4 py-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {item.id}
                        </Badge>
                        <span className="text-muted-foreground">
                          {item.tokenCount} tokens
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">
                        {item.reason}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromArchive(item.id)}
                      title="Restore message"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
