/**
 * Error Analytics Bridge Service
 *
 * Bridges error analytics functionality between different parts of the application
 * Provides a singleton service for tracking errors and generating analytics
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ErrorAnalyticsData {
  errorId: string;
  message: string;
  stack?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
  errorsByType: Record<string, number>;
  errorsByPage: Record<string, number>;
}

export interface RealTimeAlert {
  id: string;
  type: 'error_spike' | 'critical_error' | 'performance_degradation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ErrorAnalyticsBridge {
  private static instance: ErrorAnalyticsBridge;
  private errorQueue: ErrorAnalyticsData[] = [];
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorRate: 0,
    topErrors: [],
    errorsByType: {},
    errorsByPage: {}
  };
  private alerts: RealTimeAlert[] = [];

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of ErrorAnalyticsBridge
   */
  static getInstance(): ErrorAnalyticsBridge {
    if (!ErrorAnalyticsBridge.instance) {
      ErrorAnalyticsBridge.instance = new ErrorAnalyticsBridge();
    }
    return ErrorAnalyticsBridge.instance;
  }

  /**
   * Track a new error and update metrics
   */
  trackError(error: ErrorAnalyticsData): void {
    this.errorQueue.push(error);
    this.updateMetrics(error);
    this.checkForAlerts(error);
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current alerts
   */
  getAlerts(): RealTimeAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear a specific alert by ID
   */
  clearAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get error queue
   */
  getErrorQueue(): ErrorAnalyticsData[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error queue
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorRate: 0,
      topErrors: [],
      errorsByType: {},
      errorsByPage: {}
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private updateMetrics(error: ErrorAnalyticsData): void {
    this.metrics.totalErrors++;

    // Update error by type
    const errorType = this.categorizeError(error.message);
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;

    // Update error by page
    if (error.url) {
      try {
        const page = new URL(error.url).pathname;
        this.metrics.errorsByPage[page] = (this.metrics.errorsByPage[page] || 0) + 1;
      } catch {
        // Invalid URL, skip page tracking
      }
    }

    // Update top errors
    this.updateTopErrors(error.message);

    // Calculate error rate (errors per minute based on last 60 seconds)
    this.calculateErrorRate();
  }

  private categorizeError(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network')) return 'network';
    if (lowerMessage.includes('typeerror')) return 'type';
    if (lowerMessage.includes('referenceerror')) return 'reference';
    if (lowerMessage.includes('syntaxerror')) return 'syntax';
    if (lowerMessage.includes('timeout')) return 'timeout';
    if (lowerMessage.includes('permission')) return 'permission';
    
    return 'other';
  }

  private updateTopErrors(message: string): void {
    const existing = this.metrics.topErrors.find(e => e.message === message);
    
    if (existing) {
      existing.count++;
    } else {
      this.metrics.topErrors.push({ message, count: 1, percentage: 0 });
    }

    // Recalculate percentages
    this.metrics.topErrors.forEach(error => {
      error.percentage = (error.count / this.metrics.totalErrors) * 100;
    });

    // Sort by count descending and keep top 10
    this.metrics.topErrors.sort((a, b) => b.count - a.count);
    this.metrics.topErrors = this.metrics.topErrors.slice(0, 10);
  }

  private calculateErrorRate(): void {
    const oneMinuteAgo = Date.now() - 60000;
    const recentErrors = this.errorQueue.filter(e => e.timestamp > oneMinuteAgo);
    this.metrics.errorRate = recentErrors.length;
  }

  private checkForAlerts(error: ErrorAnalyticsData): void {
    // Check for error spikes
    const recentErrors = this.errorQueue.filter(e =>
      Date.now() - e.timestamp < 60000 // Last minute
    );

    if (recentErrors.length > 10) {
      this.addAlert({
        id: `spike_${Date.now()}`,
        type: 'error_spike',
        message: `Error spike detected: ${recentErrors.length} errors in the last minute`,
        severity: 'high',
        timestamp: Date.now(),
        data: { errorCount: recentErrors.length }
      });
    }

    // Check for critical errors
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
      this.addAlert({
        id: `critical_${Date.now()}`,
        type: 'critical_error',
        message: `Critical error detected: ${error.message}`,
        severity: 'critical',
        timestamp: Date.now(),
        data: error
      });
    }
  }

  private addAlert(alert: RealTimeAlert): void {
    // Check for duplicate alerts (same type within last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    const isDuplicate = this.alerts.some(
      a => a.type === alert.type && a.timestamp > fiveMinutesAgo
    );

    if (!isDuplicate) {
      this.alerts.push(alert);

      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

/**
 * Singleton instance of ErrorAnalyticsBridge
 * Use this for all error tracking and analytics operations
 * 
 * @example
 * import { errorAnalyticsBridge } from './errorAnalyticsBridge';
 * 
 * errorAnalyticsBridge.trackError({
 *   errorId: 'err-123',
 *   message: 'Something went wrong',
 *   timestamp: Date.now()
 * });
 */
export const errorAnalyticsBridge = ErrorAnalyticsBridge.getInstance();