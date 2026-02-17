/**
 * Error Context Builder
 * 
 * Provides a fluent API for building error context objects with
 * operation details, layer information, and metadata.
 */

export interface ErrorContext {
  operation: string;
  layer: 'client' | 'api' | 'transformation' | 'database';
  field?: string;
  value?: unknown;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export class ErrorContextBuilder {
  private context: Partial<ErrorContext> = {};

  operation(op: string): this {
    // Validate operation is not empty or whitespace-only
    if (!op || op.trim().length === 0) {
      throw new Error('Operation cannot be empty or whitespace-only');
    }
    this.context.operation = op.trim();
    return this;
  }

  layer(layer: ErrorContext['layer']): this {
    this.context.layer = layer;
    return this;
  }

  field(field: string): this {
    // Validate field name is not empty, whitespace-only, or dangerous
    if (!field || field.trim().length === 0) {
      throw new Error('Field name cannot be empty or whitespace-only');
    }
    
    const dangerousNames = ['__proto__', 'constructor', 'prototype'];
    if (dangerousNames.includes(field.trim())) {
      throw new Error(`Field name cannot be a dangerous property: ${field}`);
    }
    
    this.context.field = field.trim();
    return this;
  }

  value(value: unknown): this {
    this.context.value = value;
    return this;
  }

  severity(severity: ErrorContext['severity']): this {
    this.context.severity = severity;
    return this;
  }

  metadata(metadata: Record<string, unknown>): this {
    // Validate metadata doesn't contain dangerous property names
    const dangerousNames = ['__proto__', 'constructor', 'prototype'];
    const keys = Object.keys(metadata);
    const hasDangerous = keys.some(key => dangerousNames.includes(key));
    
    if (hasDangerous) {
      throw new Error('Metadata cannot contain dangerous property names (__proto__, constructor, prototype)');
    }
    
    this.context.metadata = metadata;
    return this;
  }

  build(): ErrorContext {
    // Validate required fields
    if (!this.context.operation || this.context.operation.trim().length === 0) {
      throw new Error('Operation is required and cannot be empty');
    }
    
    return {
      operation: this.context.operation,
      layer: this.context.layer || 'client',
      timestamp: new Date(),
      severity: this.context.severity || 'medium',
      stackTrace: new Error().stack,
      ...this.context,
    };
  }
}
