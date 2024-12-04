import js from '@eslint/js'
import globals from 'globals'
import solid from 'eslint-plugin-solid/configs/recommended'

export default [
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
