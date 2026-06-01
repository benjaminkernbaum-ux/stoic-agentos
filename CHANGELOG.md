# Changelog

All notable changes to Stoic AgentOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/benjaminkernbaum-ux/stoic-agentos/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/benjaminkernbaum-ux/stoic-agentos/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/benjaminkernbaum-ux/stoic-agentos/releases/tag/v1.0.0
