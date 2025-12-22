/**
 * Unified Validation Service Implementation
 *
 * Implementation of the IValidationService interface that wraps the existing
 * ValidationService and provides a unified API for client and server modules.
 */

import { Result, ok, err } from '../primitives/types/result';
import { BaseError } from '../observability/error-management/errors/base-error';
import {
  IValidationService,
  ValidationServiceRegistry,
  ValidationResult,
  BatchValidationResult,
  ValidationOptions,
  ValidationContext,
  ValidationMetrics,
  SchemaRegistrationOptions
} from './ivalidation-service';
import { ValidationService } from './validation-service';
import { ZodSchema } from 'zod';

/**
 * Validation operation error
 */
export class ValidationOperationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'VALIDATION_OPERATION_ERROR', ...(cause && { cause }) });
  }
}

/**
 * Unified Validation Service Implementation
 *
 * Wraps the existing ValidationService to provide a consistent,
 * high-level API for validation operations.
 */
export class ValidationServiceWrapper implements IValidationService {
  private service: ValidationService;

  constructor(config?: any) {
    this.service = new ValidationService(config);
  }

  /**
   * Register a schema for reuse
   */
  registerSchema(
    name: string,
    schema: ZodSchema,
    options?: SchemaRegistrationOptions
  ): void {
    this.service.registerSchema(name, schema, options);
  }

  /**
   * Retrieve a registered schema by name
   */
  getSchema(name: string): ZodSchema | undefined {
    return this.service.getSchema(name);
  }

  /**
   * List all registered schemas
   */
  getRegisteredSchemas(): any[] {
    return this.service.getRegisteredSchemas();
  }

  /**
   * Access pre-built common validation schemas
   */
  getCommonSchema(name: string): ZodSchema | undefined {
    return this.service.getCommonSchema(name);
  }

  /**
   * Validate data with comprehensive error handling (throws on failure)
   */
  async validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: ValidationOptions,
    context?: ValidationContext
  ): Promise<T> {
    try {
      return await this.service.validate(schema, data, options, context);
    } catch (error) {
      throw new ValidationOperationError(`Validation failed: ${error}`, error as Error);
    }
  }

  /**
   * Validate data returning a result object (never throws)
   */
  async validateSafe<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options?: ValidationOptions,
    context?: ValidationContext
  ): Promise<ValidationResult<T>> {
    try {
      return await this.service.validateSafe(schema, data, options, context);
    } catch (error) {
      return {
        success: false,
        error: new ValidationOperationError(`Safe validation failed: ${error}`, error as Error)
      };
    }
  }

  /**
   * Validate multiple items concurrently
   */
  async validateBatch<T>(
    schema: ZodSchema<T>,
    dataArray: unknown[],
    options?: ValidationOptions,
    context?: ValidationContext
  ): Promise<BatchValidationResult<T>> {
    try {
      return await this.service.validateBatch(schema, dataArray, options, context);
    } catch (error) {
      throw new ValidationOperationError(`Batch validation failed: ${error}`, error as Error);
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Readonly<ValidationMetrics> {
    return this.service.getMetrics();
  }

  /**
   * Reset all metrics to zero
   */
  resetMetrics(): void {
    this.service.resetMetrics();
  }

  /**
   * Clear all cached validation results
   */
  clearCache(): void {
    this.service.clearCache();
  }

  /**
   * Get detailed cache performance statistics
   */
  getCacheStats(): any {
    return this.service.getCacheStats();
  }

  /**
   * Check if the validation service is ready
   */
  isReady(): boolean {
    // The ValidationService doesn't have an isReady method, so we assume it's always ready
    return true;
  }

  /**
   * Gracefully shutdown the validation service
   */
  destroy(): void {
    this.service.destroy();
  }
}

/**
 * Factory function for creating validation services
 */
export async function createValidationServiceWrapper(config?: any): Promise<Result<IValidationService>> {
  try {
    const service = new ValidationServiceWrapper(config);
    return ok(service);
  } catch (error) {
    return err(new ValidationOperationError('Failed to create validation service wrapper', error as Error));
  }
}

// Register the default validation service factory
ValidationServiceRegistry.register('default', createValidationServiceWrapper);