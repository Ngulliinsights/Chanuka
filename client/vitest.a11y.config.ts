import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'accessibility',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup/a11y-setup.ts'],
    include: ['**/*.a11y.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
