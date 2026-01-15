import type { PruneConfig } from './types';

export const defaultConfig: PruneConfig = {
  confidenceThreshold: parseFloat(process.env.PRUNE_CONFIDENCE_THRESHOLD || '0.8'),
  maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '128000', 10),
  enablePruning: process.env.ENABLE_PRUNING !== 'false',
};
