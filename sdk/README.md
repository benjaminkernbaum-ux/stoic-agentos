# @stoic/agentos-sdk

**Official SDK for Stoic AgentOS** — The AI Agent Operations Platform

Monitor, orchestrate, and persist knowledge across your entire AI agent fleet from a single command center.

## Installation

```bash
npm install @stoic/agentos-sdk
```

## Quick Start

```javascript
import { AgentOS } from '@stoic/agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_your_key_here',
  workspace: 'my-project',
});

// Wrap any agent function — auto-captures start/success/error
const myAgent = os.wrapAgent('data-processor', async (input) => {
  // Your agent logic here
  return await processData(input);
});

// Run it — observations are captured automatically
await myAgent({ source: 'production' });

// Manual observation capture
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for cost optimization',
  content: 'Reduced inference cost by 60% with negligible quality drop',
});
```

## CLI Usage

```bash
# Initialize AgentOS in your project
npx @stoic/agentos-sdk init <YOUR_API_KEY> <WORKSPACE_NAME>

# Install git post-commit hooks (auto-captures commits)
npx @stoic/agentos-sdk init-hooks

# Test your API connection
npx @stoic/agentos-sdk test

# Bulk-register all 25 OpenClaw skills as agents
npx @stoic/agentos-sdk register-skills
```

## OpenClaw Integration

Wire local OpenClaw skills to the AgentOS cloud brain so every skill
invocation is registered as an agent, logged as an observation, and
heartbeat-pinged on the dashboard.

```javascript
import { logSkill, observe } from 'stoic-agentos-sdk/openclaw';

// outreach.js — drop the wrapper around your skill entry function.
export default logSkill('outreach', async (ctx) => {
  await observe({ type: 'decision', title: 'Sequenced 50 leads via LinkedIn' });
  // ... skill body
});
```

The adapter auto-loads `apiKey` and `workspace` from `~/.openclaw/openclaw.json`
(`agentos.api_key` / `agentos.workspace`) or `AGENTOS_API_KEY` env var, and
classifies each of the 25 built-in Stoic skills into its module (content / gtm /
crm / finance / standalone) so the dashboard groups them correctly. Pass
`{ module: 'gtm' }` as the third arg to override for custom skills.

For the `memory-bridge` skill — cross-machine shared memory:

```javascript
import { rememberKnowledge, recallKnowledge } from 'stoic-agentos-sdk/openclaw';

await rememberKnowledge({ name: 'Q2 OKRs', summary: '...', content: '...' });
const items = await recallKnowledge('okrs');
```

## API Reference

### `new AgentOS(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `process.env.AGENTOS_API_KEY` | Your API key from the dashboard |
| `workspace` | `string` | `'default'` | Workspace identifier |
| `apiUrl` | `string` | Production URL | Custom API endpoint |
| `debug` | `boolean` | `false` | Enable debug logging |
| `batchSize` | `number` | `10` | Flush after N observations |
| `flushInterval` | `number` | `5000` | Auto-flush interval (ms) |

### `os.capture(observation)`

Capture a single observation.

```javascript
await os.capture({
  type: 'architecture',    // note|decision|architecture|deployment|discovery|error|agent_run
  title: 'Migrated to PostgreSQL',
  content: 'Full migration details...',
  agent: 'db-migrator',
  metadata: { tables: 8, duration_ms: 3400 },
});
```

### `os.wrapAgent(name, fn)`

Wrap an async function with automatic observation capture.

```javascript
const summarizer = os.wrapAgent('summarizer', async (text) => {
  const result = await llm.generate(text);
  return result;
});

// Automatically captures: agent_start, agent_success/agent_error
await summarizer('Long document text...');
```

### `os.registerAgent(agent)`

Register an agent in the platform.

```javascript
await os.registerAgent({
  name: 'content-writer',
  description: 'Generates blog posts from outlines',
  module: 'content',  // content|gtm|crm|finance|standalone
});
```

### `os.getStats()` / `os.getObservations(options)`

```javascript
const stats = await os.getStats();
console.log(stats.observations.this_month); // 142

const recent = await os.getObservations({ limit: 10, type: 'error' });
```

## Observation Types

| Type | Emoji | Use Case |
|------|-------|----------|
| `note` | 📌 | General notes |
| `decision` | 🧭 | Architecture decisions |
| `architecture` | 🏗️ | System design changes |
| `deployment` | 🚀 | Deploy events |
| `discovery` | 💡 | New findings |
| `error` | ❌ | Error reports |
| `agent_run` | 🤖 | Agent execution logs |
| `git_commit` | 📝 | Auto-captured commits |

## Git Hook Integration

After running `npx @stoic/agentos-sdk init-hooks`, every git commit in your repo automatically creates an observation in your dashboard.

## License

MIT © [Stoic](https://stoic-agentos.vercel.app)
