import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import solid from 'eslint-plugin-solid/configs/recommended'
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
  solid,
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
