module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // 공통 규칙들
    'prefer-const': 'error',
    'comma-dangle': ['error', 'never'],
    'no-unused-vars': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-var': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-constant-condition': 'off',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
  },
}
