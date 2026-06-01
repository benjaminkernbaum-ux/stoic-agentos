# Contributing to Stoic AgentOS

First off, **thank you** for considering a contribution to Stoic AgentOS! 🎉 Whether it's a bug fix, a new feature, improved documentation, or a typo correction — every contribution makes the platform better for everyone building AI agent fleets.

This document explains how to get started, what we expect from contributions, and how the review process works.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Development Setup](#development-setup)
  - [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
  - [Running the App](#running-the-app)
  - [Running Tests](#running-tests)
  - [Running Linting](#running-linting)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Requesting Features](#requesting-features)
  - [Finding Good First Issues](#finding-good-first-issues)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Standards](#coding-standards)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [Commit Message Conventions](#commit-message-conventions)
- [Code Review Process](#code-review-process)
- [License](#license)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior via [GitHub Issues](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues) or by emailing **benjamin@stoicagentos.com**.

---

## Getting Started

### Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| [Node.js](https://nodejs.org/) | 18.x | Runtime for API, SDK, and frontend |
| [npm](https://www.npmjs.com/) | 9.x | Package management |
| [Python](https://www.python.org/) | 3.9+ | Python SDK development (optional) |
| [Git](https://git-scm.com/) | 2.x | Version control |

### Development Setup

1. **Fork the repository** on GitHub by clicking the "Fork" button at [github.com/benjaminkernbaum-ux/stoic-agentos](https://github.com/benjaminkernbaum-ux/stoic-agentos).

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/<your-username>/stoic-agentos.git
   cd stoic-agentos
   ```

3. **Add the upstream remote** (to stay in sync):

   ```bash
   git remote add upstream https://github.com/benjaminkernbaum-ux/stoic-agentos.git
   ```

4. **Install dependencies** for each workspace:

   ```bash
   # Frontend (React + Vite)
   npm install

   # API (Express.js + TypeScript)
   cd api && npm install && cd ..

   # TypeScript SDK
   cd sdk && npm install && cd ..

   # Python SDK (optional)
   cd sdk-python && pip install -e ".[dev]" && cd ..
   ```

5. **Set up environment variables.** Copy the example `.env` files in each workspace and fill in the required values:

   ```bash
   cp .env.example .env
   cd api && cp .env.example .env && cd ..
   ```

   > **Note:** You will need a [Supabase](https://supabase.com/) project for local development. See the `supabase/` directory for migration files.

### Project Structure

```
stoic-agentos/
├── api/                  # Express.js + TypeScript API (deployed on Railway)
│   ├── src/              # API source code
│   ├── tests/            # API test suite
│   └── package.json
├── sdk/                  # TypeScript SDK (published to npm as stoic-agentos-sdk)
│   ├── src/              # SDK source code
│   ├── tests/            # SDK test suite
│   └── package.json
├── sdk-python/           # Python SDK (published to PyPI)
│   ├── stoic_agentos/    # Python package source
│   └── tests/            # Python SDK tests
├── src/                  # React + Vite frontend (deployed on Vercel)
│   ├── components/       # React components
│   ├── pages/            # Page-level components
│   └── lib/              # Shared utilities
├── mcp-server/           # MCP server implementation
├── supabase/             # Supabase config & SQL migrations
│   └── migrations/       # Postgres migration files
├── .github/              # GitHub Actions CI, issue templates, PR template
├── CONTRIBUTING.md       # ← You are here
├── CHANGELOG.md          # Version history
├── CODE_OF_CONDUCT.md    # Community standards
├── SECURITY.md           # Security policy
└── package.json          # Root package.json (frontend)
```

---

## Development Workflow

### Running the App

```bash
# Start the frontend dev server (React + Vite)
npm run dev

# Start the API dev server (in a separate terminal)
cd api && npm run dev
```

The frontend runs at `http://localhost:5173` by default, and the API runs at `http://localhost:3001`.

### Running Tests

```bash
# API tests
cd api && npm test

# TypeScript SDK tests
cd sdk && npm test

# Python SDK tests (optional)
cd sdk-python && pytest
```

Our CI pipeline runs tests across **Node.js 18, 20, and 22** — make sure your changes work on all supported versions.

### Running Linting

```bash
# Lint the entire project
npm run lint

# Auto-fix lint issues
npm run lint -- --fix
```

We use **ESLint** for code quality. All code must pass linting before it can be merged.

---

## How to Contribute

### Reporting Bugs

Found a bug? Please [open a bug report](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues/new?template=bug_report.yml) using our issue template. The more detail you include, the faster we can reproduce and fix it.

Good bug reports include:

- A clear, descriptive title prefixed with `[Bug]`
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (OS, Node.js version, SDK version)
- Screenshots or log output (if applicable)

### Requesting Features

Have an idea? [Open a feature request](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues/new?template=feature_request.yml) and describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Finding Good First Issues

New to the project? Look for issues labeled [**`good first issue`**](https://github.com/benjaminkernbaum-ux/stoic-agentos/labels/good%20first%20issue). These are smaller, well-scoped tasks that are great for getting familiar with the codebase.

Also check out issues labeled [**`help wanted`**](https://github.com/benjaminkernbaum-ux/stoic-agentos/labels/help%20wanted) for tasks where we'd especially appreciate community contributions.

### Submitting a Pull Request

1. **Fork** the repository (if you haven't already).

2. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes.** Write clean, well-documented code.

4. **Run tests and linting** to make sure everything passes:

   ```bash
   npm run lint
   cd api && npm test && cd ..
   cd sdk && npm test && cd ..
   ```

5. **Commit your changes** using our [commit message conventions](#commit-message-conventions):

   ```bash
   git commit -m "feat: add agent heartbeat endpoint"
   ```

6. **Push your branch** to your fork:

   ```bash
   git push origin feat/your-feature-name
   ```

7. **Open a Pull Request** against `main` on the upstream repository. Fill out the [PR template](.github/pull_request_template.md) completely.

> **Tip:** Keep PRs focused. One feature or fix per PR makes review faster and cleaner.

---

## Coding Standards

### TypeScript Guidelines

- **Language:** TypeScript is required for all API, SDK, and frontend code.
- **Linting:** We use [ESLint](https://eslint.org/) with a shared config. Run `npm run lint` before committing.
- **Formatting:** We use [Prettier](https://prettier.io/) for consistent code formatting. Make sure your editor has Prettier integration enabled.
- **Type safety:** Avoid `any` types. Use explicit types and interfaces wherever possible.
- **Naming conventions:**
  - `camelCase` for variables and functions
  - `PascalCase` for types, interfaces, and React components
  - `SCREAMING_SNAKE_CASE` for constants
- **File naming:** Use `kebab-case.ts` for source files, `PascalCase.tsx` for React components.
- **Exports:** Prefer named exports over default exports.

### Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code restructuring without changing behavior |
| `test` | Adding or updating tests |
| `chore` | Build process, CI, or tooling changes |
| `perf` | Performance improvements |

**Examples:**

```
feat(api): add agent heartbeat endpoint
fix(sdk): resolve token refresh race condition
docs: update CONTRIBUTING.md with Python SDK setup
chore(ci): add Node 22 to test matrix
```

---

## Code Review Process

1. **All PRs require at least one approving review** before merging.
2. Maintainers will review your PR for:
   - **Correctness** — Does it work as intended?
   - **Code quality** — Does it follow our coding standards?
   - **Test coverage** — Are new features and fixes covered by tests?
   - **Security** — Does it introduce any vulnerabilities?
   - **Performance** — Are there any performance concerns?
3. Reviewers may request changes — please address feedback promptly.
4. Once approved and CI passes, a maintainer will merge your PR.
5. We typically merge using **squash and merge** to keep the commit history clean.

> **Response time:** We aim to review all PRs within **72 hours**. If you haven't heard back, feel free to leave a comment.

---

## License

By contributing to Stoic AgentOS, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

**Thanks again for contributing! 🚀** If you have any questions, feel free to open a [Discussion](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions) or reach out.
