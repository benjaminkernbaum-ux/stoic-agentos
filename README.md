# ⚡ Stoic AgentOS

**The Operating System for AI Agent Fleets**

Monitor, orchestrate, and scale your AI agents from a single premium dashboard. Knowledge persistence, auto-capture, and multi-workspace management — built for teams shipping AI.

![License](https://img.shields.io/badge/license-MIT-purple)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

## 🚀 Quick Start

```bash
# Install the SDK
npm install @stoic/agentos-sdk

# Initialize in your project
npx agentos init YOUR_API_KEY my-workspace
```

```javascript
import { AgentOS } from '@stoic/agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_xxx',
  workspace: 'my-saas-backend',
});

// Wrap any agent — auto-captures start/end/errors
const myAgent = os.wrapAgent('invoice-processor', async (input) => {
  const result = await processInvoice(input);
  return result;
});

// Manual capture
os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini',
  content: 'Reduced cost by 40% with no quality loss',
});
```

## ✨ Features

- 🤖 **Agent Fleet Monitoring** — Track 100+ agents across departments
- 🧠 **Knowledge Brain** — Persistent memory across all AI sessions
- 🕸️ **Knowledge Graph** — Interactive codebase visualization
- 📦 **Multi-Workspace** — Manage 50+ repos from one dashboard
- ⚡ **Auto-Capture** — Git hooks auto-log every change
- 🏛 **Financial Department** — 8 AI agents replacing $184K/yr

## 💎 Pricing

| | Free | Pro ($49/mo) | Team ($299/mo) | Enterprise |
|---|------|-------------|----------------|------------|
| Workspaces | 2 | 10 | Unlimited | Unlimited |
| Agents | 5 | 25 | 100 | Unlimited |
| Observations/mo | 10,000 | 100,000 | Unlimited | Unlimited |

## 📚 Documentation

Visit [agentos.dev/docs](https://agentos.dev/docs) for full documentation.

## 📄 License

MIT © 2026 Benjamin Kernbaum
