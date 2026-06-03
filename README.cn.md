<p align="center">
  <h1 align="center">⚡ Stoic AgentOS</h1>
  <p align="center"><strong>AI 智能体集群的操作系统</strong></p>
  <p align="center">从一个仪表盘监控、编排并持久化您 AI 智能体的知识。</p>
</p>

<p align="center">
  <a href="./README.md"><img alt="English" src="https://img.shields.io/badge/English-d9d9d9"></a>
  <a href="./README.cn.md"><img alt="简体中文" src="https://img.shields.io/badge/简体中文-d9d9d9"></a>
  <a href="./README.ja.md"><img alt="日本語" src="https://img.shields.io/badge/日本語-d9d9d9"></a>
  <a href="./README.kr.md"><img alt="한국어" src="https://img.shields.io/badge/한국어-d9d9d9"></a>
  <a href="./README.es.md"><img alt="Español" src="https://img.shields.io/badge/Español-d9d9d9"></a>
  <a href="./README.pt.md"><img alt="Português" src="https://img.shields.io/badge/Português-d9d9d9"></a>
</p>

<p align="center">
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/network/members"><img src="https://img.shields.io/github/forks/benjaminkernbaum-ux/stoic-agentos?style=social" alt="GitHub Forks" /></a>
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk"><img src="https://img.shields.io/npm/v/stoic-agentos-sdk?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk"><img src="https://img.shields.io/npm/dm/stoic-agentos-sdk?color=green" alt="npm downloads" /></a>
  <a href="https://stoicagentos.com"><img src="https://img.shields.io/badge/dashboard-live-brightgreen" alt="Dashboard" /></a>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="License" /></a>
</p>

<p align="center">
  <a href="https://stoicagentos.com">仪表盘</a> · 
  <a href="https://stoicagentos.com/docs">文档</a> · 
  <a href="https://stoicagentos.com/signup">免费开始</a> · 
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk">npm</a> · 
  <a href="#快速开始">快速开始</a>
</p>

<p align="center">
  <strong>⭐ 喜欢这个项目？点个 Star 吧 —— 每一颗 Star 都能帮助我们触达更多正在构建 AI 智能体的开发者！</strong><br/>
  <sub>如果 AgentOS 帮你节省了调试智能体的时间，点个 Star 就是最好的感谢 🙏</sub>
</p>

<p align="center">
  <!-- TODO: Replace with actual demo GIF recording of the dashboard -->
  <img src="launch-assets/01_hero.png" alt="Stoic AgentOS Dashboard" width="800" />
</p>

---

## 问题所在

您正在生产环境中运行 AI 智能体 —— 编码助手、数据管道、客户支持机器人、交易机器人、内容生成器。它们各自做出自主决策，但是：

- **没有可见性** → 智能体凌晨3点故障，您周一才发现
- **没有记忆** → 同一个智能体每次会话都要重新发现同一个 bug
- **没有协调** → 5个智能体，5个孤岛，零共享知识

## 解决方案

AgentOS 为您的 AI 集群提供一个**指挥中心** —— 实时监控、跨会话持久化知识，以及随您扩展的按量计费。

```
Your Agent Fleet          →  AgentOS SDK  →  Dashboard
├── Coding Assistant           3 lines       📊 Real-time status
├── Data Pipeline              of code       🧠 Shared knowledge
├── Support Bot                              📈 Usage analytics
└── Content Generator                        🔑 API key management
```

## 快速开始

### 1. 安装

```bash
npm install stoic-agentos-sdk
```

### 2. 获取 API Key

在 [stoicagentos.com](https://stoicagentos.com/signup) 注册 → 仪表盘 → 设置 → 生成密钥

### 3. 监控您的第一个智能体

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_your_key_here',
  workspace: 'my-project',
});

// Wrap any function → auto-captures start, success, and errors
const myAgent = os.wrapAgent('invoice-processor', async (input) => {
  const result = await processInvoice(input);
  return result;
});

// Run it — AgentOS tracks everything
await myAgent({ invoiceId: 'INV-001' });
```

### 4. 捕获决策与知识

```javascript
// Capture important observations
os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for summarization',
  content: 'Reduced cost by 40% with no quality loss on BLEU benchmark',
});

// Persist knowledge across sessions
os.capture({
  type: 'architecture',
  title: 'Payment service uses idempotency keys',
  content: 'Always include X-Idempotency-Key header to prevent double charges',
});
```

## 功能特性

| 功能 | 描述 |
|---------|-------------|
| 🤖 **智能体监控** | 实时状态、心跳检测、整个集群的错误追踪 |
| 🧠 **知识持久化** | 智能体跨会话记住决策 —— 不再重复学习 |
| 📊 **使用分析** | 每月观测量、智能体运行次数、错误率一目了然 |
| 📦 **多工作区** | 按项目、仓库或团队分组智能体 |
| ⚡ **自动捕获** | `wrapAgent()` 自动记录启动、成功和错误 |
| 🔑 **API Key 管理** | 从仪表盘生成、列出和撤销密钥 |
| 💳 **按量计费** | 免费层级有真实限额，需要更多时再升级 |
| 🔒 **行级安全** | Supabase 全面 RLS —— 您的数据按组织隔离 |
| 🧠 **Claude 驱动的洞察** | 自动总结活动（Haiku 4.5）和诊断故障智能体（Sonnet 4.6 + thinking） |
| 🔐 **BYOK** | 自带 Anthropic 密钥 —— 使用 Supabase Vault 加密存储，永不明文保存 |

## 为什么选择 AgentOS？

| | **Stoic AgentOS** | Langfuse | AgentOps | CrewAI |
|---|---|---|---|---|
| **智能体监控** | ✅ | ✅ | ✅ | ⚠️ 仅编排 |
| **知识持久化** | ✅ | ❌ | ❌ | ❌ |
| **自动捕获 SDK** | ✅ 3 行代码 | ⚠️ 基于装饰器 | ✅ | ❌ |
| **多工作区** | ✅ | ⚠️ Projects | ❌ | ❌ |
| **自助仪表盘** | ✅ | ✅ | ✅ | ❌ |
| **用量限制 + 计费** | ✅ 内置 | ✅ | ❌ | ❌ |
| **开源核心** | ✅ MIT | ✅ MIT | 部分开源 | ✅ |
| **配置时间** | 3 分钟 | 10 分钟 | 5 分钟 | 30 分钟 |

## 定价

| | 免费版 | Pro — $29/月 | Team — $79/月 | 企业版 |
|---|------|-------------|----------------|------------|
| 工作区 | 2 | 10 | 无限 | 无限 |
| 智能体 | 5 | 25 | 100 | 无限 |
| 每月观测量 | 10,000 | 100,000 | 无限 | 无限 |
| 知识条目 | 5 | 25 | 无限 | 无限 |
| 成员 | 1 | 5 | 15 | 无限 |

[**免费开始 →**](https://stoicagentos.com/signup)

## 架构

```
┌────────────────────────────────┐
│  Your Application              │
│  ├── Agent 1                   │
│  ├── Agent 2                   │─── stoic-agentos-sdk (npm)
│  └── Agent N                   │         │
└────────────────────────────────┘         │
                                           ▼
┌──────────────────────────────────────────────────┐
│  AgentOS API (Railway)                            │
│  ├── Auth (Supabase JWT + API Keys)               │
│  ├── Observations → /api/v1/observations          │
│  ├── Agents → /api/v1/agents                      │
│  ├── Knowledge → /api/v1/knowledge-items          │
│  ├── Billing → /api/v1/billing (Stripe)           │
│  └── Webhooks → /webhooks/stripe, /webhooks/git   │
└──────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│  Supabase   │    │  Stripe         │
│  (Postgres) │    │  (Billing)      │
│  8 tables   │    │  Checkout +     │
│  RLS on all │    │  Portal +       │
│             │    │  Webhooks       │
└─────────────┘    └─────────────────┘
```

## API 参考

| 方法 | 端点 | 认证 | 描述 |
|--------|----------|------|-------------|
| `POST` | `/api/v1/observations` | API Key | 创建观测 |
| `GET` | `/api/v1/observations` | API Key | 列出观测 |
| `POST` | `/api/v1/agents` | API Key | 注册智能体 |
| `GET` | `/api/v1/agents` | API Key | 列出智能体 |
| `POST` | `/api/v1/agents/heartbeat` | API Key | 智能体心跳（更新或插入） |
| `POST` | `/api/v1/knowledge-items` | API Key | 创建知识条目 |
| `POST` | `/api/v1/workspaces` | API Key | 创建工作区 |
| `GET` | `/api/v1/stats` | API Key | 仪表盘统计数据 |
| `POST` | `/api/v1/api-keys` | JWT | 生成 API Key |
| `DELETE` | `/api/v1/api-keys/:id` | JWT | 撤销 API Key |
| `POST` | `/api/v1/billing/checkout` | JWT | 启动 Stripe 结账 |
| `POST` | `/api/v1/billing/portal` | JWT | 打开客户门户 |

## SDK 参考

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

// Initialize
const os = new AgentOS({ apiKey: 'sk_live_xxx', workspace: 'my-app' });

// Core methods
os.capture({ type, title, content, metadata })     // Log observation
os.wrapAgent(name, fn)                              // Auto-monitor function
os.getObservations({ limit, type })                 // Query observations
os.getStats()                                       // Dashboard stats

// Claude-powered insights (v2.1+)
await os.summarize({ hours: 168 })                 // AI briefing of recent activity
await os.analyzeAgent(agentId)                     // Diagnose an agent's health
await os.ask('Why did the email-agent fail?')      // Free-form Q&A
```

## Claude 集成

AgentOS 使用 Anthropic Claude 提供 AI 驱动的洞察 —— 总结观测记录、诊断智能体故障、回答关于您集群的自由问题。

**模型：** Haiku 4.5 用于快速总结，Sonnet 4 搭配自适应思维用于深度诊断。

**三个接入面：**
- **API**：`POST /insights/{summarize,analyze-agent,ask}` —— 参见 API 参考
- **SDK**：`os.summarize()`、`os.analyzeAgent(id)`、`os.ask(q)`（见上文）
- **MCP server**：`agentos_summarize_observations`、`agentos_analyze_agent`、`agentos_ask` 工具

**BYOK（自带密钥）：** 客户可以从 设置 → Anthropic API Key 将推理路由到自己的 Anthropic 账户。密钥使用 Supabase Vault（`vault.secrets`，pgsodium 静态加密）加密存储，仅由 API 的 service role 访问。当没有设置组织专属密钥时，平台将回退到 `ANTHROPIC_API_KEY` 环境变量。

**成本追踪：** 每次 Claude 调用都会记录到 `anthropic_usage`，包含 token 数量和缓存命中情况。设置页面显示 7/30/90 天窗口内的调用次数、token 用量和预估成本。

**缓存：** 所有请求都使用 `cache_control: { type: 'ephemeral' }`，因此重复的系统提示会命中前缀缓存，成本仅为输入成本的约 10%。

## 🌍 谁在使用

Stoic AgentOS 受到现代工程团队的信赖，用于监控、持久化和编排他们的自治系统。

<p align="center">
  <img src="https://img.shields.io/badge/Fleet-Coding%20Copilots-blueviolet?style=for-the-badge&logo=github" alt="Coding Copilots" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Orchestrator-Customer%20Support-00BFFF?style=for-the-badge&logo=intercom" alt="Customer Support" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Pipeline-Autonomous%20Trading-FFD700?style=for-the-badge&logo=stripe" alt="Autonomous Trading" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Worker-Data%20Extraction-FF8C00?style=for-the-badge&logo=python" alt="Data Extraction" />
</p>

- **自主 DevOps：** 自动监控全天候运行的 CI/CD 分诊智能体。
- **企业支持集群：** 协调多智能体支持流程，每月处理超过 10,000 条动态观测。
- **动态内容管道：** 追踪长期运行的创意视频生成中的记忆保存。

---

## 贡献

我们欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

```bash
# Clone the repo
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cd stoic-agentos

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 许可证

MIT © 2026 [Benjamin Kernbaum](https://github.com/benjaminkernbaum-ux)

---

## 📈 Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=benjaminkernbaum-ux/stoic-agentos&type=Date)](https://star-history.com/#benjaminkernbaum-ux/stoic-agentos)

---

## 🌍 社区

- 💬 [讨论](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions) — 提问、分享想法
- 🐛 [问题](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues) — 报告 bug、请求功能
- ⭐ [Star 本仓库](https://github.com/benjaminkernbaum-ux/stoic-agentos) — 帮助我们触达更多开发者
- 📋 [贡献](CONTRIBUTING.md) — 帮助我们构建 AgentOS

---

<p align="center">
  <strong>以信念构建。</strong><br/>
  <a href="https://stoicagentos.com">stoicagentos.com</a><br/><br/>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=for-the-badge&logo=github&label=Star%20on%20GitHub&color=9b59ff" alt="Star on GitHub" /></a>
</p>
