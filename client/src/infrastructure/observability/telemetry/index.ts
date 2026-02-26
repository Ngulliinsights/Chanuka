/**
 * Telemetry Sub-module
 * 
 * Provides system telemetry data collection and aggregation.
 * 
 * Requirements: 3.1, 11.5
 */

// Re-export from telemetry module for now
// These will be gradually migrated to the new structure
export {
  telemetryService,
  TelemetryServiceImpl,
} from '@client/infrastructure/telemetry/service';

export type {
  TelemetryService,
} from '@client/infrastructure/telemetry/service';

export type {
  SystemMetrics,
  MetricsData,
  ExportConfig,
  MetricsResult,
  SendResult,
  AggregateResult,
  ValidationResult,
  ExportResult,
} from '@client/infrastructure/telemetry/types';

/**
 * Send telemetry data
 * Requirements: 11.5
 */
export async function sendTelemetry(data: {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: Date;
}): Promise<void> {
  const service = telemetryService;
  
  // Convert to the format expected by the telemetry service
  const metricsData = {
    timestamp: data.timestamp || new Date(),
    metrics: {
      [data.type]: data.payload,
    },
  };

  await service.sendMetrics(metricsData as any);
}

/**
 * Initialize telemetry with configuration
 */
export function initializeTelemetry(config: {
  enabled?: boolean;
  aggregationInterval?: number;
  endpoint?: string;
}): void {
  if (!config.enabled) {
    return;
  }

  // Telemetry service is already initialized as a singleton
  console.log('Telemetry initialized');
}
