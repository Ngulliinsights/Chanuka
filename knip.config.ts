import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  project: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,js}'],

  // Ignore patterns for type definitions and global configs
  ignore: [
    'src/**/*.d.ts',
    '@types/**/*.d.ts',
    'dist/**',
    'build/**',
    'coverage/**',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],

  // Entry points for each package/workspace
  entry: [
    'client/src/main.tsx',
    'client/src/index.ts',
    'server/index.ts',
    'shared/index.ts',
  ],

  // Exclude common library exports that are meant to be re-exported
  exclude: [
    'default',
    '__esModule',
  ],

  // Workspace configuration for monorepo structure
  workspaces: {
    client: {
      project: ['src/**/*.{ts,tsx}'],
      entry: ['src/main.tsx'],
      ignore: ['**/__tests__/**', '**/*.test.tsx', '**/*.spec.tsx'],
    },
    server: {
      project: ['**/*.{ts,js}'],
      entry: ['index.ts'],
    },
    shared: {
      project: ['**/*.{ts,tsx}'],
      entry: ['index.ts'],
    },
  },

  // Report configuration
  reporter: 'default',

  // Advanced options
  strict: false,
  ignoreExportsUsedInFile: true,
};

export default config;
