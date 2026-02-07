/**
 * Unified Error Monitoring Interface
 * Provides a unified interface for error monitoring across systems
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical' | 'blocker';
export type ErrorDomain = 'api' | 'ui' | 'auth' | 'data' | 'network' | 'unknown' | 'system' | 'cache' | 'security' | 'hooks' | 'library_services';
export type ClientSystem = 'web' | 'mobile' | 'desktop' | 'service_architecture' | 'security';

// Const objects for runtime enum values
export const ErrorSeverity = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
  BLOCKER: 'blocker' as const,
} as const;

export const ErrorDomain = {
  API: 'api' as const,
  UI: 'ui' as const,
  AUTH: 'auth' as const,
  DATA: 'data' as const,
  NETWORK: 'network' as const,
  UNKNOWN: 'unknown' as const,
  SYSTEM: 'system' as const,
  CACHE: 'cache' as const,
  SECURITY: 'security' as const,
  HOOKS: 'hooks' as const,
  LIBRARY_SERVICES: 'library_services' as const,
} as const;

export const ClientSystem = {
  WEB: 'web' as const,
  MOBILE: 'mobile' as const,
  DESKTOP: 'desktop' as const,
  SERVICE_ARCHITECTURE: 'service_architecture' as const,
  SECURITY: 'security' as const,
} as const;

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  // Extended properties for monitoring
  system?: ClientSystem;
  operation?: string;
}

export interface AppError extends Error {
  code?: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  context?: ErrorContext;
  timestamp: Date;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiLatency: number;
  memoryUsage: number;
  // Extended properties for monitoring
  operation?: string;
  duration?: number;
  success?: boolean;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByDomain: Record<ErrorDomain, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: AppError[];
  // Extended properties
  errorId?: string;
  frequency?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  errorRate: number;
  performance: PerformanceMetrics;
}

export interface UnifiedErrorMonitor {
  captureError(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  setContext(key: string, value: any): void;
}

export type UnifiedErrorMonitoring = UnifiedErrorMonitor;

export interface ErrorMonitoringMiddleware {
  onError: (error: AppError) => void;
  onWarning: (message: string) => void;
  onInfo: (message: string) => void;
}

export class UnifiedErrorMonitoringService implements UnifiedErrorMonitor {
  captureError(error: Error, context?: ErrorContext) {
    console.error('Unified error:', error, context);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  setContext(key: string, value: any) {
    // Set context for error tracking
  }
}

export const unifiedErrorMonitor = new UnifiedErrorMonitoringService();
export default unifiedErrorMonitor;


export class TrendAnalysisService {
  analyzeTrends(data: any[]) {
    return { trends: [], insights: [] };
  }
}
