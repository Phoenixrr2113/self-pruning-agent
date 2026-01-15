'use client';

import type { ContextBudget } from '@/lib/types';

interface ContextBudgetDisplayProps {
  budget: ContextBudget;
}

export function ContextBudgetDisplay({ budget }: ContextBudgetDisplayProps) {
  const usagePercent = Math.round((budget.used / budget.total) * 100);
  const isWarning = usagePercent > 70;
  const isCritical = usagePercent > 90;
  
  return (
    <div className="border-b border-border bg-muted/30 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Context Budget</span>
        <span className={`font-mono ${isCritical ? 'text-destructive' : isWarning ? 'text-yellow-600' : 'text-muted-foreground'}`}>
          {budget.used.toLocaleString()} / {budget.total.toLocaleString()} tokens ({usagePercent}%)
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
