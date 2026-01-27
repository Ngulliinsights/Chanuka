/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts', './tests/setup/modules/client.ts'],
    css: true,
    testTimeout: 10000,
    hookTimeout: 5000,

    // Only includes standard unit tests
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.{ts,tsx}',
      '**/*.e2e.test.{ts,tsx}',
      '**/*.performance.test.{ts,tsx}',
      '**/*.a11y.test.{ts,tsx}',
    ],

    environmentOptions: {
      jsdom: {
        resources: 'usable',
        url: 'http://localhost:3000',
      },
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: '../../coverage/client/unit',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/**/*.d.ts',
        'src/test-utils/**',
        'src/**/*.stories.{ts,tsx}',
        'src/__tests__/**',
      ],
      all: true,
      skipFull: false,
    },

    reporters: ['verbose'],
    retry: process.env.CI ? 2 : 0,
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
      '@': resolve(__dirname, './src'),
      '@client': resolve(__dirname, './src'),
      '@client/*': resolve(__dirname, './src/*'),
      '@shared': resolve(__dirname, '../../shared'),
      '@shared/*': resolve(__dirname, '../../shared/*'),
      '@shared/core': resolve(__dirname, '../../shared/core/src'),
      '@shared/core/*': resolve(__dirname, '../../shared/core/src/*'),
      '@server/infrastructure/schema': resolve(__dirname, '../../shared/schema'),
      '@server/infrastructure/schema/*': resolve(__dirname, '../../shared/schema/*'),
      '@server/infrastructure/database': resolve(__dirname, './src/stubs/database-stub.ts'),
      '@shared/utils': resolve(__dirname, '../../shared/utils'),
      '@shared/utils/*': resolve(__dirname, '../../shared/utils/*'),
      '@server/infrastructure/database/*': resolve(__dirname, './src/stubs/database-stub.ts'),
      '@shared/core/middleware': resolve(__dirname, './src/stubs/middleware-stub.ts'),
      '@client/utils/logger': resolve(__dirname, './src/utils/logger.ts'),
      '@client/test-utils': resolve(__dirname, './src/test-utils'),
      '@client/@types': resolve(__dirname, './src/@types'),
    },
  },
})
