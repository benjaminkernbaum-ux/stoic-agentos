import { defineConfig } from 'vitest/config';

// Separate config for E2E tests. The default vitest.config.ts excludes
// tests/e2e/**; this one targets ONLY those. They hit a live API and
// self-skip (describe.skip) unless AGENTOS_E2E_API_KEY is set, so running
// this with no secret is a green no-op — safe in CI before staging creds exist.
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/e2e/**/*.e2e.test.js'],
    testTimeout: 30000,
    hookTimeout: 20000,
  },
});
