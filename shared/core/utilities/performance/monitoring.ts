/**
 * Unified Performance Monitoring
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceTimer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class UnifiedPerformanceMonitor {
  private static timers = new Map<string, PerformanceTimer>();
  private static metrics: PerformanceMetric[] = [];

  static startTimer(name: string): PerformanceTimer {
    const timer: PerformanceTimer = {
      name,
      startTime: this.now()
    };
    
    this.timers.set(name, timer);
    return timer;
  }

  static endTimer(name: string): PerformanceTimer | null {
    const timer = this.timers.get(name);
    if (!timer) return null;

    timer.endTime = this.now();
    timer.duration = timer.endTime - timer.startTime;
    
    this.recordMetric({
      name: `timer.${name}`,
      value: timer.duration,
      unit: 'ms',
      timestamp: new Date()
    });

    this.timers.delete(name);
    return timer;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  private static now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    } else if (typeof process !== 'undefined' && process.hrtime) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    } else {
      return Date.now();
    }
  }
}

// Legacy compatibility
export const PerformanceUtils = UnifiedPerformanceMonitor;
export const startTimer = UnifiedPerformanceMonitor.startTimer.bind(UnifiedPerformanceMonitor);
export const endTimer = UnifiedPerformanceMonitor.endTimer.bind(UnifiedPerformanceMonitor);
export const measureAsync = UnifiedPerformanceMonitor.measureAsync.bind(UnifiedPerformanceMonitor);

