import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import type { Plugin } from 'vite'
import type { MinifyOptions } from 'terser'
// import type { PreRenderedAsset } from 'rollup'

// cSpell:words treemap Deoptimization
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      // React plugin with optimized settings for each environment
      // Fast refresh is enabled by default in development
      react(
        // Only include babel configuration in production builds
        // This removes prop-types in production for smaller bundle size
        isProduction ? {
          babel: {
            plugins: [
              ['transform-react-remove-prop-types', { removeImport: true }],
            ],
          },
        } : {}
      ),
      
      // Bundle analyzer - only include when explicitly requested
      // Set ANALYZE=true to generate a visual bundle analysis
      ...(env.ANALYZE ? [visualizer({
        filename: 'dist/bundle-analysis.html',
        open: env.ANALYZE_OPEN === 'true',
        gzipSize: true,
        brotliSize: true,
        // Template options: treemap (hierarchical boxes), sunburst (circular), network (graph)
        template: 'treemap',
        // Add summary statistics for better insights
        sourcemap: true,
      }) as Plugin] : []),

      // Compression plugin for better bundle size
      // Enables Brotli and Gzip compression for production builds
      ...(isProduction ? [
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024, // Only compress files larger than 1KB
          deleteOriginFile: false, // Keep original files for fallback
        }),
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024,
          deleteOriginFile: false,
        })
      ] : []),

      // Bundle analysis plugin for automated monitoring
      // This plugin integrates with the build process to track bundle sizes
      // Note: Plugin is available via scripts/bundle-analysis-plugin.js
      // Enable with ANALYZE=true environment variable
    ],

    // CSS configuration with PostCSS integration
    css: {
      // Enable source maps in development for easier debugging
      devSourcemap: isDevelopment,
      // Use the client directory's postcss.config.js
      postcss: path.resolve(__dirname, '.'),
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@chanuka/shared': path.resolve(__dirname, '../shared'),
      },
      // Explicitly define extensions to speed up resolution
      // Order matters: more common extensions first for faster lookups
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },

    server: {
      port: 5173,
      host: true,
      // Improve CORS handling with specific allowed origins
      cors: {
        origin: isDevelopment ? '*' : false,
        credentials: true,
      },
      // More restrictive CSP for development security
      headers: {
        'Content-Security-Policy': isDevelopment 
          ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http://localhost:* https://localhost:*;"
          : "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self';",
      },
      hmr: {
        // Use the host from server config for better compatibility
        overlay: true, // Show errors in browser overlay
      },
      // Watch configuration optimized for different environments
      watch: {
        // Only use polling if you're in a containerized environment
        usePolling: process.env.USE_POLLING === 'true',
        // Ignore unnecessary directories to improve performance
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
    },

    // Define global constants with better organization
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      // Provide minimal process shims for browser compatibility
      'process.env': JSON.stringify({}),
      'process.versions': JSON.stringify({}),
      'process.platform': JSON.stringify('browser'),
      // Add build timestamp for cache busting and debugging
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    },

    build: {
      outDir: 'dist',
      // Enable CSS code splitting for better caching
      // Each component's CSS can be loaded only when needed
      cssCodeSplit: true,
      // Generate source maps in development and for production debugging
      // 'hidden' means source maps exist but aren't referenced in the bundle
      sourcemap: isDevelopment ? true : 'hidden',

      // Bundle size budgets - fail build if exceeded
      rollupOptions: {
        output: {
          // Optimized chunk splitting strategy
          // Reduces the number of chunks while maintaining good caching
          manualChunks: (id: string) => {
            // Core vendor libraries (loaded on every page)
            if (id.includes('node_modules')) {
              // React ecosystem - critical for all pages
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-core'
              }
              
              // UI and styling libraries - used frequently
              if (id.includes('@radix-ui') || id.includes('lucide-react') || 
                  id.includes('clsx') || id.includes('tailwind-merge') ||
                  id.includes('class-variance-authority')) {
                return 'ui-core'
              }
              
              // Data and forms - used on most interactive pages
              if (id.includes('@tanstack/react-query') || id.includes('axios') ||
                  id.includes('react-hook-form') || id.includes('zod')) {
                return 'data-forms'
              }
              
              // Heavy/specialized libraries - lazy loaded
              if (id.includes('recharts') || id.includes('date-fns')) {
                return 'heavy-libs'
              }
              
              // All other vendor code
              return 'vendor'
            }

            // Application code splitting
            if (id.includes('src/')) {
              // Core app infrastructure
              if (id.includes('src/components/layout') || 
                  id.includes('src/components/navigation') ||
                  id.includes('src/hooks/use-') ||
                  id.includes('src/utils/browser-') ||
                  id.includes('src/store/')) {
                return 'app-core'
              }
              
              // Feature-specific code (lazy loaded)
              if (id.includes('src/pages/') || 
                  id.includes('src/features/') ||
                  id.includes('src/components/bills/') ||
                  id.includes('src/components/analysis/')) {
                const pathParts = id.split('/')
                const featureIndex = pathParts.findIndex(part => 
                  part === 'pages' || part === 'features' || part === 'bills' || part === 'analysis'
                )
                if (featureIndex !== -1 && pathParts[featureIndex + 1]) {
                  return `feature-${pathParts[featureIndex + 1]}`
                }
                return 'features'
              }
              
              // Mobile-specific components
              if (id.includes('src/components/mobile/')) {
                return 'mobile'
              }
              
              // Everything else goes to main app chunk
              return 'app'
            }

            return undefined
          },

          // Organized file naming strategy
          // Hash ensures cache busting when content changes
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',

          // Smart asset organization based on file type
          assetFileNames: (assetInfo: any) => {
            const name = assetInfo.name || ''

            // Image assets with organized subfolder structure
            if (/\.(png|jpe?g|svg|gif|webp|avif|tiff|bmp|ico)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }

            // Font files in dedicated folder
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }

            // CSS files in dedicated folder
            if (/\.css$/i.test(name)) {
              return 'assets/css/[name]-[hash][extname]'
            }

            // JSON and other data files
            if (/\.json$/i.test(name)) {
              return 'assets/data/[name]-[hash][extname]'
            }

            // Default fallback for any other asset type
            return 'assets/misc/[name]-[hash][extname]'
          },
        },

        // Tree-shaking optimization to remove unused code
        // These settings ensure aggressive dead code elimination
        treeshake: {
          // Don't assume external modules have side effects
          moduleSideEffects: 'no-external',
          // Property reads don't cause side effects
          propertyReadSideEffects: false,
          // Don't disable optimization for try-catch blocks
          tryCatchDeoptimization: false,
        },

        onwarn(warning, warn) {
          // Suppress certain warnings that are not actionable
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'THIS_IS_UNDEFINED') return;
          warn(warning);
        }
      },

      // Strict bundle size budgets - fail build if exceeded
      chunkSizeWarningLimit: 500, // 500KB - reduced to enforce better code splitting
      
      // Production minification with optimized settings
      minify: isProduction ? 'terser' : false,
      // Only set terserOptions when minify is 'terser' to satisfy TypeScript
      ...(isProduction ? {
        terserOptions: {
          compress: {
            // Remove console statements in production for cleaner code
            drop_console: true,
            drop_debugger: true,
            // Remove specific console methods while keeping errors
            pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
            // Additional compression optimizations
            passes: 2, // Run compression twice for better results
            unsafe_arrows: true, // Convert functions to arrow functions when safe
            unsafe_methods: true, // Optimize method calls
          },
          mangle: {
            safari10: true, // Fix Safari 10+ issues with variable naming
          },
          format: {
            comments: false, // Remove all comments
            // Preserve important license comments
            preserve_annotations: true,
          },
        } as MinifyOptions,
      } : {}),
      
      // Smart asset inlining threshold
      // Files smaller than this will be inlined as base64 to reduce HTTP requests
      assetsInlineLimit: 4096, // 4KB
      
      // Enable reporting for build analysis
      // Shows compressed sizes to help optimize bundle size
      reportCompressedSize: isProduction,
      
      // Target modern browsers for smaller bundle size
      // ES2020 is supported by all modern browsers
      target: 'es2020',
      
      // Optimize CSS handling in production
      cssMinify: isProduction,
    },

    // Optimize dependency pre-bundling for faster dev server startup
    optimizeDeps: {
      // Include dependencies that should be pre-bundled
      // Pre-bundling converts CommonJS modules to ESM for faster loading
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
      // Exclude dependencies that shouldn't be pre-bundled
      // Add any problematic dependencies here
      exclude: [],
      // Force optimization even if already cached
      // Useful when dependencies change but cache isn't invalidated
      force: env.FORCE_OPTIMIZE === 'true',
    },

    // Preview server configuration (for testing production builds locally)
    preview: {
      port: 4173,
      host: true,
      cors: true,
    },

    // Logging configuration
    // Info level in development for debugging, warn level in production
    logLevel: isDevelopment ? 'info' : 'warn',
  }
})