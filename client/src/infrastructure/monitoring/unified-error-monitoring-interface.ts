/**
 * Unified Error Monitoring Interface
 * Provides a unified interface for error monitoring across systems
 */

// Import from single source of truth
import { ErrorDomain as CoreErrorDomain, ErrorSeverity as CoreErrorSeverity } from '@client/infrastructure/error/constants';

// Re-export the canonical enum types (not string unions) so downstream
// consumers use the same nominal type as @shared/core.
export type ErrorSeverity = CoreErrorSeverity;
export type ErrorDomain = CoreErrorDomain;

// Const objects for runtime enum values - use core enums
export const ErrorSeverity = CoreErrorSeverity;
export const ErrorDomain = CoreErrorDomain;

export type ClientSystem = 'web' | 'mobile' | 'desktop' | 'service_architecture' | 'security' | 'library_services' | 'hooks';

export const ClientSystem = {
  WEB: 'web' as const,
  MOBILE: 'mobile' as const,
  DESKTOP: 'desktop' as const,
  SERVICE_ARCHITECTURE: 'service_architecture' as const,
  SECURITY: 'security' as const,
  LIBRARY_SERVICES: 'library_services' as const,
  HOOKS: 'hooks' as const,
} as const;

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  // Extended properties for monitoring
  system?: string; // Changed from ClientSystem to string for compatibility
  operation?: string;
  // Component-specific context fields
  serviceComponent?: string;
  serviceName?: string;
  coreComponent?: string;
  coreOperation?: string;
  securityComponent?: string;
}

export interface AppError extends Error {
  code?: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: Date | number; // Support both Date and number (Unix timestamp)
  type?: ErrorDomain; // Alias for domain
  recovered?: boolean;
}

export interface PerformanceMetrics {
  loadTime?: number;
  renderTime?: number;
  apiLatency?: number;
  memoryUsage?: number;
  // Extended properties for monitoring
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  context?: ErrorContext;
}

export interface ErrorAnalytics {
  totalErrors?: number;
  errorsByDomain?: Record<ErrorDomain, number>;
  errorsBySeverity?: Record<ErrorSeverity, number>;
  recentErrors?: AppError[];
  // Extended properties
  errorId: string;
  pattern: string;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: number;
  recoveryRate: number;
  affectedUsers: number;
}

export interface SystemHealth {
  system: string; // Changed from ClientSystem to string for compatibility
  status: 'healthy' | 'degraded' | 'critical';
  uptime?: number;
  errorRate: number;
  performanceScore: number;
  performance?: PerformanceMetrics;
  lastUpdated: number;
}

export interface UnifiedErrorMonitor {
  captureError(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  setContext(key: string, value: unknown): void;
}

export interface UnifiedErrorMonitoring {
  reportError(error: AppError | Error, context: ErrorContext): Promise<void>;
  trackPerformance(metrics: PerformanceMetrics): Promise<void>;
  getErrorAnalytics(timeRange?: { start: number; end: number }): Promise<ErrorAnalytics[]>;
  getSystemHealth(): Promise<SystemHealth>;
  registerErrorPattern(pattern: string, threshold: number): void;
  setMonitoringEnabled(enabled: boolean, operations?: string[]): void;
  getAggregatedMetrics(period: 'hour' | 'day' | 'week'): Promise<{
    totalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
    performanceImpact: number;
  }>;
}

export interface ErrorMonitoringMiddleware {
  wrap<T extends (...args: unknown[]) => any>(fn: T, context: ErrorContext): T;
  wrapAsync<T extends (...args: unknown[]) => Promise<any>>(fn: T, context: ErrorContext): T;
  createBoundary(context: ErrorContext): {
    onError: (error: Error) => void;
    trackPerformance: (operation: string, duration: number, success: boolean) => void;
  };
}

export class UnifiedErrorMonitoringService implements UnifiedErrorMonitor {
  captureError(error: Error, context?: ErrorContext) {
    console.error('Unified error:', error, context);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  setContext(key: string, value: unknown) {
    // Set context for error tracking
  }
}

export const unifiedErrorMonitor = new UnifiedErrorMonitoringService();
export default unifiedErrorMonitor;


export class TrendAnalysisService {
  analyzeTrends(data: unknown[]) {
    return { trends: [], insights: [] };
  }
}
