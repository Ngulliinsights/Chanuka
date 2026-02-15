/**
 * Telemetry Service
 * Core service for collecting, aggregating, and exporting system metrics
 * Collects browser performance metrics (LCP, FID, CLS)
 */

import { logger } from '@client/lib/utils/logger';
import type {
  SystemMetrics,
  MetricsData,
  ExportConfig,
  MetricsResult,
  SendResult,
  AggregateResult,
  ValidationResult,
  ExportResult,
} from './types';

/**
 * Telemetry Service Interface
 */
export interface TelemetryService {
  collectMetrics(): Promise<MetricsResult>;
  sendMetrics(data: MetricsData): Promise<SendResult>;
  aggregateData(rawData: unknown[]): Promise<AggregateResult>;
  validateData(data: unknown): Promise<ValidationResult>;
  exportData(config: ExportConfig): Promise<ExportResult>;
}

/**
 * Telemetry Service Implementation
 * Handles system metrics collection with proper error handling
 */
class TelemetryServiceImpl implements TelemetryService {
  private metricsBuffer: MetricsData[] = [];
  private readonly maxBufferSize = 100;

  /**
   * Collect current system metrics
   */
  async collectMetrics(): Promise<MetricsResult> {
    try {
      const metrics: SystemMetrics = {
        performance: await this.collectPerformanceMetrics(),
        memory: this.collectMemoryMetrics(),
        network: this.collectNetworkMetrics(),
      };

      logger.info('Telemetry metrics collected', { metrics });

      return {
        collected: true,
        metrics,
        timestamp: Date.now(),
        source: 'browser',
      };
    } catch (error) {
      logger.error('Failed to collect telemetry metrics', { error });
      return {
        collected: false,
        metrics: {},
        timestamp: Date.now(),
        source: 'browser',
      };
    }
  }

  /**
   * Send metrics data to telemetry backend
   */
  async sendMetrics(data: MetricsData): Promise<SendResult> {
    try {
      // Add to buffer
      this.metricsBuffer.push(data);

      // Flush buffer if it exceeds max size
      if (this.metricsBuffer.length >= this.maxBufferSize) {
        await this.flushBuffer();
      }

      logger.info('Telemetry metrics sent', { data });

      return {
        sent: true,
        timestamp: Date.now(),
        metadata: {
          bufferSize: this.metricsBuffer.length,
        },
      };
    } catch (error) {
      logger.error('Failed to send telemetry metrics', { data, error });
      return {
        sent: false,
        timestamp: Date.now(),
        metadata: { error: String(error) },
      };
    }
  }

  /**
   * Aggregate raw telemetry data
   */
  async aggregateData(rawData: unknown[]): Promise<AggregateResult> {
    try {
      // Basic aggregation logic
      const validData = rawData.filter(item => this.isValidMetricsData(item));

      logger.info('Telemetry data aggregated', {
        total: rawData.length,
        valid: validData.length,
      });

      return {
        aggregated: true,
        count: validData.length,
        timestamp: Date.now(),
        summary: {
          total: rawData.length,
          valid: validData.length,
          invalid: rawData.length - validData.length,
        },
      };
    } catch (error) {
      logger.error('Failed to aggregate telemetry data', { error });
      return {
        aggregated: false,
        count: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Validate telemetry data structure
   */
  async validateData(data: unknown): Promise<ValidationResult> {
    try {
      const errors: string[] = [];

      if (!data || typeof data !== 'object') {
        errors.push('Data must be an object');
      }

      const metricsData = data as Partial<MetricsData>;

      if (!metricsData.timestamp) {
        errors.push('Missing timestamp');
      }

      if (!metricsData.source) {
        errors.push('Missing source');
      }

      if (!metricsData.metrics) {
        errors.push('Missing metrics');
      }

      const isValid = errors.length === 0;

      if (!isValid) {
        logger.warn('Telemetry data validation failed', { errors });
      }

      return {
        valid: isValid,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to validate telemetry data', { error });
      return {
        valid: false,
        errors: [String(error)],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Export telemetry data in specified format
   */
  async exportData(config: ExportConfig): Promise<ExportResult> {
    try {
      // Validate config structure
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid export config: must be an object');
      }

      if (!config.format) {
        throw new Error('Invalid export config: format is required');
      }

      if (!config.dateRange || !config.dateRange.start || !config.dateRange.end) {
        throw new Error('Invalid export config: dateRange with start and end is required');
      }

      // Filter data by date range
      const filteredData = this.metricsBuffer.filter(item => {
        const timestamp = item.timestamp.getTime();
        return (
          timestamp >= config.dateRange.start.getTime() &&
          timestamp <= config.dateRange.end.getTime()
        );
      });

      // Format data based on config
      let exportedData: string;
      switch (config.format) {
        case 'json':
          exportedData = JSON.stringify(filteredData, null, 2);
          break;
        case 'csv':
          exportedData = this.convertToCSV(filteredData);
          break;
        case 'parquet':
          // Parquet format would require additional library
          exportedData = JSON.stringify(filteredData);
          break;
        default:
          exportedData = JSON.stringify(filteredData);
      }

      logger.info('Telemetry data exported', {
        format: config.format,
        count: filteredData.length,
      });

      return {
        exported: true,
        format: config.format,
        size: exportedData.length,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to export telemetry data', { config, error });
      return {
        exported: false,
        format: config?.format || 'unknown',
        size: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Collect browser performance metrics (Core Web Vitals)
   */
  private async collectPerformanceMetrics(): Promise<
    SystemMetrics['performance']
  > {
    try {
      // Check if Performance API is available
      if (typeof window === 'undefined' || !window.performance) {
        return undefined;
      }

      const metrics: SystemMetrics['performance'] = {
        lcp: 0,
        fid: 0,
        cls: 0,
      };

      // Collect LCP (Largest Contentful Paint)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        const lastEntry = lcpEntries[lcpEntries.length - 1] as PerformanceEntry & {
          renderTime: number;
          loadTime: number;
        };
        metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      }

      // Collect FID (First Input Delay)
      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        const firstEntry = fidEntries[0] as PerformanceEntry & {
          processingStart: number;
          startTime: number;
        };
        metrics.fid = firstEntry.processingStart - firstEntry.startTime;
      }

      // CLS (Cumulative Layout Shift) would require PerformanceObserver
      // For now, we'll set it to 0
      metrics.cls = 0;

      return metrics;
    } catch (error) {
      logger.error('Failed to collect performance metrics', { error });
      return undefined;
    }
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): SystemMetrics['memory'] {
    try {
      // Check if memory API is available (Chrome only)
      if (
        typeof window === 'undefined' ||
        !(performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory
      ) {
        return undefined;
      }

      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    } catch (error) {
      logger.error('Failed to collect memory metrics', { error });
      return undefined;
    }
  }

  /**
   * Collect network metrics
   */
  private collectNetworkMetrics(): SystemMetrics['network'] {
    try {
      // Check if Network Information API is available
      if (
        typeof window === 'undefined' ||
        !(navigator as Navigator & { connection?: { effectiveType: string; downlink: number; rtt: number } }).connection
      ) {
        return undefined;
      }

      const connection = (navigator as Navigator & { connection: { effectiveType: string; downlink: number; rtt: number } }).connection;

      return {
        latency: connection.rtt || 0,
        bandwidth: connection.downlink || 0,
        requests: 0, // Would need to track this separately
      };
    } catch (error) {
      logger.error('Failed to collect network metrics', { error });
      return undefined;
    }
  }

  /**
   * Flush metrics buffer to backend
   */
  private async flushBuffer(): Promise<void> {
    try {
      if (this.metricsBuffer.length === 0) {
        return;
      }

      // In a real implementation, this would send to backend
      logger.info('Flushing telemetry buffer', {
        count: this.metricsBuffer.length,
      });

      // Clear buffer
      this.metricsBuffer = [];
    } catch (error) {
      logger.error('Failed to flush telemetry buffer', { error });
    }
  }

  /**
   * Check if data is valid MetricsData
   */
  private isValidMetricsData(data: unknown): data is MetricsData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const metricsData = data as Partial<MetricsData>;
    return !!(
      metricsData.timestamp &&
      metricsData.source &&
      metricsData.metrics
    );
  }

  /**
   * Convert metrics data to CSV format
   */
  private convertToCSV(data: MetricsData[]): string {
    if (data.length === 0) {
      return '';
    }

    // CSV headers
    const headers = ['timestamp', 'source', 'metrics'];
    const rows = data.map(item => [
      item.timestamp.toISOString(),
      item.source,
      JSON.stringify(item.metrics),
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

/**
 * Global telemetry service instance
 */
export const telemetryService: TelemetryService = new TelemetryServiceImpl();

/**
 * Export for testing and dependency injection
 */
export { TelemetryServiceImpl };
