import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@chanuka/shared': resolve(__dirname, '../shared'),
      '@server': resolve(__dirname, '.'),
    },
  },
});