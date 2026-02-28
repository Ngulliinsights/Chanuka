import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.property.test.ts'],
    testTimeout: 120000, // Property tests may take longer (2 minutes)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
      '@shared': path.resolve(__dirname, '../../shared'),
      'shared': path.resolve(__dirname, '../../shared'),
      'client': path.resolve(__dirname, '../../client'),
      '@client': path.resolve(__dirname, '../../client/src'),
      'server': path.resolve(__dirname, '../../server'),
      '@server': path.resolve(__dirname, '../../server'),
    },
  },
});
