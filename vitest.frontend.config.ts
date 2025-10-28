import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'Frontend Tests',
    environment: 'jsdom',
    setupFiles: ['./client/src/setupTests.ts'],
    include: [
      'client/**/*.{test,spec}.{ts,tsx}',
      'client/src/**/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/server/**',
      '**/db/**'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/frontend',
      include: ['client/src/**/*.{ts,tsx}'],
      exclude: [
        'client/src/**/*.d.ts',
        'client/src/main.tsx',
        'client/src/vite-env.d.ts',
        'client/src/setupTests.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});





































