// Core types for the self-pruning agent

export interface PruneSuggestion {
  id: string;           // e.g., "msg:003"
  confidence: number;   // 0.0 - 1.0
  tokens: number;
  reason: string;
}

export interface ContextBudget {
  total: number;
  used: number;
  remaining: number;
}

export interface ArchivedMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tokenCount: number;
  prunedAt: Date;
  reason: string;
}

export interface TaggedMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tokenCount: number;
  runningTally: number;
}

export interface PruneConfig {
  confidenceThreshold: number;  // default 0.8
  maxContextTokens: number;     // default 128000
  enablePruning: boolean;       // default true
}
