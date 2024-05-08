import js from '@eslint/js'
import globals from 'globals'

export default [
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
    },
  },
]
