module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json', './client/tsconfig.json', './server/tsconfig.json', './shared/tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'import'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './client/tsconfig.json', './server/tsconfig.json', './shared/tsconfig.json'],
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/no-unresolved': 'error',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
  overrides: [
    {
      files: ['client/**/*'],
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      plugins: ['react', 'react-hooks', 'import'],
      settings: {
        react: {
          version: 'detect',
        },
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './client/tsconfig.json',
          },
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // Not needed with React 17+
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        'import/no-unresolved': 'error',
      },
    },
    {
      files: ['server/**/*'],
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './server/tsconfig.json',
          },
        },
      },
    },
    {
      files: ['shared/**/*'],
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './shared/tsconfig.json',
          },
        },
      },
    },
  ],
};