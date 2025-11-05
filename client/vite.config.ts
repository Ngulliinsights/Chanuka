import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Enhanced bundle analyzer for production builds
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/bundle-analysis.html',
      open: process.env.ANALYZE_OPEN === 'true',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }) as any] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    // Aggressive code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries - rarely change, cache well
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            if (id.includes('react-router') || id.includes('wouter')) {
              return 'router-vendor';
            }
            if (id.includes('date-fns') || id.includes('zod') || id.includes('clsx')) {
              return 'utils-vendor';
            }
            if (id.includes('axios') || id.includes('zustand')) {
              return 'data-vendor';
            }
            return 'vendor';
          }

          // Route-based splitting - load pages on demand
          if (id.includes('/pages/')) {
            const pagePath = id.split('/pages/')[1];
            if (pagePath) {
              const pageName = pagePath.split('.')[0] || 'unknown';
              if (pageName.includes('bill') || pageName.includes('sponsorship')) {
                return 'bills-pages';
              }
              if (pageName.includes('admin') || pageName.includes('database')) {
                return 'admin-pages';
              }
              if (pageName.includes('community') || pageName.includes('expert')) {
                return 'community-pages';
              }
              if (pageName.includes('auth') || pageName.includes('profile') || pageName.includes('onboarding')) {
                return 'user-pages';
              }
              return `page-${pageName}`;
            }
          }

          // Component-based splitting for large feature components
          if (id.includes('/components/')) {
            if (id.includes('/admin/') || id.includes('/database/')) {
              return 'admin-components';
            }
            if (id.includes('/bills/') || id.includes('/sponsorship/')) {
              return 'bills-components';
            }
            if (id.includes('/community/')) {
              return 'community-components';
            }
            if (id.includes('/profile/') || id.includes('/user/')) {
              return 'user-components';
            }
          }

          // Utility modules
          if (id.includes('/utils/') || id.includes('/services/')) {
            return 'app-utils';
          }

          // Everything else goes in main chunk
          return 'main';
        },
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const extType = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
      },
    },
    // Bundle size warnings and limits
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
    },
    // Inline small assets to reduce HTTP requests
    assetsInlineLimit: 4096, // 4KB threshold
  },
})