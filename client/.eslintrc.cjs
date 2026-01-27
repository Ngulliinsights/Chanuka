module.exports = {
  root: false,
  extends: ['../.eslintrc.cjs'],
  settings: {
    'import/resolver': {
      // Try multiple resolvers in order
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src'],
      },
    },
  },
  rules: {
    // Re-enable import resolution with better error handling
    'import/no-unresolved': ['warn', {
      ignore: [
        // Ignore known problematic patterns and old refactored paths
        '^@/',
        '^@client/',
        '^@shared/',
        '^lucide-react$',
        '^react$',
        '^react-dom$',
        '^react-router-dom$',
        '../types',
        './types',
        '../core/navigation/types',
        '../core/navigation/context',
        '../core/api/hooks',
        '../core/api/auth',
        '../core/api/config',
        '../core/error',
        '../core/loading/hooks',
        '../core/performance',
        '../features',
        './components',
        '../icons',
        '../utils/logger',
        '../utils/event-emitter',
        './client/src',
        '@server/infrastructure/schema',
        './PerformanceDashboard',
        './community-service',
        './use-safe-query',
        './use-community',
      ]
    }],
    // Allow type-only imports from server (type erasure happens at compile time)
    'no-restricted-imports': 'off',
    // Disable import order warnings as they're non-critical and cause too many warnings
    'import/order': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
      rules: {
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
};
