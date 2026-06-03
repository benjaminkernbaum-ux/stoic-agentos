<p align="center">
  <h1 align="center">⚡ Stoic AgentOS</h1>
  <p align="center"><strong>AIエージェントフリートのためのオペレーティングシステム</strong></p>
  <p align="center">AIエージェントの監視、オーケストレーション、ナレッジの永続化を — 単一のダッシュボードから。</p>
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
  <a href="https://stoicagentos.com">ダッシュボード</a> · 
  <a href="https://stoicagentos.com/docs">ドキュメント</a> · 
  <a href="https://stoicagentos.com/signup">無料で始める</a> · 
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk">npm</a> · 
  <a href="#クイックスタート">クイックスタート</a>
</p>

<p align="center">
  <strong>⭐ このプロジェクトを気に入っていただけましたか？スターをお願いします — スターひとつひとつが、AIエージェントを開発するより多くの開発者に届く力になります！</strong><br/>
  <sub>AgentOSがエージェントのデバッグ時間を短縮できたなら、スターが最高の感謝の伝え方です 🙏</sub>
</p>

<p align="center">
  <!-- TODO: Replace with actual demo GIF recording of the dashboard -->
  <img src="launch-assets/01_hero.png" alt="Stoic AgentOS Dashboard" width="800" />
</p>

---

## 課題

本番環境でAIエージェントを運用していませんか — コーディングアシスタント、データパイプライン、カスタマーサポートBot、トレーディングBot、コンテンツ生成器。それぞれが自律的に意思決定を行いますが：

- **可視性がない** → エージェントが午前3時に障害を起こし、月曜日に気づく
- **記憶がない** → 同じエージェントが毎回同じバグを再発見する
- **連携がない** → 5つのエージェント、5つのサイロ、共有知識ゼロ

## 解決策

AgentOSはAIフリートに**コマンドセンター**を提供します — リアルタイム監視、セッションをまたいで維持される永続ナレッジ、そしてスケールに合わせた従量課金制。

```
Your Agent Fleet          →  AgentOS SDK  →  Dashboard
├── Coding Assistant           3 lines       📊 Real-time status
├── Data Pipeline              of code       🧠 Shared knowledge
├── Support Bot                              📈 Usage analytics
└── Content Generator                        🔑 API key management
```

## クイックスタート

### 1. インストール

```bash
npm install stoic-agentos-sdk
```

### 2. APIキーの取得

[stoicagentos.com](https://stoicagentos.com/signup) でサインアップ → ダッシュボード → 設定 → キーを生成

### 3. 最初のエージェントを監視する

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

### 4. 意思決定とナレッジのキャプチャ

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

## 機能一覧

| 機能 | 説明 |
|---------|-------------|
| 🤖 **エージェント監視** | フリート全体のリアルタイムステータス、ハートビート、エラー追跡 |
| 🧠 **ナレッジの永続化** | エージェントがセッションをまたいで意思決定を記憶 — 再学習の必要なし |
| 📊 **使用状況分析** | Observations/月、エージェント実行数、エラー率を一目で把握 |
| 📦 **マルチワークスペース** | プロジェクト、リポジトリ、チームごとにエージェントをグループ化 |
| ⚡ **自動キャプチャ** | `wrapAgent()` が開始、成功、エラーを自動でログ記録 |
| 🔑 **APIキー管理** | ダッシュボードからキーの生成、一覧表示、失効が可能 |
| 💳 **従量課金制** | 実際の制限がある無料ティア、必要に応じてアップグレード |
| 🔒 **行レベルセキュリティ** | Supabase上の完全なRLS — データは組織ごとに分離 |
| 🧠 **Claude搭載インサイト** | アクティビティの自動要約（Haiku 4.5）と障害エージェントの診断（Sonnet 4.6 + thinking） |
| 🔐 **BYOK** | Anthropicキーの持ち込み — Supabase Vaultで暗号化保存、平文での保存は一切なし |

## なぜAgentOSなのか？

| | **Stoic AgentOS** | Langfuse | AgentOps | CrewAI |
|---|---|---|---|---|
| **エージェント監視** | ✅ | ✅ | ✅ | ⚠️ オーケストレーションのみ |
| **ナレッジの永続化** | ✅ | ❌ | ❌ | ❌ |
| **自動キャプチャSDK** | ✅ 3行 | ⚠️ デコレータベース | ✅ | ❌ |
| **マルチワークスペース** | ✅ | ⚠️ Projects | ❌ | ❌ |
| **セルフサービスダッシュボード** | ✅ | ✅ | ✅ | ❌ |
| **使用量制限 + 課金** | ✅ ビルトイン | ✅ | ❌ | ❌ |
| **オープンソースコア** | ✅ MIT | ✅ MIT | 部分的 | ✅ |
| **セットアップ時間** | 3分 | 10分 | 5分 | 30分 |

## 料金プラン

| | Free | Pro — $29/月 | Team — $79/月 | Enterprise |
|---|------|-------------|----------------|------------|
| ワークスペース | 2 | 10 | 無制限 | 無制限 |
| エージェント | 5 | 25 | 100 | 無制限 |
| Observations/月 | 10,000 | 100,000 | 無制限 | 無制限 |
| ナレッジアイテム | 5 | 25 | 無制限 | 無制限 |
| メンバー | 1 | 5 | 15 | 無制限 |

[**無料で始める →**](https://stoicagentos.com/signup)

## アーキテクチャ

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

## APIリファレンス

| メソッド | エンドポイント | 認証 | 説明 |
|--------|----------|------|-------------|
| `POST` | `/api/v1/observations` | API Key | Observationの作成 |
| `GET` | `/api/v1/observations` | API Key | Observationの一覧取得 |
| `POST` | `/api/v1/agents` | API Key | エージェントの登録 |
| `GET` | `/api/v1/agents` | API Key | エージェントの一覧取得 |
| `POST` | `/api/v1/agents/heartbeat` | API Key | エージェントハートビート（upsert） |
| `POST` | `/api/v1/knowledge-items` | API Key | ナレッジアイテムの作成 |
| `POST` | `/api/v1/workspaces` | API Key | ワークスペースの作成 |
| `GET` | `/api/v1/stats` | API Key | ダッシュボード統計情報 |
| `POST` | `/api/v1/api-keys` | JWT | APIキーの生成 |
| `DELETE` | `/api/v1/api-keys/:id` | JWT | APIキーの失効 |
| `POST` | `/api/v1/billing/checkout` | JWT | Stripeチェックアウトの開始 |
| `POST` | `/api/v1/billing/portal` | JWT | カスタマーポータルを開く |

## SDKリファレンス

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

## Claude統合

AgentOSはAI搭載インサイトにAnthropic Claudeを使用しています — Observationの要約、エージェント障害の診断、フリートに関する自由形式の質問への回答。

**モデル:** 高速要約にはHaiku 4.5、詳細な診断にはadaptive thinking付きSonnet 4。

**3つのインターフェース:**
- **API**: `POST /insights/{summarize,analyze-agent,ask}` — APIリファレンスを参照
- **SDK**: `os.summarize()`, `os.analyzeAgent(id)`, `os.ask(q)`（上記参照）
- **MCPサーバー**: `agentos_summarize_observations`, `agentos_analyze_agent`, `agentos_ask` ツール

**BYOK（Bring Your Own Key）:** お客様は設定 → Anthropic APIキーから、推論を自身のAnthropicアカウント経由でルーティングできます。キーはSupabase Vault（`vault.secrets`、保存時にpgsodium暗号化）で暗号化保存され、APIのサービスロールのみがアクセスします。組織ごとのキーが設定されていない場合、プラットフォームは`ANTHROPIC_API_KEY`環境変数にフォールバックします。

**コスト追跡:** すべてのClaude呼び出しはトークン数とキャッシュヒットとともに`anthropic_usage`に記録されます。設定タブでは、7日/30日/90日間の呼び出し数、トークン使用量、推定コストが確認できます。

**キャッシュ:** すべてのリクエストは`cache_control: { type: 'ephemeral' }`を使用しているため、繰り返しのシステムプロンプトはプレフィックスキャッシュにヒットし、入力コストの約10%で済みます。

## 🌍 導入事例

Stoic AgentOSは、自律システムの監視、永続化、オーケストレーションを行う先進的なエンジニアリングチームに信頼されています。

<p align="center">
  <img src="https://img.shields.io/badge/Fleet-Coding%20Copilots-blueviolet?style=for-the-badge&logo=github" alt="Coding Copilots" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Orchestrator-Customer%20Support-00BFFF?style=for-the-badge&logo=intercom" alt="Customer Support" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Pipeline-Autonomous%20Trading-FFD700?style=for-the-badge&logo=stripe" alt="Autonomous Trading" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Worker-Data%20Extraction-FF8C00?style=for-the-badge&logo=python" alt="Data Extraction" />
</p>

- **自律型DevOps:** 24時間365日稼働するCI/CDトリアージエージェントの自動監視。
- **エンタープライズサポートフリート:** 月間10,000件以上の動的Observationにわたるマルチエージェントサポートフローの調整。
- **動的コンテンツパイプライン:** 長時間実行されるクリエイティブ動画生成における記憶保持の追跡。

---

## コントリビューション

コントリビューションを歓迎します！ガイドラインは[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください。

```bash
# Clone the repo
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cd stoic-agentos

# Install dependencies
npm install

# Start dev server
npm run dev
```

## ライセンス

MIT © 2026 [Benjamin Kernbaum](https://github.com/benjaminkernbaum-ux)

---

## 📈 スター履歴

[![Star History Chart](https://api.star-history.com/svg?repos=benjaminkernbaum-ux/stoic-agentos&type=Date)](https://star-history.com/#benjaminkernbaum-ux/stoic-agentos)

---

## 🌍 コミュニティ

- 💬 [Discussions](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions) — 質問やアイデアの共有
- 🐛 [Issues](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues) — バグ報告、機能リクエスト
- ⭐ [このリポジトリにスター](https://github.com/benjaminkernbaum-ux/stoic-agentos) — より多くの開発者に届ける手助けを
- 📋 [Contributing](CONTRIBUTING.md) — AgentOSの開発に参加する

---

<p align="center">
  <strong>信念を持って構築。</strong><br/>
  <a href="https://stoicagentos.com">stoicagentos.com</a><br/><br/>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=for-the-badge&logo=github&label=Star%20on%20GitHub&color=9b59ff" alt="Star on GitHub" /></a>
</p>
