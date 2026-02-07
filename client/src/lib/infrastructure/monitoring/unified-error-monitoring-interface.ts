/**
 * Unified Error Monitoring Interface
 * Provides a unified interface for error monitoring across systems
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorDomain = 'api' | 'ui' | 'auth' | 'data' | 'network' | 'unknown';
export type ClientSystem = 'web' | 'mobile' | 'desktop';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
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
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByDomain: Record<ErrorDomain, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: AppError[];
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
