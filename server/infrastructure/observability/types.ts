import { Logger } from './logger';

export interface ObservabilityStack {
  getLogger(context?: string): Logger;
  getMetrics(): MetricsProvider;
}

export interface MetricsProvider {
  counter(name: string, value: number, tags?: Record<string, string | number>): void;
  histogram(name: string, value: number, tags?: Record<string, string | number>): void;
}
