<div align="center">

# @stoic/agentos-sdk

**The observability layer for AI agent fleets**

Monitor every LLM call, trace agent workflows, and persist knowledge — with 3 lines of code.

[![npm version](https://img.shields.io/npm/v/stoic-agentos-sdk)](https://www.npmjs.com/package/stoic-agentos-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

[Quick Start](#-quick-start) · [Auto-Instrumentation](#-auto-instrumentation) · [API Reference](#-api-reference) · [CLI](#-cli)

</div>

---

## 🚀 Quick Start

```bash
npm install @stoic/agentos-sdk
```

```javascript
import { AgentOS } from '@stoic/agentos-sdk';

const os = new AgentOS({ apiKey: 'sk_live_your_key_here' });

// That's it. Start capturing.
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for cost optimization',
  content: 'Reduced inference cost by 60% with negligible quality drop',
});
```

Get your API key at [stoic-agentos.vercel.app/dashboard](https://stoic-agentos.vercel.app/dashboard).

---

## 🔥 Auto-Instrumentation

Instrument your OpenAI or Anthropic clients with **one line** — every LLM call is automatically captured with model, tokens, latency, and cost.

```javascript
import { AgentOS } from '@stoic/agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({ apiKey: 'sk_live_your_key_here' });
const openai = new OpenAI();

os.instrumentClient('openai', openai);  // ← One line. That's it.

// All calls are now auto-captured
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
// ↑ Automatically captured: model, tokens, latency, cost
```

### What gets captured

| Field | Description |
|-------|-------------|
| `provider` | openai or anthropic |
| `model` | gpt-4o, claude-sonnet-4, etc. |
| `prompt_tokens` | Input token count |
| `completion_tokens` | Output token count |
| `latency_ms` | Request duration |
| `cost_usd` | Estimated cost (from embedded pricing table) |
| `status` | success or error |
| `error_message` | Error details (if failed) |

### Supported SDKs

| SDK | Support | Method |
|-----|---------|--------|
| `openai` ≥ 4.0 | ✅ Full | `chat.completions.create()` (sync + streaming) |
| `@anthropic-ai/sdk` ≥ 0.20 | ✅ Full | `messages.create()` (sync + streaming) |

---

## 🔗 Trace Boundaries

Group related LLM calls into a single trace for end-to-end visibility:

```javascript
const trace = os.startTrace('summarize-pipeline', { agent: 'content-writer' });

const outline = await openai.chat.completions.create({ /* ... */ });
const summary = await openai.chat.completions.create({ /* ... */ });

await trace.end(); // All spans are sent as one trace
```

---

## 🤖 Agent Wrapping

Wrap agent functions to automatically capture start/success/error, duration, and heartbeats:

```javascript
const myAgent = os.wrapAgent('data-processor', async (input) => {
  // Your agent logic — automatically traced if instrumented
  const result = await processData(input);
  return result;
});

// Each call captures: start event, success/error, duration, tokens, cost
await myAgent({ source: 'production' });
```

---

## 📝 Manual Observation Capture

```javascript
// Decision
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for cost optimization',
  content: 'Reduced inference cost by 60% with negligible quality drop',
  agent: 'cost-optimizer',
});

// Error
await os.capture({
  type: 'error',
  title: 'OpenAI rate limit exceeded',
  content: 'Received 429, implementing exponential backoff',
  metadata: { retry_count: 3, delay_ms: 4000 },
});

// Architecture
await os.capture({
  type: 'architecture',
  title: 'Migrated to vector search for knowledge retrieval',
  content: 'pgvector with HNSW index, 95% recall at 50ms p99',
});
```

---

## 🧠 Claude Insights

Ask questions about your agent fleet, powered by Claude:

```javascript
// Summarize recent activity
const summary = await os.summarize({ limit: 100, agent_id: 'my-agent-uuid' });
console.log(summary.summary);

// Deep-dive into a specific agent's health
const analysis = await os.analyzeAgent('agent-uuid');
console.log(analysis.analysis);

// Free-form questions
const answer = await os.ask('Which agent had the most errors this week?');
console.log(answer.answer);
```

> **Note:** Requires an Anthropic API key configured in your org settings (BYOK) or a platform-wide key.

---

## ⌨️ CLI

```bash
# Initialize AgentOS in your project
npx @stoic/agentos-sdk init <YOUR_API_KEY> <WORKSPACE_NAME>

# Check which LLM SDKs are installed
npx @stoic/agentos-sdk instrument

# Install git hooks (auto-capture commits)
npx @stoic/agentos-sdk init-hooks

# Test API connection
npx @stoic/agentos-sdk test
```

---

## 📖 API Reference

### `new AgentOS(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `process.env.AGENTOS_API_KEY` | Your API key (`sk_live_xxx`) |
| `workspace` | `string` | `'default'` | Workspace identifier |
| `apiUrl` | `string` | Production URL | Custom API endpoint |
| `debug` | `boolean` | `false` | Enable debug logging |
| `batchSize` | `number` | `10` | Flush after N observations |
| `flushInterval` | `number` | `5000` | Auto-flush interval (ms) |
| `maxRetries` | `number` | `3` | Max retries on network/429 errors |
| `baseDelay` | `number` | `500` | Base delay for exponential backoff (ms) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `instrumentClient(provider, client)` | `this` | Auto-patch an OpenAI or Anthropic client |
| `startTrace(name, options?)` | `Trace` | Start a trace boundary |
| `capture(observation)` | `Promise<void>` | Queue an observation |
| `flush()` | `Promise<void>` | Send all queued observations |
| `wrapAgent(name, fn)` | `Function` | Wrap agent with auto-capture + tracing |
| `registerAgent(agent)` | `Promise` | Register an agent with the platform |
| `getStats()` | `Promise<Stats>` | Get dashboard stats |
| `getObservations(options?)` | `Promise<Observation[]>` | List observations |
| `getTraces(options?)` | `Promise<Trace[]>` | List traces |
| `summarize(options?)` | `Promise<SummarizeResult>` | Claude-powered summary |
| `analyzeAgent(agentId)` | `Promise<AnalyzeResult>` | Claude-powered agent diagnosis |
| `ask(question, context?)` | `Promise<AskResult>` | Free-form Claude Q&A |
| `shutdown()` | `Promise<void>` | Flush all pending data |

### Observation Types

| Type | Use Case |
|------|----------|
| `note` | General notes |
| `decision` | Architecture/strategy decisions |
| `architecture` | System design changes |
| `deployment` | Deploy events |
| `discovery` | New findings |
| `file_edit` | Code changes |
| `error` | Error reports |
| `agent_run` | Agent execution logs |
| `git_commit` | Auto-captured commits |
| `command` | CLI commands run |
| `dependency` | Package/dependency changes |
| `config` | Configuration updates |

---

## 🔄 Retry & Error Handling

The SDK automatically retries on network errors and `429 Rate Limited` responses with exponential backoff:

```
Attempt 1 → fail → wait 500ms
Attempt 2 → fail → wait 1000ms  
Attempt 3 → fail → wait 2000ms
Attempt 4 → return null (or throw for validation errors)
```

**Error classes** you can catch:

```javascript
import { AgentOSValidationError, AgentOSAuthError, AgentOSRateLimitError } from '@stoic/agentos-sdk';

try {
  await os.capture({ title: '' }); // missing required field
} catch (err) {
  if (err instanceof AgentOSValidationError) {
    console.error('Bad input:', err.message);
  }
}
```

---

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTOS_API_KEY` | Your API key (fallback if not passed to constructor) |
| `AGENTOS_API_URL` | Custom API URL (default: production) |

---

## 📋 Requirements

- **Node.js** ≥ 18.0.0
- **Optional peer deps**: `openai` ≥ 4.0, `@anthropic-ai/sdk` ≥ 0.20

---

## License

MIT © [Stoic](https://stoicagentos.com)
