import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    // Core React plugin
    react(),
    
    // Bundle analyzer - only runs when ANALYZE env var is set
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
    
    // Gzip compression for production builds
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files > 1KB
      deleteOriginFile: false,
    }),
    
    // Brotli compression for even better compression ratios
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ].filter((plugin): plugin is Plugin => Boolean(plugin)),
  
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
        // Strategic chunk splitting for optimal caching and loading
        manualChunks: (id) => {
          // Vendor libraries - these change infrequently, so they cache well
          if (id.includes('node_modules')) {
            // React ecosystem - core framework, changes rarely
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            
            // UI component libraries
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            
            // Data fetching and state management
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            
            // Form handling libraries
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            
            // Routing libraries
            if (id.includes('react-router') || id.includes('wouter')) {
              return 'router-vendor';
            }
            
            // Icon libraries - can be large
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            
            // Utility libraries
            if (id.includes('date-fns') || id.includes('zod') || 
                id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            
            // Catch-all for other vendor code
            return 'vendor';
          }
          
          // Route-based code splitting - loads only what's needed per page
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('.')[0];
            
            // Group related pages to reduce number of chunks
            if (pageName.includes('bill')) {
              return 'bills-pages';
            }
            if (pageName.includes('admin') || pageName.includes('database')) {
              return 'admin-pages';
            }
            if (pageName.includes('community') || pageName.includes('expert')) {
              return 'community-pages';
            }
            if (pageName.includes('auth') || pageName.includes('profile') || 
                pageName.includes('onboarding')) {
              return 'user-pages';
            }
            
            return `page-${pageName}`;
          }
          
          // Component-based splitting for feature-specific components
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
          
          // Utility and service modules
          if (id.includes('/services/') || id.includes('/utils/')) {
            return 'app-utils';
          }
          
          // Everything else goes in the main chunk
          return 'main';
        }
      }
    },
    
    // Warning threshold for chunk sizes (in KB)
    chunkSizeWarningLimit: 1000,
    
    // Source maps for debugging - only in development
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Terser minification for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log in production for cleaner, smaller builds
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    
    // Inline small assets as base64 to reduce HTTP requests
    assetsInlineLimit: 4096, // 4KB threshold
  },
});




































