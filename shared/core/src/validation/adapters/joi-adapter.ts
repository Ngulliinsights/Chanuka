/**
 * Joi Validation Adapter
 *
 * Adapter for Joi validation library implementing the core validation interfaces
 */

import * as Joi from 'joi';
import { ValidationError } from '../../observability/error-management/errors/specialized-errors';
import {
  ISchemaAdapter,
  IValidationResult,
  IValidationService,
  IBatchValidationResult,
  IValidationServiceConfig,
  ValidationErrorDetail,
} from '../core/interfaces';
import { CoreValidationService } from '../core/validation-service';

/**
 * Joi schema adapter implementing the ISchemaAdapter interface
 */
export class JoiSchemaAdapter implements ISchemaAdapter {
  getName(): string {
    return 'joi';
  }

  getVersion(): string {
    return '17.x'; // This would be dynamically determined in a real implementation
  }

  supports(schema: any): boolean {
    return schema && typeof schema === 'object' && schema.isJoi === true;
  }

  async validate<T>(schema: Joi.Schema, data: unknown): Promise<T> {
    const result = schema.validate(data, { abortEarly: false });
    if (result.error) {
      throw result.error;
    }
    return result.value as T;
  }

  async validateSafe<T>(schema: Joi.Schema, data: unknown): Promise<IValidationResult<T>> {
    try {
      const result = await this.validate(schema, data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errorDetails: ValidationErrorDetail[] = error.details.map(detail => ({
          field: detail.path.join('.') || '',
          message: detail.message,
          code: detail.type || 'invalid',
          value: detail.context?.value,
          context: { joiError: error, detail }
        }));
        return { success: false, errors: errorDetails };
      }
      throw error;
    }
  }
}

/**
 * Joi-based validation service extending the core validation service
 */
export class JoiValidationService extends CoreValidationService implements IValidationService {
  private adapter: JoiSchemaAdapter;

  constructor(config: IValidationServiceConfig = {}) {
    super(config);
    this.adapter = new JoiSchemaAdapter();
  }

  async validate<T>(
    schema: Joi.Schema,
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

      // Perform validation using Joi adapter
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
    schema: Joi.Schema,
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

      // Perform validation using Joi adapter
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
    schema: Joi.Schema,
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
 * Default Joi validation service instance
 */
export const joiValidationService = new JoiValidationService();

/**
 * Create a new Joi validation service with custom configuration
 */
export function createJoiValidationService(config: IValidationServiceConfig): JoiValidationService {
  return new JoiValidationService(config);
}





































