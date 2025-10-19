import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from '../utils/correlation-id';
import { MiddlewareFactory } from './factory';
import { logger } from '../observability/logging';

export class MiddlewareRegistry {
  private middlewares: ((app: any) => void)[] = [];

  constructor(private factory: MiddlewareFactory) {
    // Always add correlation ID middleware first
    this.middlewares.push(app => app.use(correlationIdMiddleware));
  }

  loadMiddlewares(): void {
    this.middlewares.push(...this.factory.createMiddleware());
  }

  applyMiddlewares(app: any): void {
    for (const middleware of this.middlewares) {
      middleware(app);
    }
  }
}

export const applyMiddleware = (middleware: any) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req: Request = args[0];
      const res: Response = args[1];
      const next: NextFunction = args[2];

      try {
        await new Promise((resolve, reject) => {
          middleware(req, res, (error: any) => {
            if (error) reject(error);
            else resolve(true);
          });
        });
        return await originalMethod.apply(this, args);
      } catch (error) {
        next(error);
      }
    };

    return descriptor;
  };
};












































