/**
 * Unified Validation Service Interface
 *
 * This interface provides a high-level abstraction over the validation infrastructure,
 * consolidating schema validation and middleware into a single, consistent API for
 * client and server modules to consume.
 */

import { ZodSchema } from 'zod';

import { Result, err } from '../primitives/types/result';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: any;
}

/**
 * Batch validation result type
 */
export interface BatchValidationResult<T> {
  valid: T[];
  invalid: Array<{
    index: number;
    data: unknown;
    error: any;
  }>;
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  preprocess?: boolean;
  useCache?: boolean;
  cacheTtl?: number;
  stripUnknown?: boolean;
  abortEarly?: boolean;
  cacheKeyGenerator?: (schema: ZodSchema, data: unknown) => string;
}

/**
 * Validation context for tracking and analytics
 */
export interface ValidationContext {
  schemaName?: string;
  requestId?: string;
  userId?: string;
  source?: string;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  cacheHits: number;
  cacheMisses: number;
  avgValidationTime: number;
  schemaUsageCount: Record<string, number>;
  errorsByField: Record<string, number>;
  errorsByCode: Record<string, number>;
}

/**
 * Schema registration options
 */
export interface SchemaRegistrationOptions {
  version?: string;
  description?: string;
  tags?: string[];
}

/**
 * Unified Validation Service Interface
 *
 * Provides a consistent, high-level API for validation operations across the application.
 * This interface abstracts away the complexity of different validation implementations
 * and provides a unified interface for schema validation, middleware, and batch operations.
 */
export interface IValidationService {
  /**
   * Register a schema for reuse across your application
   */
  registerSchema(
    name: string,
    schema: ZodSchema,
    options?: SchemaRegistrationOptions
  ): void;

  /**
   * Retrieve a registered schema by name
   */
  getSchema(name: string): ZodSchema | undefined;

  /**
   * List all registered schemas
   */
  getRegisteredSchemas(): any[];

  /**
   * Access pre-built common validation schemas
   */
  getCommonSchema(name: string): ZodSchema | undefined;

  /**
   * Validate data with comprehensive error handling (throws on failure)
   */
  validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: ValidationOptions,
    context?: ValidationContext
  ): Promise<T>;

  /**
   * Validate data returning a result object (never throws)
   */
  validateSafe<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: ValidationOptions,
    context?: ValidationContext
  ): Promise<ValidationResult<T>>;

  /**
   * Validate multiple items concurrently
   */
  validateBatch<T>(
    schema: ZodSchema<T>,
    dataArray: unknown[],
    options?: ValidationOptions,
    context?: ValidationContext
  ): Promise<BatchValidationResult<T>>;

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Readonly<ValidationMetrics>;

  /**
   * Reset all metrics to zero
   */
  resetMetrics(): void;

  /**
   * Clear all cached validation results
   */
  clearCache(): void;

  /**
   * Get detailed cache performance statistics
   */
  getCacheStats(): any;

  /**
   * Check if the validation service is ready for operations
   */
  isReady(): boolean;

  /**
   * Gracefully shutdown the validation service
   */
  destroy(): void;
}

/**
 * Factory function type for creating validation services
 */
export type ValidationServiceFactory = (config?: any) => Promise<Result<IValidationService>>;

/**
 * Registry for validation service factories
 */
export class ValidationServiceRegistry {
  private static factories = new Map<string, ValidationServiceFactory>();

  /**
   * Register a validation service factory
   */
  static register(type: string, factory: ValidationServiceFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * Create a validation service instance
   */
  static async create(type: string, config?: any): Promise<Result<IValidationService>> {
    const factory = this.factories.get(type);
    if (!factory) {
      return err(new Error(`No validation service factory registered for type: ${type}`));
    }
    return factory(config);
  }

  /**
   * Get registered factory types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}