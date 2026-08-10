# Changelog

All notable changes to Stoic AgentOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Declarative Shield policies (server-side)** — New `shield_policies` table (migration 020) + CRUD API. Orgs declare glob rules (`stripe_*`, `*_delete`) mapping tool names to `ALLOW` / `REQUIRE_APPROVAL` / `BLOCK`, with per-policy approval timeouts. Enforcement no longer depends on client-side `criticalTools` config.
- **`POST /compliance/shield/evaluate`** — Single server-side verdict endpoint: checks the agent's circuit breaker (blocks when open), evaluates policies by priority, creates the HITL approval when required, and writes the audit trail (`PROCEED`/`ESCALATE`/`BLOCK`).
- **Governance report** — `GET /compliance/report?from&to`: actions taken, approvals requested/approved/rejected/timed-out, median resolution time, per-agent breakdown, active policies. Rendered in the Compliance tab with JSON download — the client-facing monthly artifact.
- **SDK guard API (JS)** — `compliance.evaluate()`, `waitForApproval()`, `guard()` (evaluate → await approval → CAS-consume), `protectTool()` wrapper, policy CRUD, `report()`. New `AgentOSApprovalRejectedError` / `AgentOSApprovalTimeoutError`.
- **Policy-driven instrumentors** — With `activeShield` on, every `tool_use`/`tool_call` is checked against server policies (not just `criticalTools`, which remains as a client-side force-escalation override). Shared enforcement path replaces the duplicated polling loops.
- **Python SDK Shield parity** — `suspend`, `check_approval_status`, `resolve_approval`, `consume_approval`, `evaluate`, `wait_for_approval`, `guard`, `protect_tool`, policy CRUD, `report`, plus `PolicyBlockedError` / `ApprovalRejectedError` / `ApprovalTimeoutError`.
- **Shield Policies UI** — Compliance tab now manages policies (create/toggle/delete) and shows per-policy timeouts.

### Fixed

- **HITL race conditions** — Approval resolution uses atomic compare-and-swap (migration 019 RPC) with a guarded-UPDATE fallback when the migration hasn't run; concurrent resolves return `409` instead of silently overwriting, and the dashboard explains the conflict. Approved tickets are claimed (`CONSUMED`) before execution to prevent double-runs.
- **Per-policy timeouts server-side** — `pending_approvals.timeout_at` is set from the matching policy; the sweep and the status endpoint (lazy expiry) honor it, with the legacy 5-minute window as fallback. SDK poll windows derive from the server's `timeout_at`, so both clocks share one source.
- Circuit-breaker threshold unified in `lib/shieldPolicy.ts` (single constant shared by all endpoints).

## [2.1.0] - 2026-06-08

### Added

- **Zustand state management** — Migrated dashboard from monolithic prop-drilling to a lightweight Zustand store with atomic selectors.
- **React Query integration** — All API calls now use TanStack React Query with automatic caching, background polling, and optimistic mutations.
- **Lazy code-splitting** — All 17 dashboard tabs are now loaded on-demand via `React.lazy` + `Suspense`, reducing initial bundle size by ~40%.
- **Claude model upgrade** — Migrated from deprecated Claude 3.x models to Sonnet 4.6 (deep analysis) and Haiku 4.5 (fast summaries).
- **Turnstile server-side verification** — Added server-side CAPTCHA validation and AI-specific rate limiting.

### Changed

- Removed floating AI Chat Assistant widget from the dashboard layout.
- Fixed template literal escape in IntegrationGuides code examples.
- Fixed AnimatedCounter to re-animate when data finishes loading asynchronously.
- Fixed `output_config` parameter placement for Anthropic API compatibility.

### Performance

- Dashboard initial load reduced from ~300KB single chunk to ~80KB with lazy-loaded tab modules.
- API response caching via React Query eliminates redundant network requests.

## [2.0.0] - 2025-05-30

### Added

- **Security hardening & Turnstile CAPTCHA** — Added Cloudflare Turnstile CAPTCHA to authentication flows; strengthened input validation and rate limiting across all API endpoints.
- **Landing page CRO architecture** — Redesigned landing page with conversion-rate-optimized layout, credibility signals, social proof sections, and SEO improvements.
- **WorkspacesTab & GraphTab production upgrade** — Shipped production-ready multi-workspace management and interactive agent graph visualization in the dashboard.
- **API smoke test suite & self-monitoring** — Introduced automated API smoke tests in CI and a self-monitoring infrastructure for continuous health checks.
- **Self-monitoring status page (`/api/v1/status`)** — Added a public status endpoint returning real-time API health, uptime, and dependency status.
- **Conversation history (load, resume, delete)** — Full conversation persistence: users can load previous conversations, resume them, and delete history.
- **Deep chat upgrade (streaming & persistence)** — Upgraded the chat interface with real-time streaming responses and persistent conversation storage.
- **6 expert modes with XML card rendering** — Added six specialized expert modes (Architect, Debugger, Optimizer, Security Auditor, Data Analyst, Generalist) with structured XML-based card rendering in chat.
- **Rich demo data seeder** — Created a comprehensive seeder script that populates workspaces with realistic demo agents, telemetry, and knowledge entries for onboarding and testing.
- **Telemetry simulation & Python SDK improvements** — Enhanced telemetry simulation for demo environments; improved Python SDK with better error handling, type hints, and async support.
- **Landing page overhaul (credibility, conversion, SEO)** — Complete landing page redesign focused on trust signals, conversion optimization, and search engine visibility.
- **Custom domain migration (`api.stoicagentos.com`)** — Migrated the production API from Railway auto-generated URLs to the custom domain `api.stoicagentos.com` with SSL.

### Changed

- Upgraded all dependencies to latest compatible versions.
- Migrated CI test matrix to include Node.js 18, 20, and 22.

### Security

- SHA-256 hashed API keys (plaintext keys are never stored).
- Row-Level Security (RLS) enforced on all Supabase tables.
- HMAC webhook signature verification.
- CORS lockdown to allowed origins only.
- Supabase Vault encryption for BYOK (Bring Your Own Key) API keys.
- Cloudflare Turnstile CAPTCHA on authentication forms.

---

## [1.0.0] - 2025-03-15

### Added

- Initial public release of Stoic AgentOS.
- React + Vite dashboard with agent monitoring.
- Express.js + TypeScript API deployed on Railway.
- Supabase (Postgres + RLS) backend.
- TypeScript SDK published to npm (`stoic-agentos-sdk`).
- Python SDK published to PyPI.
- Stripe billing integration.
- Claude-powered AI insights.
- BYOK (Bring Your Own Key) support.
- Knowledge persistence for agent memory.
- GitHub Actions CI pipeline (lint, test, build, Lighthouse).

[Unreleased]: https://github.com/benjaminkernbaum-ux/stoic-agentos/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/benjaminkernbaum-ux/stoic-agentos/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/benjaminkernbaum-ux/stoic-agentos/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/benjaminkernbaum-ux/stoic-agentos/releases/tag/v1.0.0
