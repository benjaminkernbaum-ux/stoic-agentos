# Security Policy

The Stoic AgentOS team takes security seriously. We appreciate your help in responsibly disclosing vulnerabilities so we can keep our users and their AI agent fleets safe.

---

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 2.x     | :white_check_mark: Currently supported |
| 1.x     | :x: End of life — please upgrade to 2.x |
| < 1.0   | :x: Not supported  |

Only the latest minor release within a supported major version receives security patches.

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, use one of the following channels:

### Option 1: Email (Preferred)

Send an email to **[security@stoicagentos.com](mailto:security@stoicagentos.com)** with:

- A description of the vulnerability
- Steps to reproduce or a proof of concept
- The potential impact
- Any suggested fixes (optional but appreciated)

### Option 2: GitHub Security Advisories

You can also report vulnerabilities privately through [GitHub Security Advisories](https://github.com/benjaminkernbaum-ux/stoic-agentos/security/advisories/new).

### What to Expect

| Timeline | Action |
|----------|--------|
| **48 hours** | Acknowledgment of your report |
| **7 days** | Initial assessment and severity classification |
| **30 days** | Target resolution for critical/high severity issues |
| **90 days** | Target resolution for medium/low severity issues |

We will keep you informed of our progress throughout the process. If you haven't received a response within 48 hours, please follow up.

---

## What Counts as a Security Issue

Please report the following types of issues:

- **Authentication / authorization bypass** — Accessing resources without proper credentials or permissions
- **Data exposure** — Unauthorized access to user data, API keys, or agent telemetry
- **Injection vulnerabilities** — SQL injection, XSS, command injection, etc.
- **Cryptographic weaknesses** — Weak hashing, broken encryption, key exposure
- **API key leakage** — Exposure of API keys in logs, responses, or client-side code
- **Row-Level Security bypass** — Circumventing Supabase RLS policies to access other users' data
- **Privilege escalation** — Gaining elevated permissions beyond what is authorized
- **Webhook signature bypass** — Forging or bypassing HMAC webhook signature verification
- **Dependency vulnerabilities** — Critical CVEs in project dependencies

---

## Out of Scope

The following are **not** considered security vulnerabilities for the purposes of this policy:

- **Social engineering** attacks (phishing, pretexting, etc.)
- **Denial of Service (DoS / DDoS)** attacks
- **Spam or abuse** of public-facing forms
- **Issues in third-party services** (Supabase, Stripe, Vercel, Railway) — please report these directly to those providers
- **Clickjacking** on pages with no sensitive actions
- **Missing security headers** that do not lead to a demonstrable exploit
- **Reports from automated scanners** without a demonstrated impact

---

## Current Security Measures

Stoic AgentOS employs the following security measures:

| Measure | Description |
|---------|-------------|
| **SHA-256 Hashed API Keys** | API keys are hashed with SHA-256 before storage. Plaintext keys are never persisted. |
| **Row-Level Security (RLS)** | All Supabase tables enforce RLS policies ensuring users can only access their own data. |
| **HMAC Webhook Signatures** | Incoming webhooks (e.g., Stripe) are verified using HMAC signatures to prevent forgery. |
| **CORS Lockdown** | Cross-Origin Resource Sharing is restricted to explicitly allowed origins only. |
| **Supabase Vault Encryption** | BYOK (Bring Your Own Key) API keys are encrypted at rest using Supabase Vault. |
| **Turnstile CAPTCHA** | Cloudflare Turnstile CAPTCHA protects authentication forms from automated abuse. |
| **SQL Migration Validation** | CI pipeline validates all Supabase SQL migrations before deployment. |

---

## Disclosure Policy

- We follow a **coordinated disclosure** model.
- We will work with you to understand and resolve the issue before any public disclosure.
- We will credit reporters in our security advisories (unless you prefer to remain anonymous).
- We ask that you give us reasonable time to address the vulnerability before disclosing it publicly.

---

## Recognition

We value the security research community. While we do not currently offer a paid bug bounty program, we are happy to:

- Credit you in our [CHANGELOG](./CHANGELOG.md) and security advisories
- Add you to a future Security Hall of Fame
- Provide a reference letter upon request

---

Thank you for helping keep Stoic AgentOS and its users secure. :shield:
