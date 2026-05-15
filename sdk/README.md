# @stoic/agentos-sdk

Official SDK for [Stoic AgentOS](https://stoic-agentos.vercel.app) — the MCP-native
observability layer for autonomous AI agents. Capture every tool call, agent run,
decision, and error. Hit the kill switch from the dashboard when something goes wrong.

## Install

```bash
npm install @stoic/agentos-sdk
```

## Quick start — MCP

The wedge. Wrap any MCP client and every tool call is captured automatically
(latency, args, result, success/error), with zero instrumentation in your business logic.

```js
import { AgentOS } from '@stoic/agentos-sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const os = new AgentOS({ apiKey: process.env.AGENTOS_API_KEY });

const raw = new Client(/* your MCP transport */);
const github = os.wrapMcpClient(raw, { serverName: 'github' });

// Every call is captured to your dashboard
await github.callTool({ name: 'create_issue', arguments: { title: 'bug' } });
await github.readResource({ uri: 'repo://owner/name/README.md' });
```

Works with the official `@modelcontextprotocol/sdk` Client or any object exposing
`callTool`, `listTools`, `readResource`, `listResources`, or `getPrompt`.

## Quick start — agent wrapping

For non-MCP agents (or plain functions), wrap them once:

```js
const summarize = os.wrapAgent('summarizer', async (text) => {
  return model.complete(text);
});

await summarize('hello world');
// → captures start, success or error, duration, and updates the agent record
```

## Manual capture

```js
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini',
  content: 'Cost dropped 73% with no measurable quality regression on our eval set.',
});
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
