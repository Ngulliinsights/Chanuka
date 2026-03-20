/**
 * Circuit Breaker Shared Types
 * 
 * Extracted to prevent circular dependencies between
 * circuit-breaker-monitor and interceptors modules.
 */

export interface CircuitBreakerState {
  state: 'open' | 'closed' | 'half-open';
  failures: number;
  successes: number;
  rejected: number;
  failureRate: number;
  averageResponseTime: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  failureCount?: number;
  nextRetryTime?: number;
  successCount?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerEvent {
  serviceName: string;
  state: 'open' | 'closed' | 'half-open';
  timestamp: Date;
  metrics: {
    failures: number;
    successes: number;
    rejected: number;
    failureRate: number;
    averageResponseTime: number;
  };
  correlationId?: string;
}

export interface ServiceHealthStatus {
  serviceName: string;
  healthy: boolean;
  state: 'open' | 'closed' | 'half-open';
  lastFailure?: Date;
  lastSuccess?: Date;
  failureRate: number;
  averageResponseTime: number;
  totalRequests: number;
  reason?: string;
}

export interface ErrorCorrelation {
  correlationId: string;
  errors: unknown[]; // BaseError type not available here to avoid circular deps
  services: string[];
  startTime: Date;
  endTime?: Date;
  resolved: boolean;
  recoveryAttempts: number;
}
