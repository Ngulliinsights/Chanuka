import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    name: 'Integration Tests',
    root: process.cwd(),
    include: [
      'server/**/__tests__/integration*.ts',
      'server/**/integration*.{spec,test}.ts',
      'shared/**/__tests__/integration*.ts',
      'shared/**/integration*.{spec,test}.ts'
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
      reportsDirectory: 'coverage/integration'
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