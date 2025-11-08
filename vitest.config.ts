import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@chanuka/shared': resolve(__dirname, './shared'),
      '@chanuka/client': resolve(__dirname, './client/src'),
      '@chanuka/server': resolve(__dirname, './server'),
    },
  },
});