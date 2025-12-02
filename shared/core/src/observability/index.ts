// Observability - Single Source of Truth
// This module consolidates all logging, health, middleware, and error management

// Unified observability stack interface and implementation
export type { IObservabilityStack } from './iobservability-stack';
export { ObservabilityStackService } from './observability-stack-service';
export { ObservabilityStackRegistry } from './iobservability-stack';
export { createObservabilityStackService } from './observability-stack-service';

// Core observability
export * from './interfaces';
export * from './middleware';
export * from './correlation';
export * from './stack';
export * from './telemetry';

// Logging
export * from './logging';

// Health monitoring
// Removed - module deleted by design during development

// Error management
export * from './error-management';

// Metrics and tracing
export * from './metrics';
export * from './tracing';

// Re-export specific types to resolve ambiguities
export type {
  LogContext,
  LogLevel,
  MetricsConfig,
  Span,
  SpanContext,
  SpanKind,
  SpanOptions,
  SpanStatus,
  Tracer,
  TracingConfig
} from './interfaces';

export type {
  DEFAULT_CONFIG as MetricsDefaultConfig
} from './metrics/types';

export type {
  SamplingConfig as TelemetrySamplingConfig,
  SamplingRule as TelemetrySamplingRule
} from './telemetry';

// Explicit re-exports to resolve naming conflicts
export { createCorrelationMiddleware } from './middleware';
export { generateTraceId } from './correlation';
export { DEFAULT_CONFIG } from './metrics/types';
export type { SamplingConfig, SamplingRule } from './telemetry';





