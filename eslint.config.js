import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/quotes': ['warn', 'single'],
    }
  },
  tseslint.configs.recommended,
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.browser,
      }
    },
    rules: {
      'no-console': 'error',
      'curly': 'error',
      '@typescript-eslint/no-array-constructor': 'off',
    },
  },
  {
    ignores: [
      'ext/*',
      'test/bundle/*',
      'safari/*',
    ],
  },
)
