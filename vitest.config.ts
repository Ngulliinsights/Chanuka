// DEPRECATED: Use vitest.frontend.config.ts for frontend testing
// This config is kept for legacy compatibility only
// 
// For new development:
// - Backend/Database tests: use jest.backend.config.js
// - Frontend tests: use vitest.frontend.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./client/src/setupTests.ts'],
    include: ['client/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});






