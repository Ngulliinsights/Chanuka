import { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import compression from 'vite-plugin-compression'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  plugins: [
    react({
      // React plugin configuration for production
    }),

    // HTML optimization
    createHtmlPlugin({
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
      },
    }),

    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),

    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // Bundle analyzer
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],

  build: {
    // Production optimizations
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,

    // Advanced terser options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'chart-vendor': ['d3', 'recharts'],
          'utils-vendor': ['lodash', 'date-fns'],

          // Feature chunks - updated to FSD structure
          'bills-feature': [
            './src/features/bills',
          ],
          'community-feature': [
            './src/features/community',
          ],
          'analytics-feature': [
            './src/features/analytics',
          ],
        },

        // Optimize chunk names
        chunkFileNames: () => {
          return `js/[name]-[hash].js`;
        },

        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];

          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `fonts/[name]-[hash][extname]`;
          }
          if (ext === 'css') {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // Performance budgets
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },

  // Resolve configuration
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
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@store': resolve(__dirname, './src/store'),
      '@services': resolve(__dirname, './src/services'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './src/types'),
    },
  },

  // Server configuration for production preview
  preview: {
    port: 3000,
    host: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});
