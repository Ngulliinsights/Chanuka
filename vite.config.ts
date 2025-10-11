import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { logger } from '../utils/logger';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer (only in build mode)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // Better visualization
    }),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false,
    }),
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@db": path.resolve(import.meta.dirname, "db"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            
            // UI library chunks
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            
            // Query and state management
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            
            // Routing
            if (id.includes('react-router') || id.includes('wouter')) {
              return 'router-vendor';
            }
            
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            
            // Utilities
            if (id.includes('date-fns') || id.includes('zod') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            
            // Other vendor libraries
            return 'vendor';
          }
          
          // Route-based code splitting
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('.')[0];
            
            // Group related pages together
            if (pageName.includes('bill')) {
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
          
          // Component-based splitting for large components
          if (id.includes('/components/')) {
            if (id.includes('/admin/')) {
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
          
          // Utility and service chunks
          if (id.includes('/services/') || id.includes('/utils/')) {
            return 'app-utils';
          }
          
          // Default chunk
          return 'main';
        }
      }
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Additional optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    // Optimize asset inlining
    assetsInlineLimit: 4096, // 4KB threshold for inlining assets
  },
});







