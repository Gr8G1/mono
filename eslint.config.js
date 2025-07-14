const js = require('@eslint/js')
const path = require('path')
const globals = require('globals')
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const simpleImportSort = require('eslint-plugin-simple-import-sort')

function tsLangOptions(project) {
  return {
    parser: tsParser,
    parserOptions: {
      project: [path.resolve(__dirname, project)],
      sourceType: 'module',
    },
  }
}

const tsCommonPlugins = {
  '@typescript-eslint': tsPlugin,
  'simple-import-sort': simpleImportSort,
}

const tsCommonRules = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unused-vars': 'warn',
  'simple-import-sort/exports': 'warn',
  'simple-import-sort/imports': [
    'warn',
    {
      groups: [
        ['^react$', '^react-.*'],
        ['^@?\\w'],
        ['^@/'],
        ['^\\./', '^\\.\\./'],
        ['^.*\\.(css|scss|sass|less)$'],
        ['^.*\\.(svg|png|jpg|jpeg|gif|webp|ico)(\\?.*)?$'],
        ['^.*\\.(json|yaml|yml)$'],
        ['^.*\\.(md|markdown)$'],
      ],
    },
  ],
}

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.min.js',
      'coverage/',
      '.turbo/',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'prefer-const': 'error',
      'comma-dangle': 'off',
      'no-unused-vars': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-var': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-constant-condition': 'off',
      'no-undef': 'off',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
    },
  },
  {
    files: ['apps/app/**/*.{ts,tsx}'],
    languageOptions: tsLangOptions('tsconfig.app.json'),
    plugins: tsCommonPlugins,
    rules: tsCommonRules,
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: tsLangOptions('tsconfig.web.json'),
    plugins: tsCommonPlugins,
    rules: tsCommonRules,
  },
  {
    files: ['packages/**/*.{ts,tsx}'],
    languageOptions: tsLangOptions('tsconfig.lib.json'),
    plugins: tsCommonPlugins,
    rules: tsCommonRules,
  },
]
