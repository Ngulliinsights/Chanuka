import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    css: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@chanuka/shared': resolve(__dirname, '../shared'),
    },
  },
});