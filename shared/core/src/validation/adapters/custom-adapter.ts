/**
 * Custom Validation Adapter
 *
 * Adapter for custom validation functions implementing the core validation interfaces
 */

import { ValidationError } from '../../observability/error-management/errors/specialized-errors';
import {
  ISchemaAdapter,
  IValidationResult,
  IValidationService,
  IBatchValidationResult,
  IValidationServiceConfig,
} from '../core/interfaces';
import { CoreValidationService } from '../core/validation-service';

/**
 * Custom validation function type
 */
export type CustomValidationFunction<T = any> = (data: unknown) => T;

/**
 * Custom validation schema type
 */
export interface CustomValidationSchema<T = any> {
  validate: CustomValidationFunction<T>;
  description?: string | undefined;
  version?: string | undefined;
}

/**
 * Custom schema adapter implementing the ISchemaAdapter interface
 */
export class CustomSchemaAdapter implements ISchemaAdapter {
  getName(): string {
    return 'custom';
  }

  getVersion(): string {
    return '1.0.0';
  }

  supports(schema: any): boolean {
    return schema && typeof schema === 'object' && typeof schema.validate === 'function';
  }

  async validate<T>(schema: CustomValidationSchema<T>, data: unknown): Promise<T> {
    try {
      return schema.validate(data);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Convert other errors to ValidationError
      const message = error instanceof Error ? error.message : 'Custom validation failed';
      throw new ValidationError(message, { originalError: error, schema: schema.description });
    }
  }

  async validateSafe<T>(schema: CustomValidationSchema<T>, data: unknown): Promise<IValidationResult<T>> {
    try {
      const result = await this.validate(schema, data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { success: false, error };
      }
      // Convert other errors to ValidationError
      const message = error instanceof Error ? error.message : 'Custom validation failed';
      const validationError = new ValidationError(message, { originalError: error });
      return { success: false, error: validationError };
    }
  }
}

/**
 * Custom validation service extending the core validation service
 */
export class CustomValidationService extends CoreValidationService implements IValidationService {
  private adapter: CustomSchemaAdapter;

  constructor(config: IValidationServiceConfig = {}) {
    super(config);
    this.adapter = new CustomSchemaAdapter();
  }

  async validate<T>(
    schema: CustomValidationSchema<T>,
    data: unknown,
    options: any = {},
    context?: any
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
          } else if (!cached.success && cached.error) {
            throw cached.error;
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

      // Perform validation using custom adapter
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
          this.setCache(cacheKey, { success: false, error }, mergedOptions.cacheTtl);
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
    schema: CustomValidationSchema<T>,
    data: unknown,
    options: any = {},
    context?: any
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

      // Perform validation using custom adapter
      const result = await this.adapter.validateSafe(schema, processedData);

      // Cache result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, result, mergedOptions.cacheTtl);
      }

      this.updateMetrics(result.success ? 'success' : 'failure', startTime, context, result.error);
      return result;

    } catch (error) {
      // Handle unexpected errors
      const validationError = new ValidationError(
        error instanceof Error ? error.message : 'Unknown validation error',
        { originalError: error }
      );
      const errorResult = { success: false, error: validationError } as IValidationResult<T>;

      this.updateMetrics('failure', startTime, context, validationError);
      return errorResult;
    }
  }

  async validateBatch<T>(
    schema: CustomValidationSchema<T>,
    dataArray: unknown[],
    options: any = {},
    context?: any
  ): Promise<IBatchValidationResult<T>> {
    const valid: T[] = [];
    const invalid: Array<{
      index: number;
      data: unknown;
      error: ValidationError;
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
        } else if (!result.success && result.error) {
          invalid.push({
            index,
            data,
            error: result.error,
          });
        }
      } else {
        // Handle promise rejection (shouldn't happen with validateSafe, but just in case)
        const error = new ValidationError('Batch validation promise rejected', {
          reason: promiseResult.reason
        });
        invalid.push({
          index: -1,
          data: null,
          error,
        });
      }
    });

    return {
      valid,
      invalid,
      totalCount: dataArray.length,
      validCount: valid.length,
      invalidCount: invalid.length,
    };
  }
}

/**
 * Default custom validation service instance
 */
export const customValidationService = new CustomValidationService();

/**
 * Create a new custom validation service with custom configuration
 */
export function createCustomValidationService(config: IValidationServiceConfig): CustomValidationService {
  return new CustomValidationService(config);
}

/**
 * Helper function to create a custom validation schema
 */
export function createCustomSchema<T>(
  validateFn: CustomValidationFunction<T>,
  description?: string,
  version?: string
): CustomValidationSchema<T> {
  return {
    validate: validateFn,
    description,
    version,
  };
}




































