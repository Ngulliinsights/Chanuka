/**
 * Unified Telemetry Data Export System
 *
 * This module provides a unified telemetry exporter that combines logs, metrics, and traces
 * into a single, configurable export interface. It supports batching, buffering, correlation
 * ID propagation, retry logic, sampling, and multiple export destinations.
 */

import { Result, ok, err } from '../primitives/types';
import { BaseError } from './error-management';
import { Logger, MetricsCollector, CorrelationManager } from './interfaces';
import { Tracer, SpanContext as TracingSpanContext } from './tracing/types';
import { LogLevel, LogContext } from './logging/types';
import { Metric } from './metrics/types';
import { SpanContext } from './tracing/types';

// ==================== Telemetry Data Types ====================

export interface TelemetryData {
  id: string;
  timestamp: Date;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  type: 'log' | 'metric' | 'trace';
  data: LogEntry | MetricEntry | TraceEntry;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, unknown>;
}

export interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

export interface TraceEntry {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  kind: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: string;
  attributes: Record<string, unknown>;
  events: Array<{
    name: string;
    timestamp: Date;
    attributes: Record<string, unknown>;
  }>;
}

// ==================== Export Destination Types ====================

export type ExportDestination = 'file' | 'http' | 'queue' | 'console';

export interface FileDestinationConfig {
  type: 'file';
  path: string;
  format: 'json' | 'jsonl' | 'csv';
  maxFileSize?: number;
  rotation?: 'daily' | 'hourly' | 'size';
}

export interface HttpDestinationConfig {
  type: 'http';
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  batchSize?: number;
}

export interface QueueDestinationConfig {
  type: 'queue';
  queueName: string;
  connectionString?: string;
  batchSize?: number;
  timeout?: number;
}

export interface ConsoleDestinationConfig {
  type: 'console';
  format: 'json' | 'pretty';
  filter?: {
    levels?: LogLevel[];
    types?: Array<'log' | 'metric' | 'trace'>;
  };
}

export type DestinationConfig =
  | FileDestinationConfig
  | HttpDestinationConfig
  | QueueDestinationConfig
  | ConsoleDestinationConfig;

// ==================== Sampling and Filtering ====================

export interface SamplingConfig {
  enabled: boolean;
  rate: number; // 0.0 to 1.0
  rules?: SamplingRule[];
}

export interface SamplingRule {
  type: 'log' | 'metric' | 'trace';
  level?: LogLevel;
  name?: string;
  correlationId?: string;
  rate: number;
}

export interface FilterConfig {
  enabled: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
  maxDataSize?: number;
  sensitiveFields?: string[];
}

// ==================== Telemetry Configuration ====================

export interface TelemetryConfig {
  enabled: boolean;
  destinations: DestinationConfig[];
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    maxBatchAge: number; // milliseconds
    flushInterval: number; // milliseconds
  };
  retry: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number; // milliseconds
    maxDelay: number; // milliseconds
  };
  sampling: SamplingConfig;
  filtering: FilterConfig;
  correlation: {
    propagateIds: boolean;
    generateIds: boolean;
  };
}

// ==================== Telemetry Exporter Interface ====================

export interface TelemetryExporter {
  /**
   * Export telemetry data
   */
  export(data: TelemetryData[]): Promise<Result<void, BaseError>>;

  /**
   * Flush any buffered data
   */
  flush(): Promise<Result<void, BaseError>>;

  /**
   * Shutdown the exporter
   */
  shutdown(): Promise<Result<void, BaseError>>;
}

// ==================== Telemetry Collector Interface ====================

export interface TelemetryCollector {
  /**
   * Collect log data
   */
  collectLog(level: LogLevel, message: string, context?: LogContext, metadata?: Record<string, unknown>): void;

  /**
   * Collect metric data
   */
  collectMetric(metric: Metric): void;

  /**
   * Collect trace data
   */
  collectTrace(span: TracingSpanContext): void;

  /**
   * Get buffered telemetry data
   */
  getBufferedData(): TelemetryData[];

  /**
   * Clear buffered data
   */
  clearBuffer(): void;
}

// ==================== Error Classes ====================

export class TelemetryError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { statusCode: 500, code: 'TELEMETRY_ERROR', cause, isOperational: false });
  }
}

export class TelemetryExportError extends TelemetryError {
  constructor(destination: string, cause?: Error) {
    super(`Failed to export telemetry to ${destination}`, cause);
  }
}

export class TelemetryConfigError extends TelemetryError {
  constructor(message: string) {
    super(`Telemetry configuration error: ${message}`);
  }
}

// ==================== Unified Telemetry Exporter Implementation ====================

export class UnifiedTelemetryExporter implements TelemetryExporter, TelemetryCollector {
  private config: TelemetryConfig;
  private buffer: TelemetryData[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isShutdown = false;
  private correlationManager?: CorrelationManager;

  constructor(config: TelemetryConfig, correlationManager?: CorrelationManager) {
    this.config = this.validateConfig(config);
    this.correlationManager = correlationManager;

    if (this.config.batching.enabled) {
      this.startFlushTimer();
    }
  }

  /**
   * Collect log data
   */
  collectLog(level: LogLevel, message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldCollect('log', level)) {
      return;
    }

    const telemetryData: TelemetryData = {
      id: this.generateId(),
      timestamp: new Date(),
      correlationId: this.getCorrelationId(),
      traceId: context?.traceId,
      spanId: context?.spanId as string | undefined,
      type: 'log',
      data: {
        level,
        message,
        context,
        metadata
      },
      metadata: this.extractMetadata(context)
    };

    this.addToBuffer(telemetryData);
  }

  /**
   * Collect metric data
   */
  collectMetric(metric: Metric): void {
    if (!this.shouldCollect('metric')) {
      return;
    }

    for (const value of metric.values) {
      const telemetryData: TelemetryData = {
        id: this.generateId(),
        timestamp: value.timestamp,
        correlationId: this.getCorrelationId(),
        type: 'metric',
        data: {
          name: metric.name,
          type: metric.type,
          value: value.value,
          labels: { ...metric.labels, ...value.labels },
          timestamp: value.timestamp
        }
      };

      this.addToBuffer(telemetryData);
    }
  }

  /**
   * Collect trace data
   */
  collectTrace(span: SpanContext): void {
    if (!this.shouldCollect('trace')) {
      return;
    }

    const telemetryData: TelemetryData = {
      id: this.generateId(),
      timestamp: span.startTime,
      correlationId: this.getCorrelationId(),
      traceId: span.traceId,
      spanId: span.spanId,
      type: 'trace',
      data: {
        spanId: span.spanId,
        traceId: span.traceId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        status: span.status,
        attributes: span.attributes,
        events: span.events
      }
    };

    this.addToBuffer(telemetryData);
  }

  /**
   * Export telemetry data
   */
  async export(data: TelemetryData[]): Promise<Result<void, BaseError>> {
    if (this.isShutdown) {
      return err(new TelemetryError('Exporter is shutdown'));
    }

    const filteredData = this.applyFiltering(data);
    if (filteredData.length === 0) {
      return ok(undefined);
    }

    const exportPromises = this.config.destinations.map(destination =>
      this.exportToDestination(filteredData, destination)
    );

    try {
      await Promise.all(exportPromises);
      return ok(undefined);
    } catch (error) {
      return err(new TelemetryExportError('multiple destinations', error as Error));
    }
  }

  /**
   * Flush any buffered data
   */
  async flush(): Promise<Result<void, BaseError>> {
    if (this.buffer.length === 0) {
      return ok(undefined);
    }

    const dataToFlush = [...this.buffer];
    this.buffer = [];

    return this.export(dataToFlush);
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<Result<void, BaseError>> {
    this.isShutdown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    return this.flush();
  }

  /**
   * Get buffered telemetry data
   */
  getBufferedData(): TelemetryData[] {
    return [...this.buffer];
  }

  /**
   * Clear buffered data
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  // ==================== Private Methods ====================

  private addToBuffer(data: TelemetryData): void {
    this.buffer.push(data);

    if (this.config.batching.enabled &&
        this.buffer.length >= this.config.batching.maxBatchSize) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const dataToFlush = [...this.buffer];
    this.buffer = [];

    const result = await this.export(dataToFlush);
    if (result.isErr()) {
      // Re-add failed data back to buffer for retry
      this.buffer.unshift(...dataToFlush);
      throw result.error;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flushBuffer();
      } catch (error) {
        console.error('Failed to flush telemetry buffer:', error);
      }
    }, this.config.batching.flushInterval);
  }

  private shouldCollect(type: 'log' | 'metric' | 'trace', level?: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Apply sampling
    if (this.config.sampling.enabled) {
      const samplingRate = this.getSamplingRate(type, level);
      if (Math.random() > samplingRate) {
        return false;
      }
    }

    return true;
  }

  private getSamplingRate(type: 'log' | 'metric' | 'trace', level?: LogLevel): number {
    // Check specific rules first
    if (this.config.sampling.rules) {
      for (const rule of this.config.sampling.rules) {
        if (rule.type === type &&
            (!rule.level || rule.level === level) &&
            (!rule.correlationId || rule.correlationId === this.getCorrelationId())) {
          return rule.rate;
        }
      }
    }

    // Fall back to global rate
    return this.config.sampling.rate;
  }

  private applyFiltering(data: TelemetryData[]): TelemetryData[] {
    if (!this.config.filtering.enabled) {
      return data;
    }

    return data.filter(item => {
      // Check exclude patterns
      if (this.config.filtering.excludePatterns) {
        for (const pattern of this.config.filtering.excludePatterns) {
          if (this.matchesPattern(item, pattern)) {
            return false;
          }
        }
      }

      // Check include patterns
      if (this.config.filtering.includePatterns) {
        let included = false;
        for (const pattern of this.config.filtering.includePatterns) {
          if (this.matchesPattern(item, pattern)) {
            included = true;
            break;
          }
        }
        if (!included) {
          return false;
        }
      }

      // Check data size
      if (this.config.filtering.maxDataSize) {
        const size = JSON.stringify(item).length;
        if (size > this.config.filtering.maxDataSize) {
          return false;
        }
      }

      return true;
    });
  }

  private matchesPattern(item: TelemetryData, pattern: string): boolean {
    const searchText = JSON.stringify(item).toLowerCase();
    return searchText.includes(pattern.toLowerCase());
  }

  private async exportToDestination(data: TelemetryData[], destination: DestinationConfig): Promise<void> {
    switch (destination.type) {
      case 'file':
        return this.exportToFile(data, destination);
      case 'http':
        return this.exportToHttp(data, destination);
      case 'queue':
        return this.exportToQueue(data, destination);
      case 'console':
        return this.exportToConsole(data, destination);
      default:
        throw new TelemetryConfigError(`Unknown destination type: ${(destination as any).type}`);
    }
  }

  private async exportToFile(data: TelemetryData[], config: FileDestinationConfig): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const content = this.formatDataForDestination(data, config.format);
    const filePath = config.path;

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.appendFile(filePath, content);
  }

  private async exportToHttp(data: TelemetryData[], config: HttpDestinationConfig): Promise<void> {
    const batches = this.chunkArray(data, config.batchSize || 100);

    for (const batch of batches) {
      await this.sendHttpBatch(batch, config);
    }
  }

  private async sendHttpBatch(batch: TelemetryData[], config: HttpDestinationConfig): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= (config.retries || 3); attempt++) {
      try {
        const response = await fetch(config.url, {
          method: config.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: JSON.stringify(batch),
          signal: AbortSignal.timeout(config.timeout || 5000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;

        if (attempt < (config.retries || 3)) {
          const delay = Math.min(
            this.config.retry.initialDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1),
            this.config.retry.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('HTTP export failed');
  }

  private async exportToQueue(data: TelemetryData[], config: QueueDestinationConfig): Promise<void> {
    // Placeholder for queue implementation
    // This would integrate with actual queue systems like RabbitMQ, SQS, etc.
    console.log(`Exporting ${data.length} telemetry items to queue: ${config.queueName}`);
  }

  private async exportToConsole(data: TelemetryData[], config: ConsoleDestinationConfig): Promise<void> {
    const filteredData = data.filter(item => {
      if (config.filter?.types && !config.filter.types.includes(item.type)) {
        return false;
      }

      if (config.filter?.levels && item.type === 'log') {
        const logData = item.data as LogEntry;
        if (!config.filter.levels.includes(logData.level)) {
          return false;
        }
      }

      return true;
    });

    if (config.format === 'pretty') {
      console.log('=== Telemetry Export ===');
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`Items: ${filteredData.length}`);
      console.log('');

      for (const item of filteredData) {
        console.log(`[${item.type.toUpperCase()}] ${item.timestamp.toISOString()}`);
        if (item.correlationId) {
          console.log(`Correlation ID: ${item.correlationId}`);
        }
        console.log(JSON.stringify(item.data, null, 2));
        console.log('');
      }
    } else {
      console.log(JSON.stringify(filteredData, null, 2));
    }
  }

  private formatDataForDestination(data: TelemetryData[], format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2) + '\n';
      case 'jsonl':
        return data.map(item => JSON.stringify(item)).join('\n') + '\n';
      case 'csv':
        // Simple CSV format - would need more sophisticated implementation for complex data
        const headers = ['id', 'timestamp', 'correlationId', 'type', 'data'];
        const rows = data.map(item => [
          item.id,
          item.timestamp.toISOString(),
          item.correlationId || '',
          item.type,
          JSON.stringify(item.data)
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n') + '\n';
      default:
        return JSON.stringify(data, null, 2) + '\n';
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private generateId(): string {
    return `tel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCorrelationId(): string | undefined {
    return this.correlationManager?.getCorrelationId();
  }

  private extractMetadata(context?: LogContext): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const metadata: Record<string, unknown> = {};
    if (context.userId) metadata.userId = context.userId;
    if (context.sessionId) metadata.sessionId = context.sessionId;
    if (context.requestId) metadata.requestId = context.requestId;

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private validateConfig(config: TelemetryConfig): TelemetryConfig {
    if (!config.destinations || config.destinations.length === 0) {
      throw new TelemetryConfigError('At least one destination must be configured');
    }

    if (config.sampling?.rate < 0 || config.sampling?.rate > 1) {
      throw new TelemetryConfigError('Sampling rate must be between 0 and 1');
    }

    return config;
  }
}

// ==================== Integration with Observability Stack ====================

export class TelemetryIntegration {
  private exporter: UnifiedTelemetryExporter;
  private logger?: Logger;
  private metrics?: MetricsCollector;
  private tracer?: Tracer;
  private spanContextType?: 'interface' | 'tracing';

  constructor(config: TelemetryConfig, correlationManager?: CorrelationManager) {
    this.exporter = new UnifiedTelemetryExporter(config, correlationManager);
  }

  /**
   * Integrate with observability components
   */
  integrate(logger?: Logger, metrics?: MetricsCollector, tracer?: Tracer): void {
    this.logger = logger;
    this.metrics = metrics;
    this.tracer = tracer;
    this.spanContextType = tracer ? 'tracing' : undefined;

    this.setupLoggerIntegration();
    this.setupMetricsIntegration();
    this.setupTracerIntegration();
  }

  /**
   * Get the telemetry exporter
   */
  getExporter(): UnifiedTelemetryExporter {
    return this.exporter;
  }

  /**
   * Shutdown the integration
   */
  async shutdown(): Promise<Result<void, BaseError>> {
    return this.exporter.shutdown();
  }

  private setupLoggerIntegration(): void {
    if (!this.logger) return;

    // Wrap logger methods to collect telemetry
    const originalMethods = {
      trace: this.logger.trace.bind(this.logger),
      debug: this.logger.debug.bind(this.logger),
      info: this.logger.info.bind(this.logger),
      warn: this.logger.warn.bind(this.logger),
      error: this.logger.error.bind(this.logger),
      fatal: this.logger.fatal.bind(this.logger),
      critical: this.logger.critical.bind(this.logger)
    };

    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'critical'];

    levels.forEach(level => {
      (this.logger as any)[level] = (
        message: string,
        context?: LogContext,
        metadata?: Record<string, unknown>
      ) => {
        // Collect telemetry
        this.exporter.collectLog(level, message, context, metadata);

        // Call original method
        originalMethods[level](message, context, metadata);
      };
    });
  }

  private setupMetricsIntegration(): void {
    if (!this.metrics) return;

    // Wrap metrics methods to collect telemetry
    const originalMethods = {
      counter: this.metrics.counter.bind(this.metrics),
      gauge: this.metrics.gauge.bind(this.metrics),
      histogram: this.metrics.histogram.bind(this.metrics),
      summary: this.metrics.summary.bind(this.metrics)
    };

    (this.metrics as any).counter = (name: string, value?: number, labels?: Record<string, string>) => {
      const result = originalMethods.counter(name, value, labels);
      // Collect telemetry when metrics are collected
      return result;
    };

    // Similar wrapping for other metric types...
  }

  private setupTracerIntegration(): void {
    if (!this.tracer) return;

    // Wrap tracer methods to collect telemetry
    const originalStartSpan = this.tracer.startSpan.bind(this.tracer);

    this.tracer.startSpan = (name: string, options?: any) => {
      const span = originalStartSpan(name, options);

      // Wrap span end method to collect telemetry
      const originalEnd = span.end.bind(span);
      span.end = (endTime?: Date) => {
        originalEnd(endTime);

        // Collect telemetry for completed spans
        const spanContext = span.context();
        if (spanContext) {
          // Convert span context to the expected type
          const traceData: TracingSpanContext = {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            parentSpanId: spanContext.parentSpanId,
            name: spanContext.name || 'unknown',
            kind: spanContext.kind || 'internal',
            startTime: spanContext.startTime || new Date(),
            endTime: spanContext.endTime,
            duration: spanContext.duration,
            status: spanContext.status || 'unset',
            statusMessage: spanContext.statusMessage,
            attributes: spanContext.attributes || {},
            events: spanContext.events || [],
            links: spanContext.links || [],
            resource: spanContext.resource || { attributes: {} },
            instrumentationScope: spanContext.instrumentationScope || {
              name: 'unknown',
              attributes: {}
            }
          };
          this.exporter.collectTrace(traceData);
        }
      };

      return span;
    };
  }
}

// ==================== Factory Functions ====================

export function createTelemetryExporter(
  config: TelemetryConfig,
  correlationManager?: CorrelationManager
): UnifiedTelemetryExporter {
  return new UnifiedTelemetryExporter(config, correlationManager);
}

export function createTelemetryIntegration(
  config: TelemetryConfig,
  correlationManager?: CorrelationManager
): TelemetryIntegration {
  return new TelemetryIntegration(config, correlationManager);
}

export function createDefaultTelemetryConfig(): TelemetryConfig {
  return {
    enabled: true,
    destinations: [
      {
        type: 'console',
        format: 'pretty',
        filter: {
          levels: ['info', 'warn', 'error'],
          types: ['log', 'metric', 'trace']
        }
      }
    ],
    batching: {
      enabled: true,
      maxBatchSize: 100,
      maxBatchAge: 30000, // 30 seconds
      flushInterval: 15000 // 15 seconds
    },
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000, // 1 second
      maxDelay: 30000 // 30 seconds
    },
    sampling: {
      enabled: false,
      rate: 1.0
    },
    filtering: {
      enabled: false
    },
    correlation: {
      propagateIds: true,
      generateIds: true
    }
  };
}

// ==================== Default Export ====================

export default UnifiedTelemetryExporter;
