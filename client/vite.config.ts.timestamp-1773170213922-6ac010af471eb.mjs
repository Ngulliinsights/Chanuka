// client/vite.config.ts
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import react from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/rollup-plugin-visualizer@6.0.5/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { defineConfig, loadEnv } from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.24_terser@5.44.1/node_modules/vite/dist/node/index.js";
import viteCompression from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/vite-plugin-compression@0.5.1_vite@5.4.21/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/vite.config.ts";
function validateEnvironmentVariables(env, mode) {
  const isProduction = mode === "production";
  const requiredSecrets = [
    { key: "VITE_SENTRY_DSN", placeholder: "your-sentry-dsn-here", developmentPlaceholder: "development-placeholder" },
    { key: "VITE_GOOGLE_ANALYTICS_ID", placeholder: "your-ga-id-here", developmentPlaceholder: "development-placeholder" }
  ];
  const errors = [];
  const warnings = [];
  for (const { key, placeholder, developmentPlaceholder } of requiredSecrets) {
    const value = env[key];
    if (isProduction) {
      if (!value || value.trim() === "" || value === placeholder || value === developmentPlaceholder) {
        warnings.push(`${key} should be set to a valid value in production mode. Current value: "${value}"`);
      }
    } else {
      if (value === placeholder) {
        warnings.push(`${key} is set to placeholder value "${placeholder}". This should be replaced with actual credentials.`);
      } else if (!value || value.trim() === "") {
        warnings.push(`${key} is not set. Using development placeholder.`);
        env[key] = developmentPlaceholder;
      }
    }
  }
  if (warnings.length > 0) {
    console.warn(isProduction ? "\u26A0\uFE0F  Production environment warnings:" : "\u26A0\uFE0F  Development environment warnings:");
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
  if (errors.length > 0) {
    console.error("\u274C Environment validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error("Environment validation failed. Please set required secrets before deploying.");
  }
  console.log("\u2705 Environment variables validated successfully");
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const isDevelopment = mode === "development";
  validateEnvironmentVariables(env, mode);
  const nonce = crypto.randomBytes(16).toString("base64");
  const baseCSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com ws: wss: ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* ws://localhost:4200 http://localhost:4200; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';";
  const devCSP = baseCSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  const prodCSP = baseCSP.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`);
  const rootDir = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
  return {
    // ============================================================================
    // PLUGINS - Extend Vite's functionality with various build-time tools
    // ============================================================================
    plugins: [
      // Resource hints plugin for better loading performance
      {
        name: "resource-hints",
        transformIndexHtml(html) {
          const preconnectHints = [
            '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
          ].join("\n");
          const dnsPrefetch = [
            '<link rel="dns-prefetch" href="https://www.google-analytics.com">'
          ].join("\n");
          return html.replace("</head>", `${preconnectHints}
${dnsPrefetch}
</head>`);
        }
      },
      // CSP Plugin for environment-aware Content Security Policy
      {
        name: "csp-plugin",
        transformIndexHtml(html) {
          const csp = isDevelopment ? devCSP : prodCSP;
          return html.replace(
            /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*"\s*\/?>/,
            `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
          ).replace(
            /<script>([\s\S]*?)<\/script>/g,
            (match, content) => {
              if (isProduction && content.trim()) {
                return `<script nonce="${nonce}">${content}</script>`;
              }
              return match;
            }
          );
        }
      },
      // React plugin handles JSX transformation and Fast Refresh in development
      // In production, we strip prop-types to reduce bundle size since they're only useful in development
      react(
        isProduction ? {
          babel: {
            plugins: [
              ["transform-react-remove-prop-types", { removeImport: true }]
            ]
          }
        } : {}
      ),
      // Bundle analyzer generates a visual representation of your bundle composition
      // Enable with ANALYZE=true environment variable or analyze mode
      // This helps identify optimization opportunities like large dependencies
      ...env.ANALYZE || mode === "analyze" ? [visualizer({
        filename: "dist/bundle-analysis.html",
        open: env.ANALYZE_OPEN === "true" || mode === "analyze",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
        // Hierarchical view of bundle contents
        sourcemap: true,
        // Enhanced analysis options
        projectRoot: process.cwd(),
        title: "Chanuka Platform Bundle Analysis"
      })] : [],
      // Compression plugins create pre-compressed versions of your assets
      // Modern CDNs and web servers can serve these directly, reducing transfer time
      // Brotli typically achieves 15-20% better compression than Gzip
      ...isProduction ? [
        viteCompression({
          algorithm: "brotliCompress",
          ext: ".br",
          threshold: 1024,
          // Only compress files larger than 1KB to avoid overhead
          deleteOriginFile: false
          // Keep originals for compatibility fallback
        }),
        viteCompression({
          algorithm: "gzip",
          ext: ".gz",
          threshold: 1024,
          deleteOriginFile: false
        })
      ] : []
    ],
    // ============================================================================
    // CSS CONFIGURATION - Control how stylesheets are processed
    // ============================================================================
    css: {
      // Source maps in development help you find the original source of CSS rules
      // This makes debugging styled components much easier
      devSourcemap: isDevelopment,
      postcss: path.resolve(rootDir, ".")
    },
    // ============================================================================
    // MODULE RESOLUTION - Configure how imports are resolved
    // ============================================================================
    resolve: {
      // Path aliases let you use cleaner imports like '@/components' instead of '../../../components'
      alias: {
        "@": path.resolve(rootDir, "./src"),
        "@client": path.resolve(rootDir, "./src"),
        "@core": path.resolve(rootDir, "./src/infrastructure"),
        "@lib": path.resolve(rootDir, "./src/lib"),
        "@features": path.resolve(rootDir, "./src/features"),
        "@app": path.resolve(rootDir, "./src/app"),
        "@hooks": path.resolve(rootDir, "./src/lib/hooks"),
        "@utils": path.resolve(rootDir, "./src/lib/utils"),
        // Workspace-level modules
        "@shared": path.resolve(rootDir, "../shared"),
        "@shared/types": path.resolve(rootDir, "../shared/types"),
        "@shared/validation": path.resolve(rootDir, "../shared/validation"),
        "@shared/constants": path.resolve(rootDir, "../shared/constants"),
        "@shared/utils": path.resolve(rootDir, "../shared/utils"),
        "@shared/core": path.resolve(rootDir, "../shared/core"),
        "@shared/platform": path.resolve(rootDir, "../shared/platform"),
        "@shared/i18n": path.resolve(rootDir, "../shared/i18n"),
        "@workspace": path.resolve(rootDir, "../shared"),
        "@workspace/types": path.resolve(rootDir, "../shared/types"),
        "@workspace/core": path.resolve(rootDir, "../shared/core"),
        "@workspace/validation": path.resolve(rootDir, "../shared/validation"),
        "@workspace/constants": path.resolve(rootDir, "../shared/constants"),
        // Exclude server-only modules (redirect to stubs)
        "@server-stub/database": path.resolve(rootDir, "./src/stubs/database-stub.ts"),
        "@server-stub/middleware": path.resolve(rootDir, "./src/stubs/middleware-stub.ts"),
        // Security fixes - redirect to secure implementations
        "@secure": path.resolve(rootDir, "./src/lib/utils/secure"),
        // Logger consolidation - redirect all logger imports to unified implementation
        "@logger": path.resolve(rootDir, "./src/lib/utils/logger")
      },
      // Extension resolution order affects lookup speed
      // More common extensions first means fewer failed lookups
      extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"]
    },
    // ============================================================================
    // DEVELOPMENT SERVER - Configuration for local development
    // ============================================================================
    server: {
      port: 5173,
      host: true,
      // Listen on all addresses for network access
      // CORS settings control which origins can make requests to your dev server
      // Wide open in development for ease of use, locked down in production
      cors: {
        origin: isDevelopment ? "*" : false,
        credentials: true
      },
      // Content Security Policy helps prevent XSS attacks
      // Development needs looser policies for hot module replacement
      headers: {
        "Content-Security-Policy": isDevelopment ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com ws: wss: http://localhost:* https://localhost:* http://127.0.0.1:*; worker-src 'self' blob:; child-src 'self' blob:;" : "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; child-src 'self' blob:;"
      },
      // Hot Module Replacement keeps your app state while updating code
      hmr: {
        overlay: true
        // Show compilation errors as an overlay in the browser
      },
      // File watching configuration for detecting changes
      watch: {
        // Polling checks files periodically instead of using filesystem events
        // Only needed in containers or network drives where events don't work
        usePolling: process.env.USE_POLLING === "true",
        ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"]
      },
      // Proxy configuration to route API calls to the backend
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4200",
          // Use IPv4 explicitly instead of localhost
          changeOrigin: true,
          secure: false
        }
      }
    },
    // ============================================================================
    // GLOBAL CONSTANTS - Values replaced at build time
    // ============================================================================
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      // Build timestamp useful for cache busting and debugging production issues
      "__BUILD_TIME__": JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
      // Note: Removed process.env, process.versions, and process.platform definitions
      // as they cause issues with Vite's module system. Use import.meta.env instead.
    },
    // ============================================================================
    // BUILD CONFIGURATION - Production build settings
    // ============================================================================
    build: {
      outDir: "dist",
      // CSS code splitting allows each route to load only its required styles
      // This improves initial load time by deferring non-critical CSS
      cssCodeSplit: true,
      // Source maps help debug production issues
      // 'hidden' creates maps but doesn't reference them in bundles for security
      sourcemap: isDevelopment ? true : "hidden",
      rollupOptions: {
        output: {
          // Manual chunk splitting is the most important optimization for load performance
          // Good chunking strategy balances parallel loading with caching efficiency
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("react/jsx-runtime")) {
                return "react-vendor";
              }
              if (id.includes("react-router")) {
                return "router-vendor";
              }
              if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("clsx") || id.includes("tailwind-merge") || id.includes("class-variance-authority")) {
                return "ui-vendor";
              }
              if (id.includes("@tanstack/react-query") || id.includes("axios") || id.includes("react-hook-form") || id.includes("zod")) {
                return "data-vendor";
              }
              if (id.includes("recharts") || id.includes("d3") || id.includes("chart")) {
                return "charts-vendor";
              }
              if (id.includes("date-fns") || id.includes("dayjs")) {
                return "date-vendor";
              }
              if (id.includes("redux") || id.includes("@reduxjs")) {
                return "state-vendor";
              }
              return "vendor";
            }
            if (id.includes("src/")) {
              if (id.includes("src/app/") || id.includes("src/infrastructure/") || id.includes("src/lib/design-system/") || id.includes("src/lib/utils/") || id.includes("src/lib/hooks/")) {
                return "app-core";
              }
              if (id.includes("src/infrastructure/")) {
                return "infrastructure";
              }
              if (id.includes("src/features/")) {
                const match = id.match(/src\/features\/([^/]+)/);
                if (match && match[1]) {
                  return `feature-${match[1]}`;
                }
                return "features";
              }
              if (id.includes("src/lib/ui/")) {
                const match = id.match(/src\/lib\/ui\/([^/]+)/);
                if (match && match[1]) {
                  const category = match[1];
                  if (["dashboard", "navigation", "layout"].includes(category)) {
                    return "ui-core";
                  }
                  if (["loading", "offline", "status"].includes(category)) {
                    return "ui-feedback";
                  }
                  if (["mobile", "accessibility"].includes(category)) {
                    return "ui-adaptive";
                  }
                  return `ui-${category}`;
                }
                return "ui";
              }
              if (id.includes("src/lib/services/")) {
                return "services";
              }
              return "app";
            }
            return void 0;
          },
          // Hash-based filenames ensure browsers never serve stale cached files
          // When content changes, the hash changes, forcing a fresh download
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          // Organized asset structure makes debugging and deployment easier
          // Different asset types go to different folders for clarity
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || "";
            if (/\.(png|jpe?g|svg|gif|webp|avif|tiff|bmp|ico)$/i.test(name)) {
              return "assets/images/[name]-[hash][extname]";
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return "assets/fonts/[name]-[hash][extname]";
            }
            if (/\.css$/i.test(name)) {
              return "assets/css/[name]-[hash][extname]";
            }
            if (/\.json$/i.test(name)) {
              return "assets/data/[name]-[hash][extname]";
            }
            return "assets/misc/[name]-[hash][extname]";
          }
        },
        // Tree-shaking removes unused code from your final bundle
        // These aggressive settings maximize dead code elimination
        treeshake: {
          // Don't assume external packages have side effects unless specified
          // This allows more aggressive optimization of library code
          moduleSideEffects: "no-external",
          // Reading properties doesn't cause side effects in most cases
          // This enables removal of unused property accesses
          propertyReadSideEffects: false,
          // Don't disable optimizations around try-catch blocks
          // Modern bundlers can handle these safely
          tryCatchDeoptimization: false
        },
        // Warning filtering keeps your build output clean and actionable
        onwarn(warning, warn) {
          if (warning.code === "CIRCULAR_DEPENDENCY") return;
          if (warning.code === "THIS_IS_UNDEFINED") return;
          warn(warning);
        }
      },
      // Chunk size limit enforces discipline around bundle size
      // If exceeded, you need to improve code splitting or remove dependencies
      chunkSizeWarningLimit: 400,
      // Reduced from 500KB to 400KB for better performance
      // Terser minification produces smaller bundles than esbuild
      // The tradeoff is slightly slower builds, but worth it for production
      minify: isProduction ? "terser" : false,
      ...isProduction ? {
        terserOptions: {
          compress: {
            // Removing console statements prevents debug code from reaching users
            // Keep console.error for production error monitoring
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ["console.log", "console.info", "console.debug", "console.trace"],
            // Multiple compression passes find more optimization opportunities
            passes: 2,
            // Balanced: 2 passes for good compression without excessive build time
            // These unsafe optimizations work in modern browsers
            unsafe_arrows: true,
            // Convert functions to arrow functions
            unsafe_methods: true,
            // Optimize method calls
            unsafe_comps: true,
            // Optimize comparisons
            // Remove unused code more aggressively
            dead_code: true,
            unused: true,
            // Reduce function calls
            reduce_funcs: true,
            reduce_vars: true,
            // Collapse single-use variables
            collapse_vars: true
          },
          mangle: {
            // Safari 10+ has specific requirements for variable naming
            safari10: true
          },
          format: {
            comments: false,
            // Remove all comments to reduce file size
            preserve_annotations: true
            // Keep important annotations like licenses
          }
        }
      } : {},
      // Files smaller than 4KB are inlined as base64 data URLs
      // This reduces HTTP requests at the cost of slightly larger HTML
      // The tradeoff is worth it for small assets like icons
      assetsInlineLimit: 4096,
      // Reporting compressed sizes helps track bundle size over time
      // This is the size users actually download, not the raw file size
      reportCompressedSize: isProduction,
      // ES2020 target works in all browsers from the last few years
      // Targeting modern browsers allows smaller, faster code
      target: "es2020",
      // CSS minification removes whitespace and optimizes selectors
      cssMinify: isProduction
    },
    // ============================================================================
    // DEPENDENCY OPTIMIZATION - Speed up development server startup
    // ============================================================================
    optimizeDeps: {
      // Pre-bundling converts CommonJS dependencies to ESM modules
      // This makes them load much faster in the browser during development
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react-router-dom",
        "@tanstack/react-query",
        "axios",
        "zod",
        "clsx",
        "tailwind-merge"
      ],
      exclude: [
        // Exclude large libraries that should be lazy loaded
        "recharts"
      ],
      // Force re-optimization when dependencies change but cache seems stale
      force: env.FORCE_OPTIMIZE === "true",
      // Enable esbuild optimizations
      esbuildOptions: {
        target: "es2020",
        supported: {
          "top-level-await": true
        }
      }
    },
    // ============================================================================
    // PREVIEW SERVER - For testing production builds locally
    // ============================================================================
    preview: {
      port: 4173,
      host: true,
      cors: true
    },
    // ============================================================================
    // LOGGING - Control build output verbosity
    // ============================================================================
    // Info level in development helps with debugging
    // Warn level in production keeps CI logs clean
    logLevel: isDevelopment ? "info" : "warn",
    // ============================================================================
    // TESTING - Vitest configuration
    // ============================================================================
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: true
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY2xpZW50L3ZpdGUuY29uZmlnLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQWNjZXNzIEdyYW50ZWRcXFxcRG93bmxvYWRzXFxcXHByb2plY3RzXFxcXFNpbXBsZVRvb2xcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBY2Nlc3MgR3JhbnRlZFxcXFxEb3dubG9hZHNcXFxccHJvamVjdHNcXFxcU2ltcGxlVG9vbFxcXFxjbGllbnRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0FjY2VzcyUyMEdyYW50ZWQvRG93bmxvYWRzL3Byb2plY3RzL1NpbXBsZVRvb2wvY2xpZW50L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcblxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gJ3JvbGx1cC1wbHVnaW4tdmlzdWFsaXplcidcbmltcG9ydCB0eXBlIHsgTWluaWZ5T3B0aW9ucyB9IGZyb20gJ3RlcnNlcidcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiwgdHlwZSBDb25maWdFbnYsIHR5cGUgUGx1Z2luIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2aXRlQ29tcHJlc3Npb24gZnJvbSAndml0ZS1wbHVnaW4tY29tcHJlc3Npb24nXG5cblxuLy8gRW52aXJvbm1lbnQgdmFyaWFibGUgdmFsaWRhdGlvbiBmdW5jdGlvblxuZnVuY3Rpb24gdmFsaWRhdGVFbnZpcm9ubWVudFZhcmlhYmxlcyhlbnY6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIG1vZGU6IHN0cmluZykge1xuICBjb25zdCBpc1Byb2R1Y3Rpb24gPSBtb2RlID09PSAncHJvZHVjdGlvbidcblxuICAvLyBMaXN0IG9mIHJlcXVpcmVkIHNlY3JldHMgdGhhdCBtdXN0IGJlIHNldCBpbiBwcm9kdWN0aW9uXG4gIGNvbnN0IHJlcXVpcmVkU2VjcmV0cyA9IFtcbiAgICB7IGtleTogJ1ZJVEVfU0VOVFJZX0RTTicsIHBsYWNlaG9sZGVyOiAneW91ci1zZW50cnktZHNuLWhlcmUnLCBkZXZlbG9wbWVudFBsYWNlaG9sZGVyOiAnZGV2ZWxvcG1lbnQtcGxhY2Vob2xkZXInIH0sXG4gICAgeyBrZXk6ICdWSVRFX0dPT0dMRV9BTkFMWVRJQ1NfSUQnLCBwbGFjZWhvbGRlcjogJ3lvdXItZ2EtaWQtaGVyZScsIGRldmVsb3BtZW50UGxhY2Vob2xkZXI6ICdkZXZlbG9wbWVudC1wbGFjZWhvbGRlcicgfVxuICBdXG5cbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdXG4gIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdXG5cbiAgZm9yIChjb25zdCB7IGtleSwgcGxhY2Vob2xkZXIsIGRldmVsb3BtZW50UGxhY2Vob2xkZXIgfSBvZiByZXF1aXJlZFNlY3JldHMpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGVudltrZXldXG5cbiAgICAvLyBJbiBwcm9kdWN0aW9uLCBzZWNyZXRzIG11c3QgYmUgc2V0IGFuZCBub3QgYmUgcGxhY2Vob2xkZXJzXG4gICAgaWYgKGlzUHJvZHVjdGlvbikge1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS50cmltKCkgPT09ICcnIHx8IHZhbHVlID09PSBwbGFjZWhvbGRlciB8fCB2YWx1ZSA9PT0gZGV2ZWxvcG1lbnRQbGFjZWhvbGRlcikge1xuICAgICAgICAvLyBGb3IgZGVwbG95bWVudCB0ZXN0aW5nLCBhbGxvdyBwbGFjZWhvbGRlciB2YWx1ZXMgYnV0IHdhcm5cbiAgICAgICAgd2FybmluZ3MucHVzaChgJHtrZXl9IHNob3VsZCBiZSBzZXQgdG8gYSB2YWxpZCB2YWx1ZSBpbiBwcm9kdWN0aW9uIG1vZGUuIEN1cnJlbnQgdmFsdWU6IFwiJHt2YWx1ZX1cImApXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEluIGRldmVsb3BtZW50LCB3YXJuIGlmIHBsYWNlaG9sZGVycyBhcmUgdXNlZCBidXQgZG9uJ3QgZmFpbFxuICAgICAgaWYgKHZhbHVlID09PSBwbGFjZWhvbGRlcikge1xuICAgICAgICB3YXJuaW5ncy5wdXNoKGAke2tleX0gaXMgc2V0IHRvIHBsYWNlaG9sZGVyIHZhbHVlIFwiJHtwbGFjZWhvbGRlcn1cIi4gVGhpcyBzaG91bGQgYmUgcmVwbGFjZWQgd2l0aCBhY3R1YWwgY3JlZGVudGlhbHMuYClcbiAgICAgIH0gZWxzZSBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgd2FybmluZ3MucHVzaChgJHtrZXl9IGlzIG5vdCBzZXQuIFVzaW5nIGRldmVsb3BtZW50IHBsYWNlaG9sZGVyLmApXG4gICAgICAgIC8vIFNldCBkZXZlbG9wbWVudCBwbGFjZWhvbGRlciBpZiBub3Qgc2V0XG4gICAgICAgIGVudltrZXldID0gZGV2ZWxvcG1lbnRQbGFjZWhvbGRlclxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNob3cgd2FybmluZ3NcbiAgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oaXNQcm9kdWN0aW9uID8gJ1x1MjZBMFx1RkUwRiAgUHJvZHVjdGlvbiBlbnZpcm9ubWVudCB3YXJuaW5nczonIDogJ1x1MjZBMFx1RkUwRiAgRGV2ZWxvcG1lbnQgZW52aXJvbm1lbnQgd2FybmluZ3M6JylcbiAgICB3YXJuaW5ncy5mb3JFYWNoKHdhcm5pbmcgPT4gY29uc29sZS53YXJuKGAgIC0gJHt3YXJuaW5nfWApKVxuICB9XG5cbiAgLy8gT25seSBmYWlsIGluIHByb2R1Y3Rpb25cbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVudmlyb25tZW50IHZhbGlkYXRpb24gZmFpbGVkOicpXG4gICAgZXJyb3JzLmZvckVhY2goZXJyb3IgPT4gY29uc29sZS5lcnJvcihgICAtICR7ZXJyb3J9YCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFbnZpcm9ubWVudCB2YWxpZGF0aW9uIGZhaWxlZC4gUGxlYXNlIHNldCByZXF1aXJlZCBzZWNyZXRzIGJlZm9yZSBkZXBsb3lpbmcuJylcbiAgfVxuXG4gIGNvbnNvbGUubG9nKCdcdTI3MDUgRW52aXJvbm1lbnQgdmFyaWFibGVzIHZhbGlkYXRlZCBzdWNjZXNzZnVsbHknKVxufVxuXG4vLyBWaXRlIGNvbmZpZ3VyYXRpb24gZm9yIGEgUmVhY3QgYXBwbGljYXRpb24gd2l0aCBvcHRpbWl6ZWQgYnVpbGRzXG4vLyBUaGlzIGNvbmZpZ3VyYXRpb24gcHJvdmlkZXMgc2VwYXJhdGUgb3B0aW1pemF0aW9ucyBmb3IgZGV2ZWxvcG1lbnQgYW5kIHByb2R1Y3Rpb25cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH06IENvbmZpZ0VudikgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKVxuICBjb25zdCBpc1Byb2R1Y3Rpb24gPSBtb2RlID09PSAncHJvZHVjdGlvbidcbiAgY29uc3QgaXNEZXZlbG9wbWVudCA9IG1vZGUgPT09ICdkZXZlbG9wbWVudCdcblxuICAvLyBWYWxpZGF0ZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYmVmb3JlIHByb2NlZWRpbmdcbiAgdmFsaWRhdGVFbnZpcm9ubWVudFZhcmlhYmxlcyhlbnYsIG1vZGUpXG5cbiAgLy8gR2VuZXJhdGUgYSBub25jZSBmb3IgQ1NQXG4gIGNvbnN0IG5vbmNlID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDE2KS50b1N0cmluZygnYmFzZTY0JylcblxuICAvLyBDU1AgcG9saWNpZXNcbiAgY29uc3QgYmFzZUNTUCA9IFwiZGVmYXVsdC1zcmMgJ3NlbGYnOyBzY3JpcHQtc3JjICdzZWxmJzsgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbTsgc3R5bGUtc3JjLWVsZW0gJ3NlbGYnICd1bnNhZmUtaW5saW5lJyBodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tOyBmb250LXNyYyAnc2VsZicgZGF0YTogaHR0cHM6Ly9mb250cy5nc3RhdGljLmNvbTsgaW1nLXNyYyAnc2VsZicgZGF0YTogYmxvYjo7IGNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tIGh0dHBzOi8vZm9udHMuZ3N0YXRpYy5jb20gd3M6IHdzczogd3M6Ly9sb2NhbGhvc3Q6KiB3czovLzEyNy4wLjAuMToqIGh0dHA6Ly9sb2NhbGhvc3Q6KiBodHRwOi8vMTI3LjAuMC4xOiogd3M6Ly9sb2NhbGhvc3Q6NDIwMCBodHRwOi8vbG9jYWxob3N0OjQyMDA7IHdvcmtlci1zcmMgJ3NlbGYnIGJsb2I6OyBjaGlsZC1zcmMgJ3NlbGYnIGJsb2I6OyBvYmplY3Qtc3JjICdub25lJzsgYmFzZS11cmkgJ3NlbGYnOyBmb3JtLWFjdGlvbiAnc2VsZic7XCJcblxuICBjb25zdCBkZXZDU1AgPSBiYXNlQ1NQLnJlcGxhY2UoXCJzY3JpcHQtc3JjICdzZWxmJ1wiLCBcInNjcmlwdC1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJyAndW5zYWZlLWV2YWwnXCIpXG4gIGNvbnN0IHByb2RDU1AgPSBiYXNlQ1NQLnJlcGxhY2UoXCJzY3JpcHQtc3JjICdzZWxmJ1wiLCBgc2NyaXB0LXNyYyAnc2VsZicgJ25vbmNlLSR7bm9uY2V9J2ApXG5cbiAgY29uc3Qgcm9vdERpciA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpXG5cbiAgcmV0dXJuIHtcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUExVR0lOUyAtIEV4dGVuZCBWaXRlJ3MgZnVuY3Rpb25hbGl0eSB3aXRoIHZhcmlvdXMgYnVpbGQtdGltZSB0b29sc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBwbHVnaW5zOiBbXG4gICAgICAvLyBSZXNvdXJjZSBoaW50cyBwbHVnaW4gZm9yIGJldHRlciBsb2FkaW5nIHBlcmZvcm1hbmNlXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdyZXNvdXJjZS1oaW50cycsXG4gICAgICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sOiBzdHJpbmcpIHtcbiAgICAgICAgICAvLyBBZGQgcHJlY29ubmVjdCBoaW50cyBmb3IgZXh0ZXJuYWwgcmVzb3VyY2VzXG4gICAgICAgICAgY29uc3QgcHJlY29ubmVjdEhpbnRzID0gW1xuICAgICAgICAgICAgJzxsaW5rIHJlbD1cInByZWNvbm5lY3RcIiBocmVmPVwiaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbVwiPicsXG4gICAgICAgICAgICAnPGxpbmsgcmVsPVwicHJlY29ubmVjdFwiIGhyZWY9XCJodHRwczovL2ZvbnRzLmdzdGF0aWMuY29tXCIgY3Jvc3NvcmlnaW4+JyxcbiAgICAgICAgICBdLmpvaW4oJ1xcbicpXG5cbiAgICAgICAgICAvLyBBZGQgRE5TIHByZWZldGNoIGZvciBwb3RlbnRpYWwgZXh0ZXJuYWwgcmVzb3VyY2VzXG4gICAgICAgICAgY29uc3QgZG5zUHJlZmV0Y2ggPSBbXG4gICAgICAgICAgICAnPGxpbmsgcmVsPVwiZG5zLXByZWZldGNoXCIgaHJlZj1cImh0dHBzOi8vd3d3Lmdvb2dsZS1hbmFseXRpY3MuY29tXCI+JyxcbiAgICAgICAgICBdLmpvaW4oJ1xcbicpXG5cbiAgICAgICAgICAvLyBJbnNlcnQgaGludHMgaW4gdGhlIGhlYWRcbiAgICAgICAgICByZXR1cm4gaHRtbC5yZXBsYWNlKCc8L2hlYWQ+JywgYCR7cHJlY29ubmVjdEhpbnRzfVxcbiR7ZG5zUHJlZmV0Y2h9XFxuPC9oZWFkPmApXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvLyBDU1AgUGx1Z2luIGZvciBlbnZpcm9ubWVudC1hd2FyZSBDb250ZW50IFNlY3VyaXR5IFBvbGljeVxuICAgICAge1xuICAgICAgICBuYW1lOiAnY3NwLXBsdWdpbicsXG4gICAgICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sOiBzdHJpbmcpIHtcbiAgICAgICAgICBjb25zdCBjc3AgPSBpc0RldmVsb3BtZW50ID8gZGV2Q1NQIDogcHJvZENTUFxuICAgICAgICAgIHJldHVybiBodG1sXG4gICAgICAgICAgICAucmVwbGFjZShcbiAgICAgICAgICAgICAgLzxtZXRhXFxzK2h0dHAtZXF1aXY9XCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiXFxzK2NvbnRlbnQ9XCJbXlwiXSpcIlxccypcXC8/Pi8sXG4gICAgICAgICAgICAgIGA8bWV0YSBodHRwLWVxdWl2PVwiQ29udGVudC1TZWN1cml0eS1Qb2xpY3lcIiBjb250ZW50PVwiJHtjc3B9XCIgLz5gXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAucmVwbGFjZShcbiAgICAgICAgICAgICAgLzxzY3JpcHQ+KFtcXHNcXFNdKj8pPFxcL3NjcmlwdD4vZyxcbiAgICAgICAgICAgICAgKG1hdGNoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpc1Byb2R1Y3Rpb24gJiYgY29udGVudC50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBgPHNjcmlwdCBub25jZT1cIiR7bm9uY2V9XCI+JHtjb250ZW50fTwvc2NyaXB0PmBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIFJlYWN0IHBsdWdpbiBoYW5kbGVzIEpTWCB0cmFuc2Zvcm1hdGlvbiBhbmQgRmFzdCBSZWZyZXNoIGluIGRldmVsb3BtZW50XG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCB3ZSBzdHJpcCBwcm9wLXR5cGVzIHRvIHJlZHVjZSBidW5kbGUgc2l6ZSBzaW5jZSB0aGV5J3JlIG9ubHkgdXNlZnVsIGluIGRldmVsb3BtZW50XG4gICAgICByZWFjdChcbiAgICAgICAgaXNQcm9kdWN0aW9uID8ge1xuICAgICAgICAgIGJhYmVsOiB7XG4gICAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICAgIFsndHJhbnNmb3JtLXJlYWN0LXJlbW92ZS1wcm9wLXR5cGVzJywgeyByZW1vdmVJbXBvcnQ6IHRydWUgfV0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0gOiB7fVxuICAgICAgKSxcblxuICAgICAgLy8gQnVuZGxlIGFuYWx5emVyIGdlbmVyYXRlcyBhIHZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiB5b3VyIGJ1bmRsZSBjb21wb3NpdGlvblxuICAgICAgLy8gRW5hYmxlIHdpdGggQU5BTFlaRT10cnVlIGVudmlyb25tZW50IHZhcmlhYmxlIG9yIGFuYWx5emUgbW9kZVxuICAgICAgLy8gVGhpcyBoZWxwcyBpZGVudGlmeSBvcHRpbWl6YXRpb24gb3Bwb3J0dW5pdGllcyBsaWtlIGxhcmdlIGRlcGVuZGVuY2llc1xuICAgICAgLi4uKGVudi5BTkFMWVpFIHx8IG1vZGUgPT09ICdhbmFseXplJyA/IFt2aXN1YWxpemVyKHtcbiAgICAgICAgZmlsZW5hbWU6ICdkaXN0L2J1bmRsZS1hbmFseXNpcy5odG1sJyxcbiAgICAgICAgb3BlbjogZW52LkFOQUxZWkVfT1BFTiA9PT0gJ3RydWUnIHx8IG1vZGUgPT09ICdhbmFseXplJyxcbiAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICAgIHRlbXBsYXRlOiAndHJlZW1hcCcsIC8vIEhpZXJhcmNoaWNhbCB2aWV3IG9mIGJ1bmRsZSBjb250ZW50c1xuICAgICAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgICAgIC8vIEVuaGFuY2VkIGFuYWx5c2lzIG9wdGlvbnNcbiAgICAgICAgcHJvamVjdFJvb3Q6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgIHRpdGxlOiAnQ2hhbnVrYSBQbGF0Zm9ybSBCdW5kbGUgQW5hbHlzaXMnLFxuICAgICAgfSkgYXMgUGx1Z2luXSA6IFtdKSxcblxuICAgICAgLy8gQ29tcHJlc3Npb24gcGx1Z2lucyBjcmVhdGUgcHJlLWNvbXByZXNzZWQgdmVyc2lvbnMgb2YgeW91ciBhc3NldHNcbiAgICAgIC8vIE1vZGVybiBDRE5zIGFuZCB3ZWIgc2VydmVycyBjYW4gc2VydmUgdGhlc2UgZGlyZWN0bHksIHJlZHVjaW5nIHRyYW5zZmVyIHRpbWVcbiAgICAgIC8vIEJyb3RsaSB0eXBpY2FsbHkgYWNoaWV2ZXMgMTUtMjAlIGJldHRlciBjb21wcmVzc2lvbiB0aGFuIEd6aXBcbiAgICAgIC4uLihpc1Byb2R1Y3Rpb24gPyBbXG4gICAgICAgIHZpdGVDb21wcmVzc2lvbih7XG4gICAgICAgICAgYWxnb3JpdGhtOiAnYnJvdGxpQ29tcHJlc3MnLFxuICAgICAgICAgIGV4dDogJy5icicsXG4gICAgICAgICAgdGhyZXNob2xkOiAxMDI0LCAvLyBPbmx5IGNvbXByZXNzIGZpbGVzIGxhcmdlciB0aGFuIDFLQiB0byBhdm9pZCBvdmVyaGVhZFxuICAgICAgICAgIGRlbGV0ZU9yaWdpbkZpbGU6IGZhbHNlLCAvLyBLZWVwIG9yaWdpbmFscyBmb3IgY29tcGF0aWJpbGl0eSBmYWxsYmFja1xuICAgICAgICB9KSxcbiAgICAgICAgdml0ZUNvbXByZXNzaW9uKHtcbiAgICAgICAgICBhbGdvcml0aG06ICdnemlwJyxcbiAgICAgICAgICBleHQ6ICcuZ3onLFxuICAgICAgICAgIHRocmVzaG9sZDogMTAyNCxcbiAgICAgICAgICBkZWxldGVPcmlnaW5GaWxlOiBmYWxzZSxcbiAgICAgICAgfSlcbiAgICAgIF0gOiBbXSksXG4gICAgXSxcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDU1MgQ09ORklHVVJBVElPTiAtIENvbnRyb2wgaG93IHN0eWxlc2hlZXRzIGFyZSBwcm9jZXNzZWRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY3NzOiB7XG4gICAgICAvLyBTb3VyY2UgbWFwcyBpbiBkZXZlbG9wbWVudCBoZWxwIHlvdSBmaW5kIHRoZSBvcmlnaW5hbCBzb3VyY2Ugb2YgQ1NTIHJ1bGVzXG4gICAgICAvLyBUaGlzIG1ha2VzIGRlYnVnZ2luZyBzdHlsZWQgY29tcG9uZW50cyBtdWNoIGVhc2llclxuICAgICAgZGV2U291cmNlbWFwOiBpc0RldmVsb3BtZW50LFxuICAgICAgcG9zdGNzczogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuJyksXG4gICAgfSxcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBNT0RVTEUgUkVTT0xVVElPTiAtIENvbmZpZ3VyZSBob3cgaW1wb3J0cyBhcmUgcmVzb2x2ZWRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgcmVzb2x2ZToge1xuICAgICAgLy8gUGF0aCBhbGlhc2VzIGxldCB5b3UgdXNlIGNsZWFuZXIgaW1wb3J0cyBsaWtlICdAL2NvbXBvbmVudHMnIGluc3RlYWQgb2YgJy4uLy4uLy4uL2NvbXBvbmVudHMnXG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi9zcmMnKSxcbiAgICAgICAgJ0BjbGllbnQnOiBwYXRoLnJlc29sdmUocm9vdERpciwgJy4vc3JjJyksXG4gICAgICAgICdAY29yZSc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi9zcmMvaW5mcmFzdHJ1Y3R1cmUnKSxcbiAgICAgICAgJ0BsaWInOiBwYXRoLnJlc29sdmUocm9vdERpciwgJy4vc3JjL2xpYicpLFxuICAgICAgICAnQGZlYXR1cmVzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuL3NyYy9mZWF0dXJlcycpLFxuICAgICAgICAnQGFwcCc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi9zcmMvYXBwJyksXG4gICAgICAgICdAaG9va3MnOiBwYXRoLnJlc29sdmUocm9vdERpciwgJy4vc3JjL2xpYi9ob29rcycpLFxuICAgICAgICAnQHV0aWxzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuL3NyYy9saWIvdXRpbHMnKSxcblxuICAgICAgICAvLyBXb3Jrc3BhY2UtbGV2ZWwgbW9kdWxlc1xuICAgICAgICAnQHNoYXJlZCc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi4vc2hhcmVkJyksXG4gICAgICAgICdAc2hhcmVkL3R5cGVzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuLi9zaGFyZWQvdHlwZXMnKSxcbiAgICAgICAgJ0BzaGFyZWQvdmFsaWRhdGlvbic6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi4vc2hhcmVkL3ZhbGlkYXRpb24nKSxcbiAgICAgICAgJ0BzaGFyZWQvY29uc3RhbnRzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuLi9zaGFyZWQvY29uc3RhbnRzJyksXG4gICAgICAgICdAc2hhcmVkL3V0aWxzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuLi9zaGFyZWQvdXRpbHMnKSxcbiAgICAgICAgJ0BzaGFyZWQvY29yZSc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi4vc2hhcmVkL2NvcmUnKSxcbiAgICAgICAgJ0BzaGFyZWQvcGxhdGZvcm0nOiBwYXRoLnJlc29sdmUocm9vdERpciwgJy4uL3NoYXJlZC9wbGF0Zm9ybScpLFxuICAgICAgICAnQHNoYXJlZC9pMThuJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuLi9zaGFyZWQvaTE4bicpLFxuICAgICAgICAnQHdvcmtzcGFjZSc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi4vc2hhcmVkJyksXG4gICAgICAgICdAd29ya3NwYWNlL3R5cGVzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuLi9zaGFyZWQvdHlwZXMnKSxcbiAgICAgICAgJ0B3b3Jrc3BhY2UvY29yZSc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi4vc2hhcmVkL2NvcmUnKSxcbiAgICAgICAgJ0B3b3Jrc3BhY2UvdmFsaWRhdGlvbic6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi4vc2hhcmVkL3ZhbGlkYXRpb24nKSxcbiAgICAgICAgJ0B3b3Jrc3BhY2UvY29uc3RhbnRzJzogcGF0aC5yZXNvbHZlKHJvb3REaXIsICcuLi9zaGFyZWQvY29uc3RhbnRzJyksXG5cbiAgICAgICAgLy8gRXhjbHVkZSBzZXJ2ZXItb25seSBtb2R1bGVzIChyZWRpcmVjdCB0byBzdHVicylcbiAgICAgICAgJ0BzZXJ2ZXItc3R1Yi9kYXRhYmFzZSc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi9zcmMvc3R1YnMvZGF0YWJhc2Utc3R1Yi50cycpLFxuICAgICAgICAnQHNlcnZlci1zdHViL21pZGRsZXdhcmUnOiBwYXRoLnJlc29sdmUocm9vdERpciwgJy4vc3JjL3N0dWJzL21pZGRsZXdhcmUtc3R1Yi50cycpLFxuXG4gICAgICAgIC8vIFNlY3VyaXR5IGZpeGVzIC0gcmVkaXJlY3QgdG8gc2VjdXJlIGltcGxlbWVudGF0aW9uc1xuICAgICAgICAnQHNlY3VyZSc6IHBhdGgucmVzb2x2ZShyb290RGlyLCAnLi9zcmMvbGliL3V0aWxzL3NlY3VyZScpLFxuXG4gICAgICAgIC8vIExvZ2dlciBjb25zb2xpZGF0aW9uIC0gcmVkaXJlY3QgYWxsIGxvZ2dlciBpbXBvcnRzIHRvIHVuaWZpZWQgaW1wbGVtZW50YXRpb25cbiAgICAgICAgJ0Bsb2dnZXInOiBwYXRoLnJlc29sdmUocm9vdERpciwgJy4vc3JjL2xpYi91dGlscy9sb2dnZXInKSxcbiAgICAgIH0sXG4gICAgICAvLyBFeHRlbnNpb24gcmVzb2x1dGlvbiBvcmRlciBhZmZlY3RzIGxvb2t1cCBzcGVlZFxuICAgICAgLy8gTW9yZSBjb21tb24gZXh0ZW5zaW9ucyBmaXJzdCBtZWFucyBmZXdlciBmYWlsZWQgbG9va3Vwc1xuICAgICAgZXh0ZW5zaW9uczogWycubWpzJywgJy5qcycsICcubXRzJywgJy50cycsICcuanN4JywgJy50c3gnLCAnLmpzb24nXSxcbiAgICB9LFxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIERFVkVMT1BNRU5UIFNFUlZFUiAtIENvbmZpZ3VyYXRpb24gZm9yIGxvY2FsIGRldmVsb3BtZW50XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogNTE3MyxcbiAgICAgIGhvc3Q6IHRydWUsIC8vIExpc3RlbiBvbiBhbGwgYWRkcmVzc2VzIGZvciBuZXR3b3JrIGFjY2Vzc1xuXG4gICAgICAvLyBDT1JTIHNldHRpbmdzIGNvbnRyb2wgd2hpY2ggb3JpZ2lucyBjYW4gbWFrZSByZXF1ZXN0cyB0byB5b3VyIGRldiBzZXJ2ZXJcbiAgICAgIC8vIFdpZGUgb3BlbiBpbiBkZXZlbG9wbWVudCBmb3IgZWFzZSBvZiB1c2UsIGxvY2tlZCBkb3duIGluIHByb2R1Y3Rpb25cbiAgICAgIGNvcnM6IHtcbiAgICAgICAgb3JpZ2luOiBpc0RldmVsb3BtZW50ID8gJyonIDogZmFsc2UsXG4gICAgICAgIGNyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgfSxcblxuICAgICAgLy8gQ29udGVudCBTZWN1cml0eSBQb2xpY3kgaGVscHMgcHJldmVudCBYU1MgYXR0YWNrc1xuICAgICAgLy8gRGV2ZWxvcG1lbnQgbmVlZHMgbG9vc2VyIHBvbGljaWVzIGZvciBob3QgbW9kdWxlIHJlcGxhY2VtZW50XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVNlY3VyaXR5LVBvbGljeSc6IGlzRGV2ZWxvcG1lbnRcbiAgICAgICAgICA/IFwiZGVmYXVsdC1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJyAndW5zYWZlLWV2YWwnOyBpbWctc3JjICdzZWxmJyBkYXRhOiBibG9iOjsgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbTsgZm9udC1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOi8vZm9udHMuZ3N0YXRpYy5jb207IGNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tIGh0dHBzOi8vZm9udHMuZ3N0YXRpYy5jb20gd3M6IHdzczogaHR0cDovL2xvY2FsaG9zdDoqIGh0dHBzOi8vbG9jYWxob3N0OiogaHR0cDovLzEyNy4wLjAuMToqOyB3b3JrZXItc3JjICdzZWxmJyBibG9iOjsgY2hpbGQtc3JjICdzZWxmJyBibG9iOjtcIlxuICAgICAgICAgIDogXCJkZWZhdWx0LXNyYyAnc2VsZic7IGltZy1zcmMgJ3NlbGYnIGRhdGE6IGJsb2I6OyBzdHlsZS1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJyBodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tOyBmb250LXNyYyAnc2VsZicgZGF0YTogaHR0cHM6Ly9mb250cy5nc3RhdGljLmNvbTsgY29ubmVjdC1zcmMgJ3NlbGYnIGh0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20gaHR0cHM6Ly9mb250cy5nc3RhdGljLmNvbTsgd29ya2VyLXNyYyAnc2VsZicgYmxvYjo7IGNoaWxkLXNyYyAnc2VsZicgYmxvYjo7XCIsXG4gICAgICB9LFxuXG4gICAgICAvLyBIb3QgTW9kdWxlIFJlcGxhY2VtZW50IGtlZXBzIHlvdXIgYXBwIHN0YXRlIHdoaWxlIHVwZGF0aW5nIGNvZGVcbiAgICAgIGhtcjoge1xuICAgICAgICBvdmVybGF5OiB0cnVlLCAvLyBTaG93IGNvbXBpbGF0aW9uIGVycm9ycyBhcyBhbiBvdmVybGF5IGluIHRoZSBicm93c2VyXG4gICAgICB9LFxuXG4gICAgICAvLyBGaWxlIHdhdGNoaW5nIGNvbmZpZ3VyYXRpb24gZm9yIGRldGVjdGluZyBjaGFuZ2VzXG4gICAgICB3YXRjaDoge1xuICAgICAgICAvLyBQb2xsaW5nIGNoZWNrcyBmaWxlcyBwZXJpb2RpY2FsbHkgaW5zdGVhZCBvZiB1c2luZyBmaWxlc3lzdGVtIGV2ZW50c1xuICAgICAgICAvLyBPbmx5IG5lZWRlZCBpbiBjb250YWluZXJzIG9yIG5ldHdvcmsgZHJpdmVzIHdoZXJlIGV2ZW50cyBkb24ndCB3b3JrXG4gICAgICAgIHVzZVBvbGxpbmc6IHByb2Nlc3MuZW52LlVTRV9QT0xMSU5HID09PSAndHJ1ZScsXG4gICAgICAgIGlnbm9yZWQ6IFsnKiovbm9kZV9tb2R1bGVzLyoqJywgJyoqL2Rpc3QvKionLCAnKiovLmdpdC8qKiddLFxuICAgICAgfSxcblxuICAgICAgLy8gUHJveHkgY29uZmlndXJhdGlvbiB0byByb3V0ZSBBUEkgY2FsbHMgdG8gdGhlIGJhY2tlbmRcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6NDIwMCcsICAvLyBVc2UgSVB2NCBleHBsaWNpdGx5IGluc3RlYWQgb2YgbG9jYWxob3N0XG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gR0xPQkFMIENPTlNUQU5UUyAtIFZhbHVlcyByZXBsYWNlZCBhdCBidWlsZCB0aW1lXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGRlZmluZToge1xuICAgICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkobW9kZSksXG4gICAgICAvLyBCdWlsZCB0aW1lc3RhbXAgdXNlZnVsIGZvciBjYWNoZSBidXN0aW5nIGFuZCBkZWJ1Z2dpbmcgcHJvZHVjdGlvbiBpc3N1ZXNcbiAgICAgICdfX0JVSUxEX1RJTUVfXyc6IEpTT04uc3RyaW5naWZ5KG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSksXG4gICAgICAvLyBOb3RlOiBSZW1vdmVkIHByb2Nlc3MuZW52LCBwcm9jZXNzLnZlcnNpb25zLCBhbmQgcHJvY2Vzcy5wbGF0Zm9ybSBkZWZpbml0aW9uc1xuICAgICAgLy8gYXMgdGhleSBjYXVzZSBpc3N1ZXMgd2l0aCBWaXRlJ3MgbW9kdWxlIHN5c3RlbS4gVXNlIGltcG9ydC5tZXRhLmVudiBpbnN0ZWFkLlxuICAgIH0sXG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQlVJTEQgQ09ORklHVVJBVElPTiAtIFByb2R1Y3Rpb24gYnVpbGQgc2V0dGluZ3NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgYnVpbGQ6IHtcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuXG4gICAgICAvLyBDU1MgY29kZSBzcGxpdHRpbmcgYWxsb3dzIGVhY2ggcm91dGUgdG8gbG9hZCBvbmx5IGl0cyByZXF1aXJlZCBzdHlsZXNcbiAgICAgIC8vIFRoaXMgaW1wcm92ZXMgaW5pdGlhbCBsb2FkIHRpbWUgYnkgZGVmZXJyaW5nIG5vbi1jcml0aWNhbCBDU1NcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcblxuICAgICAgLy8gU291cmNlIG1hcHMgaGVscCBkZWJ1ZyBwcm9kdWN0aW9uIGlzc3Vlc1xuICAgICAgLy8gJ2hpZGRlbicgY3JlYXRlcyBtYXBzIGJ1dCBkb2Vzbid0IHJlZmVyZW5jZSB0aGVtIGluIGJ1bmRsZXMgZm9yIHNlY3VyaXR5XG4gICAgICBzb3VyY2VtYXA6IGlzRGV2ZWxvcG1lbnQgPyB0cnVlIDogJ2hpZGRlbicgYXMgY29uc3QsXG5cbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgLy8gTWFudWFsIGNodW5rIHNwbGl0dGluZyBpcyB0aGUgbW9zdCBpbXBvcnRhbnQgb3B0aW1pemF0aW9uIGZvciBsb2FkIHBlcmZvcm1hbmNlXG4gICAgICAgICAgLy8gR29vZCBjaHVua2luZyBzdHJhdGVneSBiYWxhbmNlcyBwYXJhbGxlbCBsb2FkaW5nIHdpdGggY2FjaGluZyBlZmZpY2llbmN5XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICAgIC8vIFJlYWN0IGNvcmUgaXMgdXNlZCBldmVyeXdoZXJlLCBzbyBpdCBnZXRzIGl0cyBvd24gY2h1bmtcbiAgICAgICAgICAgICAgLy8gVGhpcyBjaHVuayBpcyBoaWdobHkgY2FjaGVhYmxlIHNpbmNlIFJlYWN0IHVwZGF0ZXMgaW5mcmVxdWVudGx5XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0L2pzeC1ydW50aW1lJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcidcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFJlYWN0IFJvdXRlciBmb3IgbmF2aWdhdGlvblxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyb3V0ZXItdmVuZG9yJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gVUkgbGlicmFyaWVzIGFyZSBncm91cGVkIHRvZ2V0aGVyIGJlY2F1c2UgdGhleSdyZSBvZnRlbiB1c2VkIHRvZ2V0aGVyXG4gICAgICAgICAgICAgIC8vIEtlZXBpbmcgcmVsYXRlZCBkZXBlbmRlbmNpZXMgdG9nZXRoZXIgcmVkdWNlcyB0aGUgbnVtYmVyIG9mIHJlcXVlc3RzXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHJhZGl4LXVpJykgfHwgaWQuaW5jbHVkZXMoJ2x1Y2lkZS1yZWFjdCcpIHx8XG4gICAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnY2xzeCcpIHx8IGlkLmluY2x1ZGVzKCd0YWlsd2luZC1tZXJnZScpIHx8XG4gICAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnY2xhc3MtdmFyaWFuY2UtYXV0aG9yaXR5JykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3VpLXZlbmRvcidcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIERhdGEgZmV0Y2hpbmcgYW5kIGZvcm0gbGlicmFyaWVzIHBvd2VyIGludGVyYWN0aXZlIGZlYXR1cmVzXG4gICAgICAgICAgICAgIC8vIEdyb3VwaW5nIHRoZW0gbWVhbnMgdGhleSBsb2FkIHRvZ2V0aGVyIHdoZW4gbmVlZGVkXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JykgfHwgaWQuaW5jbHVkZXMoJ2F4aW9zJykgfHxcbiAgICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdyZWFjdC1ob29rLWZvcm0nKSB8fCBpZC5pbmNsdWRlcygnem9kJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2RhdGEtdmVuZG9yJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2hhcnQgYW5kIHZpc3VhbGl6YXRpb24gbGlicmFyaWVzIChoZWF2eSlcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWNoYXJ0cycpIHx8IGlkLmluY2x1ZGVzKCdkMycpIHx8IGlkLmluY2x1ZGVzKCdjaGFydCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdjaGFydHMtdmVuZG9yJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gRGF0ZSB1dGlsaXRpZXNcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdkYXRlLWZucycpIHx8IGlkLmluY2x1ZGVzKCdkYXlqcycpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdkYXRlLXZlbmRvcidcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFJlZHV4IGFuZCBzdGF0ZSBtYW5hZ2VtZW50XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVkdXgnKSB8fCBpZC5pbmNsdWRlcygnQHJlZHV4anMnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnc3RhdGUtdmVuZG9yJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ2F0Y2gtYWxsIGZvciByZW1haW5pbmcgdmVuZG9yIGNvZGVcbiAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3InXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFwcGxpY2F0aW9uIGNvZGUgc3BsaXR0aW5nIGJ5IGZlYXR1cmUgaW1wcm92ZXMgY29kZSBvcmdhbml6YXRpb25cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3JjLycpKSB7XG4gICAgICAgICAgICAgIC8vIENvcmUgaW5mcmFzdHJ1Y3R1cmUgaXMgbmVlZGVkIGV2ZXJ5d2hlcmUsIHNvIGxvYWQgaXQgdXBmcm9udFxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3NyYy9hcHAvJykgfHwgXG4gICAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnc3JjL2luZnJhc3RydWN0dXJlLycpIHx8XG4gICAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnc3JjL2xpYi9kZXNpZ24tc3lzdGVtLycpIHx8XG4gICAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnc3JjL2xpYi91dGlscy8nKSB8fFxuICAgICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3NyYy9saWIvaG9va3MvJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2FwcC1jb3JlJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gSW5mcmFzdHJ1Y3R1cmUgbGF5ZXJcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzcmMvaW5mcmFzdHJ1Y3R1cmUvJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2luZnJhc3RydWN0dXJlJ1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gRmVhdHVyZS1zcGVjaWZpYyBjb2RlIGdldHMgaXRzIG93biBjaHVuayBwZXIgZmVhdHVyZVxuICAgICAgICAgICAgICAvLyBUaGlzIGVuYWJsZXMgcm91dGUtYmFzZWQgY29kZSBzcGxpdHRpbmcgZm9yIG9wdGltYWwgbG9hZGluZ1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3NyYy9mZWF0dXJlcy8nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gaWQubWF0Y2goL3NyY1xcL2ZlYXR1cmVzXFwvKFteL10rKS8pXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gYGZlYXR1cmUtJHttYXRjaFsxXX1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnZmVhdHVyZXMnXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBVSSBjb21wb25lbnRzIGJ5IGNhdGVnb3J5XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3JjL2xpYi91aS8nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gaWQubWF0Y2goL3NyY1xcL2xpYlxcL3VpXFwvKFteL10rKS8pXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgICAgICAvLyBHcm91cCByZWxhdGVkIFVJIGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gbWF0Y2hbMV1cbiAgICAgICAgICAgICAgICAgIGlmIChbJ2Rhc2hib2FyZCcsICduYXZpZ2F0aW9uJywgJ2xheW91dCddLmluY2x1ZGVzKGNhdGVnb3J5KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3VpLWNvcmUnXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoWydsb2FkaW5nJywgJ29mZmxpbmUnLCAnc3RhdHVzJ10uaW5jbHVkZXMoY2F0ZWdvcnkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAndWktZmVlZGJhY2snXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoWydtb2JpbGUnLCAnYWNjZXNzaWJpbGl0eSddLmluY2x1ZGVzKGNhdGVnb3J5KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3VpLWFkYXB0aXZlJ1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGB1aS0ke2NhdGVnb3J5fWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICd1aSdcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFNlcnZpY2VzIGxheWVyXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3JjL2xpYi9zZXJ2aWNlcy8nKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnc2VydmljZXMnXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICByZXR1cm4gJ2FwcCdcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byB1bmRlZmluZWQgdG8gbGV0IFZpdGUgaGFuZGxlIHRoZSByZXN0XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgICAgICAgfSxcblxuICAgICAgICAgIC8vIEhhc2gtYmFzZWQgZmlsZW5hbWVzIGVuc3VyZSBicm93c2VycyBuZXZlciBzZXJ2ZSBzdGFsZSBjYWNoZWQgZmlsZXNcbiAgICAgICAgICAvLyBXaGVuIGNvbnRlbnQgY2hhbmdlcywgdGhlIGhhc2ggY2hhbmdlcywgZm9yY2luZyBhIGZyZXNoIGRvd25sb2FkXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXG5cbiAgICAgICAgICAvLyBPcmdhbml6ZWQgYXNzZXQgc3RydWN0dXJlIG1ha2VzIGRlYnVnZ2luZyBhbmQgZGVwbG95bWVudCBlYXNpZXJcbiAgICAgICAgICAvLyBEaWZmZXJlbnQgYXNzZXQgdHlwZXMgZ28gdG8gZGlmZmVyZW50IGZvbGRlcnMgZm9yIGNsYXJpdHlcbiAgICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbzogeyBuYW1lPzogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBhc3NldEluZm8ubmFtZSB8fCAnJ1xuXG4gICAgICAgICAgICBpZiAoL1xcLihwbmd8anBlP2d8c3ZnfGdpZnx3ZWJwfGF2aWZ8dGlmZnxibXB8aWNvKSQvaS50ZXN0KG5hbWUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYXNzZXRzL2ltYWdlcy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJ1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoL1xcLih3b2ZmMj98ZW90fHR0ZnxvdGYpJC9pLnRlc3QobmFtZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdhc3NldHMvZm9udHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXSdcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKC9cXC5jc3MkL2kudGVzdChuYW1lKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9jc3MvW25hbWVdLVtoYXNoXVtleHRuYW1lXSdcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKC9cXC5qc29uJC9pLnRlc3QobmFtZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdhc3NldHMvZGF0YS9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJ1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9taXNjL1tuYW1lXS1baGFzaF1bZXh0bmFtZV0nXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUcmVlLXNoYWtpbmcgcmVtb3ZlcyB1bnVzZWQgY29kZSBmcm9tIHlvdXIgZmluYWwgYnVuZGxlXG4gICAgICAgIC8vIFRoZXNlIGFnZ3Jlc3NpdmUgc2V0dGluZ3MgbWF4aW1pemUgZGVhZCBjb2RlIGVsaW1pbmF0aW9uXG4gICAgICAgIHRyZWVzaGFrZToge1xuICAgICAgICAgIC8vIERvbid0IGFzc3VtZSBleHRlcm5hbCBwYWNrYWdlcyBoYXZlIHNpZGUgZWZmZWN0cyB1bmxlc3Mgc3BlY2lmaWVkXG4gICAgICAgICAgLy8gVGhpcyBhbGxvd3MgbW9yZSBhZ2dyZXNzaXZlIG9wdGltaXphdGlvbiBvZiBsaWJyYXJ5IGNvZGVcbiAgICAgICAgICBtb2R1bGVTaWRlRWZmZWN0czogJ25vLWV4dGVybmFsJyBhcyBjb25zdCxcbiAgICAgICAgICAvLyBSZWFkaW5nIHByb3BlcnRpZXMgZG9lc24ndCBjYXVzZSBzaWRlIGVmZmVjdHMgaW4gbW9zdCBjYXNlc1xuICAgICAgICAgIC8vIFRoaXMgZW5hYmxlcyByZW1vdmFsIG9mIHVudXNlZCBwcm9wZXJ0eSBhY2Nlc3Nlc1xuICAgICAgICAgIHByb3BlcnR5UmVhZFNpZGVFZmZlY3RzOiBmYWxzZSxcbiAgICAgICAgICAvLyBEb24ndCBkaXNhYmxlIG9wdGltaXphdGlvbnMgYXJvdW5kIHRyeS1jYXRjaCBibG9ja3NcbiAgICAgICAgICAvLyBNb2Rlcm4gYnVuZGxlcnMgY2FuIGhhbmRsZSB0aGVzZSBzYWZlbHlcbiAgICAgICAgICB0cnlDYXRjaERlb3B0aW1pemF0aW9uOiBmYWxzZSxcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBXYXJuaW5nIGZpbHRlcmluZyBrZWVwcyB5b3VyIGJ1aWxkIG91dHB1dCBjbGVhbiBhbmQgYWN0aW9uYWJsZVxuICAgICAgICBvbndhcm4od2FybmluZywgd2Fybikge1xuICAgICAgICAgIC8vIENpcmN1bGFyIGRlcGVuZGVuY2llcyBhcmUgY29tbW9uIGluIFJlYWN0IGFwcHMgYW5kIHVzdWFsbHkgaGFybWxlc3NcbiAgICAgICAgICBpZiAod2FybmluZy5jb2RlID09PSAnQ0lSQ1VMQVJfREVQRU5ERU5DWScpIHJldHVyblxuICAgICAgICAgIC8vIFRoaXMgd2FybmluZyBhcHBlYXJzIHdpdGggc29tZSBsaWJyYXJpZXMgYnV0IGRvZXNuJ3QgYWZmZWN0IGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgICBpZiAod2FybmluZy5jb2RlID09PSAnVEhJU19JU19VTkRFRklORUQnKSByZXR1cm5cbiAgICAgICAgICB3YXJuKHdhcm5pbmcpXG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8vIENodW5rIHNpemUgbGltaXQgZW5mb3JjZXMgZGlzY2lwbGluZSBhcm91bmQgYnVuZGxlIHNpemVcbiAgICAgIC8vIElmIGV4Y2VlZGVkLCB5b3UgbmVlZCB0byBpbXByb3ZlIGNvZGUgc3BsaXR0aW5nIG9yIHJlbW92ZSBkZXBlbmRlbmNpZXNcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNDAwLCAvLyBSZWR1Y2VkIGZyb20gNTAwS0IgdG8gNDAwS0IgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuXG4gICAgICAvLyBUZXJzZXIgbWluaWZpY2F0aW9uIHByb2R1Y2VzIHNtYWxsZXIgYnVuZGxlcyB0aGFuIGVzYnVpbGRcbiAgICAgIC8vIFRoZSB0cmFkZW9mZiBpcyBzbGlnaHRseSBzbG93ZXIgYnVpbGRzLCBidXQgd29ydGggaXQgZm9yIHByb2R1Y3Rpb25cbiAgICAgIG1pbmlmeTogaXNQcm9kdWN0aW9uID8gJ3RlcnNlcicgYXMgY29uc3QgOiBmYWxzZSxcblxuICAgICAgLi4uKGlzUHJvZHVjdGlvbiA/IHtcbiAgICAgICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgICAvLyBSZW1vdmluZyBjb25zb2xlIHN0YXRlbWVudHMgcHJldmVudHMgZGVidWcgY29kZSBmcm9tIHJlYWNoaW5nIHVzZXJzXG4gICAgICAgICAgICAvLyBLZWVwIGNvbnNvbGUuZXJyb3IgZm9yIHByb2R1Y3Rpb24gZXJyb3IgbW9uaXRvcmluZ1xuICAgICAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcbiAgICAgICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJywgJ2NvbnNvbGUuZGVidWcnLCAnY29uc29sZS50cmFjZSddLFxuICAgICAgICAgICAgLy8gTXVsdGlwbGUgY29tcHJlc3Npb24gcGFzc2VzIGZpbmQgbW9yZSBvcHRpbWl6YXRpb24gb3Bwb3J0dW5pdGllc1xuICAgICAgICAgICAgcGFzc2VzOiAyLCAvLyBCYWxhbmNlZDogMiBwYXNzZXMgZm9yIGdvb2QgY29tcHJlc3Npb24gd2l0aG91dCBleGNlc3NpdmUgYnVpbGQgdGltZVxuICAgICAgICAgICAgLy8gVGhlc2UgdW5zYWZlIG9wdGltaXphdGlvbnMgd29yayBpbiBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgICAgIHVuc2FmZV9hcnJvd3M6IHRydWUsIC8vIENvbnZlcnQgZnVuY3Rpb25zIHRvIGFycm93IGZ1bmN0aW9uc1xuICAgICAgICAgICAgdW5zYWZlX21ldGhvZHM6IHRydWUsIC8vIE9wdGltaXplIG1ldGhvZCBjYWxsc1xuICAgICAgICAgICAgdW5zYWZlX2NvbXBzOiB0cnVlLCAvLyBPcHRpbWl6ZSBjb21wYXJpc29uc1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHVudXNlZCBjb2RlIG1vcmUgYWdncmVzc2l2ZWx5XG4gICAgICAgICAgICBkZWFkX2NvZGU6IHRydWUsXG4gICAgICAgICAgICB1bnVzZWQ6IHRydWUsXG4gICAgICAgICAgICAvLyBSZWR1Y2UgZnVuY3Rpb24gY2FsbHNcbiAgICAgICAgICAgIHJlZHVjZV9mdW5jczogdHJ1ZSxcbiAgICAgICAgICAgIHJlZHVjZV92YXJzOiB0cnVlLFxuICAgICAgICAgICAgLy8gQ29sbGFwc2Ugc2luZ2xlLXVzZSB2YXJpYWJsZXNcbiAgICAgICAgICAgIGNvbGxhcHNlX3ZhcnM6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBtYW5nbGU6IHtcbiAgICAgICAgICAgIC8vIFNhZmFyaSAxMCsgaGFzIHNwZWNpZmljIHJlcXVpcmVtZW50cyBmb3IgdmFyaWFibGUgbmFtaW5nXG4gICAgICAgICAgICBzYWZhcmkxMDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgY29tbWVudHM6IGZhbHNlLCAvLyBSZW1vdmUgYWxsIGNvbW1lbnRzIHRvIHJlZHVjZSBmaWxlIHNpemVcbiAgICAgICAgICAgIHByZXNlcnZlX2Fubm90YXRpb25zOiB0cnVlLCAvLyBLZWVwIGltcG9ydGFudCBhbm5vdGF0aW9ucyBsaWtlIGxpY2Vuc2VzXG4gICAgICAgICAgfSxcbiAgICAgICAgfSBhcyBNaW5pZnlPcHRpb25zLFxuICAgICAgfSA6IHt9KSxcblxuICAgICAgLy8gRmlsZXMgc21hbGxlciB0aGFuIDRLQiBhcmUgaW5saW5lZCBhcyBiYXNlNjQgZGF0YSBVUkxzXG4gICAgICAvLyBUaGlzIHJlZHVjZXMgSFRUUCByZXF1ZXN0cyBhdCB0aGUgY29zdCBvZiBzbGlnaHRseSBsYXJnZXIgSFRNTFxuICAgICAgLy8gVGhlIHRyYWRlb2ZmIGlzIHdvcnRoIGl0IGZvciBzbWFsbCBhc3NldHMgbGlrZSBpY29uc1xuICAgICAgYXNzZXRzSW5saW5lTGltaXQ6IDQwOTYsXG5cbiAgICAgIC8vIFJlcG9ydGluZyBjb21wcmVzc2VkIHNpemVzIGhlbHBzIHRyYWNrIGJ1bmRsZSBzaXplIG92ZXIgdGltZVxuICAgICAgLy8gVGhpcyBpcyB0aGUgc2l6ZSB1c2VycyBhY3R1YWxseSBkb3dubG9hZCwgbm90IHRoZSByYXcgZmlsZSBzaXplXG4gICAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogaXNQcm9kdWN0aW9uLFxuXG4gICAgICAvLyBFUzIwMjAgdGFyZ2V0IHdvcmtzIGluIGFsbCBicm93c2VycyBmcm9tIHRoZSBsYXN0IGZldyB5ZWFyc1xuICAgICAgLy8gVGFyZ2V0aW5nIG1vZGVybiBicm93c2VycyBhbGxvd3Mgc21hbGxlciwgZmFzdGVyIGNvZGVcbiAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG5cbiAgICAgIC8vIENTUyBtaW5pZmljYXRpb24gcmVtb3ZlcyB3aGl0ZXNwYWNlIGFuZCBvcHRpbWl6ZXMgc2VsZWN0b3JzXG4gICAgICBjc3NNaW5pZnk6IGlzUHJvZHVjdGlvbixcbiAgICB9LFxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIERFUEVOREVOQ1kgT1BUSU1JWkFUSU9OIC0gU3BlZWQgdXAgZGV2ZWxvcG1lbnQgc2VydmVyIHN0YXJ0dXBcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICAvLyBQcmUtYnVuZGxpbmcgY29udmVydHMgQ29tbW9uSlMgZGVwZW5kZW5jaWVzIHRvIEVTTSBtb2R1bGVzXG4gICAgICAvLyBUaGlzIG1ha2VzIHRoZW0gbG9hZCBtdWNoIGZhc3RlciBpbiB0aGUgYnJvd3NlciBkdXJpbmcgZGV2ZWxvcG1lbnRcbiAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgJ3JlYWN0JyxcbiAgICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAgICdyZWFjdC9qc3gtcnVudGltZScsXG4gICAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICAgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsXG4gICAgICAgICdheGlvcycsXG4gICAgICAgICd6b2QnLFxuICAgICAgICAnY2xzeCcsXG4gICAgICAgICd0YWlsd2luZC1tZXJnZScsXG4gICAgICBdLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAvLyBFeGNsdWRlIGxhcmdlIGxpYnJhcmllcyB0aGF0IHNob3VsZCBiZSBsYXp5IGxvYWRlZFxuICAgICAgICAncmVjaGFydHMnLFxuICAgICAgXSxcbiAgICAgIC8vIEZvcmNlIHJlLW9wdGltaXphdGlvbiB3aGVuIGRlcGVuZGVuY2llcyBjaGFuZ2UgYnV0IGNhY2hlIHNlZW1zIHN0YWxlXG4gICAgICBmb3JjZTogZW52LkZPUkNFX09QVElNSVpFID09PSAndHJ1ZScsXG4gICAgICAvLyBFbmFibGUgZXNidWlsZCBvcHRpbWl6YXRpb25zXG4gICAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgICAgICBzdXBwb3J0ZWQ6IHtcbiAgICAgICAgICAndG9wLWxldmVsLWF3YWl0JzogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQUkVWSUVXIFNFUlZFUiAtIEZvciB0ZXN0aW5nIHByb2R1Y3Rpb24gYnVpbGRzIGxvY2FsbHlcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgcHJldmlldzoge1xuICAgICAgcG9ydDogNDE3MyxcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBjb3JzOiB0cnVlLFxuICAgIH0sXG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gTE9HR0lORyAtIENvbnRyb2wgYnVpbGQgb3V0cHV0IHZlcmJvc2l0eVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBJbmZvIGxldmVsIGluIGRldmVsb3BtZW50IGhlbHBzIHdpdGggZGVidWdnaW5nXG4gICAgLy8gV2FybiBsZXZlbCBpbiBwcm9kdWN0aW9uIGtlZXBzIENJIGxvZ3MgY2xlYW5cbiAgICBsb2dMZXZlbDogaXNEZXZlbG9wbWVudCA/ICdpbmZvJyBhcyBjb25zdCA6ICd3YXJuJyBhcyBjb25zdCxcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBURVNUSU5HIC0gVml0ZXN0IGNvbmZpZ3VyYXRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdGVzdDoge1xuICAgICAgZ2xvYmFsczogdHJ1ZSxcbiAgICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0L3NldHVwLnRzJ10sXG4gICAgICBjc3M6IHRydWUsXG4gICAgfSxcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1gsT0FBTyxZQUFZO0FBQ3pZLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUU5QixPQUFPLFdBQVc7QUFDbEIsU0FBUyxrQkFBa0I7QUFFM0IsU0FBUyxjQUFjLGVBQTRDO0FBQ25FLE9BQU8scUJBQXFCO0FBUmlOLElBQU0sMkNBQTJDO0FBWTlSLFNBQVMsNkJBQTZCLEtBQTZCLE1BQWM7QUFDL0UsUUFBTSxlQUFlLFNBQVM7QUFHOUIsUUFBTSxrQkFBa0I7QUFBQSxJQUN0QixFQUFFLEtBQUssbUJBQW1CLGFBQWEsd0JBQXdCLHdCQUF3QiwwQkFBMEI7QUFBQSxJQUNqSCxFQUFFLEtBQUssNEJBQTRCLGFBQWEsbUJBQW1CLHdCQUF3QiwwQkFBMEI7QUFBQSxFQUN2SDtBQUVBLFFBQU0sU0FBbUIsQ0FBQztBQUMxQixRQUFNLFdBQXFCLENBQUM7QUFFNUIsYUFBVyxFQUFFLEtBQUssYUFBYSx1QkFBdUIsS0FBSyxpQkFBaUI7QUFDMUUsVUFBTSxRQUFRLElBQUksR0FBRztBQUdyQixRQUFJLGNBQWM7QUFDaEIsVUFBSSxDQUFDLFNBQVMsTUFBTSxLQUFLLE1BQU0sTUFBTSxVQUFVLGVBQWUsVUFBVSx3QkFBd0I7QUFFOUYsaUJBQVMsS0FBSyxHQUFHLEdBQUcsdUVBQXVFLEtBQUssR0FBRztB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
