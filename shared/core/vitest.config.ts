import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { logger } from './src/observability/logging';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/__tests__/',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/config': resolve(__dirname, './src/config'),
      '@/cache': resolve(__dirname, './src/cache'),
      '@/logging': resolve(__dirname, './src/logging'),
      '@/validation': resolve(__dirname, './src/validation'),
      '@/error-handling': resolve(__dirname, './src/error-handling'),
      '@/rate-limiting': resolve(__dirname, './src/rate-limiting'),
      '@/health': resolve(__dirname, './src/health'),
      '@/middleware': resolve(__dirname, './src/middleware'),
      '@/utils': resolve(__dirname, './src/utils'),
    },
  },
});






