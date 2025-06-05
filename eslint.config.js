import js from '@eslint/js'
import globals from 'globals'
import solid from 'eslint-plugin-solid/configs/recommended'
import stylistic from '@stylistic/eslint-plugin'

export default [
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/quotes': ['warn', 'single'],
    }
  },
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
    },
  },
  {
    ignores: [
      'ext/*',
      'test/bundle/*',
      'safari/*',
    ],
  },
]
