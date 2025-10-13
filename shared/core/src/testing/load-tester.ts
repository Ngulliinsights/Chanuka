import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

export class LoadTester {
  constructor(private readonly config: LoadTestConfig = {}) {}

  /**
   * Create a comprehensive load test suite
   */
  async createLoadTestSuite(options: LoadTestSuiteOptions): Promise<LoadTestSuite> {
    const startTime = performance.now();
    const results: LoadTestResults[] = [];

    for (const scenario of options.scenarios) {
      const scenarioResult = await this.simulateLoad({
        totalRequests: scenario.requests,
        concurrency: scenario.concurrency,
        requestFn: scenario.requestFn,
        delayBetweenBatches: scenario.delayBetweenBatches
      });

      results.push({
        ...scenarioResult,
        scenarioName: scenario.name,
        description: scenario.description
      });
    }

    const totalTime = performance.now() - startTime;

    return {
      timestamp: new Date(),
      totalDurationMs: totalTime,
      scenarios: results,
      summary: {
        totalScenarios: results.length,
        totalRequests: results.reduce((sum, r) => sum + r.totalRequests, 0),
        totalSuccessful: results.reduce((sum, r) => sum + r.successfulRequests, 0),
        totalFailed: results.reduce((sum, r) => sum + r.failedRequests, 0),
        averageSuccessRate: results.reduce((sum, r) => sum + r.successRate, 0) / results.length,
        averageResponseTime: results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length
      }
    };
  }

  async simulateLoad(options: SimulateLoadOptions): Promise<LoadTestResults> {
    const startTime = performance.now();
    const results: RequestResult[] = [];
    const concurrentBatches = this.createBatches(options.totalRequests, options.concurrency);

    for (const batch of concurrentBatches) {
      const batchResults = await Promise.all(
        batch.map(() => this.executeRequest(options.requestFn))
      );
      results.push(...batchResults);

      if (options.delayBetweenBatches) {
        await this.delay(options.delayBetweenBatches);
      }
    }

    const endTime = performance.now();
    return this.analyzeResults(results, endTime - startTime);
  }

  async injectFailures(options: FailureInjectionOptions): Promise<void> {
    const failurePatterns = this.generateFailurePatterns(options);
    
    for (const pattern of failurePatterns) {
      await this.executeFailurePattern(pattern);
      if (options.delayBetweenFailures) {
        await this.delay(options.delayBetweenFailures);
      }
    }
  }

  private createBatches(total: number, batchSize: number): number[][] {
    const batches: number[][] = [];
    for (let i = 0; i < total; i += batchSize) {
      batches.push(Array(Math.min(batchSize, total - i)).fill(i));
    }
    return batches;
  }

  private async executeRequest(requestFn: () => Promise<any>): Promise<RequestResult> {
    const start = performance.now();
    try {
      await requestFn();
      return {
        success: true,
        duration: performance.now() - start
      };
    } catch (error) {
      return {
        success: false,
        duration: performance.now() - start,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  private generateFailurePatterns(options: FailureInjectionOptions): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    
    if (options.networkLatency) {
      patterns.push({
        type: 'latency',
        duration: options.networkLatency.duration,
        magnitude: options.networkLatency.latencyMs
      });
    }

    if (options.errorRate) {
      patterns.push({
        type: 'error',
        duration: options.errorRate.duration,
        rate: options.errorRate.percentage
      });
    }

    if (options.resourceExhaustion) {
      patterns.push({
        type: 'resource',
        duration: options.resourceExhaustion.duration,
        resource: options.resourceExhaustion.resource,
        percentage: options.resourceExhaustion.percentage
      });
    }

    return patterns;
  }

  private async executeFailurePattern(pattern: FailurePattern): Promise<void> {
    switch (pattern.type) {
      case 'latency':
        // Simulate network latency
        await this.injectNetworkLatency(pattern.magnitude, pattern.duration);
        break;
      case 'error':
        // Simulate error responses
        await this.injectErrors(pattern.rate, pattern.duration);
        break;
      case 'resource':
        // Simulate resource exhaustion
        await this.simulateResourceExhaustion(pattern);
        break;
    }
  }

  private analyzeResults(results: RequestResult[], totalDuration: number): LoadTestResults {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const durations = results.map(r => r.duration);

    return {
      totalRequests: results.length,
      successfulRequests: successCount,
      failedRequests: failureCount,
      totalDurationMs: totalDuration,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / results.length,
      percentiles: {
        p50: this.calculatePercentile(durations, 50),
        p90: this.calculatePercentile(durations, 90),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99)
      },
      successRate: (successCount / results.length) * 100,
      requestsPerSecond: (results.length / totalDuration) * 1000
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async injectNetworkLatency(latencyMs: number, durationMs: number): Promise<void> {
    const endTime = Date.now() + durationMs;
    while (Date.now() < endTime) {
      await this.delay(latencyMs);
    }
  }

  private async injectErrors(errorRate: number, durationMs: number): Promise<void> {
    const endTime = Date.now() + durationMs;
    while (Date.now() < endTime) {
      if (Math.random() < errorRate) {
        throw new Error('Injected failure');
      }
      await this.delay(100);
    }
  }

  private async simulateResourceExhaustion(pattern: ResourceFailurePattern): Promise<void> {
    const endTime = Date.now() + pattern.duration;
    while (Date.now() < endTime) {
      switch (pattern.resource) {
        case 'memory':
          this.exhaustMemory(pattern.percentage);
          break;
        case 'cpu':
          this.exhaustCPU(pattern.percentage);
          break;
        case 'connections':
          await this.exhaustConnections(pattern.percentage);
          break;
      }
      await this.delay(1000);
    }
  }

  private exhaustMemory(percentage: number): void {
    const targetBytes = Math.floor((process.memoryUsage().heapTotal * percentage) / 100);
    const arr: any[] = [];
    while (process.memoryUsage().heapUsed < targetBytes) {
      arr.push(new Array(1000000));
    }
  }

  private exhaustCPU(percentage: number): void {
    const startTime = Date.now();
    const duration = 1000; // 1 second
    const targetUsage = percentage / 100;

    while (Date.now() - startTime < duration) {
      if (Math.random() < targetUsage) {
        // Busy loop
        for (let i = 0; i < 1000000; i++) {
          Math.random();
        }
      } else {
        // Sleep
        this.delay(10);
      }
    }
  }

  private async exhaustConnections(percentage: number): Promise<void> {
    // Simulate connection exhaustion by creating many pending promises
    const connections: Promise<void>[] = [];
    const maxConnections = 1000;
    const targetConnections = Math.floor((maxConnections * percentage) / 100);

    for (let i = 0; i < targetConnections; i++) {
      connections.push(new Promise(resolve => setTimeout(resolve, 10000)));
    }

    await Promise.all(connections);
  }
}

interface LoadTestConfig {
  maxConcurrency?: number;
  maxDuration?: number;
  failureThreshold?: number;
}

interface SimulateLoadOptions {
  totalRequests: number;
  concurrency: number;
  requestFn: () => Promise<any>;
  delayBetweenBatches?: number;
}

interface RequestResult {
  success: boolean;
  duration: number;
  error?: Error;
}

interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDurationMs: number;
  averageResponseTime: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  successRate: number;
  requestsPerSecond: number;
}

interface FailureInjectionOptions {
  networkLatency?: {
    latencyMs: number;
    duration: number;
  };
  errorRate?: {
    percentage: number;
    duration: number;
  };
  resourceExhaustion?: {
    resource: 'memory' | 'cpu' | 'connections';
    percentage: number;
    duration: number;
  };
  delayBetweenFailures?: number;
}

type FailurePattern = NetworkLatencyPattern | ErrorPattern | ResourceFailurePattern;

interface NetworkLatencyPattern {
  type: 'latency';
  duration: number;
  magnitude: number;
}

interface ErrorPattern {
  type: 'error';
  duration: number;
  rate: number;
}

interface ResourceFailurePattern {
  type: 'resource';
  duration: number;
  resource: 'memory' | 'cpu' | 'connections';
  percentage: number;
}

// Additional interfaces for load test suite
export interface LoadTestScenario {
  name: string;
  description?: string;
  requests: number;
  concurrency: number;
  requestFn: () => Promise<any>;
  delayBetweenBatches?: number;
}

export interface LoadTestSuiteOptions {
  scenarios: LoadTestScenario[];
}

export interface LoadTestSuite {
  timestamp: Date;
  totalDurationMs: number;
  scenarios: (LoadTestResults & { scenarioName: string; description?: string })[];
  summary: {
    totalScenarios: number;
    totalRequests: number;
    totalSuccessful: number;
    totalFailed: number;
    averageSuccessRate: number;
    averageResponseTime: number;
  };
}







