# Changelog

All notable changes to Stoic AgentOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-07-15

### Added — Active Shield: server-side policy engine (Layers 1–3)

- **Layer 1 — schema policies.** Per-tool JSON Schema policies (`tool_policies`) evaluated server-side via `POST /compliance/shield/evaluate`, returning a graduated verdict: `ALLOW`, `BLOCK`, or `REQUIRE_APPROVAL`. `REQUIRE_APPROVAL` suspends into the existing HITL approval flow — same CAS state machine, same dashboard.
- **Layer 2 — predicate rules & budgets.** Sandboxed CEL expressions (`cel-js`, no eval/host access) evaluated against `{ args, agent_id, trace_id, budget_remaining }`. Fleet-wide spend budgets are enforced with an atomic `consume_budget` compare-and-swap RPC — the decision and the debit are one server-side operation, so concurrent calls can't overspend.
- **Layer 3 — semantic validators (parse, don't regex).** SQL args are parsed with the real PostgreSQL grammar (`pgsql-parser`) and checked against a statement-type + schema-qualified table allowlist, with a fixed denylist of dangerous built-in functions (`pg_read_file`, `dblink`, `lo_*`, `pg_sleep`, …) rejected regardless of the table allowlist. Shell args are parsed (`shell-quote`) and checked against a binary allowlist, rejecting substitution/chaining/redirection. URL args are parsed with the WHATWG URL API and checked against a domain/protocol allowlist. Validators now recurse into nested object/array schema properties, not just top-level args. A parse failure is always a rejection.
- **SDK wiring.** `os.compliance.evaluate()` plus policy/budget CRUD (`getPolicies`/`setPolicy`/`deletePolicy`/`getBudgets`/`setBudget`) on the JS SDK. Both OpenAI and Anthropic instrumentors consult the policy engine before tool execution, behind an opt-in `policyShield` flag (off by default; the existing `criticalTools` HITL flow is unchanged).
- **Fail-closed audit.** A `BLOCK` verdict that cannot be written to the immutable audit log now returns `503` rather than silently reporting success — a compliance decision that couldn't be recorded is not reported as decided.

### Added — HITL concurrency correctness

- **Compare-and-swap approval state machine.** Every `pending_approvals` status transition is a conditional `UPDATE … WHERE status = $from RETURNING`, so the classic TIMEOUT-vs-APPROVED race has a single database-enforced winner. Approvals are single-use: a new `CONSUMED` state prevents a retried poll from executing a tool twice.
- **Server-side timeout sweep**, matched to the SDK's client poll window, so an approval can't be approved by an admin after the agent has already given up and refused.
- **Circuit breaker** threshold unified across all endpoints and documented as an eventually-consistent observability tripwire (not a hard concurrency gate).

### Added — Episodic memory at scale

- `halfvec(384)` embedding column (halves HNSW index size with negligible recall loss at this dimensionality), iterative HNSW scans (`hnsw.iterative_scan = relaxed_order`, fixes under-return on selective `org_id` filters), reflection-driven memory consolidation, and vector-scaling instrumentation.

### Added — Self-hosting & CI

- **Self-host, honestly scoped.** A single, correct `docker-compose.yml` (API + dashboard against your own Supabase project) replaces a previous compose file that stood up a Postgres/Redis the app never used. New `SELF_HOSTING.md` walkthrough.
- **e2e tests actually run.** Live-API smoke suites, previously excluded from every CI run, now execute on a nightly schedule + manual dispatch (self-skip without staging secrets, so they never block a PR or hit production unprompted).
- **Migration hygiene.** All migrations reconciled into a single non-colliding sequence with a checked-in `api/migrations/APPLY_ORDER` manifest.

### Fixed

- Pricing page claims corrected to match shipped reality: SSO/SAML marked `(roadmap)` (no implementation existed), "self-hosted (coming soon)" → "self-hosting (open source)".
- Schema-qualified SQL tables (`other_schema.table`) no longer bypass a same-name table allowlist entry.
- An unvalidated `agent_id` is no longer interpolated into a PostgREST filter string; budget lookups fall back to the fleet-wide budget for non-UUID identifiers.

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
