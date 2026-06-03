# 🗺️ Roadmap

> **Last updated:** June 2026
> This roadmap is a living document. We prioritize based on community feedback.
> 
> 💡 **Have an idea?** [Open a discussion](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions/categories/ideas) · ⭐ **Upvote** existing ideas to help us prioritize.

---

## ✅ Shipped

| Feature | Version | Date |
|---|---|---|
| Core agent monitoring (heartbeats, status, errors) | v1.0.0 | Mar 2025 |
| Knowledge persistence across sessions | v1.0.0 | Mar 2025 |
| TypeScript SDK (`stoic-agentos-sdk`) | v1.0.0 | Mar 2025 |
| Python SDK | v1.0.0 | Mar 2025 |
| Stripe billing integration | v1.0.0 | Mar 2025 |
| Claude-powered AI insights (summarize, diagnose, ask) | v1.0.0 | Mar 2025 |
| BYOK (Bring Your Own Anthropic Key) | v1.0.0 | Mar 2025 |
| MCP server for agent-to-agent communication | v1.0.0 | Mar 2025 |
| Cloudflare Turnstile CAPTCHA | v2.0.0 | May 2025 |
| Landing page CRO overhaul | v2.0.0 | May 2025 |
| Multi-workspace management | v2.0.0 | May 2025 |
| Interactive agent graph visualization | v2.0.0 | May 2025 |
| Conversation persistence (load/resume/delete) | v2.0.0 | May 2025 |
| Deep chat with streaming responses | v2.0.0 | May 2025 |
| 6 expert modes with XML card rendering | v2.0.0 | May 2025 |
| Custom domain (`api.stoicagentos.com`) | v2.0.0 | May 2025 |
| Self-hosting via Docker Compose | v2.1.0 | Jun 2026 |
| Multi-language READMEs (CN, JA, KR, ES, PT) | — | Jun 2026 |

---

## 🚧 In Progress

| Feature | Status | ETA |
|---|---|---|
| OpenTelemetry (OTEL) trace export | 🔨 Building | Q3 2026 |
| Langfuse integration adapter (`@stoic/langfuse`) | 🔨 Building | Q3 2026 |
| Public demo instance (stoicagentos.com/demo) | 📐 Designing | Q3 2026 |
| Agent evaluation framework (task completion, tool accuracy) | 📐 Designing | Q3 2026 |

---

## 📋 Planned

### Q3 2026

- [ ] **OTEL-native SDK** — Emit OpenTelemetry spans from every agent run. Compatible with Langfuse, Jaeger, Datadog, and any OTLP backend.
- [ ] **Langfuse adapter** — Drop-in `@stoic/langfuse` package to auto-instrument Stoic agents as Langfuse traces.
- [ ] **Agent evaluation framework** — Built-in evals for task completion rate, tool accuracy, reasoning quality, and cost efficiency.
- [ ] **Prompt management** — Version-controlled prompts with A/B testing and rollback.
- [ ] **Dataset benchmarks** — Create test sets from production traces for regression testing.

### Q4 2026

- [ ] **Agent Marketplace** — Discover, share, and install pre-built agent templates.
- [ ] **Webhooks & Alerts** — Slack, Discord, PagerDuty notifications on agent failures.
- [ ] **Multi-model support** — Extend AI insights beyond Claude to GPT-4o, Gemini, open-source models.
- [ ] **Team collaboration** — Comments, annotations, and shared views on agent traces.
- [ ] **Kubernetes Helm chart** — Production-grade K8s deployment with auto-scaling.

### 2027

- [ ] **Agent orchestration engine** — Define multi-agent workflows with DAG-based pipelines.
- [ ] **Real-time streaming dashboard** — WebSocket-powered live agent activity feed.
- [ ] **Compliance & audit trails** — SOC 2 Type II, GDPR data residency controls.
- [ ] **Terraform modules** — AWS, GCP, Azure infrastructure-as-code templates.
- [ ] **Mobile app** — Monitor your agent fleet from iOS/Android.

---

## 🗳️ Community Requests

The following features have been most requested by the community. Upvote them in [Discussions](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions/categories/ideas):

| Request | Votes | Status |
|---|---|---|
| OpenTelemetry support | 🔥🔥🔥 | In Progress |
| Webhook notifications | 🔥🔥 | Planned Q4 |
| Kubernetes Helm chart | 🔥🔥 | Planned Q4 |
| Agent-to-agent messaging | 🔥 | Evaluating |
| GraphQL API | 🔥 | Evaluating |

---

<p align="center">
  <strong>Want to influence what we build?</strong><br/>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions/categories/ideas">💡 Suggest a Feature</a> ·
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers">⭐ Star the Repo</a> ·
  <a href="./CONTRIBUTING.md">🤝 Contribute</a>
</p>
