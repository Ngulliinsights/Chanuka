import { z } from 'zod';

// ==================== Core Types ====================

export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

export type SpanStatus = 'ok' | 'error' | 'unset';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled?: boolean;
  flags?: number;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string | undefined;
  name: string;
  kind: SpanKind;
  startTime: Date;
  endTime?: Date | undefined;
  duration?: number | undefined;
  status: SpanStatus;
  statusMessage?: string | undefined;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  links: SpanLink[];
  resource: Resource;
  instrumentationScope: InstrumentationScope;
}

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes: Record<string, string | number | boolean>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, string | number | boolean>;
}

export interface Resource {
  attributes: Record<string, string | number | boolean>;
  schemaUrl?: string;
}

export interface InstrumentationScope {
  name: string;
  version?: string;
  attributes: Record<string, string | number | boolean>;
  schemaUrl?: string;
}

export interface Trace {
  traceId: string;
  spans: SpanContext[];
  startTime: Date;
  endTime: Date;
  duration: number;
  rootSpan: SpanContext;
}

// ==================== Tracer Types ====================

export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  getCurrentSpan(): Span | undefined;
  setCurrentSpan(span: Span): void;
  extract(carrier: Record<string, unknown>, format: string): TraceContext | undefined;
  inject(spanContext: TraceContext, carrier: Record<string, unknown>, format: string): void;
}

export interface Span {
  context(): SpanContext;
  setAttribute(key: string, value: string | number | boolean): Span;
  setAttributes(attributes: Record<string, string | number | boolean>): Span;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): Span;
  addLink(link: SpanLink): Span;
  setStatus(status: SpanStatus, message?: string): Span;
  end(endTime?: Date): void;
  isRecording(): boolean;
}

export interface SpanOptions {
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  parent?: Span | TraceContext;
  links?: SpanLink[];
  startTime?: Date;
}

// ==================== Sampling Types ====================

export interface Sampler {
  shouldSample(traceId: string, name: string, kind?: SpanKind, attributes?: Record<string, string | number | boolean>): SamplingResult;
}

export interface SamplingResult {
  decision: 'DROP' | 'RECORD_ONLY' | 'RECORD_AND_SAMPLE';
  attributes?: Record<string, string | number | boolean>;
}

export interface SamplingConfig {
  rate: number; // 0.0 to 1.0
  maxPerSecond?: number;
  rules?: SamplingRule[];
}

export interface SamplingRule {
  name?: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  rate: number;
}

// ==================== Exporter Types ====================

export interface TraceExporter {
  export(spans: SpanContext[]): Promise<void>;
  shutdown(): Promise<void>;
}

export interface BatchSpanProcessor {
  onStart(span: Span): void;
  onEnd(span: Span): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}

// ==================== Configuration Types ====================

export interface TracingConfig {
  enabled?: boolean;
  serviceName: string;
  serviceVersion?: string;
  resourceAttributes?: Record<string, string | number | boolean>;
  sampling?: SamplingConfig;
  exporters?: {
    console?: boolean;
    jaeger?: JaegerConfig;
    zipkin?: ZipkinConfig;
    otlp?: OTLPConfig;
  };
  processors?: {
    batch?: BatchProcessorConfig;
  };
}

export interface JaegerConfig {
  endpoint?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
}

export interface ZipkinConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

export interface OTLPConfig {
  endpoint: string;
  headers?: Record<string, string>;
  compression?: 'gzip' | 'none';
}

export interface BatchProcessorConfig {
  maxBatchSize?: number;
  maxQueueSize?: number;
  exportTimeout?: number;
  scheduledDelay?: number;
}

// ==================== Context Propagation Types ====================

export interface TextMapPropagator {
  inject(context: TraceContext, carrier: Record<string, unknown>): void;
  extract(carrier: Record<string, unknown>): TraceContext | undefined;
}

export interface Baggage {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
  getAll(): Record<string, string>;
}

// ==================== Validation Schemas ====================

export const spanKindSchema = z.enum(['internal', 'server', 'client', 'producer', 'consumer']);

export const spanStatusSchema = z.enum(['ok', 'error', 'unset']);

export const traceContextSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  sampled: z.boolean().optional(),
  flags: z.number().optional(),
});

export const spanContextSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  kind: spanKindSchema,
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  status: spanStatusSchema,
  statusMessage: z.string().optional(),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
  events: z.array(z.object({
    name: z.string(),
    timestamp: z.date(),
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
  })),
  links: z.array(z.object({
    traceId: z.string(),
    spanId: z.string(),
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
  })),
  resource: z.object({
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
    schemaUrl: z.string().optional(),
  }),
  instrumentationScope: z.object({
    name: z.string(),
    version: z.string().optional(),
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
    schemaUrl: z.string().optional(),
  }),
});

export const tracingConfigSchema = z.object({
  enabled: z.boolean().optional(),
  serviceName: z.string(),
  serviceVersion: z.string().optional(),
  resourceAttributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  sampling: z.object({
    rate: z.number().min(0).max(1),
    maxPerSecond: z.number().min(1).optional(),
    rules: z.array(z.object({
      name: z.string().optional(),
      kind: spanKindSchema.optional(),
      attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      rate: z.number().min(0).max(1),
    })).optional(),
  }).optional(),
  exporters: z.object({
    console: z.boolean().optional(),
    jaeger: z.object({
      endpoint: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      headers: z.record(z.string()).optional(),
    }).optional(),
    zipkin: z.object({
      endpoint: z.string(),
      headers: z.record(z.string()).optional(),
    }).optional(),
    otlp: z.object({
      endpoint: z.string(),
      headers: z.record(z.string()).optional(),
      compression: z.enum(['gzip', 'none']).optional(),
    }).optional(),
  }).optional(),
  processors: z.object({
    batch: z.object({
      maxBatchSize: z.number().min(1).optional(),
      maxQueueSize: z.number().min(1).optional(),
      exportTimeout: z.number().min(1).optional(),
      scheduledDelay: z.number().min(1).optional(),
    }).optional(),
  }).optional(),
});

// ==================== Constants ====================

export const DEFAULT_CONFIG = {
  ENABLED: true,
  SERVICE_NAME: 'unknown-service',
  SERVICE_VERSION: '1.0.0',
  DEFAULT_SAMPLING_RATE: 0.1,
  MAX_BATCH_SIZE: 512,
  MAX_QUEUE_SIZE: 2048,
  EXPORT_TIMEOUT_MS: 30000,
  SCHEDULED_DELAY_MS: 5000,
  TRACE_ID_DELIMITER: ':',
  SPAN_ID_DELIMITER: ':',
} as const;

export const TRACE_HEADER_W3C = 'traceparent';
export const TRACE_HEADER_JAEGER = 'uber-trace-id';
export const TRACE_HEADER_B3 = 'x-b3-traceid';

export const SPAN_ATTRIBUTE_PREFIXES = {
  HTTP: 'http.',
  DB: 'db.',
  RPC: 'rpc.',
  MESSAGING: 'messaging.',
  EXCEPTION: 'exception.',
} as const;








































