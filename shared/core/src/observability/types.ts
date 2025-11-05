/**
 * Observability Types
 * 
 * Centralized type definitions for all observability concerns including
 * logging, health monitoring, error management, metrics, and tracing.
 */

// Re-export all types from sub-modules for convenience
export type {
  LogLevel,
  LogContext,
  LogMetrics,
  RequestLogData,
  DatabaseQueryLogData,
  CacheOperationLogData,
  SecurityEventLogData,
  BusinessEventLogData,
  PerformanceLogData,
  StoredLogEntry,
  LogQueryFilters,
  LogAggregation,
  LogRotationConfig,
  LoggerOptions,
  ErrorTrackerInterface,
  LogTransport,
  Logger,
  LoggerChild
} from './logging/types';
export type {
  HealthStatus,
  HealthCheck,
  HealthCheckResult,
  HealthReport,
  HealthCheckOptions,
  HealthOrchestratorOptions,
  HealthMetrics
} from './health/types';
export type {
  ErrorHandler as ErrorHandlerInterface,
  ErrorReporter,
  ErrorRecovery,
  ErrorContext,
  ErrorMetrics,
  ErrorAggregation,
  UserErrorReport,
  RecoveryOption,
  UserFeedback,
  ErrorAnalytics,
  ErrorMonitor,
  ErrorRecoveryEngine,
  RecoverySuggestion,
  ErrorBoundaryConfig,
  ErrorTrackingIntegration,
  ErrorDashboardData
} from './error-management/types';
export type {
  Counter,
  Gauge,
  Histogram,
  Summary,
  AnyMetric,
  Metric,
  MetricValue,
  MetricsRegistry,
  MetricType
} from './metrics/types';
export type {
  Tracer,
  Span,
  SpanContext,
  SpanKind,
  SpanOptions,
  SpanStatus,
  TracingConfig,
  SamplingConfig,
  SamplingRule
} from './tracing/types';

// Core observability interfaces
export interface ObservabilityConfig {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    outputs: string[];
  };
  health: {
    enabled: boolean;
    checkInterval: number;
    timeout: number;
  };
  metrics: {
    enabled: boolean;
    exportInterval: number;
    exporters: string[];
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;
    exporters: string[];
  };
  errorManagement: {
    enabled: boolean;
    reportingEnabled: boolean;
    recoveryEnabled: boolean;
  };
}

export interface ObservabilityContext { correlationId: string;
  traceId?: string;
  spanId?: string;
  user_id?: string;
  session_id?: string;
  requestId?: string;
  metadata?: Record<string, any>;
 }

export interface ObservabilityEvent {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: ObservabilityContext;
  data?: Record<string, any>;
  error?: Error;
}

export interface ObservabilityProvider {
  name: string;
  version: string;
  initialize(config: ObservabilityConfig): Promise<void>;
  shutdown(): Promise<void>;
  isHealthy(): boolean;
}

// Middleware types
export interface ObservabilityMiddleware {
  name: string;
  priority: number;
  process(event: ObservabilityEvent): Promise<ObservabilityEvent>;
}

// Stack types
export interface ObservabilityStack {
  providers: ObservabilityProvider[];
  middleware: ObservabilityMiddleware[];
  config: ObservabilityConfig;
}

// Telemetry types
export interface TelemetryData {
  metrics: Record<string, number>;
  traces: any[];
  logs: ObservabilityEvent[];
  health: Record<string, boolean>;
}

export interface TelemetryExporter {
  name: string;
  export(data: TelemetryData): Promise<void>;
}
