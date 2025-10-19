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
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface BatchValidationResult<T> {
  valid: T[];
  invalid: Array<{
    index: number;
    data: unknown;
    errors: ValidationError[];
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    successRate: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  context?: Record<string, any>;
}

export interface ValidationContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface ValidationMetrics {
  validations: number;
  successes: number;
  failures: number;
  successRate: number;
  avgLatency: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  schemasRegistered: number;
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
}

// Schema registration and management
export interface SchemaRegistration {
  name: string;
  schema: ValidationSchema;
  version?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaRegistry {
  register(registration: Omit<SchemaRegistration, 'createdAt' | 'updatedAt'>): void;
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