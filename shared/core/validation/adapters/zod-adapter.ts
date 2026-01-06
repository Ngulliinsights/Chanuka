/**
 * Zod Validation Adapter
 *
 * Adapter for Zod validation library implementing the core validation interfaces
 */

import { ZodSchema, ZodError } from 'zod';

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
 * Zod schema adapter implementing the ValidationAdapter interface
 */
export class ZodSchemaAdapter {
  getName(): string {
    return 'zod';
  }

  getVersion(): string {
    return '3.x'; // This would be dynamically determined in a real implementation
  }

  supports(schema: any): boolean {
    return schema && typeof schema === 'object' && '_def' in schema;
  }

  async validate<T>(schema: ValidationSchema, data: unknown, _options?: ValidationOptions): Promise<T> {
    const zodSchema = schema as any as ZodSchema<T>;
    return zodSchema.parse(data);
  }

  async validateSafe<T>(schema: ValidationSchema, data: unknown, _options?: ValidationOptions): Promise<ValidationResult<T>> {
    try {
      const result = await this.validate(schema, data) as T;
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join('.') || '',
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined,
          context: { zodError: error }
        }));
        return { success: false, errors: errorDetails };
      }
      throw error;
    }
  }

  validateSync<T>(schema: ValidationSchema, data: unknown, _options?: ValidationOptions): T {
    const zodSchema = schema as any as ZodSchema<T>;
    return zodSchema.parse(data);
  }
}

/**
 * Zod-based validation service extending the core validation service
 */
export class ZodValidationService extends CoreValidationService {
  private adapter: ZodSchemaAdapter;

  constructor(config: ValidationServiceConfig = {}) {
    super(config);
    this.adapter = new ZodSchemaAdapter();
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

      // Perform validation using Zod adapter
      const result = await this.adapter.validate(schema, processedData);

      // Cache successful result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, { success: true, data: result }, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime);
      return result as T;

    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join('.') || '',
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined,
          context: { expected: 'expected' in err ? err.expected : undefined }
        }));

        this.updateMetrics('failure', startTime);
        throw new ValidationError('Zod validation failed', undefined, { zodError: error, errors: errorDetails });
      }

      // Re-throw non-validation errors
      this.updateMetrics('failure', startTime);
      throw error;
    }
  }

  validateSync<T>(
    schema: any,
    data: unknown,
    options?: ValidationOptions
  ): T {
    const mergedOptions = { ...this.config.defaultOptions, ...options };
    
    // Preprocess data if enabled
    let processedData = data;
    if (mergedOptions.preprocess) {
      processedData = this.preprocessData(data);
    }

    return (schema as any as ZodSchema<T>).parse(processedData);
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
      if (error instanceof ZodError) {
        const errorDetails: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join('.') || '',
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined,
          context: { expected: 'expected' in err ? err.expected : undefined }
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
 * Default Zod validation service instance
 */
export const zodValidationService = new ZodValidationService();

/**
 * Create a new Zod validation service with custom configuration
 */
export function createZodValidationService(config: ValidationServiceConfig): ZodValidationService {
  return new ZodValidationService(config);
}








































