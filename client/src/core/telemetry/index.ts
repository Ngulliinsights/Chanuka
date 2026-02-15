/**
 * Telemetry Module
 * Exports telemetry service and types
 */

export { telemetryService, TelemetryServiceImpl } from './service';
export type { TelemetryService } from './service';
export type {
  SystemMetrics,
  MetricsData,
  ExportConfig,
  MetricsResult,
  SendResult,
  AggregateResult,
  ValidationResult,
  ExportResult,
} from './types';
