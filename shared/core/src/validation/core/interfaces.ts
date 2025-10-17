/**
 * Validation Core Interfaces
 *
 * Core interfaces for the validation system following the adapter pattern
 */

import { ValidationError } from '../../error-management/errors/specialized/validation-error';

/**
 * Core validation result interface
 */
export interface IValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

/**
 * Core batch validation result interface
 */
export interface IBatchValidationResult<T = any> {
  valid: T[];
  invalid: Array<{
    index: number;
    data: unknown;
    error: ValidationError;
  }>;
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

/**
 * Core validation options interface
 */
export interface IValidationOptions {
  preprocess?: boolean;
  useCache?: boolean;
  cacheTtl?: number;
  cacheKeyGenerator?: (schema: any, data: unknown) => string;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

/**
 * Core validation context interface
 */
export interface IValidationContext {
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Core validation service interface
 */
export interface IValidationService {
  /**
   * Validate data against a schema
   */
  validate<T>(
    schema: any,
    data: unknown,
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<T>;

  /**
   * Validate data safely without throwing errors
   */
  validateSafe<T>(
    schema: any,
    data: unknown,
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<IValidationResult<T>>;

  /**
   * Validate multiple objects in batch
   */
  validateBatch<T>(
    schema: any,
    dataArray: unknown[],
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<IBatchValidationResult<T>>;

  /**
   * Register a schema with the service
   */
  registerSchema(
    name: string,
    schema: any,
    options?: {
      version?: string;
      description?: string;
      tags?: string[];
    }
  ): void;

  /**
   * Get a registered schema by name
   */
  getSchema(name: string): any | undefined;

  /**
   * Get validation metrics
   */
  getMetrics(): any;

  /**
   * Clear validation cache
   */
  clearCache(): void;
}

/**
 * Core schema adapter interface
 */
export interface ISchemaAdapter {
  /**
   * Validate data using the adapter's validation library
   */
  validate<T>(schema: any, data: unknown): Promise<T>;

  /**
   * Validate data safely using the adapter's validation library
   */
  validateSafe<T>(schema: any, data: unknown): Promise<IValidationResult<T>>;

  /**
   * Check if the adapter supports the given schema type
   */
  supports(schema: any): boolean;

  /**
   * Get adapter name
   */
  getName(): string;

  /**
   * Get adapter version
   */
  getVersion(): string;
}

/**
 * Core preprocessing configuration interface
 */
export interface IPreprocessingConfig {
  trimStrings?: boolean;
  coerceNumbers?: boolean;
  coerceBooleans?: boolean;
  emptyStringToNull?: boolean;
  undefinedToNull?: boolean;
  customPreprocessors?: Array<(data: unknown) => unknown>;
}

/**
 * Core caching configuration interface
 */
export interface ICachingConfig {
  enabled: boolean;
  defaultTtl: number;
  maxSize: number;
}

/**
 * Core validation service configuration interface
 */
export interface IValidationServiceConfig {
  defaultOptions?: IValidationOptions;
  preprocessing?: IPreprocessingConfig;
  cache?: ICachingConfig;
  metrics?: {
    enabled: boolean;
    trackSchemaUsage: boolean;
    trackErrorPatterns: boolean;
  };
}

/**
 * Core schema registration interface
 */
export interface ISchemaRegistration {
  name: string;
  schema: any;
  version?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Core validation metrics interface
 */
export interface IValidationMetrics {
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
 * Core cached validation result interface
 */
export interface ICachedValidationResult<T = any> {
  result: IValidationResult<T>;
  timestamp: number;
  ttl: number;
}