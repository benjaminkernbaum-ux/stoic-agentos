# 📋 Good First Issue Drafts for Stoic AgentOS Community Launch

These issue templates are designed to attract first-time contributors. They provide clear descriptions, step-by-step guidance, and defined acceptance criteria to ensure successful community contributions.

---

## 🎨 Issue 1: Add a "Theme Toggle" (Dark/Light/System) to Dashboard Header

*   **Labels:** `good first issue` | `frontend` | `ui/ux`
*   **Difficulty:** Easy
*   **Component:** Frontend (`src/`)

### Description
Currently, Stoic AgentOS dashboard uses a stunning sleek dark mode by default. However, to make it accessible to all developers and fit different working environments, we want to add an explicit theme selector (supporting **Dark**, **Light**, and **System** preference) in the dashboard header.

### Steps to Implement
1.  Create a lightweight theme context or utility in `src/lib/theme.js` to manage the `'light' | 'dark'` class or CSS variables on the `<html>` or `<body>` element.
2.  Add a sleek toggle icon button in the header component (located in `src/components/Header.jsx` or similar dashboard header file) featuring animations when switching between sun and moon icons.
3.  Persist the user's preference in `localStorage`.
4.  Ensure that the main components (sidebar, main panels, tables) adjust colors cleanly by utilizing our global CSS variables inside `src/index.css`.

### Acceptance Criteria
*   [ ] Toggle icon is visible and aligned in the dashboard top header.
*   [ ] Clicking the toggle switches themes immediately without requiring a page reload.
*   [ ] Theme state is persistent across browser tabs and reloads via `localStorage`.
*   [ ] System preference is respected by default if no localStorage value exists.

---

## 🔌 Issue 2: Support Custom Tag Lists on SDK Observations (TS SDK)

*   **Labels:** `good first issue` | `typescript` | `sdk`
*   **Difficulty:** Easy
*   **Component:** TypeScript SDK (`sdk/`) & API (`api/`)

### Description
Currently, `os.capture()` in the TypeScript SDK supports standard properties like `type`, `title`, and `content`. We want to allow developers to tag observations with custom key-value pairs or string lists, e.g., `os.capture({ type: 'error', title: 'DB Timeout', tags: ['db', 'critical'] })`.

### Steps to Implement
1.  Modify the TS interface `CaptureOptions` in `sdk/src/types.ts` to include an optional `tags` field: `tags?: string[]`.
2.  Update `sdk/src/client.ts` to validate that tags are an array of strings (max 5 tags, max 20 chars per tag) and pass them in the payload to `/api/v1/observations`.
3.  In the Express API (`api/src/routes/observations.ts` or database model), ensure the `tags` column (which is an array of text in Postgres) is parsed and stored.
4.  Update the existing SDK unit tests under `sdk/tests/client.test.ts` to verify tags are handled correctly.

### Acceptance Criteria
*   [ ] TypeScript SDK accepts a string array of tags without typing errors.
*   [ ] Tags are validated (arrays only, limit size) and successfully stored in the database.
*   [ ] Unit tests pass successfully.

---

## 📈 Issue 3: Add "Export to CSV" Button on Observations Tab

*   **Labels:** `good first issue` | `frontend` | `usability`
*   **Difficulty:** Easy
*   **Component:** Frontend (`src/pages/dashboard/tabs/ObservationsTab.jsx`)

### Description
Observability is all about data analysis. Many developers want to export their captured agent runs and observations into external tools like Excel or Pandas. We need an "Export CSV" button on the Observations tab.

### Steps to Implement
1.  Open `src/pages/dashboard/tabs/ObservationsTab.jsx` (or the equivalent table component).
2.  Add an elegant secondary button with a download icon: "Export CSV".
3.  Write a utility function that maps the current list of loaded observations (from state/props) into a flat CSV format: `id, timestamp, agentName, type, title, status`.
4.  Implement client-side download using an `ObjectObjectURL` or raw data URI.

### Acceptance Criteria
*   [ ] "Export CSV" button fits beautifully in the action bar of the Observations tab.
*   [ ] Clicking the button downloads a file named `agentos-observations-[date].csv`.
*   [ ] CSV lists all columns correctly, handling commas and quotes in titles/content safely.

---

## 🐍 Issue 4: Add Simple Pytest Mock Tests for Python SDK

*   **Labels:** `good first issue` | `python` | `testing`
*   **Difficulty:** Medium
*   **Component:** Python SDK (`sdk-python/`)

### Description
Our Python SDK needs better test coverage. We want to add a basic test suite utilizing `pytest` and `responses` (or `unittest.mock`) to verify that the Python `AgentOS` client correctly initializes, wraps agents, and handles API errors.

### Steps to Implement
1.  Under `sdk-python/tests`, create a mock test file `test_client.py`.
2.  Implement unit tests that mock the HTTP requests to `/api/v1/observations` and `/api/v1/agents/heartbeat`.
3.  Verify that `os.capture()` formats the payloads correctly and handles HTTP timeout exceptions gracefully without crashing the host agent.
4.  Verify the Python `@wrap_agent` decorator works and tracks start/stop times.

### Acceptance Criteria
*   [ ] Running `pytest` in `sdk-python/` executes the mock tests and passes.
*   [ ] No real network calls are made during unit test execution.
*   [ ] Test coverage for the core client rises above 70%.

---

## 💾 Issue 5: Add a CLI Setup Script (`npm run setup`) for Dev Environments

*   **Labels:** `good first issue` | `dx` | `chore`
*   **Difficulty:** Easy
*   **Component:** Tooling (`scripts/` / Root)

### Description
Setting up the local environment currently requires manually copying `.env.example` to `.env` in two separate directories and configuring Supabase/Stripe variables. We can make the developer onboarding experience magical by adding an interactive setup CLI.

### Steps to Implement
1.  Create a Node script `scripts/setup-env.js` utilizing a lightweight library or raw `readline` to prompt the developer.
2.  The script should ask for:
    *   Supabase URL & Anon Key
    *   Stripe Webhook Secret (optional)
    *   Anthropic API Key (optional)
3.  Automatically copy `.env.example` to `.env` and `api/.env.example` to `api/.env` and replace the placeholder values.
4.  Add a `setup` script in the root `package.json` pointing to this file.

### Acceptance Criteria
*   [ ] Running `npm run setup` triggers the interactive shell prompts.
*   [ ] Correctly writes `.env` files with the entered credentials.
*   [ ] Skips writing/overwriting if `.env` files already exist (prompt to overwrite).
