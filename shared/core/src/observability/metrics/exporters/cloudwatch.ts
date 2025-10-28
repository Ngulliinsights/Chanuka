import { Metric } from '../types';
import { Result, Ok, Err } from '../../../primitives/types/result';

// ==================== CloudWatch Configuration ====================

export interface CloudWatchConfig {
  region?: string;
  namespace?: string;
  batchSize?: number;
  flushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  bufferSize?: number;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  endpoint?: string;
  storageResolution?: number;
}

// ==================== Enhanced CloudWatch Exporter ====================

export class EnhancedCloudWatchExporter {
  public readonly name = 'cloudwatch';
  public readonly contentType = 'application/x-amz-json-1.1';

  private config: CloudWatchConfig;
  private buffer: Metric[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isExporting = false;

  constructor(config: CloudWatchConfig = {}) {
    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      namespace: config.namespace || 'App/Metrics',
      batchSize: config.batchSize || 20, // CloudWatch limit is 20 metrics per request
      flushInterval: config.flushInterval || 30000, // 30 seconds
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      bufferSize: config.bufferSize || 1000,
      accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: config.sessionToken || process.env.AWS_SESSION_TOKEN,
      endpoint: config.endpoint,
      storageResolution: config.storageResolution || 60, // 1 minute resolution
    };

    this.startFlushTimer();
  }

  async export(metrics: Metric[]): Promise<Result<void, Error>> {
    try {
      this.buffer.push(...metrics);

      // Check if we should flush immediately
      if (this.buffer.length >= (this.config.batchSize ?? 20)) {
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
      const cloudWatchMetrics = this.convertToCloudWatch(metricsToExport);

      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= (this.config.retryAttempts ?? 3); attempt++) {
        try {
          await this.sendToCloudWatch(cloudWatchMetrics);
          return new Ok(undefined);
        } catch (error) {
          lastError = error as Error;

          if (attempt < (this.config.retryAttempts ?? 3)) {
            const delay = (this.config.retryDelay ?? 1000) * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }

      // If we get here, all retries failed
      this.buffer.unshift(...metricsToExport);
      return new Err(lastError || new Error('Failed to send metrics to CloudWatch after all retries'));

    } finally {
      this.isExporting = false;
    }
  }

  private convertToCloudWatch(metrics: Metric[]): any {
    const metricData: any[] = [];

    for (const metric of metrics) {
      for (const value of metric.values) {
        const dimensions = this.convertLabelsToDimensions({
          ...metric.labels,
          ...value.labels
        });

        const baseMetric = {
          MetricName: metric.name,
          Dimensions: dimensions,
          Timestamp: value.timestamp,
          StorageResolution: this.config.storageResolution,
        };

        switch (metric.type) {
          case 'counter':
            metricData.push({
              ...baseMetric,
              Value: value.value,
              Unit: 'Count',
            });
            break;

          case 'gauge':
            metricData.push({
              ...baseMetric,
              Value: value.value,
              Unit: 'None',
            });
            break;

          case 'histogram':
            // For histograms, we send sum and count
            if (metric.name.includes('sum')) {
              metricData.push({
                ...baseMetric,
                Value: value.value,
                Unit: 'None',
                MetricName: metric.name.replace('_sum', '_sum'),
              });
            } else if (metric.name.includes('count')) {
              metricData.push({
                ...baseMetric,
                Value: value.value,
                Unit: 'Count',
                MetricName: metric.name.replace('_count', '_count'),
              });
            } else {
              // Send as timing
              metricData.push({
                ...baseMetric,
                Value: value.value * 1000, // Convert to milliseconds
                Unit: 'Milliseconds',
              });
            }
            break;

          case 'summary':
            // Similar to histogram
            if (metric.name.includes('sum')) {
              metricData.push({
                ...baseMetric,
                Value: value.value,
                Unit: 'None',
                MetricName: metric.name.replace('_sum', '_sum'),
              });
            } else if (metric.name.includes('count')) {
              metricData.push({
                ...baseMetric,
                Value: value.value,
                Unit: 'Count',
                MetricName: metric.name.replace('_count', '_count'),
              });
            } else {
              metricData.push({
                ...baseMetric,
                Value: value.value * 1000,
                Unit: 'Milliseconds',
              });
            }
            break;
        }
      }
    }

    return {
      Namespace: this.config.namespace,
      MetricData: metricData,
    };
  }

  private convertLabelsToDimensions(labels: Record<string, string>): any[] {
    if (!labels || Object.keys(labels).length === 0) {
      return [];
    }

    return Object.entries(labels)
      .filter(([key, value]) => key && value)
      .map(([key, value]) => ({
        Name: key,
        Value: value,
      }))
      .slice(0, 10); // CloudWatch limit is 10 dimensions per metric
  }

  private async sendToCloudWatch(metricData: any): Promise<void> {
    // In a real implementation, this would use the AWS SDK
    // For now, we'll simulate the API call

    const endpoint = this.config.endpoint ||
      `https://monitoring.${this.config.region}.amazonaws.com/`;

    const headers: Record<string, string> = {
      'Content-Type': this.contentType,
      'X-Amz-Target': 'GraniteServiceVersion20100801.PutMetricData',
    };

    // Add AWS authentication headers
    if (this.config.accessKeyId && this.config.secretAccessKey) {
      // In a real implementation, you'd calculate the AWS signature here
      headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(metricData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CloudWatch API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      const result = await this.flush();
      if (result.isErr()) {
        console.error('Failed to flush CloudWatch buffer:', result.error);
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
        console.error('Error during final CloudWatch flush:', result.error);
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(error as Error);
    }
  }
}

// ==================== Factory Function ====================

export function createEnhancedCloudWatchExporter(config?: CloudWatchConfig): EnhancedCloudWatchExporter {
  return new EnhancedCloudWatchExporter(config);
}
