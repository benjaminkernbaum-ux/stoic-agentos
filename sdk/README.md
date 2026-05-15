# @stoic/agentos-sdk

Official SDK for [Stoic AgentOS](https://stoic-agentos.vercel.app) — the AI Agent Operations Platform.
Capture decisions, errors, deployments, and agent runs in one place.

## Install

```bash
npm install @stoic/agentos-sdk
```

## Quick start

```js
import { AgentOS } from '@stoic/agentos-sdk';

const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY, // sk_live_xxx — generate one in the dashboard
  workspace: 'my-app',
});

// Capture an observation
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini',
  content: 'Cost dropped 73% with no measurable quality regression on our eval set.',
});

// Wrap an agent function — auto-captures start, success/error, and updates the agent record
const summarize = os.wrapAgent('summarizer', async (text) => {
  // ...your agent code
  return summary;
});

await summarize('hello world');
```

## API

### `new AgentOS(options)`

| Option | Default | Description |
| --- | --- | --- |
| `apiKey` | `process.env.AGENTOS_API_KEY` | Required. Generate one in the dashboard's Settings tab. |
| `apiUrl` | Stoic AgentOS production | Override for self-hosting. |
| `workspace` | `'default'` | Logical workspace name. |
| `batchSize` | `10` | Flush after N queued observations. |
| `flushInterval` | `5000` | ms before auto-flush of partial batch. |
| `debug` | `false` | Log API errors to console. |

### `os.capture(observation)`

Queues an observation. Flushes automatically.

```ts
type Observation = {
  type: 'note' | 'decision' | 'architecture' | 'deployment' | 'discovery' | 'file_edit' | 'error' | 'agent_run';
  title: string;
  content?: string;
  agent?: string;
  metadata?: Record<string, unknown>;
};
```

### `os.wrapAgent(name, fn)`

Returns a wrapped function. On each call:
- Captures `agent_run` observation with `start` event.
- Captures success (with duration) or error (with stack).
- Upserts the agent in your dashboard via the heartbeat endpoint.

### `os.registerAgent({ name, description, module })`

Manually register an agent without invoking it.

### `os.flush()` / `os.getStats()` / `os.getObservations({ limit, type, workspace })`

Standard data access.

## License

MIT
