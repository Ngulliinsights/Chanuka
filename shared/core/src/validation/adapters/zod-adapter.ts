/**
 * Zod Validation Adapter
 *
 * Adapter for Zod validation library implementing the core validation interfaces
 */

import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../../observability/error-management/errors/specialized-errors';
import {
  ISchemaAdapter,
  IValidationResult,
  IValidationOptions,
  IValidationContext,
  IValidationService,
  IBatchValidationResult,
  IValidationServiceConfig,
  ISchemaRegistration,
  IValidationMetrics,
  ValidationErrorDetail,
} from '../core/interfaces';
import { CoreValidationService } from '@client/core/validation-service';

/**
 * Zod schema adapter implementing the ISchemaAdapter interface
 */
export class ZodSchemaAdapter implements ISchemaAdapter {
  getName(): string {
    return 'zod';
  }

  getVersion(): string {
    return '3.x'; // This would be dynamically determined in a real implementation
  }

  supports(schema: any): boolean {
    return schema && typeof schema === 'object' && '_def' in schema;
  }

  async validate<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
    return schema.parse(data);
  }

  async validateSafe<T>(schema: ZodSchema<T>, data: unknown): Promise<IValidationResult<T>> {
    try {
      const result = await this.validate(schema, data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(error, undefined, { zodError: error });
        const errorDetails: ValidationErrorDetail[] = validationError.errors.map(err => ({
          field: err.field || '',
          message: err.message,
          code: err.code,
          value: err.value,
          context: { zodError: error }
        }));
        return { success: false, errors: errorDetails };
      }
      throw error;
    }
  }
}

/**
 * Zod-based validation service extending the core validation service
 */
export class ZodValidationService extends CoreValidationService implements IValidationService {
  private adapter: ZodSchemaAdapter;

  constructor(config: IValidationServiceConfig = {}) {
    super(config);
    this.adapter = new ZodSchemaAdapter();
  }

  async validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: IValidationOptions = {},
    context?: IValidationContext
  ): Promise<T> {
    const startTime = performance.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    try {
      // Check cache first if enabled
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);

        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          if (cached.success && cached.data) {
            return cached.data;
          } else if (!cached.success && cached.errors && cached.errors.length > 0) {
            const validationError = new ValidationError('Cached validation error', undefined, {
              cachedErrors: cached.errors
            });
            throw validationError;
          }
        } else {
          this.updateMetrics('cacheMiss');
        }
      }

      // Preprocess data if enabled
      let processedData = data;
      if (mergedOptions.preprocess) {
        processedData = this.preprocessData(data);
      }

      // Perform validation using Zod adapter
      const result = await this.adapter.validate(schema, processedData);

      // Cache successful result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, { success: true, data: result }, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime, context);
      return result;

    } catch (error) {
      if (error instanceof ValidationError) {
        // Cache validation error
        if (mergedOptions.useCache && this.config.cache?.enabled) {
          const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
          const errorDetails: ValidationErrorDetail[] = error.errors.map(err => ({
            field: err.field || '',
            message: err.message,
            code: err.code,
            value: err.value,
            context: { cached: true }
          }));
          this.setCache(cacheKey, { success: false, errors: errorDetails }, mergedOptions.cacheTtl);
        }

        this.updateMetrics('failure', startTime, context, error);
        throw error;
      }

      // Re-throw non-validation errors
      this.updateMetrics('failure', startTime, context);
      throw error;
    }
  }

  async validateSafe<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: IValidationOptions = {},
    context?: IValidationContext
  ): Promise<IValidationResult<T>> {
    const startTime = performance.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    try {
      // Check cache first if enabled
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);

        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          return cached;
        } else {
          this.updateMetrics('cacheMiss');
        }
      }

      // Preprocess data if enabled
      let processedData = data;
      if (mergedOptions.preprocess) {
        processedData = this.preprocessData(data);
      }

      // Perform validation using Zod adapter
      const result = await this.adapter.validateSafe(schema, processedData);

      // Cache result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, result, mergedOptions.cacheTtl);
      }

      this.updateMetrics(result.success ? 'success' : 'failure', startTime, context);
      return result;

    } catch (error) {
      // Handle unexpected errors
      const validationError = new ValidationError(
        error instanceof Error ? error.message : 'Unknown validation error',
        undefined,
        { originalError: error }
      );
      const errorDetails: ValidationErrorDetail[] = validationError.errors.map(err => ({
        field: err.field || '',
        message: err.message,
        code: err.code,
        value: err.value,
        context: { originalError: error }
      }));
      const errorResult = { success: false, errors: errorDetails } as IValidationResult<T>;

      this.updateMetrics('failure', startTime, context, validationError);
      return errorResult;
    }
  }

  async validateBatch<T>(
    schema: ZodSchema<T>,
    dataArray: unknown[],
    options: IValidationOptions = {},
    context?: IValidationContext
  ): Promise<IBatchValidationResult<T>> {
    const valid: T[] = [];
    const invalid: Array<{
      index: number;
      data: unknown;
      errors: ValidationErrorDetail[];
    }> = [];

    // Process all items
    const results = await Promise.allSettled(
      dataArray.map((data, index) =>
        this.validateSafe(schema, data, options, context).then(result => ({ result, index, data }))
      )
    );

    // Separate valid and invalid results
    results.forEach((promiseResult) => {
      if (promiseResult.status === 'fulfilled') {
        const { result, index, data } = promiseResult.value;
        if (result.success && result.data) {
          valid.push(result.data);
        } else if (!result.success && result.errors && result.errors.length > 0) {
          invalid.push({
            index,
            data,
            errors: result.errors,
          });
        }
      } else {
        // Handle promise rejection (shouldn't happen with validateSafe, but just in case)
        const validationError = new ValidationError('Batch validation promise rejected', undefined, {
          reason: promiseResult.reason
        });
        const errorDetails: ValidationErrorDetail[] = validationError.errors.map(err => ({
          field: err.field || '',
          message: err.message,
          code: err.code,
          value: err.value,
          context: { reason: promiseResult.reason }
        }));
        invalid.push({
          index: -1,
          data: null,
          errors: errorDetails,
        });
      }
    });

    return {
      valid,
      invalid,
      summary: {
        total: dataArray.length,
        valid: valid.length,
        invalid: invalid.length,
        successRate: valid.length / dataArray.length,
      },
    };
  }
}

/**
 * Default Zod validation service instance
 */
export const zodValidationService = new ZodValidationService();

/**
 * Create a new Zod validation service with custom configuration
 */
export function createZodValidationService(config: IValidationServiceConfig): ZodValidationService {
  return new ZodValidationService(config);
}





































