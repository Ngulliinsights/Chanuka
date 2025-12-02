import { MiddlewareProvider } from '../../types';
import { RateLimitStore } from '../../rate-limiting/types';
import { Request, Response, NextFunction } from 'express';
// import { logger } from '../observability/logging'; // Unused import

export class RateLimitMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'rateLimit';

  constructor(private readonly store: RateLimitStore) {}

  validate(options: Record<string, any>): boolean {
    const { windowMs, max } = options;
    return typeof windowMs === 'number' && typeof max === 'number';
  }

  create(options: Record<string, any>) {
    const { windowMs, max } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = this.getKey(req);
        const current = await this.store.increment(key, windowMs);
        
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
        
        if (current > max) {
          res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil(windowMs / 1000)
          });
          return;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private getKey(req: Request): string {
    return `${req.ip}`;
  }
}
















































