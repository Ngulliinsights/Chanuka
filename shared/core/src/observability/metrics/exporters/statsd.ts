import { Metric, MetricsExporter } from '../types';
import { Result, Ok, Err } from '../../../primitives/types/result';
import * as dgram from 'dgram';
import * as net from 'net';

// ==================== StatsD Configuration ====================

export interface StatsDConfig {
  host?: string;
  port?: number;
  protocol?: 'udp' | 'tcp';
  batchSize?: number;
  flushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  bufferSize?: number;
  prefix?: string;
  suffix?: string;
  globalTags?: Record<string, string>;
  sampleRate?: number;
}

// ==================== Enhanced StatsD Exporter ====================

export class EnhancedStatsDExporter {
  public readonly name = 'statsd';
  public readonly contentType = 'text/plain';

  private config: Required<StatsDConfig>;
  private buffer: string[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isExporting = false;
  private client?: dgram.Socket | net.Socket;

  constructor(config: StatsDConfig = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 8125,
      protocol: config.protocol || 'udp',
      batchSize: config.batchSize || 1000,
      flushInterval: config.flushInterval || 10000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      bufferSize: config.bufferSize || 10000,
      prefix: config.prefix || '',
      suffix: config.suffix || '',
      globalTags: config.globalTags || {},
      sampleRate: config.sampleRate || 1.0,
    };

    this.initializeClient();
    this.startFlushTimer();
  }

  async export(metrics: Metric[]): Promise<Result<void, Error>> {
    try {
      const statsdMetrics = this.convertToStatsD(metrics);
      this.buffer.push(...statsdMetrics);

      // Check if we should flush immediately
      if (this.buffer.length >= this.config.batchSize) {
        return this.flush();
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(error as Error);
    }
  }

  private convertToStatsD(metrics: Metric[]): string[] {
    const result: string[] = [];

    for (const metric of metrics) {
      for (const value of metric.values) {
        const combinedLabels = { ...metric.labels, ...value.labels, ...this.config.globalTags };
        const tags = this.formatTags(combinedLabels);

        // Apply sampling
        if (Math.random() > this.config.sampleRate) {
          continue;
        }

        const metricName = this.formatMetricName(metric.name);
        const sampleRate = this.config.sampleRate < 1.0 ? `|@${this.config.sampleRate}` : '';

        switch (metric.type) {
          case 'counter':
            result.push(`${metricName}:${value.value}|c${tags}${sampleRate}`);
            break;

          case 'gauge':
            result.push(`${metricName}:${value.value}|g${tags}`);
            break;

          case 'histogram':
          case 'summary':
            // Convert to timing metric for StatsD
            result.push(`${metricName}:${Math.round(value.value * 1000)}|ms${tags}${sampleRate}`);
            break;
        }
      }
    }

    return result;
  }

  private formatMetricName(name: string): string {
    let formatted = name;
    if (this.config.prefix) {
      formatted = `${this.config.prefix}.${formatted}`;
    }
    if (this.config.suffix) {
      formatted = `${formatted}.${this.config.suffix}`;
    }
    return formatted.replace(/[^a-zA-Z0-9_.]/g, '_');
  }

  private formatTags(labels: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const tags = Object.entries(labels)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');

    return `|#${tags}`;
  }

  private async flush(): Promise<Result<void, Error>> {
    if (this.isExporting || this.buffer.length === 0 || !this.client) {
      return new Ok(undefined);
    }

    this.isExporting = true;

    try {
      const metricsToSend = this.buffer.splice(0, this.config.batchSize);
      const payload = metricsToSend.join('\n');

      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          await this.sendMetrics(payload);
          return new Ok(undefined);
        } catch (error) {
          lastError = error as Error;

          if (attempt < this.config.retryAttempts) {
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }

      // If we get here, all retries failed
      this.buffer.unshift(...metricsToSend);
      return new Err(lastError || new Error('Failed to send metrics to StatsD after all retries'));

    } finally {
      this.isExporting = false;
    }
  }

  private sendMetrics(payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('StatsD client not initialized'));
        return;
      }

      const buffer = Buffer.from(payload);

      if (this.config.protocol === 'udp') {
        (this.client as dgram.Socket).send(buffer, 0, buffer.length, this.config.port, this.config.host, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        (this.client as net.Socket).write(buffer, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    });
  }

  private initializeClient(): void {
    if (this.config.protocol === 'udp') {
      this.client = dgram.createSocket('udp4');
    } else {
      this.client = new net.Socket();
      this.client.connect(this.config.port, this.config.host);
    }

    this.client.on('error', (error) => {
      console.error('StatsD client error:', error);
    });
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      const result = await this.flush();
      if (result.isErr()) {
        console.error('Failed to flush StatsD buffer:', result.error);
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
        console.error('Error during final StatsD flush:', result.error);
      }

      // Close client
      if (this.client) {
        if (this.config.protocol === 'udp') {
          (this.client as dgram.Socket).close();
        } else {
          (this.client as net.Socket).end();
        }
        this.client = undefined;
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(error as Error);
    }
  }
}

// ==================== Factory Function ====================

export function createEnhancedStatsDExporter(config?: StatsDConfig): EnhancedStatsDExporter {
  return new EnhancedStatsDExporter(config);
}
