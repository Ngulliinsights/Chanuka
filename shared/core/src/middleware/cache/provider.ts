import { MiddlewareProvider } from '../types';
import { CacheService } from '../../services/cache';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class CacheMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'cache';

  constructor(private readonly cacheService: CacheService) {}

  validate(options: Record<string, any>): boolean {
    const { ttl, key } = options;
    return typeof ttl === 'number' && typeof key === 'string';
  }

  create(options: Record<string, any>) {
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
        res.json = (body: any) => {
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







