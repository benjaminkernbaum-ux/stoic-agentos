# Reddit Post: /r/node (For Node.js and TypeScript developers)
## Title Options:
1. Show /r/node: Stoic AgentOS – Active memory and governance SDK for AI agent fleets
2. I built an open-source active memory middleware for OpenAI & Anthropic clients in Node.js

---

### Post Body:

Hey /r/node,

I wanted to share a project I've been building that deals with AI agent operations in Node.js/TypeScript, specifically addressing how to manage agent state and memory without bloat.

### The Context

Almost all tools in LLMOps right now are passive tracing databases (Langfuse, LangSmith). They show you logs of what happened. But when it comes to *preventing* failures, managing agent memory across sessions, or handling infinite loops, the SDKs are stateless.

So I built **Stoic AgentOS** — an open-source cognitive middleware layer that wraps OpenAI and Anthropic clients in Node.js.

### How it Works (Under the Hood)

When you initialize our SDK and wrap your LLM clients, we monkey-patch the client methods (e.g. `openai.chat.completions.create` or `anthropic.messages.create`) to inject active safety and memory.

Here is the SDK configuration:

```typescript
import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY,
  autoRecall: true,             // Enables active vector memory injection
  activeShield: true,           // Enables Human-in-the-loop approvals
  criticalTools: ['send_email', 'write_db'],
  circuitBreaker: {
    enabled: true,
    maxRpm: 60,
    maxTpm: 100000
  }
});

const openai = new OpenAI();
os.instrumentClient('openai', openai);
```

### Key SDK Middleware Capabilities:

1. **`autoRecall` Prompt Patching:** When your agent runs, the SDK intercepts the incoming user prompt, runs a cosine similarity vector search on episodic memories stored in Postgres (utilizing `pgvector` + `HNSW` index), and prepends matched historical context directly to the LLM system prompt on the fly. Your agent remembers past sessions with zero manual code changes.
2. **Local Circuit Breakers:** Evaluates token and request volume using client-side sliding window algorithms. If a runaway loop is detected, it trips the breaker locally to save your API budget before making the call.
3. **Active Shield (HITL):** If the LLM returns a tool call matching one in `criticalTools`, the SDK suspends execution, registers an approval request on the API, and polls until you click Approve/Reject in the dashboard.

### Self-Hosting (MIT License)

You can self-host the API and backend with Docker Compose:

```bash
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cd stoic-agentos
cp .env.selfhost.example .env.selfhost
# add Supabase URL and service key
docker compose -f docker-compose.selfhost.yml up -d
```

I’m really looking for feedback on the middleware design patterns (the client monkey-patching approach) and how to improve the local sliding-window circuit breaker.

- **GitHub:** https://github.com/benjaminkernbaum-ux/stoic-agentos
- **Docs:** https://stoicagentos.com/docs
