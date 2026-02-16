import { Request, Response, NextFunction } from 'express';

import { MiddlewareProvider } from '../types';

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number>;
}

export class RateLimitMiddlewareProvider implements MiddlewareProvider {
  readonly name = 'rateLimit';

  constructor(private readonly store?: RateLimitStore) {}

  validate(options: Record<string, any>): boolean {
    const { windowMs, max } = options;
    return typeof windowMs === 'number' && typeof max === 'number';
  }

  create(options: Record<string, any>) {
    const { windowMs, max } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!this.store) {
          // No store configured, skip rate limiting
          return next();
        }

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
















































