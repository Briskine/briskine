import js from '@eslint/js'
import globals from 'globals'
import solid from 'eslint-plugin-solid/configs/recommended.js'

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
]
