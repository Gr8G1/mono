module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'import', 'simple-import-sort'],
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  ignorePatterns: ['dist'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        paths: ['src'],
      },
    },
  },
  rules: {
    // Base Rules
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    'no-constant-condition': 'off',

    // Import Rules
    'import/no-named-as-default': 'off',
    'import/newline-after-import': ['error', { count: 1 }],
    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^react$', '^react-.*'],
          ['^@?\\w'],
          ['^@/app/apis$', '^@/app/apis/.*'],
          ['^@/app/hooks/.*'],
          ['^@/app/utils/.*'],
          ['^@/app/services/.*'],
          ['^@/app/components/.*'],
          ['^\\./', '^\\.\\./'],
        ],
      },
    ],

    // React Rules
    'react-hooks/exhaustive-deps': 'off',

    // TypeScript Rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
}
