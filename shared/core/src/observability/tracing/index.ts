// Re-export types
export type {
  SpanKind,
  SpanStatus,
  TraceContext,
  SpanContext,
  SpanEvent,
  SpanLink,
  Resource,
  InstrumentationScope,
  Trace,
  Tracer as TracerInterface,
  Span as SpanInterface,
  SpanOptions,
  Sampler,
  SamplingResult,
  SamplingConfig,
  SamplingRule,
  TraceExporter,
  BatchSpanProcessor,
  TracingConfig,
  JaegerConfig,
  ZipkinConfig,
  OTLPConfig,
  BatchProcessorConfig,
  TextMapPropagator,
  Baggage,
} from './types';

// Re-export constants
export {
  DEFAULT_CONFIG,
  TRACE_HEADER_W3C,
  TRACE_HEADER_JAEGER,
  TRACE_HEADER_B3,
  SPAN_ATTRIBUTE_PREFIXES,
} from './types';

// Re-export implementations
export { Tracer, createTracer, ProbabilisticSampler, BatchSpanProcessorImpl, createBatchSpanProcessor } from './tracer';
export { Span, createSpan, generateSpanId, generateTraceId } from './span';
export { TraceContextManager, traceContextManager, withTraceContext, withTraceContextAsync } from './context';





































