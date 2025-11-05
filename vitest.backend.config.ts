import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    name: 'Backend & Database Tests',
    root: process.cwd(),
    include: [
      'server/**/__tests__/**/*.ts',
      'server/**/*.{spec,test}.ts',
      'shared/**/__tests__/**/*.ts',
      'shared/**/*.{spec,test}.ts'
    ],
    exclude: [
      'node_modules/**',
      'client/**',
      'dist/**'
    ],
    coverage: {
      include: [
        'server/**/*.ts',
        'shared/**/*.ts'
      ],
      exclude: [
        'server/**/*.d.ts',
        'shared/**/*.d.ts',
        'server/tests/**',
        'server/index.ts'
      ],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage/backend'
    },
    setupFiles: ['server/tests/setup.ts'],
    globals: true,
    testTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  esbuild: {
    target: 'node18'
  }
});