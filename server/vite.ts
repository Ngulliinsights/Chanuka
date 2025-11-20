import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createServer, type ViteDevServer } from '../node_modules/vite';
import { type Server } from "http";

/**
 * Centralized configuration that's determined once at startup for optimal performance.
 * This prevents repeated environment variable lookups during request handling.
 */
const CONFIG = {
  debug: {
    warnings: process.env.VITE_DEBUG_WARNINGS === 'true',
    requests: process.env.VITE_DEBUG_REQUESTS === 'true',
    fileChanges: process.env.VITE_DEBUG_FILE_CHANGES === 'true',
    all: process.env.VITE_DEBUG === 'true'
  },
  cache: {
    immutable: 'public, max-age=31536000, immutable',
    long: 'public, max-age=604800',
    medium: 'public, max-age=86400',
    short: 'public, max-age=3600',
    none: 'no-cache, no-store, must-revalidate'
  },
  timeouts: {
    request: 30000,
    hmrRecovery: 5000
  },
  polling: process.env.VITE_USE_POLLING === 'true'
} as const;

/**
 * Comprehensive MIME type mapping for optimal content delivery.
 * Organized by category for easier maintenance.
 */
const MIME_TYPES: Record<string, string> = {
  // JavaScript and related
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  
  // Stylesheets
  '.css': 'text/css; charset=utf-8',
  
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  
  // Documents
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  
  // Media
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/**
 * State management for the Vite server with proper locking to prevent race conditions.
 */
let viteDevServer: ViteDevServer | null = null;
let viteInitializationLock = false;
let viteShutdownLock = false;

/**
 * Lightweight logger that formats timestamps consistently across the application.
 */
export function log(message: string, source = "express"): void {
  // eslint-disable-next-line no-console
  console.log(`[${source}] ${message}`);
}

/**
 * Debug logging that respects the configuration flags set at startup.
 * This prevents performance overhead when debug mode is disabled.
 */
function debugLog(category: keyof typeof CONFIG.debug, message: string, source: string): void {
  if (CONFIG.debug[category] || CONFIG.debug.all) {
    log(message, source);
  }
}

/**
 * Error categorization system that maps error messages to actionable categories.
 * This helps provide targeted recovery suggestions to developers.
 */
function categorizeError(message: string): string {
  const patterns: Record<string, RegExp> = {
    'port-conflict': /eaddrinuse|port.*(?:in\s+)?use/i,
    'file-not-found': /enoent|no such file/i,
    'permission-denied': /eacces|permission/i,
    'syntax-error': /syntax|parse/i,
    'module-not-found': /module.*not found/i,
    'hmr-error': /hmr|hot/i,
    'transform-error': /transform|compile/i,
  };

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      return category;
    }
  }

  return 'unknown';
}

/**
 * HMR recovery mechanism that attempts to restore Hot Module Replacement functionality.
 * This only triggers for HMR-specific errors, as other errors require developer intervention.
 */
async function attemptHMRRecovery(): Promise<void> {
  if (!viteDevServer) return;

  try {
    log("Attempting HMR recovery...", "vite-recovery");
    
    // Invalidate the entire module graph to force a clean reload
    viteDevServer.moduleGraph.invalidateAll();
    
    // Send full reload signal to all connected clients
    await viteDevServer.ws.send({ type: 'full-reload' });
    
    log("HMR recovery completed successfully", "vite-recovery");
  } catch (error) {
    log(`HMR recovery failed: ${(error as Error).message}`, "vite-recovery");
  }
}

/**
 * Graceful shutdown handler that ensures the Vite server closes cleanly.
 * Uses a lock to prevent concurrent shutdown attempts.
 */
export async function closeVite(): Promise<void> {
  if (viteShutdownLock) {
    log("Vite shutdown already in progress", "vite");
    return;
  }

  viteShutdownLock = true;

  try {
    if (viteDevServer) {
      await viteDevServer.close();
      viteDevServer = null;
      log("Vite development server closed successfully", "vite");
    }
  } catch (error) {
    log(`Error during Vite shutdown: ${(error as Error).message}`, "vite-error");
  } finally {
    viteShutdownLock = false;
  }
}

/**
 * Main Vite setup function that configures the development server with optimized settings.
 * This handles middleware setup, HMR configuration, and error recovery.
 */
export async function setupVite(app: Express, server: Server): Promise<void> {
  if (viteInitializationLock) {
    log("Vite initialization already in progress", "vite");
    return;
  }

  if (viteDevServer) {
    log("Vite development server already initialized", "vite");
    return;
  }

  viteInitializationLock = true;

  try {
    log("Initializing Vite development server...", "vite");

    const hmrPort = parseInt(process.env.HMR_PORT || process.env.PORT || '4200') + 1;

    // Create a custom logger that integrates with our logging system
    const customLogger = createViteLogger();

    viteDevServer = await createServer({
      configFile: false,
      resolve: {
        alias: {
          '@': path.resolve(import.meta.dirname, '..', 'client', 'src'),
          '@chanuka/shared': path.resolve(import.meta.dirname, '..', 'shared'),
        },
      },
      customLogger,
      server: {
        middlewareMode: true,
        hmr: {
          server,
          port: hmrPort,
          overlay: true,
          clientPort: hmrPort,
          host: 'localhost',
          protocol: 'ws'
        },
        cors: {
          origin: true,
          credentials: true
        },
        watch: {
          ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          usePolling: CONFIG.polling,
        },
        fs: {
          allow: ['..']
        }
      },
      appType: "custom",
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
      },
      esbuild: {}
    });

    // Enhanced WebSocket error handling with proper type annotations
    if (viteDevServer && viteDevServer.ws) {
      viteDevServer.ws.on('connection', () => {
      });
    }

    // Set up development monitoring if debug mode is enabled
    if (CONFIG.debug.all) {
      setupDevelopmentMonitoring(viteDevServer!);
    }

    // Register middleware in the correct order
    registerViteMiddleware(app, viteDevServer!);
    registerSPAMiddleware(app, viteDevServer!, hmrPort);

    log("Vite development server initialized successfully", "vite");

  } catch (error) {
    const err = error as Error;
    const errorType = categorizeError(err.message);
    log(`Vite initialization failed [${errorType}]: ${err.message}`, "vite-error");
    throw new Error(`Vite setup failed [${errorType}]: ${err.message}`);
  } finally {
    viteInitializationLock = false;
  }
}

/**
 * Creates a custom Vite logger that integrates with our logging system.
 * This provides consistent error handling and automatic recovery for HMR issues.
 */
function createViteLogger() {
  const baseLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    warnOnce: () => {},
    clearScreen: () => {},
    hasErrorLogged: () => false,
    hasWarned: false
  };

  return {
    ...baseLogger,
    error: (msg: string) => {
      const errorType = categorizeError(msg);
      log(`Vite ${errorType} error: ${msg}`, "vite-error");

      // Only attempt automatic recovery for HMR errors
      if (errorType === 'hmr-error') {
        void attemptHMRRecovery();
      }

      baseLogger.error();
    },
    warn: (msg: string) => {
      debugLog('warnings', `Vite warning: ${msg}`, "vite-warn");
      baseLogger.warn();
    },
    info: (msg: string) => {
      // Filter out noisy HMR update messages that clutter the console
      if (!msg.toLowerCase().includes('hmr update') &&
          !msg.toLowerCase().includes('page reload')) {
        log(`Vite: ${msg}`, "vite-info");
      }
      baseLogger.info();
    },
  };
}

/**
 * Registers Vite middleware with timeout protection and smart routing.
 * This ensures Vite handles its special routes while preventing request hangs.
 */
function registerViteMiddleware(app: Express, vite: ViteDevServer): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check if this is a route that Vite should handle
    const isViteRoute = req.originalUrl.startsWith('/src/') ||
                        req.originalUrl.startsWith('/@') ||
                        req.originalUrl.includes('?import') ||
                        req.originalUrl.includes('?direct') ||
                        /\.(ts|tsx|jsx|vue)(\?|$)/.test(req.originalUrl);

    if (isViteRoute) {
      return vite.middlewares(req, res, next);
    }

    // Set up timeout protection for all other requests
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        log(`Request timeout: ${req.originalUrl}`, "vite-error");
        res.status(408).end('Request timeout');
      }
    }, CONFIG.timeouts.request);

    res.once('finish', () => clearTimeout(timeout));

    vite.middlewares(req, res, (err?: unknown) => {
      clearTimeout(timeout);
      
      if (err && !res.headersSent) {
        const errorType = categorizeError((err as Error).message || String(err));
        log(`Vite middleware error [${errorType}]: ${(err as Error).message}`, "vite-error");
        res.status(500).json({ error: (err as Error).message, type: errorType });
      } else {
        next(err);
      }
    });
  });
}

/**
 * Generates a cryptographically secure nonce for CSP
 */
function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '').substring(0, 16);
}

/**
 * Registers the SPA fallback middleware that serves the index.html with transformations.
 * This handles client-side routing while providing enhanced development utilities.
 */
function registerSPAMiddleware(app: Express, vite: ViteDevServer, hmrPort: number): void {
  app.use("*", async (req: Request, res: Response, next: NextFunction) => {
    // Skip non-SPA routes
    if (shouldSkipSPAHandling(req.originalUrl)) {
      return next();
    }

    const startTime = Date.now();
    const nonce = generateCSPNonce();

    try {
      const template = await loadAndEnhanceTemplate(req.originalUrl, startTime, hmrPort, nonce);
      const page = await vite.transformIndexHtml(req.originalUrl, template);

      // Set CSP header with nonce - more permissive for development
      const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://cdn.chanuka.ke http://localhost:* ws://localhost:* wss://localhost:*; script-src-elem 'self' 'unsafe-inline' http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.chanuka.ke wss://ws.chanuka.ke http://localhost:* ws://localhost:* wss://localhost:*; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; report-uri /api/security/csp-report`;

      res.status(200).set({
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": cspHeader,
        "Cache-Control": CONFIG.cache.none,
        "X-Response-Time": `${Date.now() - startTime}ms`,
      }).end(page);

      debugLog('requests', `Served ${req.originalUrl} in ${Date.now() - startTime}ms`, "vite");

    } catch (error) {
      handleSPAError(error as Error, res, vite);
    }
  });
}

/**
 * Determines whether a request should skip SPA handling based on its URL pattern.
 */
function shouldSkipSPAHandling(url: string): boolean {
  return url.startsWith('/api/') ||
         url.startsWith('/health') ||
         url.startsWith('/src/') ||
         url.startsWith('/@') ||
         /\.(js|mjs|ts|tsx|jsx|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|json|map)$/.test(url);
}

/**
 * Loads the HTML template and enhances it with development utilities.
 * This adds debugging tools and cache-busting for optimal development experience.
 */
async function loadAndEnhanceTemplate(url: string, startTime: number, hmrPort: number, nonce?: string): Promise<string> {
  const templatePath = path.resolve(import.meta.dirname, "..", "client", "index.html");

  if (!existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  let template = await fs.readFile(templatePath, "utf-8");

  // Add cache-busting for the main entry point
  const cacheVersion = Date.now();
  template = template.replace(
    `src="/src/main.tsx"`,
    `src="/src/main.tsx?v=${cacheVersion}"`
  );

  // Add nonce to script tags if provided
  if (nonce) {
    template = template.replace(
      /<script([^>]*)>/g,
      `<script$1 nonce="${nonce}">`
    );
  }

  // Inject development utilities
  template = enhanceTemplateForDevelopment(template, url, startTime, hmrPort);

  return template;
}

/**
 * Enhances the HTML template with minimal development utilities.
 * This provides essential debugging tools without bloating the page.
 */
function enhanceTemplateForDevelopment(
  template: string,
  url: string,
  startTime: number,
  hmrPort: number
): string {
  const developmentScript = `
    <script>
      // Development server utilities
      window.__DEV_SERVER__ = {
        url: "${url}",
        timestamp: ${startTime},
        hmrPort: ${hmrPort},
        reload: () => location.reload(),
        clearCache: () => {
          localStorage.clear();
          sessionStorage.clear();
          location.reload();
        }
      };
      
      // Consolidated error handler for better debugging
      const logError = (type, event) => {
        console.group(\`🚨 \${type}\`);
        console.error('Error:', event.error || event.reason || event.message);
        console.error('Location:', event.filename || 'unknown');
        console.groupEnd();
      };
      
      window.addEventListener('error', e => logError('Runtime Error', e));
      window.addEventListener('unhandledrejection', e => logError('Promise Rejection', e));
    </script>
  `;

  return template.replace('</head>', `${developmentScript}</head>`);
}

/**
 * Handles SPA routing errors by displaying a helpful error page.
 * This includes stack traces and recovery suggestions in development.
 */
function handleSPAError(error: Error, res: Response, vite: ViteDevServer): void {
  const errorType = categorizeError(error.message);
  log(`SPA error [${errorType}]: ${error.message}`, "vite-error");

  vite.ssrFixStacktrace(error);

  // Only include stack if it exists, otherwise omit the property entirely
  const errorPageOptions: Parameters<typeof createErrorPage>[0] = {
    title: "Development Server Error",
    message: error.message,
    errorType,
    suggestions: getErrorSuggestions(errorType),
  };
  
  if (error.stack) {
    errorPageOptions.stack = error.stack;
  }

  const errorPage = createErrorPage(errorPageOptions);

  res.status(500).set({
    "Content-Type": "text/html; charset=utf-8",
  }).end(errorPage);
}

/**
 * Sets up development monitoring for file changes and WebSocket connections.
 * This only activates when debug mode is enabled to minimize overhead.
 */
function setupDevelopmentMonitoring(vite: ViteDevServer): void {
  vite.ws.on('connection', () => {
    log("HMR client connected", "vite-hmr");
  });

  if (CONFIG.debug.fileChanges) {
    vite.watcher.on('change', (file: string) => {
      log(`File changed: ${path.relative(process.cwd(), file)}`, "vite-watcher");
    });
  }
}

/**
 * Provides context-specific suggestions based on the error type.
 * This helps developers quickly resolve common issues.
 */
function getErrorSuggestions(errorType: string): string[] {
  const suggestions: Record<string, string[]> = {
    'file-not-found': [
      'Verify the file exists at the expected path',
      'Check for typos in the file path',
      'Ensure the file is not excluded by .gitignore',
    ],
    'module-not-found': [
      'Run "npm install" to install dependencies',
      'Verify the import path is correct',
      'Check that the module exists in package.json',
    ],
    'syntax-error': [
      'Look for syntax errors in your code',
      'Check for missing brackets or parentheses',
      'Verify TypeScript types are correct',
    ],
    'transform-error': [
      'Check for syntax errors in the file',
      'Verify import/export statements',
      'Try restarting the development server',
    ],
    'hmr-error': [
      'Refresh the page to recover',
      'Check for syntax errors in recently edited files',
      'Restart the server if the issue persists',
    ],
    'port-conflict': [
      'Another process is using the port',
      'Try: PORT=4201 npm run dev',
      'Or kill the process: lsof -ti:4200 | xargs kill -9',
    ],
  };

  return suggestions[errorType] || [
    'Try refreshing the page',
    'Check the browser console for details',
    'Restart the development server',
  ];
}

/**
 * Creates a visually appealing error page with actionable suggestions.
 * This provides a better developer experience than generic error pages.
 */
function createErrorPage(options: {
  title: string;
  message: string;
  errorType?: string;
  stack?: string;
  suggestions?: string[];
}): string {
  const suggestions = options.suggestions || getErrorSuggestions('unknown');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.title} - Chanuka Platform</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            padding: 40px;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #1a202c;
          }
          .error-type {
            color: #718096;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .message {
            background: #fff5f5;
            border-left: 4px solid #fc8181;
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
            color: #742a2a;
            line-height: 1.5;
          }
          .suggestions {
            list-style: none;
            margin: 20px 0;
          }
          .suggestions li {
            padding: 10px 0 10px 28px;
            position: relative;
            line-height: 1.5;
          }
          .suggestions li:before {
            content: "💡";
            position: absolute;
            left: 0;
            top: 10px;
          }
          .stack {
            background: #2d3748;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
            margin: 16px 0;
            line-height: 1.5;
          }
          details {
            margin: 16px 0;
          }
          summary {
            cursor: pointer;
            padding: 8px 0;
            font-weight: 600;
            user-select: none;
          }
          summary:hover {
            color: #667eea;
          }
          .actions {
            margin-top: 24px;
            display: flex;
            gap: 8px;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
          }
          button:hover {
            background: #5a67d8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${options.title}</h1>
          ${options.errorType ? `<div class="error-type">Error Type: ${options.errorType}</div>` : ''}
          <div class="message">${options.message}</div>
          <ul class="suggestions">
            ${suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
          ${options.stack ? `
            <details>
              <summary>View Stack Trace</summary>
              <pre class="stack">${options.stack}</pre>
            </details>
          ` : ''}
          <div class="actions">
            <button onclick="location.reload()">🔄 Reload Page</button>
            <button onclick="
              localStorage.clear();
              sessionStorage.clear();
              location.reload();
            ">🧹 Clear Cache & Reload</button>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sets up production static file serving with optimized caching strategies.
 * This serves pre-built assets with appropriate cache headers for performance.
 */
export function serveStatic(app: Express): void {
  try {
    log("Configuring production static file serving...", "static");

    const distPath = findBuildDirectory();
    const indexPath = path.resolve(distPath, "index.html");

    // Serve static files with intelligent caching
    app.use(express.static(distPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
      etag: true,
      lastModified: true,
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res: Response, filePath: string) => {
        setStaticFileHeaders(res, filePath);
      }
    }));

    // SPA fallback for client-side routing
    app.use("*", (req: Request, res: Response, next: NextFunction) => {
      if (shouldSkipSPAHandling(req.originalUrl)) {
        return next();
      }

      if (!existsSync(indexPath)) {
        return res.status(500).send(createErrorPage({
          title: "Build Error",
          message: "The application build is missing or corrupted.",
          suggestions: ["Contact the system administrator to rebuild the application."]
        }));
      }

      res.sendFile(indexPath, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': CONFIG.cache.none,
        }
      }, (err) => {
        if (err && !res.headersSent) {
          log(`Error serving index.html: ${err.message}`, "static-error");
          res.status(500).send(createErrorPage({
            title: "Application Error",
            message: "The application could not be loaded.",
            suggestions: ["Try refreshing the page."]
          }));
        }
      });
    });

    log("Production static file serving configured successfully", "static");
  } catch (error) {
    const err = error as Error;
    log(`Static file serving configuration failed: ${err.message}`, "static-error");
    throw error;
  }
}

/**
 * Locates the build directory by checking multiple possible paths.
 * This handles different build configurations flexibly.
 */
function findBuildDirectory(): string {
  const possiblePaths = [
    path.resolve(import.meta.dirname, "..", "dist", "public"),
    path.resolve(import.meta.dirname, "..", "client", "dist", "public")
  ];

  for (const distPath of possiblePaths) {
    if (existsSync(distPath) && existsSync(path.resolve(distPath, "index.html"))) {
      log(`Found build directory: ${distPath}`, "static");
      return distPath;
    }
  }

  throw new Error(
    "No valid build directory found. Run 'npm run build' to create the production build."
  );
}

/**
 * Sets appropriate headers for static files based on their type and content.
 * This implements intelligent caching strategies for optimal performance.
 */
function setStaticFileHeaders(res: Response, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  const isHashed = /[a-f0-9]{8,}/.test(fileName);

  // Set MIME type
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);

  // Determine optimal caching strategy
  let cacheStrategy: keyof typeof CONFIG.cache;

  if (ext === '.html') {
    cacheStrategy = 'none';
  } else if (isHashed && /\.(js|mjs|css)$/.test(ext)) {
    cacheStrategy = 'immutable';
  } else if (/\.(woff2?|ttf|eot|otf)$/.test(ext)) {
    cacheStrategy = 'immutable';
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/.test(ext)) {
    cacheStrategy = isHashed ? 'immutable' : 'medium';
  } else if (/\.(mp3|mp4|webm|ogg)$/.test(ext)) {
    cacheStrategy = 'long';
    res.setHeader('Accept-Ranges', 'bytes');
  } else {
    cacheStrategy = 'short';
  }

  res.setHeader('Cache-Control', CONFIG.cache[cacheStrategy]);

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}
