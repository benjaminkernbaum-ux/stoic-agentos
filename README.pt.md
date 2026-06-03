<p align="center">
  <h1 align="center">⚡ Stoic AgentOS</h1>
  <p align="center"><strong>O Sistema Operacional para Frotas de Agentes de IA</strong></p>
  <p align="center">Monitore, orquestre e persista conhecimento entre seus agentes de IA — a partir de um único painel.</p>
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
  <a href="https://stoicagentos.com">Dashboard</a> · 
  <a href="https://stoicagentos.com/docs">Docs</a> · 
  <a href="https://stoicagentos.com/signup">Comece Gratuitamente</a> · 
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk">npm</a> · 
  <a href="#início-rápido">Início Rápido</a>
</p>

<p align="center">
  <strong>⭐ Gostou deste projeto? Dê uma estrela — cada estrela nos ajuda a alcançar mais desenvolvedores que constroem com agentes de IA!</strong><br/>
  <sub>Se o AgentOS economiza seu tempo depurando agentes, uma estrela é a melhor forma de agradecer 🙏</sub>
</p>

<p align="center">
  <!-- TODO: Replace with actual demo GIF recording of the dashboard -->
  <img src="launch-assets/01_hero.png" alt="Stoic AgentOS Dashboard" width="800" />
</p>

---

## O Problema

Você está executando agentes de IA em produção — assistentes de código, pipelines de dados, bots de suporte ao cliente, bots de trading, geradores de conteúdo. Cada um toma decisões autônomas, mas:

- **Sem visibilidade** → O agente falha às 3 da manhã, você descobre na segunda-feira
- **Sem memória** → O mesmo agente redescobre o mesmo bug toda sessão
- **Sem coordenação** → 5 agentes, 5 silos, zero conhecimento compartilhado

## A Solução

O AgentOS dá à sua frota de IA um **centro de comando** — monitoramento em tempo real, conhecimento persistente que sobrevive entre sessões, e cobrança baseada em uso que escala com você.

```
Your Agent Fleet          →  AgentOS SDK  →  Dashboard
├── Coding Assistant           3 lines       📊 Real-time status
├── Data Pipeline              of code       🧠 Shared knowledge
├── Support Bot                              📈 Usage analytics
└── Content Generator                        🔑 API key management
```

## Início Rápido

### 1. Instalar

```bash
npm install stoic-agentos-sdk
```

### 2. Obtenha sua API Key

Cadastre-se em [stoicagentos.com](https://stoicagentos.com/signup) → Dashboard → Settings → Generate Key

### 3. Monitore seu Primeiro Agente

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

### 4. Capture Decisões e Conhecimento

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

## Funcionalidades

| Funcionalidade | Descrição |
|---------|-------------|
| 🤖 **Monitoramento de Agentes** | Status em tempo real, heartbeats, rastreamento de erros para toda a sua frota |
| 🧠 **Persistência de Conhecimento** | Agentes lembram decisões entre sessões — sem necessidade de reaprender |
| 📊 **Análise de Uso** | Observações/mês, execuções de agentes, taxas de erro em um relance |
| 📦 **Multi-Workspace** | Agrupe agentes por projeto, repositório ou equipe |
| ⚡ **Captura Automática** | `wrapAgent()` registra início, sucesso e erros automaticamente |
| 🔑 **Gerenciamento de API Keys** | Gere, liste e revogue chaves a partir do dashboard |
| 💳 **Cobrança por Uso** | Plano gratuito com limites reais, faça upgrade quando precisar |
| 🔒 **Row-Level Security** | RLS completo no Supabase — seus dados são isolados por organização |
| 🧠 **Insights com Claude** | Resumo automático de atividade (Haiku 4.5) e diagnóstico de agentes com falha (Sonnet 4.6 + thinking) |
| 🔐 **BYOK** | Traga sua própria chave Anthropic — armazenada criptografada no Supabase Vault, nunca em texto plano |

## Por que o AgentOS?

| | **Stoic AgentOS** | Langfuse | AgentOps | CrewAI |
|---|---|---|---|---|
| **Monitoramento de agentes** | ✅ | ✅ | ✅ | ⚠️ Apenas orquestração |
| **Persistência de conhecimento** | ✅ | ❌ | ❌ | ❌ |
| **SDK com captura automática** | ✅ 3 linhas | ⚠️ Baseado em decoradores | ✅ | ❌ |
| **Multi-workspace** | ✅ | ⚠️ Projetos | ❌ | ❌ |
| **Dashboard self-service** | ✅ | ✅ | ✅ | ❌ |
| **Limites de uso + cobrança** | ✅ Integrado | ✅ | ❌ | ❌ |
| **Core open-source** | ✅ MIT | ✅ MIT | Parcial | ✅ |
| **Tempo de configuração** | 3 min | 10 min | 5 min | 30 min |

## Preços

| | Free | Pro — $29/mês | Team — $79/mês | Enterprise |
|---|------|-------------|----------------|------------|
| Workspaces | 2 | 10 | Ilimitados | Ilimitados |
| Agentes | 5 | 25 | 100 | Ilimitados |
| Observações/mês | 10.000 | 100.000 | Ilimitadas | Ilimitadas |
| Itens de conhecimento | 5 | 25 | Ilimitados | Ilimitados |
| Membros | 1 | 5 | 15 | Ilimitados |

[**Comece Gratuitamente →**](https://stoicagentos.com/signup)

## Arquitetura

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

## Referência da API

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-------------|
| `POST` | `/api/v1/observations` | API Key | Criar observação |
| `GET` | `/api/v1/observations` | API Key | Listar observações |
| `POST` | `/api/v1/agents` | API Key | Registrar agente |
| `GET` | `/api/v1/agents` | API Key | Listar agentes |
| `POST` | `/api/v1/agents/heartbeat` | API Key | Heartbeat do agente (upsert) |
| `POST` | `/api/v1/knowledge-items` | API Key | Criar item de conhecimento |
| `POST` | `/api/v1/workspaces` | API Key | Criar workspace |
| `GET` | `/api/v1/stats` | API Key | Estatísticas do dashboard |
| `POST` | `/api/v1/api-keys` | JWT | Gerar API key |
| `DELETE` | `/api/v1/api-keys/:id` | JWT | Revogar API key |
| `POST` | `/api/v1/billing/checkout` | JWT | Iniciar checkout Stripe |
| `POST` | `/api/v1/billing/portal` | JWT | Abrir portal do cliente |

## Referência do SDK

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

## Integração com Claude

O AgentOS utiliza o Anthropic Claude para insights alimentados por IA — resumindo observações, diagnosticando falhas de agentes e respondendo perguntas de forma livre sobre sua frota.

**Modelos:** Haiku 4.5 para resumos rápidos, Sonnet 4 com thinking adaptativo para diagnósticos aprofundados.

**Três superfícies:**
- **API**: `POST /insights/{summarize,analyze-agent,ask}` — veja a Referência da API
- **SDK**: `os.summarize()`, `os.analyzeAgent(id)`, `os.ask(q)` (acima)
- **MCP server**: ferramentas `agentos_summarize_observations`, `agentos_analyze_agent`, `agentos_ask`

**BYOK (Bring Your Own Key):** Clientes podem rotear a inferência através de sua própria conta Anthropic em Settings → Anthropic API Key. As chaves são armazenadas criptografadas no Supabase Vault (`vault.secrets`, pgsodium em repouso) e acessadas apenas pelo service role da API. Quando nenhuma chave por organização é definida, a plataforma utiliza a variável de ambiente `ANTHROPIC_API_KEY` como fallback.

**Rastreamento de custos:** Cada chamada ao Claude é registrada em `anthropic_usage` com contagem de tokens e cache hits. A aba Settings exibe contagem de chamadas, uso de tokens e custo estimado em uma janela de 7/30/90 dias.

**Cache:** Todas as requisições usam `cache_control: { type: 'ephemeral' }` para que system prompts repetidos utilizem o cache de prefixo a ~10% do custo de input.

## 🌍 Usado Por

O Stoic AgentOS é confiado por equipes de engenharia modernas para monitorar, persistir e orquestrar seus sistemas autônomos.

<p align="center">
  <img src="https://img.shields.io/badge/Fleet-Coding%20Copilots-blueviolet?style=for-the-badge&logo=github" alt="Coding Copilots" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Orchestrator-Customer%20Support-00BFFF?style=for-the-badge&logo=intercom" alt="Customer Support" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Pipeline-Autonomous%20Trading-FFD700?style=for-the-badge&logo=stripe" alt="Autonomous Trading" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Worker-Data%20Extraction-FF8C00?style=for-the-badge&logo=python" alt="Data Extraction" />
</p>

- **DevOps Autônomo:** Monitoramento automático de agentes de triagem CI/CD rodando 24/7.
- **Frotas de Suporte Empresarial:** Coordenando fluxos de suporte multi-agente com mais de 10 mil observações dinâmicas/mês.
- **Pipelines de Conteúdo Dinâmico:** Rastreando preservação de memória para geração de vídeos criativos de longa duração.

---

## Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes.

```bash
# Clone the repo
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cd stoic-agentos

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Licença

MIT © 2026 [Benjamin Kernbaum](https://github.com/benjaminkernbaum-ux)

---

## 📈 Histórico de Estrelas

[![Star History Chart](https://api.star-history.com/svg?repos=benjaminkernbaum-ux/stoic-agentos&type=Date)](https://star-history.com/#benjaminkernbaum-ux/stoic-agentos)

---

## 🌍 Comunidade

- 💬 [Discussões](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions) — Faça perguntas, compartilhe ideias
- 🐛 [Issues](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues) — Reporte bugs, solicite funcionalidades
- ⭐ [Dê uma estrela neste repo](https://github.com/benjaminkernbaum-ux/stoic-agentos) — Nos ajude a alcançar mais desenvolvedores
- 📋 [Contribuindo](CONTRIBUTING.md) — Nos ajude a construir o AgentOS

---

<p align="center">
  <strong>Construído com convicção.</strong><br/>
  <a href="https://stoicagentos.com">stoicagentos.com</a><br/><br/>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=for-the-badge&logo=github&label=Star%20on%20GitHub&color=9b59ff" alt="Star on GitHub" /></a>
</p>
