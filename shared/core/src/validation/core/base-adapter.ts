/**
 * Base Validation Adapter
 * 
 * Abstract base class providing common functionality for all validation adapters
 */

import { EventEmitter } from 'events';
import { 
  ValidationAdapter, 
  ValidationAdapterConfig, 
  ValidationSchema,
  ValidationOptions,
  ValidationResult,
  BatchValidationResult,
  ValidationError,
  ValidationMetrics,
  ValidationHealthStatus,
  ValidationEvent,
  ValidationEventType,
  ValidationEventEmitter,
  SanitizationRules,
  PreprocessingRules,
  SchemaRegistry,
  SchemaRegistration
} from './interfaces.js';

export abstract class BaseValidationAdapter extends EventEmitter implements ValidationAdapter, ValidationEventEmitter {
  public readonly name: string;
  public readonly version: string;
  public readonly config: ValidationAdapterConfig;
  
  protected metrics: ValidationMetrics;
  protected schemaRegistry: Map<string, SchemaRegistration>;
  protected cache: Map<string, { result: any; timestamp: number }>;
  protected startTime: number;

  constructor(name: string, version: string, config: ValidationAdapterConfig) {
    super();
    this.name = name;
    this.version = version;
    this.config = {
      enableCache: true,
      cacheTimeout: 300000, // 5 minutes
      enableMetrics: true,
      enablePreprocessing: true,
      enableSanitization: true,
      strictMode: false,
      ...config
    };
    
    this.metrics = this.initializeMetrics();
    this.schemaRegistry = new Map();
    this.cache = new Map();
    this.startTime = Date.now();
    
    // Start cache cleanup timer
    if (this.config.enableCache) {
      this.startCacheCleanup();
    }
  }

  // Abstract methods that must be implemented by concrete adapters
  abstract validateSync<T>(schema: ValidationSchema, data: unknown, options?: ValidationOptions): T;
  protected abstract createSchemaFromDefinition(definition: any): ValidationSchema;

  // Schema management
  registerSchema(name: string, schema: ValidationSchema): void {
    const registration: SchemaRegistration = {
      name,
      schema,
      version: schema.version || '1.0.0',
      description: schema.description,
      tags: schema.tags || [],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.schemaRegistry.set(name, registration);
    this.emit('schema_registered', { schema: name });
  }

  getSchema(name: string): ValidationSchema | undefined {
    const registration = this.schemaRegistry.get(name);
    return registration?.schema;
  }

  hasSchema(name: string): boolean {
    return this.schemaRegistry.has(name);
  }

  // Validation operations
  async validate<T>(schema: ValidationSchema, data: unknown, options?: ValidationOptions): Promise<T> {
    return this.measureLatency(async () => {
      const opts = { ...options };
      
      // Check cache if enabled
      if (this.config.enableCache && opts.enableCache !== false && opts.cacheKey) {
        const cached = this.getCachedResult(opts.cacheKey);
        if (cached) {
          this.updateMetrics('cache_hit');
          this.emit('cache_hit', { schema: schema.name || 'unknown' });
          return cached as T;
        }
        this.updateMetrics('cache_miss');
        this.emit('cache_miss', { schema: schema.name || 'unknown' });
      }

      // Preprocess data if enabled
      let processedData = data;
      if (this.config.enablePreprocessing && opts.enablePreprocessing !== false) {
        processedData = this.preprocess(data, this.getDefaultPreprocessingRules());
      }

      // Sanitize data if enabled
      if (this.config.enableSanitization && opts.enableSanitization !== false) {
        processedData = this.sanitize(processedData, this.getDefaultSanitizationRules());
      }

      // Perform validation
      this.emit('validation_start', { schema: schema.name || 'unknown' });
      
      try {
        const result = this.validateSync<T>(schema, processedData, opts);
        
        // Cache result if enabled
        if (this.config.enableCache && opts.enableCache !== false && opts.cacheKey) {
          this.setCachedResult(opts.cacheKey, result);
        }
        
        this.updateMetrics('success');
        this.emit('validation_success', { schema: schema.name || 'unknown' });
        return result;
      } catch (error) {
        this.updateMetrics('error');
        this.emit('validation_error', { 
          schema: schema.name || 'unknown',
          errorCount: 1,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
        throw error;
      }
    });
  }

  async validateSafe<T>(schema: ValidationSchema, data: unknown, options?: ValidationOptions): Promise<ValidationResult<T>> {
    try {
      const result = await this.validate<T>(schema, data, options);
      return { success: true, data: result };
    } catch (error) {
      const errors = this.extractValidationErrors(error);
      return { success: false, errors };
    }
  }

  async validateBatch<T>(schema: ValidationSchema, dataArray: unknown[], options?: ValidationOptions): Promise<BatchValidationResult<T>> {
    const valid: T[] = [];
    const invalid: Array<{ index: number; data: unknown; errors: ValidationError[] }> = [];
    
    const results = await Promise.allSettled(
      dataArray.map((data, index) => 
        this.validateSafe<T>(schema, data, options).then(result => ({ result, index, data }))
      )
    );
    
    for (const promiseResult of results) {
      if (promiseResult.status === 'fulfilled') {
        const { result, index, data } = promiseResult.value;
        if (result.success) {
          valid.push(result.data!);
        } else {
          invalid.push({ index, data, errors: result.errors || [] });
        }
      } else {
        // This shouldn't happen with validateSafe, but handle it just in case
        invalid.push({ 
          index: -1, 
          data: null, 
          errors: [{ field: 'unknown', message: 'Validation failed', code: 'UNKNOWN_ERROR' }] 
        });
      }
    }
    
    return {
      valid,
      invalid,
      summary: {
        total: dataArray.length,
        valid: valid.length,
        invalid: invalid.length,
        successRate: dataArray.length > 0 ? valid.length / dataArray.length : 0
      }
    };
  }

  // Utility methods
  sanitize(data: unknown, rules: SanitizationRules): unknown {
    if (typeof data !== 'string') return data;
    
    let result = data;
    
    if (rules.trim) {
      result = result.trim();
    }
    
    if (rules.lowercase) {
      result = result.toLowerCase();
    }
    
    if (rules.uppercase) {
      result = result.toUpperCase();
    }
    
    if (rules.removeHtml) {
      result = result.replace(/<[^>]*>/g, '');
    }
    
    if (rules.removeScripts) {
      result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (rules.maxLength && result.length > rules.maxLength) {
      result = result.substring(0, rules.maxLength);
    }
    
    if (rules.allowedChars) {
      result = result.replace(new RegExp(`[^${rules.allowedChars.source}]`, 'g'), '');
    }
    
    if (rules.customRules) {
      for (const rule of rules.customRules) {
        result = rule(result);
      }
    }
    
    return result;
  }

  preprocess(data: unknown, rules: PreprocessingRules): unknown {
    if (data === null || data === undefined) return data;
    
    let result = data;
    
    if (rules.convertTypes && typeof result === 'string') {
      // Try to convert string to appropriate type
      if (rules.parseNumbers && /^\d+(\.\d+)?$/.test(result)) {
        result = parseFloat(result);
      } else if (rules.parseDates && /^\d{4}-\d{2}-\d{2}/.test(result)) {
        const parsed = new Date(result);
        if (!isNaN(parsed.getTime())) {
          result = parsed;
        }
      } else if (rules.parseJson && (result.startsWith('{') || result.startsWith('['))) {
        try {
          result = JSON.parse(result);
        } catch {
          // Keep original value if JSON parsing fails
        }
      }
    }
    
    if (rules.normalizeWhitespace && typeof result === 'string') {
      result = result.replace(/\s+/g, ' ').trim();
    }
    
    if (rules.customRules) {
      for (const rule of rules.customRules) {
        result = rule(result);
      }
    }
    
    return result;
  }

  // Health and metrics
  async getHealth(): Promise<ValidationHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic validation with a simple schema
      const testSchema = this.createSchemaFromDefinition({ type: 'string' });
      await this.validate(testSchema, 'test');
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency,
        schemasLoaded: this.schemaRegistry.size,
        cacheStatus: this.config.enableCache ? 'enabled' : 'disabled'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        schemasLoaded: this.schemaRegistry.size,
        cacheStatus: this.config.enableCache ? 'error' : 'disabled',
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  // Event system
  emit(event_type: ValidationEventType, data: Omit<ValidationEvent, 'type' | 'timestamp'>): boolean {
    const event: ValidationEvent = {
      type: event_type,
      timestamp: Date.now(),
      ...data
    };
    return super.emit(event_type, event);
  }

  // Lifecycle
  async destroy(): Promise<void> {
    this.cache.clear();
    this.schemaRegistry.clear();
    this.removeAllListeners();
  }

  // Protected utility methods
  protected updateMetrics(operation: 'success' | 'error' | 'cache_hit' | 'cache_miss', latency?: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.validations++;
    
    switch (operation) {
      case 'success':
        this.metrics.successes++;
        break;
      case 'error':
        this.metrics.failures++;
        break;
      case 'cache_hit':
        this.metrics.cacheHits++;
        break;
      case 'cache_miss':
        this.metrics.cacheMisses++;
        break;
    }

    // Update rates
    this.metrics.successRate = this.metrics.validations > 0 
      ? this.metrics.successes / this.metrics.validations 
      : 0;
    
    this.metrics.cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
      : 0;

    // Update latency
    if (latency !== undefined) {
      this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
    }

    // Update schema count
    this.metrics.schemasRegistered = this.schemaRegistry.size;
  }

  protected async measureLatency<T>(operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      this.updateMetrics('success', Date.now() - start);
      return result;
    } catch (error) {
      this.updateMetrics('error', Date.now() - start);
      throw error;
    }
  }

  protected getCachedResult(key: string): unknown | null {
    if (!this.config.enableCache) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < (this.config.cacheTimeout || 300000)) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  protected setCachedResult(key: string, result: unknown): void {
    if (!this.config.enableCache) return;
    
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  protected extractValidationErrors(error: any): ValidationError[] {
    // Default implementation - concrete adapters should override
    if (error && error.errors && Array.isArray(error.errors)) {
      return error.errors;
    }
    
    return [{
      field: 'unknown',
      message: error instanceof Error ? error.message : 'Validation failed',
      code: 'VALIDATION_ERROR'
    }];
  }

  protected getDefaultSanitizationRules(): SanitizationRules {
    return {
      trim: true,
      removeScripts: true,
      maxLength: 10000
    };
  }

  protected getDefaultPreprocessingRules(): PreprocessingRules {
    return {
      convertTypes: true,
      parseNumbers: true,
      normalizeWhitespace: true
    };
  }

  private initializeMetrics(): ValidationMetrics {
    return {
      validations: 0,
      successes: 0,
      failures: 0,
      successRate: 0,
      avgLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      schemasRegistered: 0
    };
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.config.cacheTimeout || 300000;
      
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > timeout) {
          this.cache.delete(key);
        }
      }
    }, timeout / 2); // Clean up every half timeout period
  }
}


