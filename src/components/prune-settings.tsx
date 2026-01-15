'use client';

import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { usePruneStore } from '@/lib/stores/prune-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export function PruneSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { config, updateConfig } = usePruneStore();
  
  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 p-0"
        title="Prune Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    );
  }
  
  return (
    <div className="absolute right-4 top-16 z-50 w-72 rounded-lg border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">Prune Settings</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-4 p-4">
        {/* Enable Pruning */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Enable Pruning</span>
          <Switch
            checked={config.enablePruning}
            onCheckedChange={(checked) => updateConfig({ enablePruning: checked })}
          />
        </div>
        
        {/* Confidence Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Confidence Threshold</span>
            <Badge variant="secondary">
              {config.confidenceThreshold.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[config.confidenceThreshold]}
            onValueChange={([value]) => updateConfig({ confidenceThreshold: value })}
            min={0.5}
            max={1.0}
            step={0.05}
            disabled={!config.enablePruning}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Aggressive (0.5)</span>
            <span>Conservative (1.0)</span>
          </div>
        </div>
        
        {/* Max Context Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Max Context</span>
            <Badge variant="secondary">
              {(config.maxContextTokens / 1000).toFixed(0)}K
            </Badge>
          </div>
          <Slider
            value={[config.maxContextTokens]}
            onValueChange={([value]) => updateConfig({ maxContextTokens: value })}
            min={16000}
            max={200000}
            step={8000}
          />
        </div>
      </div>
    </div>
  );
}
