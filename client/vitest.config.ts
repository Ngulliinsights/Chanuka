import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { coverageConfig } from './src/__tests__/coverage/coverage-config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    css: true,
    
    // Test configuration
    testTimeout: 10000,
    hookTimeout: 5000,
    
    // Test file patterns
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.{ts,tsx}',
      '**/*.e2e.test.{ts,tsx}',
      '**/*.performance.test.{ts,tsx}',
    ],
    
    // Environment options
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        url: 'http://localhost:3000',
      },
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: coverageConfig.reporters,
      reportsDirectory: coverageConfig.reportsDirectory,
      
      // Coverage thresholds
      // Cast to `any` to accommodate custom per-file threshold mapping
      thresholds: ({
        global: coverageConfig.global,
        perFile: coverageConfig.perFile,
      } as any),
      
      // Files to include/exclude
      include: coverageConfig.collectCoverageFrom,
      exclude: coverageConfig.exclude,
      
      // Additional coverage options
      all: true,
      skipFull: false,
      clean: true,
    },
    
    reporters: ['verbose'],
    
    // Retry configuration
    retry: process.env.CI ? 2 : 0,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
  
  resolve: {
    alias: {
      '@': resolve(resolve(fileURLToPath(import.meta.url), '..'), './src'),
      '@client': resolve(resolve(fileURLToPath(import.meta.url), '..'), './src'),
      '@chanuka/shared': resolve(resolve(fileURLToPath(import.meta.url), '..'), '../shared'),
    },
  },
});
