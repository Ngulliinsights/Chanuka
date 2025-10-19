export class MigrationMetrics {
  private readonly metrics: Map<string, Record<string, number>>;
  private readonly adapterName: string;

  constructor(adapterName: string) {
    this.adapterName = adapterName;
    this.metrics = new Map();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('successes', {});
    this.metrics.set('failures', {});
    this.metrics.set('durations', {});
    this.metrics.set('mismatches', {});
    this.metrics.set('legacyFailures', {});
    this.metrics.set('newFailures', {});
  }

  recordOperationSuccess(operation: string, duration: number): void {
    this.incrementMetric('successes', operation);
    this.recordDuration(operation, duration);
  }

  recordOperationFailure(operation: string): void {
    this.incrementMetric('failures', operation);
  }

  recordResultMismatch(operation: string): void {
    this.incrementMetric('mismatches', operation);
  }

  recordLegacySystemFailure(operation: string): void {
    this.incrementMetric('legacyFailures', operation);
  }

  recordNewSystemFailure(operation: string): void {
    this.incrementMetric('newFailures', operation);
  }

  private incrementMetric(metricType: string, operation: string): void {
    const metrics = this.metrics.get(metricType);
    if (metrics) {
      metrics[operation] = (metrics[operation] || 0) + 1;
    }
  }

  private recordDuration(operation: string, duration: number): void {
    const durations = this.metrics.get('durations');
    if (durations) {
      if (!durations[operation]) {
        durations[operation] = duration;
      } else {
        // Calculate running average
        durations[operation] = (durations[operation] + duration) / 2;
      }
    }
  }

  getMetrics(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    this.metrics.forEach((value, key) => {
      result[key] = { ...value };
    });
    return result;
  }

  getMetricsForOperation(operation: string): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((metrics, metricType) => {
      if (metrics[operation] !== undefined) {
        result[metricType] = metrics[operation];
      }
    });
    return result;
  }

  reset(): void {
    this.initializeMetrics();
  }
}












































