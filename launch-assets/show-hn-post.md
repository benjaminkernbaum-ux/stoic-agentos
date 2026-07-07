# Show HN: Stoic AgentOS — Open-source memory + governance for AI agents

> Copy everything below the line for the HN submission.
> Post to: https://news.ycombinator.com/submit
> Title field: "Show HN: Stoic AgentOS – Open-source memory and governance layer for AI agents"
> URL field: https://github.com/benjaminkernbaum-ux/stoic-agentos

---

## HN POST BODY (paste into the text field)

Hi HN — I'm Benjamin, and I built Stoic AgentOS because my AI agents kept making the same mistakes.

**The problem:** Every agent observability tool (Langfuse, LangSmith, Helicone) is stateless. They record traces — what your agent did — but the agent itself forgets everything when the session ends. My support agent hallucinated a refund policy on a Tuesday, I fixed it, and on Thursday it did the exact same thing because it had no memory of the fix.

**What I built:** An open-source active memory and governance layer with three things no other tool has:

1. **Three-tier persistent memory with Vector Search** — working (session state with TTL), episodic (timestamped timeline of past actions embedded using cosine similarity), and semantic (structured knowledge graph). It's backed by `pgvector` and an HNSW index.

2. **Transparent autoRecall** — Wrap your OpenAI or Anthropic clients in 3 lines of code. When initialized with `autoRecall: true`, the SDK automatically searches episodic memory for historical context matching the user's prompt and injects it directly into the system prompt. The agent learns from past runs with zero manual prompt tweaking.

3. **Active Shields & Circuit Breakers** — Server-side cost/loop limits and Human-in-the-Loop approvals. Suspend critical tool executions (like database edits or trades) until verified via the dashboard.

**How it works (3 lines):**

    import { AgentOS } from 'stoic-agentos-sdk';
    const os = new AgentOS({ apiKey: 'sk_live_xxx', autoRecall: true });
    os.instrumentClient('openai', openai);  // auto-captures calls & injects memory context

Then manual memory or telemetry (optional):

    await os.memory.recordEpisode('Customer prefers email over phone', { importance: 7 });
    // ...next session, after restart:
    const past = await os.memory.searchEpisodes('Preferred communication channel?');
    // Returns relevant episodes using vector cosine similarity

**Stack:** React + Express + Supabase (Postgres + pgvector + HNSW) + Railway. SDKs in Node.js and Python. MIT licensed. Self-hostable with docker compose.

**What I'm NOT:** I'm not replacing Langfuse or LangSmith for tracing. They're great at that (Langfuse especially, now backed by ClickHouse). I'm building the layer that sits on top — the brain that remembers and governs, not just the eyes that watch.

GitHub: https://github.com/benjaminkernbaum-ux/stoic-agentos
Live: https://stoicagentos.com
npm: `npm install stoic-agentos-sdk`
pip: `pip install stoicos`

Happy to answer any questions about the architecture, pgvector, or the memory system.

---

## HN STRATEGY NOTES (Don't paste these)

### Timing
- Post between 8-10 AM ET (Monday-Thursday)
- Best days: Tuesday or Wednesday
- Avoid weekends and Fridays

### Rules
1. **Answer every comment** within the first 2 hours — this is critical for HN ranking
2. **Be technical and humble** — no marketing language
3. **Admit limitations honestly** — HN rewards transparency
4. **Don't ask for upvotes** — instant death on HN

### Likely Questions and Prepared Answers

**Q: "How is this different from just using a database?"**
A: "The logging/storage part, fair point — that's just Postgres. But the Reflection Engine (Claude extracting structured triples from raw logs), memory decay (automatic confidence reduction on stale facts), and circuit breakers (server-side auto-halt) — those are the pieces that took months. You could build each one individually, but the integration is where the value lives."

**Q: "Why not just use Langfuse?"**
A: "Langfuse is excellent for tracing — I've used it myself. But it's stateless by design. It records what happened; it doesn't remember what happened. If your agent needs to know what it learned yesterday, Langfuse can't help. That's the gap I'm filling. Some teams run both."

**Q: "Why Supabase instead of ClickHouse for traces?"**
A: "Honest answer: Supabase was faster to ship with. Postgres + RLS gave me multi-tenant isolation out of the box. For high-volume trace ingestion (10K+ events/second), ClickHouse would be better — that's actually why Langfuse chose it. But for the memory/knowledge layer, Postgres is a better fit because it's relational data (triples, episodes, audit logs), not time-series. If I hit scale problems on the trace side, I'll add ClickHouse as a trace-specific store."

**Q: "What's the performance overhead of instrumentClient?"**
A: "It monkey-patches the client methods and adds ~2-5ms per call for the telemetry envelope. The actual API calls go through unchanged. Observation flushing is batched (every 10 events or 5 seconds) and non-blocking. In benchmarks, overhead is under 1% of total request time."

**Q: "How does the Reflection Engine work?"**
A: "It reads the last N episodic memory entries, sends them to Claude Haiku with a structured extraction prompt, and gets back subject-relation-object triples with confidence scores. Example: from 'Customer asked about refund policy three times this week', it extracts: (customer-123, frequently_asks_about, refund_policy, confidence: 0.9). These triples are upserted into the semantic memory table. Memory decay runs on a cron — episodes older than 30 days get importance reduced, triples older than 60 days get confidence reduced."

**Q: "Solo founder? How do I know this won't disappear?"**
A: "MIT licensed, fully self-hostable, standard Postgres. If I get hit by a bus tomorrow, you docker compose up on your own server and everything keeps running. No proprietary formats, no lock-in. That's the whole point of open source."
