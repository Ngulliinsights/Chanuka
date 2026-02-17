/**
 * Middleware Types
 * Core type definitions for middleware system
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Regular middleware function signature
 */
export type RegularMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error handling middleware function signature
 */
export type ErrorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Union type for any middleware
 */
export type AnyMiddleware = RegularMiddleware | ErrorMiddleware;

/**
 * Performance metrics for middleware
 */
export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  lastRequestTime: number;
}

/**
 * Middleware provider interface
 */
export interface MiddlewareProvider {
  readonly name: string;
  validate(options: Record<string, unknown>): boolean;
  create(options: Record<string, unknown>): RegularMiddleware;
}
