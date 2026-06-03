import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore directories
  globalIgnores([
    'dist',
    'api/dist',
    'sdk/dist',
    'node_modules',
    '**/*.ts',
    '**/*.d.ts'
  ]),
  
  // 1. Browser/React files (Frontend JS/JSX)
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-refresh/only-export-components': 'off',
      'no-empty': 'off',
      'no-undef': 'error',
    }
  },

  // 2. Node.js Tooling & JavaScript Backend files (SDK, MCP, scripts, configurations)
  {
    files: [
      'sdk/**/*.js',
      'mcp-server/**/*.js',
      'scripts/**/*.js',
      '*.config.js',
      '*.mjs',
    ],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest, // For any test globals if present
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-undef': 'error',
    }
  }
])
