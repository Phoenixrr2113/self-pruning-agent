# Self-Pruning Agent

An experimental Next.js application demonstrating **autonomous context window management** for AI agents. Inspired by the blog post ["Teaching AI Agents to Forget to Stop Forgetting"](https://medium.com/@phoenixrr2113/teaching-ai-agents-to-forget-to-stop-forgetting-what-speed-reading-taught-us-about-context-a2044c3f47d0).

## 🧠 The Concept

Traditional AI agents are limited by fixed context windows. As conversations grow, older messages get dropped arbitrarily. This project explores a smarter approach: **let the AI decide what to forget**.

The agent:
1. **Sees its context budget** - Token usage is visible in the system prompt
2. **Tags messages with metadata** - Each message has `[msg:XXX][tokens:N][tally:N]`
3. **Suggests what to prune** - When appropriate, outputs `<prune_suggestions>` with confidence scores
4. **Preserves context** - Generates a summary of pruned content as a breadcrumb
5. **Filter happens server-side** - Approved prunes are filtered on subsequent requests

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   useChat   │  │DebugPanel   │  │  Context Budget Display │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
└─────────┼────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API Route (/api/chat)                       │
│                                                                   │
│  1. Inject metadata [msg:XXX][tokens:N][tally:N]                 │
│  2. Filter previously pruned messages                             │
│  3. Inject context summary breadcrumb                             │
│  4. Send to model                                                 │
│  5. Parse <prune_suggestions> from response                       │
│  6. Store context summary + pruned IDs for next request          │
└──────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
app/src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Main chat API with pruning logic
│   │   └── usage/route.ts     # Token usage endpoint
│   └── page.tsx               # Chat UI
├── components/
│   ├── context-budget.tsx     # Token budget progress bar
│   ├── debug-panel.tsx        # Event log viewer
│   ├── prune-archive.tsx      # Archived pruned messages
│   └── prune-settings.tsx     # Pruning configuration UI
├── lib/
│   ├── middleware/
│   │   ├── metadata-injector.ts   # Adds [msg:XXX] tags to messages
│   │   ├── prune-parser.ts        # Extracts <prune_suggestions> XML
│   │   ├── prune-executor.ts      # Filters pruned messages
│   │   └── token-counter.ts       # Tiktoken-based token counting
│   ├── prompts/
│   │   └── system.ts          # System prompt with pruning instructions
│   ├── usage-store.ts         # Global state for usage + prune tracking
│   └── config.ts              # Configuration constants
└── hooks/
    └── use-prune-manager.ts   # Prune state management hook
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- OpenAI API key

### Installation

```bash
cd app
npm install
```

### Environment Setup

Create `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧪 Testing the Pruning Flow

1. **Build context**: "Get me the weather for New York, LA, Chicago, Miami, and Seattle"
2. **Synthesize**: "Which city has the best weather? Give me a comparison."
3. **Close topic**: "Perfect, I've noted that. The weather research is complete."
4. **Pivot**: "Now, what's the square root of 144?"

You should see:
- `✂️ PRUNE_SUGGESTION` events in the debug panel
- `🗑️ PRUNE_EXECUTED` events for approved suggestions
- `[Context Summary]` breadcrumb injected on subsequent requests

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | App framework |
| AI SDK v6 | LLM streaming + tool calling |
| OpenAI GPT-4o-mini | Language model |
| Tiktoken | Token counting |
| Tailwind CSS 4 | Styling |
| Radix UI | UI primitives |
| Zustand | State management |

## 📊 Key Features

- **Metadata Injection**: Messages tagged with `[msg:XXX][tokens:N][tally:N]`
- **Context Budget Display**: Visual progress bar showing token usage
- **Prune Suggestions**: Model outputs XML with message IDs and confidence scores
- **Context Summarization**: Full conversation summary preserved as breadcrumb
- **Debug Panel**: Real-time event logging for tool calls, messages, and pruning
- **Server-Side Filtering**: Pruned messages never sent to model on subsequent requests

## 📝 How Pruning Works

### System Prompt Instructions

The model receives instructions to:
1. Monitor context budget
2. Suggest pruning when topics close or data is synthesized
3. Include a `<context_summary>` of the entire conversation
4. Format suggestions as XML with confidence scores

### Prune Suggestion Format

```xml
<prune_suggestions>
  <context_summary>User researched weather for 5 cities. Best: LA at 85°F. Then searched Austin restaurants.</context_summary>
  <suggestion id="msg:002" confidence="0.9" tokens="114" reason="Weather data synthesized" />
  <suggestion id="msg:004" confidence="0.85" tokens="286" reason="Comparison no longer needed" />
</prune_suggestions>
```

### Server-Side Execution

1. Parse suggestions from model response
2. Filter by confidence threshold (default: 0.8)
3. Store approved IDs + context summary in global state
4. On next request, skip pruned messages and inject summary

## 🔮 Future Improvements

- [ ] Persist prune state to database (currently in-memory)
- [ ] User approval UI for prune suggestions
- [ ] Configurable confidence thresholds per message type
- [ ] Migrate to `ToolLoopAgent` pattern for cleaner SDK integration
- [ ] A/B testing prune accuracy vs manual truncation

## 📚 References

- [Teaching AI Agents to Forget to Stop Forgetting](https://medium.com/@phoenixrr2113/teaching-ai-agents-to-forget-to-stop-forgetting-what-speed-reading-taught-us-about-context-a2044c3f47d0) - Inspiration blog post
- [AI SDK Documentation](https://sdk.vercel.ai/docs) - Vercel AI SDK
- [Context Caching Strategies](https://platform.openai.com/docs/guides/context-caching) - OpenAI docs

## 📄 License

MIT
