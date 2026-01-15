import type { ContextBudget } from '../types';

/**
 * Builds the system prompt with context budget and pruning instructions
 */
export function buildSystemPrompt(
  budget: ContextBudget,
  baseInstructions?: string
): string {
  return `<context_budget>
  total: ${budget.total}
  used: ${budget.used}
  remaining: ${budget.remaining}
</context_budget>

${baseInstructions || DEFAULT_INSTRUCTIONS}

${PRUNING_INSTRUCTIONS}`;
}

const DEFAULT_INSTRUCTIONS = `You are a helpful AI assistant that thinks step by step.

For each task:
1. THINK: Analyze what you need to do
2. ACT: Use available tools to gather information or take action
3. OBSERVE: Analyze the results
4. REPEAT: Continue until you have a complete answer

Always explain your reasoning clearly.`;

const PRUNING_INSTRUCTIONS = `## Context Management

You can see your current context budget above. Each message is tagged with:
- [msg:XXX] - Message ID
- [tokens:N] - Token count for that message
- [tally:N] - Running total of tokens

After each response, you MAY suggest messages to prune when:
1. You have fully synthesized information from earlier messages into your response
2. A topic is closed and the user has moved on
3. Tool results have been summarized and the raw data is no longer needed
4. Your own exploratory thinking is superseded by conclusions

Only suggest pruning when you're confident the information is no longer needed.

**IMPORTANT**: Always include a conversational response BEFORE any prune suggestions.
For example: "Great, I've noted that! What else can I help you with?" followed by prune_suggestions.
Never respond with ONLY prune suggestions - the user should see a helpful message.

Format your suggestions at the END of your response:

<prune_suggestions>
  <suggestion id="msg:XXX" confidence="0.9" tokens="1234" reason="[Brief summary of content]: Why it can be pruned" />
</prune_suggestions>

Example reason: "Weather data (NYC: 72°F sunny, LA: 85°F cloudy): Research complete, data synthesized"

Guidelines:
- Only suggest pruning at confidence >= 0.8
- Never prune the system prompt or recent user messages
- When pruning tool calls, note that results depend on calls
- Prefer pruning large, redundant content (old tool results, exploration)
- Do NOT include prune_suggestions if you have nothing to suggest`;
