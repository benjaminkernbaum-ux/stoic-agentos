import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/tests/e2e/**',
      '**/src/__tests__/api-smoke*',
    ],
  },
});
