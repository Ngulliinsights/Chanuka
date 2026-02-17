import { Request, Response, NextFunction } from 'express';

import { MiddlewareFactory } from './middleware-factory';

export class MiddlewareRegistry {
  private middlewares: ((app: unknown) => void)[] = [];

  constructor(private factory: MiddlewareFactory) {
    // Correlation ID middleware should be added by the server
  }

  loadMiddlewares(): void {
    this.middlewares.push(...this.factory.createMiddleware());
  }

  applyMiddlewares(app: unknown): void {
    for (const middleware of this.middlewares) {
      middleware(app);
    }
  }

  addMiddleware(middleware: (app: unknown) => void): void {
    this.middlewares.push(middleware);
  }
}

export const applyMiddleware = (middleware: unknown) => {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const req: Request = args[0];
      const res: Response = args[1];
      const next: NextFunction = args[2];

      try {
        await new Promise((resolve, reject) => {
          middleware(req, res, (error: unknown) => {
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
















































