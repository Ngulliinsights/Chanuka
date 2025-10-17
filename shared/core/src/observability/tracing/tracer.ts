import { randomBytes } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import {
  Tracer,
  Span,
  SpanContext,
  SpanOptions,
  TraceContext,
  SpanKind,
  SpanStatus,
  SamplingResult,
  Sampler,
  SamplingConfig,
  DEFAULT_CONFIG,
  TRACE_HEADER_W3C,
  TRACE_HEADER_JAEGER,
  TRACE_HEADER_B3,
} from './types';

// ==================== Span Implementation ====================

class SpanImpl implements Span {
  private _context: SpanContext;
  private ended = false;
  private readonly tracer: TracerImpl;

  constructor(
    tracer: TracerImpl,
    name: string,
    options: SpanOptions = {},
    traceContext: TraceContext
  ) {
    this.tracer = tracer;

    const startTime = options.startTime || new Date();
    const spanId = this.generateSpanId();

    this._context = {
      traceId: traceContext.traceId,
      spanId,
      parentSpanId: traceContext.spanId !== spanId ? traceContext.spanId : undefined,
      name,
      kind: options.kind || 'internal',
      startTime,
      status: 'unset',
      attributes: { ...options.attributes },
      events: [],
      links: options.links || [],
      resource: tracer.resource,
      instrumentationScope: tracer.instrumentationScope,
    };

    // Add links if provided
    if (options.links) {
      this._context.links.push(...options.links);
    }
  }

  context(): SpanContext {
    return { ...this._context };
  }

  setAttribute(key: string, value: string | number | boolean): Span {
    if (!this.ended) {
      this._context.attributes[key] = value;
    }
    return this;
  }

  setAttributes(attributes: Record<string, string | number | boolean>): Span {
    if (!this.ended) {
      Object.assign(this._context.attributes, attributes);
    }
    return this;
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean>): Span {
    if (!this.ended) {
      this._context.events.push({
        name,
        timestamp: new Date(),
        attributes: attributes || {},
      });
    }
    return this;
  }

  addLink(link: any): Span {
    if (!this.ended) {
      this._context.links.push(link);
    }
    return this;
  }

  setStatus(status: SpanStatus, message?: string): Span {
    if (!this.ended) {
      this._context.status = status;
      if (message) {
        this._context.statusMessage = message;
      }
    }
    return this;
  }

  end(endTime?: Date): void {
    if (this.ended) return;

    this.ended = true;
    const actualEndTime = endTime || new Date();
    this._context.endTime = actualEndTime;
    this._context.duration = actualEndTime.getTime() - this._context.startTime.getTime();

    // Notify tracer that span has ended
    this.tracer.onSpanEnd(this);
  }

  isRecording(): boolean {
    return !this.ended;
  }

  private generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }
}

// ==================== Sampler Implementation ====================

class ProbabilisticSampler implements Sampler {
  private config: SamplingConfig;

  constructor(config: SamplingConfig) {
    this.config = config;
  }

  shouldSample(
    traceId: string,
    name: string,
    kind?: SpanKind,
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
    rule: any,
    name: string,
    kind?: SpanKind,
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

// ==================== Tracer Implementation ====================

export class TracerImpl implements Tracer {
  private spans = new Map<string, SpanImpl>();
  private activeSpans = new AsyncLocalStorage<SpanImpl>();
  public readonly resource: any;
  public readonly instrumentationScope: any;
  private sampler: Sampler;
  private processors: any[] = [];

  constructor(
    serviceName: string,
    serviceVersion = '1.0.0',
    samplingConfig: SamplingConfig = { rate: DEFAULT_CONFIG.DEFAULT_SAMPLING_RATE }
  ) {
    this.resource = {
      attributes: {
        'service.name': serviceName,
        'service.version': serviceVersion,
        'telemetry.sdk.name': 'custom-tracer',
        'telemetry.sdk.version': '1.0.0',
      },
    };

    this.instrumentationScope = {
      name: serviceName,
      version: serviceVersion,
      attributes: {},
    };

    this.sampler = new ProbabilisticSampler(samplingConfig);
  }

  startSpan(name: string, options: SpanOptions = {}): Span {
    // Get parent context
    let parentContext: TraceContext;

    if (options.parent) {
      if ('context' in options.parent) {
        // It's a Span
        const spanContext = (options.parent as Span).context();
        parentContext = {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      } else {
        // It's a TraceContext
        parentContext = options.parent as TraceContext;
      }
    } else {
      // Get from async local storage
      const activeSpan = this.activeSpans.getStore();
      if (activeSpan) {
        const spanContext = activeSpan.context();
        parentContext = {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      } else {
        // Create new trace
        parentContext = {
          traceId: this.generateTraceId(),
          spanId: this.generateSpanId(),
        };
      }
    }

    // Check sampling
    const samplingResult = this.sampler.shouldSample(
      parentContext.traceId,
      name,
      options.kind,
      options.attributes
    );

    if (samplingResult.decision === 'DROP') {
      // Return a no-op span
      return new NoOpSpan();
    }

    // Create new span
    const span = new SpanImpl(this, name, options, parentContext);

    // Store span
    this.spans.set(span.context().spanId, span);

    // Set as active span
    this.activeSpans.run(span, () => {
      // Span is now active in this context
    });

    return span;
  }

  getCurrentSpan(): Span | undefined {
    return this.activeSpans.getStore();
  }

  setCurrentSpan(span: Span): void {
    if (span instanceof SpanImpl) {
      this.activeSpans.enterWith(span);
    }
  }

  extract(carrier: any, format: string): TraceContext | undefined {
    switch (format) {
      case 'w3c':
        return this.extractW3C(carrier);
      case 'jaeger':
        return this.extractJaeger(carrier);
      case 'b3':
        return this.extractB3(carrier);
      default:
        return undefined;
    }
  }

  inject(spanContext: TraceContext, carrier: any, format: string): void {
    switch (format) {
      case 'w3c':
        this.injectW3C(spanContext, carrier);
        break;
      case 'jaeger':
        this.injectJaeger(spanContext, carrier);
        break;
      case 'b3':
        this.injectB3(spanContext, carrier);
        break;
    }
  }

  onSpanEnd(span: SpanImpl): void {
    // Notify processors
    for (const processor of this.processors) {
      processor.onEnd(span);
    }

    // Clean up
    this.spans.delete(span.context().spanId);
  }

  addProcessor(processor: any): void {
    this.processors.push(processor);
  }

  private generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  private extractW3C(carrier: any): TraceContext | undefined {
    const header = carrier[TRACE_HEADER_W3C];
    if (!header || typeof header !== 'string') return undefined;

    // Format: 00-traceId-spanId-sampled
    const parts = header.split('-');
    if (parts.length < 4) return undefined;

    return {
      traceId: parts[1],
      spanId: parts[2],
      sampled: parts[3] === '01',
    };
  }

  private injectW3C(context: TraceContext, carrier: any): void {
    const sampled = context.sampled ? '01' : '00';
    carrier[TRACE_HEADER_W3C] = `00-${context.traceId}-${context.spanId}-${sampled}`;
  }

  private extractJaeger(carrier: any): TraceContext | undefined {
    const header = carrier[TRACE_HEADER_JAEGER];
    if (!header || typeof header !== 'string') return undefined;

    // Format: traceId:spanId:parentSpanId:flags
    const parts = header.split(':');
    if (parts.length < 4) return undefined;

    return {
      traceId: parts[0],
      spanId: parts[1],
      parentSpanId: parts[2] !== '0' ? parts[2] : undefined,
      sampled: (parseInt(parts[3], 10) & 1) === 1,
    };
  }

  private injectJaeger(context: TraceContext, carrier: any): void {
    const parentSpanId = context.parentSpanId || '0';
    const flags = context.sampled ? '1' : '0';
    carrier[TRACE_HEADER_JAEGER] = `${context.traceId}:${context.spanId}:${parentSpanId}:${flags}`;
  }

  private extractB3(carrier: any): TraceContext | undefined {
    const traceId = carrier[TRACE_HEADER_B3];
    const spanId = carrier['x-b3-spanid'];
    const sampled = carrier['x-b3-sampled'];

    if (!traceId || !spanId) return undefined;

    return {
      traceId,
      spanId,
      sampled: sampled === '1',
    };
  }

  private injectB3(context: TraceContext, carrier: any): void {
    carrier[TRACE_HEADER_B3] = context.traceId;
    carrier['x-b3-spanid'] = context.spanId;
    carrier['x-b3-sampled'] = context.sampled ? '1' : '0';
  }
}

// ==================== No-Op Span ====================

class NoOpSpan implements Span {
  context(): SpanContext {
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

  setAttribute(): Span {
    return this;
  }

  setAttributes(): Span {
    return this;
  }

  addEvent(): Span {
    return this;
  }

  addLink(): Span {
    return this;
  }

  setStatus(): Span {
    return this;
  }

  end(): void {
    // No-op
  }

  isRecording(): boolean {
    return false;
  }
}

// ==================== Factory Functions ====================

export function createTracer(
  serviceName: string,
  serviceVersion?: string,
  samplingConfig?: SamplingConfig
): Tracer {
  return new TracerImpl(serviceName, serviceVersion, samplingConfig);
}