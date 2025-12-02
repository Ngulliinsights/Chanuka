/**
 * Joi Validation Adapter
 *
 * Adapter for Joi validation library implementing the core validation interfaces
 */

import * as Joi from 'joi';
import { ValidationError } from '../../observability/error-management/errors/specialized-errors';
import {
  ValidationSchema,
  ValidationOptions,
  ValidationResult,
  BatchValidationResult,
  PreprocessingRules,
  ValidationServiceConfig,
  ValidationErrorDetail,
} from '../core/interfaces';
import { CoreValidationService } from '../core/validation-service';

/**
 * Joi schema adapter implementing the ValidationAdapter interface
 */
export class JoiSchemaAdapter {
  getName(): string {
    return 'joi';
  }

  getVersion(): string {
    return '17.x'; // This would be dynamically determined in a real implementation
  }

  supports(schema: any): boolean {
    return schema && typeof schema === 'object' && schema.isJoi === true;
  }

  async validate<T>(schema: Joi.Schema, data: unknown, _options?: ValidationOptions): Promise<T> {
    const joiSchema = schema;
    const result = joiSchema.validate(data, { abortEarly: false });
    if (result.error) {
      throw result.error;
    }
    return result.value;
  }

  async validateSafe<T>(schema: Joi.Schema, data: unknown, _options?: ValidationOptions): Promise<ValidationResult<T>> {
    try {
      const result = await this.validate(schema, data);
      return { success: true, data: result as T };
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

  validateSync<T>(schema: Joi.Schema, data: unknown, _options?: ValidationOptions): T {
    const joiSchema = schema;
    const result = joiSchema.validate(data, { abortEarly: false });
    if (result.error) {
      throw result.error;
    }
    return result.value as T;
  }
}

/**
 * Joi-based validation service extending the core validation service
 */
export class JoiValidationService extends CoreValidationService {
  private adapter: JoiSchemaAdapter;

  constructor(config: ValidationServiceConfig = {}) {
    super(config);
    this.adapter = new JoiSchemaAdapter();
  }

  async validate<T>(
    schema: ValidationSchema,
    data: unknown,
    options?: ValidationOptions
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
      const result = await this.adapter.validate(schema as unknown as Joi.Schema, processedData) as T;

      // Cache successful result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, { success: true, data: result }, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime);
      return result;

    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errorDetails: ValidationErrorDetail[] = error.details.map(detail => ({
          field: detail.path.join('.') || '',
          message: detail.message,
          code: detail.type,
          value: detail.context?.value,
          context: detail.context || {}
        }));

        this.updateMetrics('failure', startTime);
        throw new ValidationError('Joi validation failed', undefined, { joiError: error, errors: errorDetails });
      }

      // Re-throw non-validation errors
      this.updateMetrics('failure', startTime);
      throw error;
    }
  }

  validateSync<T>(
    schema: ValidationSchema,
    data: unknown,
    options?: ValidationOptions
  ): T {
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    // Preprocess data if enabled
    let processedData = data;
    if (mergedOptions.preprocess) {
      processedData = this.preprocessData(data);
    }

    const result = (schema as unknown as Joi.Schema).validate(processedData, { abortEarly: false });
    if (result.error) {
      throw result.error;
    }
    return result.value as T;
  }

  async validateSafe<T>(
    schema: ValidationSchema,
    data: unknown,
    options?: ValidationOptions
  ): Promise<ValidationResult<T>> {
    try {
      const result = await this.validate<T>(schema, data, options);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errorDetails: ValidationErrorDetail[] = error.details.map(detail => ({
          field: detail.path.join('.') || '',
          message: detail.message,
          code: detail.type,
          value: detail.context?.value,
          context: detail.context || {}
        }));
        return { success: false, errors: errorDetails };
      }

      // Handle other errors
      return {
        success: false,
        errors: [{
          field: '',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'UNKNOWN_ERROR'
        }]
      };
    }
  }

  async validateBatch<T>(
    schema: ValidationSchema,
    dataArray: unknown[],
    options?: ValidationOptions
  ): Promise<BatchValidationResult<T>> {
    const valid: T[] = [];
    const invalid: Array<{
      index: number;
      data: unknown;
      errors: ValidationErrorDetail[];
    }> = [];

    // Process all items
    const results = await Promise.allSettled(
      dataArray.map((data, index) =>
        this.validateSafe(schema, data, options).then(result => ({ result, index, data }))
      )
    );

    // Separate valid and invalid results
    results.forEach((promiseResult) => {
      if (promiseResult.status === 'fulfilled') {
        const { result, index, data } = promiseResult.value;
        if (result.success && result.data !== undefined) {
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
        invalid.push({
          index: -1,
          data: null,
          errors: [{
            field: '',
            message: 'Batch validation promise rejected',
            code: 'PROMISE_REJECTED',
            context: { reason: promiseResult.reason }
          }],
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

  // Implement the preprocess method required by ValidationService interface
  override preprocess(data: unknown, _rules: PreprocessingRules): unknown {
    return this.preprocessData(data);
  }
}

/**
 * Default Joi validation service instance
 */
export const joiValidationService = new JoiValidationService();

/**
 * Create a new Joi validation service with custom configuration
 */
export function createJoiValidationService(config: ValidationServiceConfig): JoiValidationService {
  return new JoiValidationService(config);
}








































