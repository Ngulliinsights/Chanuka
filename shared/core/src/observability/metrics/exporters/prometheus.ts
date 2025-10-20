import { Metric, MetricsExporter, PrometheusConfig } from '../types';
import { Result, Ok, Err } from '../../../primitives/types/result';

// ==================== Enhanced Prometheus Exporter ====================

export interface EnhancedPrometheusConfig extends PrometheusConfig {
  batchSize?: number;
  flushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  bufferSize?: number;
  compression?: boolean;
  timeout?: number;
}

export class EnhancedPrometheusExporter {
  public readonly name = 'prometheus';
  public readonly contentType = 'text/plain; version=0.0.4; charset=utf-8';

  private config: EnhancedPrometheusConfig;
  private buffer: Metric[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isExporting = false;

  constructor(config: EnhancedPrometheusConfig = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl,
      jobName: config.jobName || 'app',
      instance: config.instance || process.env.HOSTNAME || 'localhost',
      interval: config.interval || 15000,
      timeout: config.timeout || 5000,
      headers: config.headers || {},
      batchSize: config.batchSize ?? 1000,
      flushInterval: config.flushInterval ?? 15000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      bufferSize: config.bufferSize ?? 10000,
      compression: config.compression ?? false,
    };

    this.startFlushTimer();
  }

  async export(metrics: Metric[]): Promise<Result<void, Error>> {
    try {
      // Add metrics to buffer
      this.buffer.push(...metrics);

      // Check if we should flush immediately
      if (this.buffer.length >= (this.config.batchSize ?? 1000)) {
        return this.flush();
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(error as Error);
    }
  }

  private async flush(): Promise<Result<void, Error>> {
    if (this.isExporting || this.buffer.length === 0) {
      return new Ok(undefined);
    }

    this.isExporting = true;

    try {
      const metricsToExport = this.buffer.splice(0, this.config.batchSize);
      const prometheusFormat = this.formatMetrics(metricsToExport);

      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= (this.config.retryAttempts ?? 3); attempt++) {
        try {
          await this.sendToPrometheus(prometheusFormat);
          return new Ok(undefined);
        } catch (error) {
          lastError = error as Error;

          if (attempt < (this.config.retryAttempts ?? 3)) {
            // Exponential backoff
            const delay = (this.config.retryDelay ?? 1000) * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }

      // If we get here, all retries failed
      // Put metrics back in buffer for next attempt
      this.buffer.unshift(...metricsToExport);
      return new Err(lastError || new Error('Failed to export metrics after all retries'));

    } finally {
      this.isExporting = false;
    }
  }

  private async sendToPrometheus(prometheusFormat: string): Promise<void> {
    if (!this.config.gatewayUrl) {
      throw new Error('Prometheus gateway URL is required');
    }

    const url = `${this.config.gatewayUrl}/metrics/job/${this.config.jobName}/instance/${this.config.instance}`;

    const headers: Record<string, string> = {
      'Content-Type': this.contentType,
      ...this.config.headers,
    };

    if (this.config.compression) {
      // Note: In a real implementation, you'd compress the payload here
      headers['Content-Encoding'] = 'gzip';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: prometheusFormat,
      signal: AbortSignal.timeout(this.config.timeout ?? 5000),
    });

    if (!response.ok) {
      throw new Error(`Prometheus push failed: ${response.status} ${response.statusText}`);
    }
  }

  private formatMetrics(metrics: Metric[]): string {
    const lines: string[] = [];

    for (const metric of metrics) {
      // Help comment
      lines.push(`# HELP ${metric.name} ${metric.help}`);

      // Type comment
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Metric values
      for (const value of metric.values) {
        const labels = this.formatLabels({ ...metric.labels, ...value.labels });
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${metric.name}${labelStr} ${value.value} ${Math.floor(value.timestamp.getTime() / 1000)}`);
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return '';

    return Object.entries(labels)
      .map(([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`)
      .join(',');
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      const result = await this.flush();
      if (result.isErr()) {
        console.error('Failed to flush metrics buffer:', result.error);
      }
    }, this.config.flushInterval);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Force immediate flush of buffered metrics
   */
  async forceFlush(): Promise<Result<void, Error>> {
    return this.flush();
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<Result<void, Error>> {
    try {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }

      // Final flush
      const result = await this.flush();
      if (result.isErr()) {
        console.error('Error during final flush:', result.error);
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(error as Error);
    }
  }
}

// ==================== Factory Function ====================

export function createEnhancedPrometheusExporter(config?: EnhancedPrometheusConfig): EnhancedPrometheusExporter {
  return new EnhancedPrometheusExporter(config);
}