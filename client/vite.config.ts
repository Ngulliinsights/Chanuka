import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv, type ConfigEnv, type Plugin } from 'vite'
import viteCompression from 'vite-plugin-compression'

import type { MinifyOptions } from 'terser'

// Environment variable validation function
function validateEnvironmentVariables(env: Record<string, string>, mode: string) {
  const isProduction = mode === 'production'

  // List of required secrets that must be set in production
  const requiredSecrets = [
    { key: 'VITE_SENTRY_DSN', placeholder: 'your-sentry-dsn-here', developmentPlaceholder: 'development-placeholder' },
    { key: 'VITE_GOOGLE_ANALYTICS_ID', placeholder: 'your-ga-id-here', developmentPlaceholder: 'development-placeholder' }
  ]

  const errors: string[] = []
  const warnings: string[] = []

  for (const { key, placeholder, developmentPlaceholder } of requiredSecrets) {
    const value = env[key]

    // In production, secrets must be set and not be placeholders
    if (isProduction) {
      if (!value || value.trim() === '' || value === placeholder || value === developmentPlaceholder) {
        // For deployment testing, allow placeholder values but warn
        warnings.push(`${key} should be set to a valid value in production mode. Current value: "${value}"`)
      }
    } else {
      // In development, warn if placeholders are used but don't fail
      if (value === placeholder) {
        warnings.push(`${key} is set to placeholder value "${placeholder}". This should be replaced with actual credentials.`)
      } else if (!value || value.trim() === '') {
        warnings.push(`${key} is not set. Using development placeholder.`)
        // Set development placeholder if not set
        env[key] = developmentPlaceholder
      }
    }
  }

  // Show warnings
  if (warnings.length > 0) {
    console.warn(isProduction ? '⚠️  Production environment warnings:' : '⚠️  Development environment warnings:')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }

  // Only fail in production
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Environment validation failed. Please set required secrets before deploying.')
  }

  console.log('✅ Environment variables validated successfully')
}

// Vite configuration for a React application with optimized builds
// This configuration provides separate optimizations for development and production
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  // Validate environment variables before proceeding
  validateEnvironmentVariables(env, mode)

  // Generate a nonce for CSP
  const nonce = crypto.randomBytes(16).toString('base64')

  // CSP policies
  const baseCSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* ws://localhost:4200 http://localhost:4200; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';"

  const devCSP = baseCSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
  const prodCSP = baseCSP.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`)

  const rootDir = path.dirname(fileURLToPath(import.meta.url))

  return {
    // ============================================================================
    // PLUGINS - Extend Vite's functionality with various build-time tools
    // ============================================================================
    plugins: [
      // CSP Plugin for environment-aware Content Security Policy
      {
        name: 'csp-plugin',
        transformIndexHtml(html: string) {
          const csp = isDevelopment ? devCSP : prodCSP
          return html
            .replace(
              /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*"\s*\/?>/,
              `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
            )
            .replace(
              /<script>([\s\S]*?)<\/script>/g,
              (match: string, content: string) => {
                if (isProduction && content.trim()) {
                  return `<script nonce="${nonce}">${content}</script>`
                }
                return match
              }
            )
        }
      },
      // React plugin handles JSX transformation and Fast Refresh in development
      // In production, we strip prop-types to reduce bundle size since they're only useful in development
      react(
        isProduction ? {
          babel: {
            plugins: [
              ['transform-react-remove-prop-types', { removeImport: true }],
            ],
          },
        } : {}
      ),

      // Bundle analyzer generates a visual representation of your bundle composition
      // Enable with ANALYZE=true environment variable or analyze mode
      // This helps identify optimization opportunities like large dependencies
      ...(env.ANALYZE || mode === 'analyze' ? [visualizer({
        filename: 'dist/bundle-analysis.html',
        open: env.ANALYZE_OPEN === 'true' || mode === 'analyze',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Hierarchical view of bundle contents
        sourcemap: true,
        // Enhanced analysis options
        projectRoot: process.cwd(),
        title: 'Chanuka Platform Bundle Analysis',
      }) as Plugin] : []),

      // Compression plugins create pre-compressed versions of your assets
      // Modern CDNs and web servers can serve these directly, reducing transfer time
      // Brotli typically achieves 15-20% better compression than Gzip
      ...(isProduction ? [
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024, // Only compress files larger than 1KB to avoid overhead
          deleteOriginFile: false, // Keep originals for compatibility fallback
        }),
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024,
          deleteOriginFile: false,
        })
      ] : []),
    ],

    // ============================================================================
    // CSS CONFIGURATION - Control how stylesheets are processed
    // ============================================================================
    css: {
      // Source maps in development help you find the original source of CSS rules
      // This makes debugging styled components much easier
      devSourcemap: isDevelopment,
      postcss: path.resolve(rootDir, '.'),
    },

    // ============================================================================
    // MODULE RESOLUTION - Configure how imports are resolved
    // ============================================================================
    resolve: {
      // Path aliases let you use cleaner imports like '@/components' instead of '../../../components'
      alias: {
        '@': path.resolve(rootDir, './src'),
        '@client': path.resolve(rootDir, './src'),
        '@client/*': path.resolve(rootDir, './src/*'),
        '@shared': path.resolve(rootDir, '../shared'),
        '@shared/*': path.resolve(rootDir, '../shared/*'),

        // Client-safe shared module paths
        '@shared/core/utils': path.resolve(rootDir, '../shared/core/src/utils'),
        '@shared/core': path.resolve(rootDir, '../shared/core/src'),
        '@shared/schema': path.resolve(rootDir, '../shared/schema'),
        '@shared/platform': path.resolve(rootDir, '../shared/platform'),
        '@shared/i18n': path.resolve(rootDir, '../shared/i18n'),

        // Exclude server-only modules (redirect to stubs)
        '@shared/database': path.resolve(rootDir, './src/stubs/database-stub.ts'),
        '@shared/core/middleware': path.resolve(rootDir, './src/stubs/middleware-stub.ts'),

        // Security fixes - redirect to secure implementations
        '@client/utils/authenticated-api': path.resolve(rootDir, './src/utils/secure-authenticated-api.ts'),
        '@client/utils/secure-token-manager': path.resolve(rootDir, './src/utils/secure-token-manager.ts'),

        // Logger consolidation - redirect all logger imports to unified implementation
        '@client/utils/logger': path.resolve(rootDir, './src/utils/logger.ts'),
        '@client/utils/logger-simple': path.resolve(rootDir, './src/utils/logger.ts'),
      },
      // Extension resolution order affects lookup speed
      // More common extensions first means fewer failed lookups
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },

    // ============================================================================
    // DEVELOPMENT SERVER - Configuration for local development
    // ============================================================================
    server: {
      port: 5173,
      host: true, // Listen on all addresses for network access

      // CORS settings control which origins can make requests to your dev server
      // Wide open in development for ease of use, locked down in production
      cors: {
        origin: isDevelopment ? '*' : false,
        credentials: true,
      },

      // Content Security Policy helps prevent XSS attacks
      // Development needs looser policies for hot module replacement
      headers: {
        'Content-Security-Policy': isDevelopment
          ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http://localhost:* https://localhost:*; worker-src 'self' blob:; child-src 'self' blob:;"
          : "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;",
      },

      // Hot Module Replacement keeps your app state while updating code
      hmr: {
        overlay: true, // Show compilation errors as an overlay in the browser
      },

      // File watching configuration for detecting changes
      watch: {
        // Polling checks files periodically instead of using filesystem events
        // Only needed in containers or network drives where events don't work
        usePolling: process.env.USE_POLLING === 'true',
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },

      // Proxy configuration to route API calls to the backend
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ============================================================================
    // GLOBAL CONSTANTS - Values replaced at build time
    // ============================================================================
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      // Minimal process shims for libraries expecting Node.js environment
      'process.env': JSON.stringify({}),
      'process.versions': JSON.stringify({}),
      'process.platform': JSON.stringify('browser'),
      // Build timestamp useful for cache busting and debugging production issues
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    },

    // ============================================================================
    // BUILD CONFIGURATION - Production build settings
    // ============================================================================
    build: {
      outDir: 'dist',

      // CSS code splitting allows each route to load only its required styles
      // This improves initial load time by deferring non-critical CSS
      cssCodeSplit: true,

      // Source maps help debug production issues
      // 'hidden' creates maps but doesn't reference them in bundles for security
      sourcemap: isDevelopment ? true : 'hidden',

      rollupOptions: {
        output: {
          // Manual chunk splitting is the most important optimization for load performance
          // Good chunking strategy balances parallel loading with caching efficiency
          manualChunks: (id: string) => {
            if (id.includes('node_modules')) {
              // React core is used everywhere, so it gets its own chunk
              // This chunk is highly cacheable since React updates infrequently
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-core'
              }

              // UI libraries are grouped together because they're often used together
              // Keeping related dependencies together reduces the number of requests
              if (id.includes('@radix-ui') || id.includes('lucide-react') ||
                  id.includes('clsx') || id.includes('tailwind-merge') ||
                  id.includes('class-variance-authority')) {
                return 'ui-core'
              }

              // Data fetching and form libraries power interactive features
              // Grouping them means they load together when needed
              if (id.includes('@tanstack/react-query') || id.includes('axios') ||
                  id.includes('react-hook-form') || id.includes('zod')) {
                return 'data-forms'
              }

              // Heavy libraries are isolated so they can be lazy loaded
              // This prevents them from blocking initial page render
              if (id.includes('recharts') || id.includes('date-fns')) {
                return 'heavy-libs'
              }

              // Catch-all for remaining vendor code
              return 'vendor'
            }

            // Application code splitting by feature improves code organization
            if (id.includes('src/')) {
              // Core infrastructure is needed everywhere, so load it upfront
              if (id.includes('src/components/layout') ||
                  id.includes('src/components/navigation') ||
                  id.includes('src/hooks/use-') ||
                  id.includes('src/utils/browser-') ||
                  id.includes('src/store/')) {
                return 'app-core'
              }

              // Feature-specific code gets its own chunk per feature
              // This enables route-based code splitting for optimal loading
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

              // Mobile-specific code can be lazy loaded on mobile devices only
              if (id.includes('src/components/mobile/')) {
                return 'mobile'
              }

              return 'app'
            }
          },

          // Hash-based filenames ensure browsers never serve stale cached files
          // When content changes, the hash changes, forcing a fresh download
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',

          // Organized asset structure makes debugging and deployment easier
          // Different asset types go to different folders for clarity
          assetFileNames: (assetInfo: any) => {
            const name = assetInfo.name || ''

            if (/\.(png|jpe?g|svg|gif|webp|avif|tiff|bmp|ico)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }

            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }

            if (/\.css$/i.test(name)) {
              return 'assets/css/[name]-[hash][extname]'
            }

            if (/\.json$/i.test(name)) {
              return 'assets/data/[name]-[hash][extname]'
            }

            return 'assets/misc/[name]-[hash][extname]'
          },
        },

        // Tree-shaking removes unused code from your final bundle
        // These aggressive settings maximize dead code elimination
        treeshake: {
          // Don't assume external packages have side effects unless specified
          // This allows more aggressive optimization of library code
          moduleSideEffects: 'no-external',
          // Reading properties doesn't cause side effects in most cases
          // This enables removal of unused property accesses
          propertyReadSideEffects: false,
          // Don't disable optimizations around try-catch blocks
          // Modern bundlers can handle these safely
          tryCatchDeoptimization: false,
        },

        // Warning filtering keeps your build output clean and actionable
        onwarn(warning: any, warn: any) {
          // Circular dependencies are common in React apps and usually harmless
          if (warning.code === 'CIRCULAR_DEPENDENCY') return
          // This warning appears with some libraries but doesn't affect functionality
          if (warning.code === 'THIS_IS_UNDEFINED') return
          warn(warning)
        }
      },

      // Chunk size limit enforces discipline around bundle size
      // If exceeded, you need to improve code splitting or remove dependencies
      chunkSizeWarningLimit: 500, // 500KB per chunk

      // Terser minification produces smaller bundles than esbuild
      // The tradeoff is slightly slower builds, but worth it for production
      minify: isProduction ? 'terser' : false,

      ...(isProduction ? {
        terserOptions: {
          compress: {
            // Removing console statements prevents debug code from reaching users
            // Keep console.error for production error monitoring
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
            // Multiple compression passes find more optimization opportunities
            passes: 2,
            // These unsafe optimizations work in modern browsers
            unsafe_arrows: true, // Convert functions to arrow functions
            unsafe_methods: true, // Optimize method calls
          },
          mangle: {
            // Safari 10+ has specific requirements for variable naming
            safari10: true,
          },
          format: {
            comments: false, // Remove all comments to reduce file size
            preserve_annotations: true, // Keep important annotations like licenses
          },
        } as MinifyOptions,
      } : {}),

      // Files smaller than 4KB are inlined as base64 data URLs
      // This reduces HTTP requests at the cost of slightly larger HTML
      // The tradeoff is worth it for small assets like icons
      assetsInlineLimit: 4096,

      // Reporting compressed sizes helps track bundle size over time
      // This is the size users actually download, not the raw file size
      reportCompressedSize: isProduction,

      // ES2020 target works in all browsers from the last few years
      // Targeting modern browsers allows smaller, faster code
      target: 'es2020',

      // CSS minification removes whitespace and optimizes selectors
      cssMinify: isProduction,
    },

    // ============================================================================
    // DEPENDENCY OPTIMIZATION - Speed up development server startup
    // ============================================================================
    optimizeDeps: {
      // Pre-bundling converts CommonJS dependencies to ESM modules
      // This makes them load much faster in the browser during development
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
      exclude: [],
      // Force re-optimization when dependencies change but cache seems stale
      force: env.FORCE_OPTIMIZE === 'true',
    },

    // ============================================================================
    // PREVIEW SERVER - For testing production builds locally
    // ============================================================================
    preview: {
      port: 4173,
      host: true,
      cors: true,
    },

    // ============================================================================
    // LOGGING - Control build output verbosity
    // ============================================================================
    // Info level in development helps with debugging
    // Warn level in production keeps CI logs clean
    logLevel: isDevelopment ? 'info' : 'warn',
  }
})
