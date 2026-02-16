import { Request, Response, NextFunction } from 'express';

import { MiddlewareFactory } from './middleware-factory';
// import { logger } from '../observability/logging'; // Unused import

export class MiddlewareRegistry {
  private middlewares: ((app: any) => void)[] = [];

  constructor(private factory: MiddlewareFactory) {
    // Correlation ID middleware should be added by the server
  }

  loadMiddlewares(): void {
    this.middlewares.push(...this.factory.createMiddleware());
  }

  applyMiddlewares(app: any): void {
    for (const middleware of this.middlewares) {
      middleware(app);
    }
  }

  addMiddleware(middleware: (app: any) => void): void {
    this.middlewares.push(middleware);
  }
}

export const applyMiddleware = (middleware: any) => {
  return (_target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
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
















































