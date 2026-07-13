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
2. **Local Circuit Breakers:** Evaluates token and request volume using client-side sliding window algorithms. If a runaway loop is detected, it trips the breaker locally to save your API budget before making the call. This is a client-side, eventually-consistent tripwire, not a hard concurrency gate — it's meant to catch obvious runaway loops, not to be a bulletproof limiter.
3. **Active Shield (HITL):** If the LLM returns a tool call matching one in `criticalTools`, the SDK suspends execution, registers an approval request on the API, and polls until you click Approve/Reject in the dashboard. Approvals are backed by a compare-and-swap state machine in Postgres (single-use `CONSUMED` state, server-side timeout sweep), so concurrent callers can't double-consume the same approval. The Shield's policy layer today is Layer 1 (per-tool JSON-Schema rules with ALLOW/BLOCK/REQUIRE_APPROVAL verdicts); predicate rules and AST-based validators are roadmap.

All of the above is **SDK-level interception** — it monkey-patches the client, so it only works for agents that actually call through the instrumented client. An on-path enforcement proxy that can't be skipped is on the roadmap, not shipped.

### Self-Hosting (Roadmap)

Self-hosting the API and backend with Docker Compose is planned but not a working one-command setup yet. Today, the hosted platform (stoicagentos.com) is the supported path — the code is MIT licensed and the schema has no lock-in, but you'd need to wire up your own deploy if you wanted to run it now.

### Limitations

- SDK-level interception (both the circuit breaker and Active Shield) is bypassable — an agent that doesn't go through the instrumented client skips the check entirely.
- The circuit breaker is eventually consistent, not a hard concurrency gate.
- Active Shield is schema-layer (Layer 1) today; predicate/AST-based validators are next.
- Self-hosting isn't turnkey yet.
- Because instrumentation works via monkey-patching, you're pinned to the OpenAI/Anthropic SDK versions we've tested against.

I’m really looking for feedback on the middleware design patterns (the client monkey-patching approach) and how to improve the local sliding-window circuit breaker.

Since some subreddits automatically block posts containing external links from low-karma accounts, I’ll drop the GitHub repository and documentation links in the first comment below!

---

### FIRST COMMENT (Post immediately after publishing):

Here are the links to check out the code and try it:

⭐ **GitHub:** https://github.com/benjaminkernbaum-ux/stoic-agentos
📖 **Docs:** https://stoicagentos.com/docs
