import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, type ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config.js";

const viteLogger = createLogger();

// Centralized logging utility
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Centralized debug configuration - check once at startup
const DEBUG_FLAGS = {
  warnings: process.env.VITE_DEBUG_WARNINGS === 'true',
  requests: process.env.VITE_DEBUG_REQUESTS === 'true',
  fileChanges: process.env.VITE_DEBUG_FILE_CHANGES === 'true',
  all: process.env.VITE_DEBUG === 'true'
} as const;

function debugLog(category: keyof typeof DEBUG_FLAGS, message: string, source: string) {
  if (DEBUG_FLAGS[category] || DEBUG_FLAGS.all) {
    log(message, source);
  }
}

// Cache strategy constants for consistent file serving
const CACHE_STRATEGIES = {
  immutable: 'public, max-age=31536000, immutable',
  long: 'public, max-age=604800',      // 1 week
  medium: 'public, max-age=86400',     // 1 day
  short: 'public, max-age=3600',       // 1 hour
  none: 'no-cache, no-store, must-revalidate'
} as const;

// Comprehensive MIME type mapping
const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.map': 'application/json; charset=utf-8',
};

let viteDevServer: ViteDevServer | null = null;
let viteInitializationLock = false;
let viteShutdownLock = false;

// Simplified error categorization focused on actionable types
function categorizeError(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('eaddrinuse') || (lowerMsg.includes('port') && lowerMsg.includes('use'))) {
    return 'port-conflict';
  }
  if (lowerMsg.includes('enoent') || lowerMsg.includes('no such file')) {
    return 'file-not-found';
  }
  if (lowerMsg.includes('eacces') || lowerMsg.includes('permission')) {
    return 'permission-denied';
  }
  if (lowerMsg.includes('syntax') || lowerMsg.includes('parse')) {
    return 'syntax-error';
  }
  if (lowerMsg.includes('module') && lowerMsg.includes('not found')) {
    return 'module-not-found';
  }
  if (lowerMsg.includes('hmr') || lowerMsg.includes('hot')) {
    return 'hmr-error';
  }
  if (lowerMsg.includes('transform') || lowerMsg.includes('compile')) {
    return 'transform-error';
  }
  
  return 'unknown';
}

// Focused HMR error recovery - the only error type worth auto-recovering
async function attemptHMRRecovery(): Promise<void> {
  if (!viteDevServer) return;
  
  try {
    log("Attempting HMR recovery...", "vite-recovery");
    viteDevServer.moduleGraph.invalidateAll();
    await viteDevServer.ws.send({ type: 'full-reload' });
    log("HMR recovery completed", "vite-recovery");
  } catch (error) {
    // Let it fail naturally - developer will see the underlying issue
    log(`HMR recovery failed: ${(error as Error).message}`, "vite-recovery");
  }
}

// Graceful shutdown handler
export async function closeVite() {
  if (viteShutdownLock) {
    log("Vite shutdown already in progress", "vite");
    return;
  }
  
  viteShutdownLock = true;
  
  try {
    if (viteDevServer) {
      await viteDevServer.close();
      viteDevServer = null;
      log("Vite development server closed", "vite");
    }
  } catch (error) {
    log(`Error closing Vite server: ${(error as Error).message}`, "vite-error");
  } finally {
    viteShutdownLock = false;
  }
}

export async function setupVite(app: Express, server: Server) {
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
    log("Setting up Vite development server...", "vite");

    const hmrPort = parseInt(process.env.HMR_PORT || process.env.PORT || '4200') + 1;
    
    // Streamlined custom logger with focused error handling
    const customLogger = {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        const errorType = categorizeError(msg);
        log(`Vite ${errorType} error: ${msg}`, "vite-error");
        
        // Only attempt recovery for HMR errors - other errors need developer attention
        if (errorType === 'hmr-error') {
          attemptHMRRecovery();
        }
        
        viteLogger.error(msg, options);
      },
      warn: (msg: string, options?: any) => {
        debugLog('warnings', `Vite warning: ${msg}`, "vite-warn");
        viteLogger.warn(msg, options);
      },
      info: (msg: string, options?: any) => {
        // Filter out noisy HMR update messages
        if (!msg.toLowerCase().includes('hmr update') && 
            !msg.toLowerCase().includes('page reload')) {
          log(`Vite info: ${msg}`, "vite-info");
        }
        viteLogger.info(msg, options);
      },
    };

    viteDevServer = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger,
      server: {
        middlewareMode: true,
        hmr: { 
          server,
          port: hmrPort,
          overlay: true,
          clientPort: hmrPort,
        },
        cors: {
          origin: true,
          credentials: true
        },
        watch: {
          ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          usePolling: process.env.VITE_USE_POLLING === 'true',
        },
      },
      appType: "custom",
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
      },
    });

    // Simplified Vite middleware with single timeout handler
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!viteDevServer) {
        return next();
      }
      
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          log(`Request timeout for ${req.originalUrl}`, "vite-error");
          res.status(408).end('Request timeout');
        }
      }, 30000);
      
      res.once('finish', () => clearTimeout(timeout));
      
      viteDevServer.middlewares(req, res, (err?: any) => {
        clearTimeout(timeout);
        if (err && !res.headersSent) {
          const errorType = categorizeError(err.message || String(err));
          log(`Vite middleware error [${errorType}]: ${err.message}`, "vite-error");
          res.status(500).json({ 
            error: err.message,
            type: errorType 
          });
        } else {
          next(err);
        }
      });
    });

    // Streamlined SPA routing with focused error handling
    app.use("*", async (req: Request, res: Response, next: NextFunction) => {
      // Skip non-frontend routes
      if (req.originalUrl.startsWith('/api/') || 
          req.originalUrl.startsWith('/health') ||
          req.originalUrl.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|json|map)$/)) {
        return next();
      }

      const startTime = Date.now();

      try {
        const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

        if (!fs.existsSync(clientTemplate)) {
          throw new Error(`Template file not found: ${clientTemplate}`);
        }

        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        
        // Simple cache busting for development
        const cacheVersion = Date.now();
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${cacheVersion}"`,
        );
        
        // Minimal template enhancement - only essential debugging utilities
        template = enhanceTemplateForDevelopment(template, req.originalUrl, startTime, hmrPort);

        if (viteDevServer) {
          try {
            const page = await viteDevServer.transformIndexHtml(req.originalUrl, template);
            
            res.status(200).set({ 
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "X-Response-Time": `${Date.now() - startTime}ms`,
            }).end(page);
            
            debugLog('requests', `Served ${req.originalUrl} in ${Date.now() - startTime}ms`, "vite-debug");
            
          } catch (transformError) {
            log(`HTML transform error: ${(transformError as Error).message}`, "vite-error");
            res.status(200).set({ 
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache",
            }).end(template);
          }
        } else {
          res.status(200).set({ 
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
          }).end(template);
        }
        
      } catch (e) {
        const error = e as Error;
        const errorType = categorizeError(error.message);
        
        log(`Error serving HTML [${errorType}]: ${error.message}`, "vite-error");
        
        if (viteDevServer) {
          viteDevServer.ssrFixStacktrace(error);
        }
        
        const errorPage = createErrorPage({
          title: "Development Server Error",
          message: error.message,
          errorType,
          stack: error.stack,
          suggestions: getErrorSuggestions(errorType),
        });
        
        res.status(500).set({ 
          "Content-Type": "text/html; charset=utf-8",
        }).end(errorPage);
      }
    });

    log("Vite development server setup completed", "vite");
    
    // Optional monitoring only in debug mode
    if (DEBUG_FLAGS.all) {
      setupDevelopmentServerMonitoring();
    }
    
  } catch (error) {
    const err = error as Error;
    const errorType = categorizeError(err.message);
    log(`Failed to setup Vite [${errorType}]: ${err.message}`, "vite-error");
    throw new Error(`Vite setup failed [${errorType}]: ${err.message}`);
  } finally {
    viteInitializationLock = false;
  }
}

// Minimal template enhancement - only essential debugging utilities
function enhanceTemplateForDevelopment(
  template: string, 
  url: string, 
  startTime: number,
  hmrPort: number
): string {
  const developmentEnhancements = `
    <script>
      // Minimal development utilities
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
      
      // Consolidated error handler
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
  
  return template.replace('</head>', `${developmentEnhancements}</head>`);
}

// Focused monitoring - only when debug mode is enabled
function setupDevelopmentServerMonitoring(): void {
  if (!viteDevServer) return;
  
  viteDevServer.ws.on('connection', () => {
    log('HMR client connected', "vite-hmr");
  });
  
  if (DEBUG_FLAGS.fileChanges) {
    viteDevServer.watcher.on('change', (file) => {
      log(`File changed: ${path.relative(process.cwd(), file)}`, "vite-watcher");
    });
  }
}

// Consolidated error page generator
function createErrorPage(options: {
  title: string;
  message: string;
  errorType?: string;
  stack?: string;
  suggestions?: string[];
}): string {
  const isDevelopment = options.errorType !== undefined;
  const suggestions = options.suggestions || [
    'Try refreshing the page',
    'Restart the development server',
    'Check the browser console for more details'
  ];
  
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${options.title} - Chanuka Platform</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          h1 { font-size: 24px; margin-bottom: 16px; color: #1a202c; }
          .message {
            background: #fff5f5;
            border-left: 4px solid #fc8181;
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
            color: #742a2a;
          }
          .suggestions {
            list-style: none;
            margin: 16px 0;
          }
          .suggestions li {
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
          }
          .suggestions li:before {
            content: "💡";
            position: absolute;
            left: 0;
          }
          .stack {
            background: #2d3748;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            overflow-x: auto;
            max-height: 200px;
            overflow-y: auto;
            margin: 16px 0;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin-right: 8px;
          }
          button:hover { background: #5a67d8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${options.title}</h1>
          ${isDevelopment ? `<div style="color: #718096; margin-bottom: 8px;">Error Type: ${options.errorType}</div>` : ''}
          <div class="message">${options.message}</div>
          <ul class="suggestions">
            ${suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
          ${options.stack ? `
            <details>
              <summary style="cursor: pointer; padding: 8px 0; font-weight: 600;">Stack Trace</summary>
              <pre class="stack">${options.stack}</pre>
            </details>
          ` : ''}
          <div style="margin-top: 24px;">
            <button onclick="location.reload()">🔄 Reload</button>
            <button onclick="
              localStorage.clear();
              sessionStorage.clear();
              location.reload();
            ">🧹 Clear Cache</button>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getErrorSuggestions(errorType: string): string[] {
  const suggestions: Record<string, string[]> = {
    'file-not-found': [
      'Check if the file exists in the correct location',
      'Verify the file path and spelling',
      'Ensure the file is not in .gitignore',
    ],
    'module-not-found': [
      'Run "npm install" to install missing dependencies',
      'Check if the import path is correct',
      'Verify the module exists in package.json',
    ],
    'syntax-error': [
      'Check for syntax errors in your code',
      'Look for missing brackets or parentheses',
      'Verify TypeScript types are correct',
    ],
    'transform-error': [
      'Check for syntax errors in the file',
      'Verify import/export statements are correct',
      'Try restarting the development server',
    ],
    'hmr-error': [
      'Try refreshing the page',
      'Check for syntax errors in your code',
      'Restart the development server if the issue persists',
    ],
    'port-conflict': [
      'Another process is using the same port',
      'Try: PORT=4201 npm run dev',
      'Or kill the process: lsof -ti:4200 | xargs kill -9',
    ],
  };
  
  return suggestions[errorType] || [
    'Try refreshing the page',
    'Restart the development server',
    'Check the browser console for more details',
  ];
}

export function serveStatic(app: Express) {
  try {
    log("Setting up production static file serving...", "static");

    const possibleDistPaths = [
      path.resolve(import.meta.dirname, "..", "dist", "public"),
      path.resolve(import.meta.dirname, "..", "client", "dist", "public")
    ];
    
    let distPath: string | null = null;
    
    for (const possiblePath of possibleDistPaths) {
      if (fs.existsSync(possiblePath) && fs.existsSync(path.resolve(possiblePath, "index.html"))) {
        distPath = possiblePath;
        log(`Found valid build directory at: ${distPath}`, "static");
        break;
      }
    }
    
    if (!distPath) {
      throw new Error(
        `No valid build directory found. Please run 'npm run build' to create the production build.`
      );
    }
    
    const indexPath = path.resolve(distPath, "index.html");

    // Streamlined static file serving with cache strategy lookup
    app.use(express.static(distPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
      etag: true,
      lastModified: true,
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res: Response, filePath: string) => {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        const isHashed = /[a-f0-9]{8,}/.test(fileName);
        
        // Set MIME type
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        
        // Determine cache strategy
        let cacheStrategy: keyof typeof CACHE_STRATEGIES;
        
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
        
        res.setHeader('Cache-Control', CACHE_STRATEGIES[cacheStrategy]);
        
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }
    }));

    // Simplified SPA fallback
    app.use("*", (req: Request, res: Response, next: NextFunction) => {
      // Skip non-SPA routes
      if (req.originalUrl.startsWith('/api/') || 
          req.originalUrl.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|json|map)$/)) {
        return next();
      }

      if (!fs.existsSync(indexPath)) {
        return res.status(500).send(createErrorPage({
          title: "Build Error",
          message: "The application build is missing or corrupted.",
          suggestions: ["Please contact the system administrator to rebuild the application."]
        }));
      }

      res.sendFile(indexPath, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }, (err) => {
        if (err && !res.headersSent) {
          log(`Error serving index.html: ${err.message}`, "static-error");
          res.status(500).send(createErrorPage({
            title: "Application Error",
            message: "The application could not be loaded.",
            suggestions: ["Please try refreshing the page."]
          }));
        }
      });
    });

    log("Production static file serving setup completed", "static");
  } catch (error) {
    const err = error as Error;
    log(`Failed to setup static file serving: ${err.message}`, "static-error");
    throw new Error(`Static file serving setup failed: ${err.message}`);
  }
}