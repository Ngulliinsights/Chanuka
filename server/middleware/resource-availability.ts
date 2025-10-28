import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/core/index.js';
import fs from 'fs/promises';
import path from 'path';

interface ResourceCache {
  exists: boolean;
  lastCheck: Date;
  size?: number;
}

class ResourceAvailabilityManager {
  private resourceCache = new Map<string, ResourceCache>();
  private readonly cacheTimeout = 60000; // 1 minute cache

  async checkResourceExists(resourcePath: string): Promise<boolean> {
    const cached = this.resourceCache.get(resourcePath);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.lastCheck.getTime() < this.cacheTimeout) {
      return cached.exists;
    }

    try {
      const stats = await fs.stat(resourcePath);
      const result = {
        exists: true,
        lastCheck: new Date(),
        size: stats.size
      };
      
      this.resourceCache.set(resourcePath, result);
      return true;
    } catch (error) {
      const result = {
        exists: false,
        lastCheck: new Date()
      };
      
      this.resourceCache.set(resourcePath, result);
      return false;
    }
  }

  clearCache() {
    this.resourceCache.clear();
  }

  getCacheStats() {
    return {
      totalEntries: this.resourceCache.size,
      existingResources: Array.from(this.resourceCache.values()).filter(r => r.exists).length,
      missingResources: Array.from(this.resourceCache.values()).filter(r => !r.exists).length
    };
  }
}

const resourceManager = new ResourceAvailabilityManager();

export const resourceAvailabilityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip this middleware entirely in development mode for Vite-handled resources
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    // Let Vite handle all resource requests in development
    if (req.path.startsWith('/src/') || 
        req.path.startsWith('/@') ||
        req.path.includes('?import') ||
        req.path.includes('?direct') ||
        req.path.match(/\.(ts|tsx|jsx|vue)$/)) {
      return next();
    }
  }

  // Only check specific static resources that should exist
  if (!req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webmanifest|pdf|mp3|mp4)$/)) {
    return next();
  }

  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }

  try {
    // Determine the file path
    let filePath: string;
    
    if (req.path.startsWith('/src/')) {
      // Development mode - check in client directory
      filePath = path.join(process.cwd(), 'client', req.path);
    } else {
      // Check in client/public first (development)
      filePath = path.join(process.cwd(), 'client/public', req.path);
      
      // Fallback to dist/public for production
      if (!(await resourceManager.checkResourceExists(filePath))) {
        filePath = path.join(process.cwd(), 'dist/public', req.path);
      }
    }

    const exists = await resourceManager.checkResourceExists(filePath);
    
    if (!exists) {
      logger.debug(`Resource not found: ${req.path}`, { 
        requestedPath: req.path,
        checkedPath: filePath,
        userAgent: req.get('User-Agent')
      });

      // Just let it proceed - don't block with 404
      // The actual static file middleware will handle the 404
      return next();
    }

    next();
  } catch (error) {
    logger.error('Error checking resource availability:', error);
    
    // Don't block the request, let it proceed
    next();
  }
};

export { resourceManager };
