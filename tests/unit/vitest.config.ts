import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    testTimeout: 30000, // Unit tests should complete quickly (30 seconds)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
      '@shared': path.resolve(__dirname, '../../shared'),
      'shared': path.resolve(__dirname, '../../shared'),
      'client': path.resolve(__dirname, '../../client'),
      'server': path.resolve(__dirname, '../../server'),
    },
  },
});
