# @stoic/agentos-sdk

**Official SDK for Stoic AgentOS** — The AI Agent Operations Platform

Auto-instrument your OpenAI & Anthropic LLM calls with **one line of code**. Get traces, token usage, latency, and cost analytics in your AgentOS dashboard.

## Installation

```bash
npm install stoic-agentos-sdk
```

## 🔥 Auto-Instrumentation (NEW in v2.0)

```javascript
import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({ apiKey: 'sk_live_your_key_here' });
os.instrument(); // ← One line. That's it.

// All OpenAI & Anthropic calls are now auto-captured
const openai = new OpenAI();
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// ↑ Automatically captured:
//   • Model: gpt-4o
//   • Tokens: 28 input, 12 output
//   • Latency: 342ms
//   • Cost: $0.000190
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

### Configuration

```javascript
os.instrument({
  openai: true,        // default: true
  anthropic: true,     // default: true
  capturePrompts: false // default: false — set true to include prompt metadata
});
```

## Trace Boundaries

Group related LLM calls into a single trace:

```javascript
const result = await os.trace('summarize-pipeline', async (ctx) => {
  // All LLM calls inside here are grouped into one trace
  const outline = await openai.chat.completions.create({ ... });
  const summary = await openai.chat.completions.create({ ... });
  return summary;
});
```

## Agent Wrapping

```javascript
const myAgent = os.wrapAgent('data-processor', async (input) => {
  // Your agent logic — automatically traced if instrumented
  return await processData(input);
});

// Auto-captures: start, success/error, duration, tokens, cost
await myAgent({ source: 'production' });
```

## Manual Observation Capture

```javascript
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for cost optimization',
  content: 'Reduced inference cost by 60% with negligible quality drop',
});
```

## CLI

```bash
# Initialize AgentOS in your project
npx stoic-agentos-sdk init <YOUR_API_KEY> <WORKSPACE_NAME>

# Check which LLM SDKs are installed
npx stoic-agentos-sdk instrument

# Install git hooks (auto-capture commits)
npx stoic-agentos-sdk init-hooks

# Test API connection
npx stoic-agentos-sdk test
```

## API Reference

### `new AgentOS(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `process.env.AGENTOS_API_KEY` | Your API key |
| `workspace` | `string` | `'default'` | Workspace identifier |
| `apiUrl` | `string` | Production URL | Custom API endpoint |
| `debug` | `boolean` | `false` | Enable debug logging |
| `batchSize` | `number` | `10` | Flush after N items |
| `flushInterval` | `number` | `5000` | Auto-flush interval (ms) |

### Methods

| Method | Description |
|--------|-------------|
| `os.instrument(options?)` | Auto-patch OpenAI & Anthropic SDKs |
| `os.trace(name, fn, options?)` | Execute fn within a named trace |
| `os.wrapAgent(name, fn)` | Wrap agent with auto-capture + tracing |
| `os.capture(observation)` | Manual observation capture |
| `os.getTraces(options?)` | List traces from API |
| `os.getStats()` | Get dashboard stats |
| `os.getObservations(options?)` | List observations |
| `os.registerAgent(agent)` | Register an agent |
| `os.shutdown()` | Flush all pending data |

## Observation Types

| Type | Use Case |
|------|----------|
| `note` | General notes |
| `decision` | Architecture decisions |
| `architecture` | System design changes |
| `deployment` | Deploy events |
| `discovery` | New findings |
| `error` | Error reports |
| `agent_run` | Agent execution logs |
| `git_commit` | Auto-captured commits |

## License

MIT © [Stoic](https://stoicagentos.com)
