/**
 * API Reporter
 *
 * Reports errors to a backend API endpoint with batching,
 * retry logic, and configurable formatting.
 */

import { AppError, ErrorReporter } from '../types';

export interface ApiReporterConfig {
  endpoint?: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  headers?: Record<string, string>;
  transformPayload?: (errors: AppError[]) => unknown;
  onSuccess?: (response: Response, errors: AppError[]) => void;
  onError?: (error: Error, errors: AppError[]) => void;
}

export class ApiReporter implements ErrorReporter {
  private config: Required<ApiReporterConfig>;
  private pendingReports: AppError[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<ApiReporterConfig>) {
    this.config = {
      endpoint: '/api/errors',
      apiKey: undefined,
      batchSize: 10,
      flushInterval: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
      headers: {},
      transformPayload: errors => ({ errors }),
      onSuccess: () => {},
      onError: () => {},
      ...config,
    } as Required<ApiReporterConfig>;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.startPeriodicFlush();
    this.isInitialized = true;
  }

  async report(error: AppError): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.pendingReports.push(error);

    // Flush immediately if batch is full or critical error
    if (this.pendingReports.length >= this.config.batchSize || error.severity === 'critical') {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.pendingReports.length === 0) return;

    const errorsToSend = [...this.pendingReports];
    this.pendingReports = [];

    await this.sendBatch(errorsToSend);
  }

  private async sendBatch(errors: AppError[], attempt = 1): Promise<void> {
    try {
      const payload = this.config.transformPayload(errors);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers,
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Call success callback
      this.config.onSuccess(response, errors);

      console.info('Successfully reported errors to API', {
        component: 'ApiReporter',
        count: errors.length,
        endpoint: this.config.endpoint,
      });
    } catch (error) {
      console.error(
        `Failed to send error batch (attempt ${attempt}/${this.config.retryAttempts}):`,
        error
      );

      // Retry logic
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendBatch(errors, attempt + 1);
      }

      // Call error callback
      this.config.onError(error as Error, errors);

      // Re-queue errors if we haven't exceeded memory limits
      if (this.pendingReports.length < this.config.batchSize * 2) {
        this.pendingReports.unshift(...errors);
      }
    }
  }

  private startPeriodicFlush(): void {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flush().catch(error => {
          console.error('Error during periodic flush:', error);
        });
      }, this.config.flushInterval);
    }
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  updateConfig(config: Partial<ApiReporterConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Restart timer if flush interval changed
    if (config.flushInterval && config.flushInterval !== oldConfig.flushInterval) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      this.startPeriodicFlush();
    }
  }

  getPendingCount(): number {
    return this.pendingReports.length;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingReports = [];
    this.isInitialized = false;
  }
}
