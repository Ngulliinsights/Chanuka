import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logging';

export type RegularMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void> | Response | Promise<Response | undefined>;
export type ErrorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => void | Promise<void> | Response | Promise<Response | undefined>;
export type AnyMiddleware = RegularMiddleware | ErrorMiddleware;

export interface PerformanceMetrics {
  readonly totalTime: number;
  readonly invocations: number;
  readonly averageTime: number;
  readonly lastInvocation: Date;
  readonly minTime: number;
  readonly maxTime: number;
}

export interface DetailedMetrics {
  count: number;
  totalDuration: number;
  min: number;
  max: number;
  durations: number[];
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ValidationService {
  validate(data: any, schema: any): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  reset(): Promise<void>;
}

export interface HealthChecker {
  check(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  details?: Record<string, any>;
}

// Provider interfaces
export interface MiddlewareProvider {
  readonly name: string;
  validate?(options: Record<string, any>): boolean;
  create(options: Record<string, any>): AnyMiddleware;
}

export interface AuthMiddlewareProvider extends MiddlewareProvider {
  readonly name: 'auth';
  create(options: Record<string, any>): RegularMiddleware;
}

export interface CacheMiddlewareProvider extends MiddlewareProvider {
  readonly name: 'cache';
  create(options: Record<string, any>): RegularMiddleware;
}

export interface ValidationMiddlewareProvider extends MiddlewareProvider {
  readonly name: 'validation';
  create(options: Record<string, any>): RegularMiddleware;
}

export interface RateLimitMiddlewareProvider extends MiddlewareProvider {
  readonly name: 'rateLimit';
  create(options: Record<string, any>): RegularMiddleware;
}

export interface ErrorHandlerMiddlewareProvider extends MiddlewareProvider {
  readonly name: 'errorHandler';
  create(options: Record<string, any>): ErrorMiddleware;
}
















































