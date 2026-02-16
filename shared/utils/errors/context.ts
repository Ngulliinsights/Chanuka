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
    this.context.operation = op;
    return this;
  }

  layer(layer: ErrorContext['layer']): this {
    this.context.layer = layer;
    return this;
  }

  field(field: string): this {
    this.context.field = field;
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
    this.context.metadata = metadata;
    return this;
  }

  build(): ErrorContext {
    return {
      operation: this.context.operation || 'unknown',
      layer: this.context.layer || 'client',
      timestamp: new Date(),
      severity: this.context.severity || 'medium',
      stackTrace: new Error().stack,
      ...this.context,
    };
  }
}
