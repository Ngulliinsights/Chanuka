import { Request, Response, NextFunction } from 'express';

import { CacheService } from '../../caching/core/interfaces';
import { CacheService } from '../../caching/core/interfaces';
import { logger } from '../../observability/logging';
import { MiddlewareProvider } from '../../types';
import { MiddlewareProvider } from '../types';

interface CacheOptions {
  ttl: number;
  key: string;
}

export class CacheMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'cache';

  constructor(private readonly cacheService: CacheService) {}

  validate(options: CacheOptions): boolean {
    const { ttl, key } = options;
    return typeof ttl === 'number' && typeof key === 'string';
  }

  create(options: CacheOptions) {
    const { ttl, key } = options;
    
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const cacheKey = `${key}:${req.originalUrl}`;
        const cached = await this.cacheService.get(cacheKey);
        
        if (cached) {
          res.json(cached);
          return;
        }

        // Store original json method
        const originalJson = res.json.bind(res);
        
        // Override json method to cache response
        res.json = (body: unknown) => {
          this.cacheService.set(cacheKey, body, ttl).catch(err => {
            logger.error('Cache set error:', { component: 'Chanuka' }, err);
          });
          return originalJson(body);
        };

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
















































