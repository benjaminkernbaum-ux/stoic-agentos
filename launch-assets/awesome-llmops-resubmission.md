# Awesome-LLMOps Resubmission — Stoic AgentOS

> **Target section:** Observability
> **Category fit:** Alongside Langfuse / Helicone / Phoenix

## PR Title

`Add Stoic AgentOS under Observability`

## PR Body

Adding **[Stoic AgentOS](https://github.com/benjaminkernbaum-ux/stoic-agentos)** — open-source observability & memory for AI agent fleets.

### Why it fits the Observability section

- **LLM tracing**: Auto-captures agent executions with inputs, outputs, latency, token counts, and error traces via a 3-line SDK.
- **Real-time monitoring**: Dashboard shows live agent status, heartbeats, error rates, and fleet-wide analytics.
- **OpenTelemetry-native**: OTLP span export compatible with Jaeger, Datadog, Grafana (shipping Q3 2026).
- **Langfuse adapter**: Drop-in `@stoic/langfuse` package for bi-directional trace interop (shipping Q3 2026).

### What makes it unique vs. existing entries

| | Stoic AgentOS | Langfuse | Helicone | Phoenix |
|---|---|---|---|---|
| Agent observability | ✅ | ✅ | ✅ | ✅ |
| Knowledge persistence | ✅ | ❌ | ❌ | ❌ |
| AI-powered diagnostics | ✅ (Claude) | ❌ | ❌ | ❌ |
| Self-hostable | ✅ Docker | ✅ | ❌ | ✅ |
| License | MIT | MIT | Proprietary | Apache-2.0 |

### Maturity signals

- **Tagged releases**: v1.0.0 (Mar 2025), v2.0.0 (May 2025), v2.1.0 (Jun 2026)
- **Active development**: 50+ commits in the last 60 days
- **CI/CD**: GitHub Actions (lint, test, build, Lighthouse audits)
- **SDKs**: [npm](https://www.npmjs.com/package/stoic-agentos-sdk) (TypeScript) + [PyPI](https://pypi.org/project/stoic-agentos-sdk/) (Python)
- **Documentation**: Comprehensive README, CONTRIBUTING.md, CHANGELOG.md, ROADMAP.md, SECURITY.md
- **Community**: GitHub Discussions, issue templates, PR template, Code of Conduct
- **Self-hosting**: Docker Compose with 3-command setup
- **Production deployment**: Live at [stoicagentos.com](https://stoicagentos.com)

### Links

- 🏠 **Live**: https://stoicagentos.com
- 📦 **Repo**: https://github.com/benjaminkernbaum-ux/stoic-agentos
- 📦 **npm SDK**: https://www.npmjs.com/package/stoic-agentos-sdk
- 🐍 **PyPI SDK**: https://pypi.org/project/stoic-agentos-sdk/
- 📖 **Docs**: https://stoicagentos.com/docs
- 🗺️ **Roadmap**: https://github.com/benjaminkernbaum-ux/stoic-agentos/blob/master/ROADMAP.md

---

*Previously submitted and closed with feedback to return when maturity signals are stronger. Since then: tagged 3 semver releases, added Zustand/React Query architecture, expanded comparison docs, and increased open-source community infrastructure.*
