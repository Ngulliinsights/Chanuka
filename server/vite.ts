import { logger } from "@shared/core";
import express, { type Express, type NextFunction,type Request, type Response } from "express";
import fs from "fs";
import path from "path";


/**
 * Intelligent Static File Serving
 * * This module allows the API server to host the Frontend client.
 * - In Production: Serves the built files from 'client/dist'
 * - In Development: Does nothing (assumes you run 'vite' separately)
 */

export function setupVite(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 1. In Development, we expect the user to run 'npm run dev' which starts Vite on port 5173
  if (!isProduction) {
    logger.info('🔧 Development mode: Expecting Frontend on http://localhost:5173', { component: 'ViteIntegration' });
    
    // Add CORS headers for development to allow frontend on different port
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.originalUrl.startsWith('/api/')) {
        return next();
      }
      
      res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Request-ID');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      
      next();
    });
    
    return;
  }

  // 2. In Production, we serve the built artifacts
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');

  // Validate build exists
  if (!fs.existsSync(clientDistPath)) {
    logger.warn('⚠️  Client build not found in dist/client. Did you run "npm run build"?', { component: 'ViteIntegration' });
    return;
  }

  logger.info(`📂 Serving static files from: ${clientDistPath}`, { component: 'ViteIntegration' });

  // A. Serve Static Assets (JS, CSS, Images) with aggressive caching
  app.use(express.static(clientDistPath, {
    maxAge: '1y', // Cache immutable assets for 1 year
    etag: true,
    setHeaders: (res, filePath) => {
      // Custom headers for security and caching
      if (filePath.endsWith('.html')) {
        // HTML should never be cached so updates are instant
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        // Hashed assets can be cached forever
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // B. SPA Catch-All Route (The "History Fallback")
  // Any request that isn't /api/* and isn't a static file gets served index.html
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api')) {
      return next(); // Let API 404 handler handle it
    }

    const indexPath = path.join(clientDistPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Application not built. Please run build script.');
    }
  });
}