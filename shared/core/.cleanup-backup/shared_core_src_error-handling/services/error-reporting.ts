import { TrackedError, ErrorContext } from '../core/types.js';

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  name: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface PerformanceIssue {
  id: string;
  type: string;
  duration?: number;
  startTime?: number;
  url: string;
  timestamp: string;
}

export interface RecoveryAttempt {
  retryCount: number;
  maxRetries: number;
  context: string;
  timestamp: string;
}

export interface MaxRetriesReached {
  retryCount: number;
  maxRetries: number;
  context: string;
  timestamp: string;
}

export class ErrorReportingService {
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceIssue[] = [];
  private isOnline = navigator ? navigator.onLine : true;
  private maxQueueSize = 100;

  constructor() {
    // Listen for online/offline events (client-side only)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Load persisted errors on initialization
      this.loadPersistedErrors();
    }
  }

  reportError(error: Error, metadata: Record<string, any> = {}) {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      metadata,
      timestamp: new Date().toISOString(),
      id: this.generateErrorId(),
    };

    // Add to queue (with size limit)
    this.errorQueue.push(errorReport);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue();
    }

    // Store in localStorage for persistence (client-side only)
    if (typeof window !== 'undefined') {
      this.persistErrorQueue();
    }
  }

  reportPerformanceIssue(issue: Omit<PerformanceIssue, 'id' | 'timestamp'>) {
    const performanceIssue: PerformanceIssue = {
      ...issue,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
    };

    this.performanceQueue.push(performanceIssue);
    if (this.performanceQueue.length > this.maxQueueSize) {
      this.performanceQueue.shift();
    }

    if (this.isOnline) {
      this.flushPerformanceQueue();
    }
  }

  reportRecoveryAttempt(data: RecoveryAttempt) {
    console.log('Recovery attempt:', data);
    // In a real application, this would be sent to analytics
  }

  reportMaxRetriesReached(data: MaxRetriesReached) {
    console.warn('Max retries reached:', data);
    // In a real application, this would trigger alerts
  }

  createBugReport(errorReport: any) {
    const subject = encodeURIComponent(`Error Report: ${errorReport.error.name}`);
    const body = encodeURIComponent(`
Error Details:
- Message: ${errorReport.error.message}
- Type: ${errorReport.errorType}
- Severity: ${errorReport.errorSeverity}
- Context: ${errorReport.context}
- URL: ${errorReport.url}
- User Agent: ${errorReport.userAgent}
- Timestamp: ${errorReport.timestamp}

Stack Trace:
${errorReport.error.stack}

Component Stack:
${errorReport.errorInfo?.componentStack || 'N/A'}
    `);

    // Open email client or redirect to bug report form
    if (typeof window !== 'undefined') {
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    console.log('Connection restored, flushing error queues');
    this.flushErrorQueue();
    this.flushPerformanceQueue();
  };

  private handleOffline = () => {
    this.isOnline = false;
    console.log('Connection lost, errors will be queued');
  };

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const queueCopy = [...this.errorQueue];

    try {
      console.log(`Sending ${queueCopy.length} error reports`);

      // Simulate API call to error reporting service
      await this.sendErrorReports(queueCopy);

      // Clear queue on successful send
      this.errorQueue = [];
      this.persistErrorQueue();
      console.log('Error reports sent successfully');
    } catch (error) {
      console.error('Failed to send error reports:', error);
      // Keep errors in queue for retry
    }
  }

  private async flushPerformanceQueue() {
    if (this.performanceQueue.length === 0) return;

    const queueCopy = [...this.performanceQueue];

    try {
      console.log(`Sending ${queueCopy.length} performance reports`);

      // Simulate API call to performance monitoring service
      await this.sendPerformanceReports(queueCopy);

      // Clear queue on successful send
      this.performanceQueue = [];
      console.log('Performance reports sent successfully');
    } catch (error) {
      console.error('Failed to send performance reports:', error);
      // Keep performance issues in queue for retry
    }
  }

  private async sendErrorReports(reports: ErrorReport[]) {
    // This would be replaced with actual API call to your error reporting service
    // For example: Sentry, LogRocket, or custom endpoint
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional network failures
        if (Math.random() > 0.9) {
          reject(new Error('Network error'));
        } else {
          resolve(reports);
        }
      }, 100); // Simulate network delay
    });
  }

  private async sendPerformanceReports(reports: PerformanceIssue[]) {
    // This would be replaced with actual API call to your performance monitoring service
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.95) {
          reject(new Error('Network error'));
        } else {
          resolve(reports);
        }
      }, 50);
    });
  }

  private persistErrorQueue() {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        errors: this.errorQueue,
        performance: this.performanceQueue,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('errorQueue', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist error queue:', error);
    }
  }

  private loadPersistedErrors() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('errorQueue');
      if (stored) {
        const data = JSON.parse(stored);

        // Load errors if they're not too old (24 hours)
        const storedTime = new Date(data.timestamp).getTime();
        const now = new Date().getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (now - storedTime < maxAge) {
          this.errorQueue = data.errors || [];
          this.performanceQueue = data.performance || [];
          console.log(`Loaded ${this.errorQueue.length} persisted errors and ${this.performanceQueue.length} performance issues`);
        } else {
          // Clear old data
          localStorage.removeItem('errorQueue');
        }
      }
    } catch (error) {
      console.error('Failed to load persisted errors:', error);
      // Clear corrupted data
      localStorage.removeItem('errorQueue');
    }
  }

  private clearPersistedErrors() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('errorQueue');
    } catch (error) {
      console.error('Failed to clear persisted errors:', error);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}




































