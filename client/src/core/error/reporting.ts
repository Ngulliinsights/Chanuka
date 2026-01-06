/**
 * Error Reporting Service
 *
 * Service for batching and sending error reports to a backend endpoint.
 * Migrated from utils/errors.ts with enhanced modular architecture.
 */

import { AppError, ErrorSeverity } from './types';

/**
 * Service for batching and sending error reports to a backend endpoint.
 * Implements batching to reduce network overhead and periodic flushing.
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private reportingEndpoint: string;
  private batchSize = 10;
  private flushInterval = 30000;
  private pendingReports: AppError[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isEnabled = true;

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  private constructor() {
    this.reportingEndpoint = this.getReportingEndpoint();
    this.startPeriodicFlush();
  }

  /**
   * Gets reporting endpoint from environment or uses default
   */
  private getReportingEndpoint(): string {
    if (typeof process !== 'undefined' && process.env?.VITE_ERROR_REPORTING_URL) {
      return process.env.VITE_ERROR_REPORTING_URL;
    }
    return '/api/errors/report';
  }

  configure(options: {
    endpoint?: string;
    batchSize?: number;
    flushInterval?: number;
    enabled?: boolean;
  }): void {
    if (options.endpoint) this.reportingEndpoint = options.endpoint;
    if (options.batchSize !== undefined) this.batchSize = Math.max(1, options.batchSize);
    if (options.flushInterval !== undefined) {
      this.flushInterval = Math.max(5000, options.flushInterval);
      this.restartPeriodicFlush();
    }
    if (options.enabled !== undefined) this.isEnabled = options.enabled;
  }

  /**
   * Adds error to reporting queue and flushes if batch is full or critical
   */
  async reportError(error: AppError): Promise<void> {
    if (!this.isEnabled) return;

    // Safety check for browser environment
    if (typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    this.pendingReports.push(error);

    // Flush immediately for critical errors or when batch is full
    if (this.pendingReports.length >= this.batchSize || error.severity === ErrorSeverity.CRITICAL) {
      await this.flushReports();
    }
  }

  /**
   * Sends all pending error reports to the backend
   */
  private async flushReports(): Promise<void> {
    if (this.pendingReports.length === 0) return;

    const reports = [...this.pendingReports];
    this.pendingReports = [];

    try {
      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: reports,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(`Reporting failed with status: ${response.status}`);
      }

      console.info('Error reports sent successfully', {
        component: 'ErrorReportingService',
        count: reports.length,
      });
    } catch (reportError) {
      console.error('Failed to send error reports', {
        component: 'ErrorReportingService',
        error: reportError,
        pendingCount: reports.length,
      });

      // Re-queue reports if we haven't exceeded memory limits
      if (this.pendingReports.length < this.batchSize * 2) {
        this.pendingReports.unshift(...reports);
      }
    }
  }

  /**
   * Sets up periodic flushing of error reports
   */
  private startPeriodicFlush(): void {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flushReports().catch(error => {
          console.error('Error during periodic flush', {
            component: 'ErrorReportingService',
            error,
          });
        });
      }, this.flushInterval);
    }
  }

  private restartPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.startPeriodicFlush();
  }

  async forceFlush(): Promise<void> {
    await this.flushReports();
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingReports = [];
  }
}
