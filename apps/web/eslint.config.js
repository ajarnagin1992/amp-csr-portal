import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Project convention: no explicit `null` values; use `undefined`.
      // Allowed: comparisons (`x === null`) and `Object.create(null)`.
      // Mirrors `unicorn/no-null` in the API's Oxlint config.
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Literal[raw='null']:not(BinaryExpression > Literal):not(CallExpression[callee.object.name='Object'][callee.property.name='create'] > Literal)",
          message: 'Avoid null; use undefined (x === null checks are allowed).',
        },
      ],
    },
  },
])
