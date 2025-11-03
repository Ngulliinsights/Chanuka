/**
 * Core Validation Interfaces
 * 
 * Unified interfaces for all validation implementations
 */

export interface ValidationService {
  // Schema management
  registerSchema(name: string, schema: ValidationSchema): void;
  getSchema(name: string): ValidationSchema | undefined;
  hasSchema(name: string): boolean;
  
  // Validation operations
  validate<T>(schema: ValidationSchema, data: unknown, options?: ValidationOptions): Promise<T>;
  validateSync<T>(schema: ValidationSchema, data: unknown, options?: ValidationOptions): T;
  validateSafe<T>(schema: ValidationSchema, data: unknown, options?: ValidationOptions): Promise<ValidationResult<T>>;
  validateBatch<T>(schema: ValidationSchema, dataArray: unknown[], options?: ValidationOptions): Promise<BatchValidationResult<T>>;
  
  // Utility methods
  sanitize(data: unknown, rules: SanitizationRules): unknown;
  preprocess(data: unknown, rules: PreprocessingRules): unknown;
  
  // Metrics and health
  getMetrics?(): ValidationMetrics;
  getHealth?(): Promise<ValidationHealthStatus>;
  
  // Lifecycle
  destroy?(): Promise<void>;
}

export interface ValidationAdapter extends ValidationService {
  readonly name: string;
  readonly version: string;
  readonly config: ValidationAdapterConfig;
}

export interface ValidationAdapterConfig {
  enableCache?: boolean;
  cacheTimeout?: number;
  enableMetrics?: boolean;
  enablePreprocessing?: boolean;
  enableSanitization?: boolean;
  strictMode?: boolean;
  
  // Additional properties needed by CoreValidationService
  // These provide more granular control over adapter behavior
  defaultOptions?: ValidationOptions;
  preprocessing?: PreprocessingConfig;
  cache?: {
    enabled?: boolean;
    defaultTtl?: number;
    maxSize?: number;
  };
  metrics?: {
    enabled?: boolean;
    trackSchemaUsage?: boolean;
    trackErrorPatterns?: boolean;
  };
}

export interface ValidationSchema {
  // Generic schema interface that adapters can implement
  validate(data: unknown): ValidationResult<any>;
  validateAsync?(data: unknown): Promise<ValidationResult<any>>;
  
  // Schema metadata
  name?: string;
  description?: string;
  version?: string;
  tags?: string[];
}

export interface ValidationOptions {
  stripUnknown?: boolean;
  enableCache?: boolean;
  cacheKey?: string;
  enablePreprocessing?: boolean;
  enableSanitization?: boolean;
  context?: ValidationContext;
  abortEarly?: boolean;
  
  // Additional options needed by CoreValidationService
  // These options control caching behavior at the operation level
  preprocess?: boolean;
  useCache?: boolean;
  cacheTtl?: number;
  cacheKeyGenerator?: (schema: any, data: unknown) => string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationErrorDetail[];
}

export interface BatchValidationResult<T> {
  valid: T[];
  invalid: Array<{
    index: number;
    data: unknown;
    errors: ValidationErrorDetail[];
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    successRate: number;
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  context?: Record<string, any>;
}

export interface ValidationContext { user_id?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
 }

/**
 * Represents a cached validation result with timing metadata
 * This is distinct from ValidationResult because it includes cache-specific information
 */
export interface CachedValidationResult<T> {
  result: ValidationResult<T>;  // The actual validation result
  timestamp: number;             // When this result was cached (milliseconds since epoch)
  ttl: number;                  // Time-to-live in seconds
}

export interface PreprocessingConfig {
  trimStrings?: boolean;
  coerceNumbers?: boolean;
  coerceBooleans?: boolean;
  emptyStringToNull?: boolean;
  undefinedToNull?: boolean;
  customPreprocessors?: Array<(data: unknown) => unknown>;
}

export interface ValidationServiceConfig {
  defaultOptions?: ValidationOptions;
  preprocessing?: PreprocessingConfig;
  cache?: {
    enabled?: boolean;
    defaultTtl?: number;
    maxSize?: number;
  };
  metrics?: {
    enabled?: boolean;
    trackSchemaUsage?: boolean;
    trackErrorPatterns?: boolean;
  };
}

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

export interface ValidationHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  schemasLoaded: number;
  cacheStatus?: 'enabled' | 'disabled' | 'error';
  lastError?: string;
}

// Sanitization and preprocessing
export interface SanitizationRules {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeHtml?: boolean;
  removeScripts?: boolean;
  maxLength?: number;
  allowedChars?: RegExp;
  customRules?: Array<(value: any) => any>;
}

export interface PreprocessingRules {
  convertTypes?: boolean;
  parseNumbers?: boolean;
  parseDates?: boolean;
  parseJson?: boolean;
  normalizeWhitespace?: boolean;
  customRules?: Array<(value: any) => any>;
  
  // Additional properties needed by CoreValidationService
  // These extend the preprocessing capabilities with more granular control
  trimStrings?: boolean;
  coerceNumbers?: boolean;
  coerceBooleans?: boolean;
  emptyStringToNull?: boolean;
  undefinedToNull?: boolean;
  customPreprocessors?: Array<(data: unknown) => unknown>;
}

// Schema registration and management
export interface SchemaRegistration {
  name: string;
  schema: ValidationSchema;
  version?: string;
  description?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SchemaRegistry {
  register(registration: Omit<SchemaRegistration, 'created_at' | 'updated_at'>): void;
  get(name: string): SchemaRegistration | undefined;
  list(tags?: string[]): SchemaRegistration[];
  remove(name: string): boolean;
  clear(): void;
}

// Validation configuration
export interface ValidationConfig {
  adapter: 'zod' | 'joi' | 'custom';
  enableCache?: boolean;
  cacheTimeout?: number;
  enableMetrics?: boolean;
  enablePreprocessing?: boolean;
  enableSanitization?: boolean;
  strictMode?: boolean;
  
  // Adapter-specific config
  zodConfig?: ZodAdapterConfig;
  joiConfig?: JoiAdapterConfig;
  customConfig?: CustomAdapterConfig;
}

export interface ZodAdapterConfig extends ValidationAdapterConfig {
  enableTransform?: boolean;
  enableCoercion?: boolean;
}

export interface JoiAdapterConfig extends ValidationAdapterConfig {
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  presence?: 'optional' | 'required' | 'forbidden';
}

export interface CustomAdapterConfig extends ValidationAdapterConfig {
  customValidators?: Record<string, (value: any) => boolean>;
  customMessages?: Record<string, string>;
}

// Event system for validation operations
export interface ValidationEvent {
  type: ValidationEventType;
  schema: string;
  timestamp: number;
  duration?: number;
  success?: boolean;
  errorCount?: number;
  metadata?: Record<string, any>;
}

export type ValidationEventType = 
  | 'validation_start'
  | 'validation_success'
  | 'validation_error'
  | 'schema_registered'
  | 'schema_removed'
  | 'cache_hit'
  | 'cache_miss';

export interface ValidationEventEmitter {
  on(event: ValidationEventType, listener: (event: ValidationEvent) => void): void;
  off(event: ValidationEventType, listener: (event: ValidationEvent) => void): void;
  emit(event: ValidationEventType, data: Omit<ValidationEvent, 'type' | 'timestamp'>): void;
}

/**
 * Type aliases with I prefix for backward compatibility
 * 
 * These aliases allow existing code using the I-prefix convention to work
 * without modification while pointing to the correct, comprehensive interfaces
 */

// Core service interfaces
export type IValidationService = ValidationService;
export type IValidationResult<T> = ValidationResult<T>;
export type IBatchValidationResult<T> = BatchValidationResult<T>;

// Options and context
export type IValidationOptions = ValidationOptions;
export type IValidationContext = ValidationContext;

// Configuration interfaces - these now point to the comprehensive configs
export type IValidationServiceConfig = ValidationServiceConfig;  // Changed from ValidationAdapterConfig
export type IValidationMetrics = ValidationMetrics;

// Cache interface - now points to the proper cached result structure
export type ICachedValidationResult<T> = CachedValidationResult<T>;  // Changed from ValidationResult<T>

// Schema and adapter interfaces
export type ISchemaRegistration = SchemaRegistration;
export type ISchemaAdapter = ValidationAdapter;

// Preprocessing and caching configs - now point to the comprehensive interfaces
export type IPreprocessingConfig = PreprocessingConfig;  // Changed from PreprocessingRules
export type ICachingConfig = ValidationServiceConfig['cache'];  // Changed to point to the cache property type

// Type alias for backward compatibility - ValidationError now points to ValidationErrorDetail
export type ValidationError = ValidationErrorDetail;
