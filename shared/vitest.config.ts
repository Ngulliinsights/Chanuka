import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '**/examples/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/examples/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '.'),
      '@server': path.resolve(__dirname, '../server'),
      '@client': path.resolve(__dirname, '../client/src')
    }
  }
});
