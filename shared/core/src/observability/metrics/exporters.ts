import { Metric, MetricsExporter, PrometheusConfig, OpenTelemetryConfig } from './types';

// ==================== Prometheus Exporter ====================

export class PrometheusExporter implements MetricsExporter {
  public readonly name = 'prometheus';
  public readonly contentType = 'text/plain; version=0.0.4; charset=utf-8';

  private config: Required<PrometheusConfig>;

  constructor(config: PrometheusConfig = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl,
      jobName: config.jobName || 'app',
      instance: config.instance || process.env.HOSTNAME || 'localhost',
      interval: config.interval || 15000,
      timeout: config.timeout || 5000,
      headers: config.headers || {},
    };
  }

  async export(metrics: Metric[]): Promise<void> {
    if (!this.config.gatewayUrl) {
      throw new Error('Prometheus gateway URL is required');
    }

    const prometheusFormat = this.formatMetrics(metrics);
    const url = `${this.config.gatewayUrl}/metrics/job/${this.config.jobName}/instance/${this.config.instance}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': this.contentType,
          ...this.config.headers,
        },
        body: prometheusFormat,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Prometheus push failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to export metrics to Prometheus:', error);
      throw error;
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
}

// ==================== OpenTelemetry Exporter ====================

export class OpenTelemetryExporter implements MetricsExporter {
  public readonly name = 'opentelemetry';
  public readonly contentType = 'application/json';

  private config: Required<OpenTelemetryConfig>;

  constructor(config: OpenTelemetryConfig) {
    this.config = {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion || '1.0.0',
      endpoint: config.endpoint || 'http://localhost:4318/v1/metrics',
      headers: config.headers || {},
      resourceAttributes: config.resourceAttributes || {},
    };
  }

  async export(metrics: Metric[]): Promise<void> {
    const otlpFormat = this.formatMetrics(metrics);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': this.contentType,
          ...this.config.headers,
        },
        body: JSON.stringify(otlpFormat),
      });

      if (!response.ok) {
        throw new Error(`OpenTelemetry export failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to export metrics to OpenTelemetry:', error);
      throw error;
    }
  }

  private formatMetrics(metrics: Metric[]): any {
    const resourceMetrics = {
      resource: {
        attributes: Object.entries(this.config.resourceAttributes).map(([key, value]) => ({
          key,
          value: { stringValue: value },
        })),
      },
      scopeMetrics: [{
        scope: {
          name: this.config.serviceName,
          version: this.config.serviceVersion,
        },
        metrics: metrics.map(metric => this.convertMetric(metric)),
        schemaUrl: 'https://opentelemetry.io/schemas/1.21.0',
      }],
    };

    return {
      resourceMetrics: [resourceMetrics],
    };
  }

  private convertMetric(metric: Metric): any {
    const baseMetric = {
      name: metric.name,
      description: metric.help,
      unit: '1', // Default unit
    };

    switch (metric.type) {
      case 'counter':
        return {
          ...baseMetric,
          sum: {
            dataPoints: metric.values.map(value => ({
              attributes: this.convertLabels(value.labels),
              startTimeUnixNano: '0',
              timeUnixNano: value.timestamp.getTime() * 1000000,
              value: value.value,
              exemplars: [],
            })),
            aggregationTemporality: 2, // AGGREGATION_TEMPORALITY_CUMULATIVE
            isMonotonic: true,
          },
        };

      case 'gauge':
        return {
          ...baseMetric,
          gauge: {
            dataPoints: metric.values.map(value => ({
              attributes: this.convertLabels(value.labels),
              startTimeUnixNano: '0',
              timeUnixNano: value.timestamp.getTime() * 1000000,
              value: value.value,
              exemplars: [],
            })),
          },
        };

      case 'histogram':
        // Simplified histogram conversion
        return {
          ...baseMetric,
          histogram: {
            dataPoints: metric.values.map(value => ({
              attributes: this.convertLabels(value.labels),
              startTimeUnixNano: '0',
              timeUnixNano: value.timestamp.getTime() * 1000000,
              count: value.value,
              sum: value.value, // Simplified
              bucketCounts: [value.value],
              explicitBounds: [1.0],
              exemplars: [],
            })),
            aggregationTemporality: 2,
          },
        };

      case 'summary':
        // Simplified summary conversion
        return {
          ...baseMetric,
          summary: {
            dataPoints: metric.values.map(value => ({
              attributes: this.convertLabels(value.labels),
              startTimeUnixNano: '0',
              timeUnixNano: value.timestamp.getTime() * 1000000,
              count: value.value,
              sum: value.value, // Simplified
              quantileValues: [], // Would need quantile data
            })),
          },
        };

      default:
        throw new Error(`Unsupported metric type: ${metric.type}`);
    }
  }

  private convertLabels(labels?: Record<string, string>): any[] {
    if (!labels) return [];

    return Object.entries(labels).map(([key, value]) => ({
      key,
      value: { stringValue: value },
    }));
  }
}

// ==================== Console Exporter ====================

export class ConsoleExporter implements MetricsExporter {
  public readonly name = 'console';
  public readonly contentType = 'text/plain';

  export(metrics: Metric[]): void {
    console.log('=== Metrics Export ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Metrics Count: ${metrics.length}`);
    console.log('');

    for (const metric of metrics) {
      console.log(`# ${metric.name} (${metric.type})`);
      console.log(`# ${metric.help}`);

      for (const value of metric.values) {
        const labels = value.labels && Object.keys(value.labels).length > 0
          ? `{${Object.entries(value.labels).map(([k, v]) => `${k}="${v}"`).join(', ')}}`
          : '';
        console.log(`${metric.name}${labels} ${value.value} ${value.timestamp.toISOString()}`);
      }

      console.log('');
    }
  }
}

// ==================== JSON Exporter ====================

export class JSONExporter implements MetricsExporter {
  public readonly name = 'json';
  public readonly contentType = 'application/json';

  export(metrics: Metric[]): void {
    const output = {
      timestamp: new Date().toISOString(),
      metrics: metrics.map(metric => ({
        name: metric.name,
        type: metric.type,
        help: metric.help,
        labels: metric.labels || {},
        values: metric.values.map(value => ({
          value: value.value,
          timestamp: value.timestamp.toISOString(),
          labels: value.labels || {},
        })),
      })),
    };

    console.log(JSON.stringify(output, null, 2));
  }
}

// ==================== Factory Functions ====================

export function createPrometheusExporter(config?: PrometheusConfig): PrometheusExporter {
  return new PrometheusExporter(config);
}

export function createOpenTelemetryExporter(config: OpenTelemetryConfig): OpenTelemetryExporter {
  return new OpenTelemetryExporter(config);
}

export function createConsoleExporter(): ConsoleExporter {
  return new ConsoleExporter();
}

export function createJSONExporter(): JSONExporter {
  return new JSONExporter();
}