import { randomBytes } from 'crypto';
import { Result, Ok, Err } from '../../primitives/types';
import { BaseError } from '../error-management';
import {
  Tracer as ITracer,
  Span as ISpan,
  SpanOptions,
  SamplingResult,
  SamplingConfig,
  SamplingRule,
  TraceExporter,
  BatchSpanProcessor,
  TracingConfig,
  DEFAULT_CONFIG,
  Resource,
  InstrumentationScope,
} from './types';
import { Span, createSpan, generateSpanId, generateTraceId } from './span';
import { TraceContextManager, traceContextManager, withTraceContext, withTraceContextAsync } from './context';

/**
 * Tracer implementation error
 */
export class TracerError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { statusCode: 500, code: 'TRACER_ERROR', cause, isOperational: false });
  }
}

/**
 * Probabilistic sampler implementation
 */
export class ProbabilisticSampler {
  private config: SamplingConfig;

  constructor(config: SamplingConfig) {
    this.config = config;
  }

  shouldSample(
    traceId: string,
    name: string,
    kind?: string,
    attributes?: Record<string, string | number | boolean>
  ): SamplingResult {
    // Check sampling rules first
    if (this.config.rules) {
      for (const rule of this.config.rules) {
        if (this.matchesRule(rule, name, kind, attributes)) {
          if (Math.random() < rule.rate) {
            return { decision: 'RECORD_AND_SAMPLE' };
          }
          return { decision: 'DROP' };
        }
      }
    }

    // Apply default sampling rate
    if (Math.random() < this.config.rate) {
      return { decision: 'RECORD_AND_SAMPLE' };
    }

    return { decision: 'DROP' };
  }

  private matchesRule(
    rule: SamplingRule,
    name: string,
    kind?: string,
    attributes?: Record<string, string | number | boolean>
  ): boolean {
    if (rule.name && !name.includes(rule.name)) return false;
    if (rule.kind && rule.kind !== kind) return false;

    if (rule.attributes && attributes) {
      for (const [key, expectedValue] of Object.entries(rule.attributes)) {
        if (attributes[key] !== expectedValue) return false;
      }
    }

    return true;
  }
}

/**
 * No-op span for dropped spans
 */
export class NoOpSpan implements ISpan {
  context(): any {
    return {
      traceId: '',
      spanId: '',
      name: '',
      kind: 'internal',
      startTime: new Date(),
      status: 'unset',
      attributes: {},
      events: [],
      links: [],
      resource: { attributes: {} },
      instrumentationScope: { name: '', attributes: {} },
    };
  }

  setAttribute(): ISpan {
    return this;
  }

  setAttributes(): ISpan {
    return this;
  }

  addEvent(): ISpan {
    return this;
  }

  addLink(): ISpan {
    return this;
  }

  setStatus(): ISpan {
    return this;
  }

  end(): void {
    // No-op
  }

  isRecording(): boolean {
    return false;
  }
}

/**
 * Batch span processor
 */
export class BatchSpanProcessorImpl implements BatchSpanProcessor {
  private spans: Span[] = [];
  private exporter: TraceExporter;
  private maxBatchSize: number;
  private maxQueueSize: number;
  private exportTimeout: number;
  private scheduledDelay: number;
  private timer?: NodeJS.Timeout;
  private exporting = false;

  constructor(
    exporter: TraceExporter,
    options: {
      maxBatchSize?: number;
      maxQueueSize?: number;
      exportTimeout?: number;
      scheduledDelay?: number;
    } = {}
  ) {
    this.exporter = exporter;
    this.maxBatchSize = options.maxBatchSize || DEFAULT_CONFIG.MAX_BATCH_SIZE;
    this.maxQueueSize = options.maxQueueSize || DEFAULT_CONFIG.MAX_QUEUE_SIZE;
    this.exportTimeout = options.exportTimeout || DEFAULT_CONFIG.EXPORT_TIMEOUT_MS;
    this.scheduledDelay = options.scheduledDelay || DEFAULT_CONFIG.SCHEDULED_DELAY_MS;
  }

  onStart(span: ISpan): void {
    // Optional: implement span start hooks
  }

  onEnd(span: ISpan): void {
    if (!(span instanceof Span) || !span.isRecording()) {
      return;
    }

    this.spans.push(span);

    if (this.spans.length >= this.maxBatchSize) {
      this.exportSpans();
    } else if (!this.timer) {
      this.scheduleExport();
    }
  }

  async forceFlush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.spans.length > 0) {
      await this.exportSpans();
    }
  }

  async shutdown(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.spans.length > 0) {
      await this.exportSpans();
    }
  }

  private scheduleExport(): void {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.exportSpans();
    }, this.scheduledDelay);
  }

  private async exportSpans(): Promise<void> {
    if (this.exporting || this.spans.length === 0) {
      return;
    }

    this.exporting = true;
    const spansToExport = this.spans.splice(0);

    try {
      await Promise.race([
        this.exporter.export(spansToExport.map(span => span.context())),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Export timeout')), this.exportTimeout)
        ),
      ]);
    } catch (error) {
      console.error('Failed to export spans:', error);
      // In a real implementation, you might want to retry or buffer failed exports
    } finally {
      this.exporting = false;
    }
  }
}

/**
 * Comprehensive tracer implementation
 */
export class Tracer implements ITracer {
  private resource: Resource;
  private instrumentationScope: InstrumentationScope;
  private sampler: ProbabilisticSampler;
  private processors: BatchSpanProcessor[] = [];
  private activeSpans = new Map<string, Span>();
  private correlationIdGenerator: () => string;

  constructor(
    serviceName: string,
    serviceVersion = '1.0.0',
    samplingConfig: SamplingConfig = { rate: DEFAULT_CONFIG.DEFAULT_SAMPLING_RATE },
    resourceAttributes: Record<string, string | number | boolean> = {}
  ) {
    this.resource = {
      attributes: {
        'service.name': serviceName,
        'service.version': serviceVersion,
        'telemetry.sdk.name': 'custom-tracer',
        'telemetry.sdk.version': '1.0.0',
        ...resourceAttributes,
      },
    };

    this.instrumentationScope = {
      name: serviceName,
      version: serviceVersion,
      attributes: {},
    };

    this.sampler = new ProbabilisticSampler(samplingConfig);
    this.correlationIdGenerator = () => `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, options: SpanOptions = {}): ISpan {
    // Get parent context
    let parentContext = this.getParentContext(options);

    // Check sampling
    const samplingResult = this.sampler.shouldSample(
      parentContext.traceId,
      name,
      options.kind,
      options.attributes
    );

    if (samplingResult.decision === 'DROP') {
      return new NoOpSpan();
    }

    // Generate span ID
    const spanId = generateSpanId();

    // Create span
    const span = createSpan(
      parentContext.traceId,
      spanId,
      name,
      {
        kind: options.kind,
        parentSpanId: parentContext.spanId,
        startTime: options.startTime,
        resource: this.resource,
        instrumentationScope: this.instrumentationScope,
        attributes: options.attributes,
        links: options.links,
      }
    );

    // Store active span
    this.activeSpans.set(spanId, span);

    // Set as current span in context
    const traceContext = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      sampled: true,
    };

    // Run with trace context
    return this.withSpanContext(span, traceContext);
  }

  /**
   * Get the currently active span
   */
  currentSpan(): ISpan | undefined {
    const context = traceContextManager.getCurrentContext();
    if (context) {
      return this.activeSpans.get(context.spanId);
    }
    return undefined;
  }

  /**
   * Get the currently active span (alias for currentSpan)
   */
  getCurrentSpan(): ISpan | undefined {
    return this.currentSpan();
  }

  /**
   * Set the currently active span
   */
  setCurrentSpan(span: ISpan): void {
    if (span instanceof Span) {
      const context = span.context();
      const traceContext = {
        traceId: context.traceId,
        spanId: context.spanId,
        parentSpanId: context.parentSpanId,
        sampled: true,
      };
      traceContextManager.setCurrentContext(traceContext);
    }
  }

  /**
   * Extract trace context from carrier
   */
  extract(carrier: any, format: string = 'w3c'): any {
    return traceContextManager.extract(carrier, format);
  }

  /**
   * Inject trace context into carrier
   */
  inject(spanContext: any, carrier: any, format: string = 'w3c'): void {
    return traceContextManager.inject(spanContext, carrier, format);
  }

  /**
   * Execute function with span context
   */
  withSpan<T>(span: ISpan, fn: () => T): T {
    if (!(span instanceof Span)) {
      return fn();
    }

    const context = span.context();
    const traceContext = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      sampled: true,
    };

    return withTraceContext(traceContext, () => {
      this.setCurrentSpan(span);
      return fn();
    });
  }

  /**
   * Execute async function with span context
   */
  async withSpanAsync<T>(span: ISpan, fn: () => Promise<T>): Promise<T> {
    if (!(span instanceof Span)) {
      return fn();
    }

    const context = span.context();
    const traceContext = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      sampled: true,
    };

    return withTraceContextAsync(traceContext, async () => {
      this.setCurrentSpan(span);
      return await fn();
    });
  }

  /**
   * Add a span processor
   */
  addProcessor(processor: BatchSpanProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Get resource
   */
  getResource(): Resource {
    return { ...this.resource };
  }

  /**
   * Get instrumentation scope
   */
  getInstrumentationScope(): InstrumentationScope {
    return { ...this.instrumentationScope };
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId(): string {
    return this.correlationIdGenerator();
  }

  /**
   * End span and notify processors
   */
  endSpan(span: Span): void {
    if (!span.isRecording()) {
      return;
    }

    span.end();

    // Notify processors
    for (const processor of this.processors) {
      processor.onEnd(span);
    }

    // Clean up
    this.activeSpans.delete(span.context().spanId);
  }

  /**
   * Get parent context from options or current context
   */
  private getParentContext(options: SpanOptions): { traceId: string; spanId: string } {
    // Check if parent span is provided
    if (options.parent) {
      if ('context' in options.parent) {
        // It's a Span
        const spanContext = (options.parent as ISpan).context();
        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      } else {
        // It's a TraceContext
        const traceContext = options.parent as any;
        return {
          traceId: traceContext.traceId,
          spanId: traceContext.spanId,
        };
      }
    }

    // Get from current context
    const currentContext = traceContextManager.getCurrentContext();
    if (currentContext) {
      return {
        traceId: currentContext.traceId,
        spanId: currentContext.spanId,
      };
    }

    // Create new trace
    return {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
    };
  }

  /**
   * Wrap span with context management
   */
  private withSpanContext(span: Span, traceContext: any): Span {
    // Create a proxy that automatically manages context
    const proxy = new Proxy(span, {
      get: (target, prop) => {
        if (prop === 'end') {
          return () => {
            target.end();
            this.endSpan(target);
          };
        }
        return (target as any)[prop];
      },
    });

    return proxy;
  }
}

/**
 * Create a new tracer instance
 */
export function createTracer(
  serviceName: string,
  serviceVersion?: string,
  samplingConfig?: SamplingConfig,
  resourceAttributes?: Record<string, string | number | boolean>
): Tracer {
  return new Tracer(serviceName, serviceVersion, samplingConfig, resourceAttributes);
}

/**
 * Create a batch span processor
 */
export function createBatchSpanProcessor(
  exporter: TraceExporter,
  options?: {
    maxBatchSize?: number;
    maxQueueSize?: number;
    exportTimeout?: number;
    scheduledDelay?: number;
  }
): BatchSpanProcessor {
  return new BatchSpanProcessorImpl(exporter, options);
}
