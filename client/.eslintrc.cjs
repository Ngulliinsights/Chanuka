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
    'import/no-unresolved': ['error', {
      ignore: [
        // Ignore known problematic patterns
        '^@/',
        '^@client/',
        '^lucide-react$',
        '^react$',
        '^react-dom$',
        '^react-router-dom$',
      ]
    }],
  },
  overrides: [
    {
      files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
      rules: {
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
      },
    },
  ],
};
