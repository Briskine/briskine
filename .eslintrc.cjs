module.exports = {
  rules: {
    'no-console': 'error',
  },
  env: {
    browser: true,
    es2021: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module'
  },
  ignorePatterns: [
    'ext/',
    'test/bundle/',
  ],
}
