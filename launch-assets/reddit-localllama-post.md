# Reddit Post: /r/LocalLLaMA (For developers who run local models & agents)
## Title Options:
1. Show LocalLLaMA: Stoic AgentOS - Open-source active memory layer for AI agents (pgvector + HNSW)
2. Why build a new AI agent APM? Because telemetry is stateless and our agents kept repeating the same errors.

---

### Post Body:

Hey /r/LocalLLaMA,

I spent the last 6 months building an open-source telemetry and agent operating system, and after hitting a wall, I had to completely re-engineer it. 

I want to share the architecture and the reasoning behind why we did it, and get your feedback.

### The Problem: Observability is Stateless

Almost every developer tool in the AI tracing space (Langfuse, Langsmith, Helicone) acts as "passive eyes." They record traces — what your agent did — but the agent itself forgets everything when the session ends. 

If your support agent hallucinated a refund policy on Tuesday, you fixed it, and on Thursday it did the exact same thing... telemetry will show you the error *after* it happens. But it won't stop it. The agent has no memory.

### The Pivot: Adding an Active Memory Layer

We refactored the project to sit between "what happened" and "what the agent remembers." We implemented a three-tier memory architecture:

1. **Working Memory:** Fast, session-scoped key-value store with TTL.
2. **Episodic Memory:** Timestamped timeline of past runs embedded using cosine similarity (`pgvector` + `HNSW` index on Postgres).
3. **Semantic Memory:** Fact triples (subject-relation-object) automatically extracted by an AI Reflection Engine.

### How it Works (3 lines in the SDK):

When you initialize the SDK, you pass `autoRecall: true`.

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({ 
  apiKey: 'sk_live_xxx', 
  autoRecall: true // <--- This does the magic
});

// Wrap your clients
os.instrumentClient('openai', openai);
```

When a user asks a question, the SDK intercepts the prompt, runs a cosine similarity vector search on the episodic memory database using `pgvector`, and automatically prefixes the system prompt with relevant context (e.g. `[Recall context from past sessions: - Acme Corp prefers net-30 terms]`).

### Active Shield & Circuit Breakers

We also added active shields at the SDK level. If an agent goes rogue in a reasoning loop or runs into a bug, you can set `criticalTools: ['execute_trade']` and the SDK will freeze execution, poll the dashboard, and wait for manual approval (Human-in-the-Loop) before letting the agent proceed.

### Tech Stack & Self-Hosting

- **Backend:** Node.js (TypeScript) + Supabase (Postgres + pgvector + HNSW index) + Express
- **Frontend:** React 19 + Vite
- **Deployment:** Fully self-hostable in under 5 minutes with Docker Compose.
- **License:** MIT

I’m the solo developer behind this. I’d love to hear your thoughts on the three-tier memory model or the pgvector/HNSW search setup. 

Since some subreddits automatically block posts containing external links from low-karma accounts, I’ll drop the GitHub repository and documentation links in the first comment below!

---

### FIRST COMMENT (Post immediately after publishing):

Here are the links to check out the code and try it:

⭐ **GitHub:** https://github.com/benjaminkernbaum-ux/stoic-agentos
📖 **Docs:** https://stoicagentos.com/docs
