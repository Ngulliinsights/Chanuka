/**
 * Error Analytics Bridge Service
 *
 * Bridges error analytics functionality between different parts of the application
 */

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
  data?: any;
}

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

  static getInstance(): ErrorAnalyticsBridge {
    if (!ErrorAnalyticsBridge.instance) {
      ErrorAnalyticsBridge.instance = new ErrorAnalyticsBridge();
    }
    return ErrorAnalyticsBridge.instance;
  }

  trackError(error: ErrorAnalyticsData): void {
    this.errorQueue.push(error);
    this.updateMetrics(error);
    this.checkForAlerts(error);
  }

  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  getAlerts(): RealTimeAlert[] {
    return [...this.alerts];
  }

  clearAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  private updateMetrics(error: ErrorAnalyticsData): void {
    this.metrics.totalErrors++;

    // Update error by type
    const errorType = this.categorizeError(error.message);
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;

    // Update error by page
    if (error.url) {
      const page = new URL(error.url).pathname;
      this.metrics.errorsByPage[page] = (this.metrics.errorsByPage[page] || 0) + 1;
    }

    // Update top errors
    this.updateTopErrors(error.message);
  }

  private categorizeError(message: string): string {
    if (message.includes('Network')) return 'network';
    if (message.includes('TypeError')) return 'type';
    if (message.includes('ReferenceError')) return 'reference';
    if (message.includes('SyntaxError')) return 'syntax';
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

    // Sort by count and keep top 10
    this.metrics.topErrors.sort((a, b) => b.count - a.count);
    this.metrics.topErrors = this.metrics.topErrors.slice(0, 10);
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
    if (error.message.toLowerCase().includes('critical') ||
        error.message.toLowerCase().includes('fatal')) {
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
    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }
}

// Export singleton instance
export const errorAnalyticsBridge = ErrorAnalyticsBridge.getInstance();

// Export types
export type { ErrorAnalyticsData, ErrorMetrics, RealTimeAlert };
