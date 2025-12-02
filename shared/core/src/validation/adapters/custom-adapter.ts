/**
 * Custom Validation Adapter
 *
 * Adapter for custom validation functions implementing the core validation interfaces
 */

import { ValidationError } from '../../observability/error-management/errors/specialized-errors';
import {
  // ISchemaAdapter,
  IValidationResult,
  IValidationService,
  IBatchValidationResult,
  IValidationServiceConfig,
  ValidationErrorDetail,
  ValidationSchema,
  ValidationOptions,
} from '../core/interfaces';
import { CoreValidationService } from '../core/validation-service';

/**
 * Custom validation function type
 */
export type CustomValidationFunction<T = any> = (data: unknown) => IValidationResult<T>;

/**
 * Custom validation schema type
 */
export interface CustomValidationSchema<T = any> extends ValidationSchema {
  validate: CustomValidationFunction<T>;
}

/**
 * Custom schema adapter
 */
export class CustomSchemaAdapter {
  readonly name = 'custom';
  readonly version = '1.0.0';
  readonly config: any = {};

  supports(schema: any): boolean {
    return schema && typeof schema === 'object' && typeof schema.validate === 'function';
  }

  async validate<T>(schema: CustomValidationSchema<T>, data: unknown): Promise<T> {
    try {
      const result = schema.validate(data);
      if (result.success) {
        return result.data!;
      } else {
        throw new ValidationError('Validation failed', result.errors || [], { schema: schema.description });
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Convert other errors to ValidationError
      const message = error instanceof Error ? error.message : 'Custom validation failed';
      throw new ValidationError(message, [{
        field: 'data',
        code: 'custom_validation_failed',
        message: message,
        value: data
      }], { originalError: error, schema: schema.description });
    }
  }

  async validateSafe<T>(schema: CustomValidationSchema<T>, data: unknown): Promise<IValidationResult<T>> {
    try {
      const result = schema.validate(data);
      return { success: result.success, data: result.data!, errors: result.errors || [] };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { success: false, errors: error.errors.map(err => ({
          field: err.field || 'data',
          message: err.message,
          code: err.code,
          value: err.value
        })) };
      }
      // Convert other errors to ValidationError
      const message = error instanceof Error ? error.message : 'Custom validation failed';
      const validationError = new ValidationError(message, [{
        field: 'data',
        code: 'custom_validation_failed',
        message: message,
        value: data
      }], { originalError: error });
      return { success: false, errors: validationError.errors.map(err => ({
        field: err.field || 'data',
        message: err.message,
        code: err.code,
        value: err.value
      })) };
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
    schema: ValidationSchema,
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
          } else if (!cached.success && cached.errors && cached.errors.length > 0) {
            throw cached.errors[0];
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
      const result = await this.adapter.validate(schema as CustomValidationSchema<T>, processedData);

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
          this.setCache(cacheKey, { success: false, errors: error.errors.map(err => ({
            field: err.field || 'data',
            message: err.message,
            code: err.code,
            value: err.value
          })) }, mergedOptions.cacheTtl);
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
    schema: ValidationSchema,
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
      const result = await this.adapter.validateSafe(schema as CustomValidationSchema<T>, processedData);

      // Cache result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, result, mergedOptions.cacheTtl);
      }

      this.updateMetrics(result.success ? 'success' : 'failure', startTime, context);
      return result as IValidationResult<T>;

    } catch (error) {
      // Handle unexpected errors
      const validationError = new ValidationError(
        error instanceof Error ? error.message : 'Unknown validation error',
        [{
          field: 'data',
          code: 'unknown_validation_error',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          value: data
        }],
        { originalError: error }
      );
      const errorDetails: ValidationErrorDetail[] = validationError.errors.map(err => ({
        field: err.field || 'data',
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
    schema: ValidationSchema,
    dataArray: unknown[],
    options: any = {},
    context?: any
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
          valid.push(result.data as T);
        } else if (!result.success && result.errors && result.errors.length > 0) {
          invalid.push({
            index,
            data,
            errors: result.errors,
          });
        }
      } else {
        // Handle promise rejection (shouldn't happen with validateSafe, but just in case)
        const error = new ValidationError('Batch validation promise rejected', [{
          field: 'batch',
          code: 'batch_validation_failed',
          message: 'Batch validation promise rejected',
          value: promiseResult.reason
        }], {
          reason: promiseResult.reason
        });
        invalid.push({
          index: -1,
          data: null,
          errors: error.errors.map(err => ({
            field: err.field || 'batch',
            message: err.message,
            code: err.code,
            value: err.value
          })),
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

  validateSync<T>(schema: ValidationSchema, data: unknown, _options?: ValidationOptions): T {
    const result = schema.validate(data);
    if (result.success) {
      return result.data as T;
    } else {
      throw new ValidationError('Validation failed', result.errors || [], { schema: schema.description });
    }
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
  } as CustomValidationSchema<T>;
}








































