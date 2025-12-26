module.exports = {
  extends: ['../.eslintrc.cjs'],
  plugins: ['simple-import-sort'],
  env: {
    node: true,
    es2022: true,
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'import/no-unresolved': 'error',
    'import/order': 'off',
    'simple-import-sort/imports': 'error',
  },
};