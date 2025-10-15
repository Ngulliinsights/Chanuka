// core/src/health/__tests__/setup.ts

/**
 * Test setup and configuration for health monitoring system tests.
 * This file provides common utilities, mocks, and configuration
 * that can be reused across different test files.
 */

import { jest } from '@jest/globals';
import { logger } from '../utils/logger';

// Global test setup
export const setupHealthTests = () => {
  // Mock environment variables for consistent testing
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      npm_package_version: '1.0.0-test'
    };
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  // Global error handler for unhandled promises in tests
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { component: 'Chanuka' }, promise, 'reason:', reason);
  });
};

// Test data generators
export const createMockHealthResult = (overrides = {}) => ({
  status: 'healthy' as const,
  latencyMs: 10,
  timestamp: new Date().toISOString(),
  ...overrides
});

export const createMockOverallHealth = (overrides = {}) => ({
  status: 'healthy' as const,
  uptime: 60000,
  environment: 'test',
  version: '1.0.0-test',
  timestamp: new Date().toISOString(),
  checks: {},
  summary: {
    total: 0,
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    critical_failures: 0
  },
  ...overrides
});

// Performance testing utilities
export class PerformanceTimer {
  private startTime: number = 0;
  private measurements: number[] = [];

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    const duration = Date.now() - this.startTime;
    this.measurements.push(duration);
    return duration;
  }

  getAverage(): number {
    return this.measurements.reduce((sum, val) => sum + val, 0) / this.measurements.length;
  }

  getMin(): number {
    return Math.min(...this.measurements);
  }

  getMax(): number {
    return Math.max(...this.measurements);
  }

  reset(): void {
    this.measurements = [];
  }
}

// Load testing utility
export class LoadTester {
  private results: Array<{ duration: number; success: boolean; error?: string }> = [];

  async runLoad(
    testFunction: () => Promise<any>,
    options: {
      concurrency: number;
      duration: number;
      rampUp?: number;
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    requestsPerSecond: number;
    errors: string[];
  }> {
    const { concurrency, duration, rampUp = 0 } = options;
    const startTime = Date.now();
    const endTime = startTime + duration;
    const workers: Promise<void>[] = [];

    // Create workers with ramp-up
    for (let i = 0; i < concurrency; i++) {
      const delay = rampUp > 0 ? (i * rampUp / concurrency) : 0;
      workers.push(this.createWorker(testFunction, endTime, delay));
    }

    await Promise.all(workers);

    return this.calculateResults(duration);
  }

  private async createWorker(
    testFunction: () => Promise<any>,
    endTime: number,
    initialDelay: number
  ): Promise<void> {
    if (initialDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, initialDelay));
    }

    while (Date.now() < endTime) {
      const start = Date.now();
      try {
        await testFunction();
        this.results.push({
          duration: Date.now() - start,
          success: true
        });
      } catch (error: any) {
        this.results.push({
          duration: Date.now() - start,
          success: false,
          error: error.message
        });
      }
    }
  }

  private calculateResults(testDuration: number) {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const latencies = successful.map(r => r.duration);

    return {
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageLatency: latencies.length > 0 ? 
        latencies.reduce((sum, val) => sum + val, 0) / latencies.length : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      requestsPerSecond: (successful.length / testDuration) * 1000,
      errors: [...new Set(failed.map(r => r.error).filter(Boolean))]
    };
  }

  reset(): void {
    this.results = [];
  }
}

// Mock factory for creating realistic test doubles
export class HealthCheckMockFactory {
  static createRedisCluster(nodeCount: number = 3) {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      options: { host: `redis-${i + 1}`, port: 6379 },
      status: 'ready',
      ping: jest.fn().mockResolvedValue('PONG')
    }));

    return {
      ping: jest.fn().mockResolvedValue('PONG'),
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockImplementation((key: string) => 
        Promise.resolve(key === 'health:ping' ? 'ping' : null)
      ),
      info: jest.fn().mockImplementation((section: string) => {
        if (section === 'memory') {
          return Promise.resolve('used_memory:1048576\nused_memory_human:1.00M');
        }
        return Promise.resolve('');
      }),
      nodes: jest.fn().mockReturnValue(nodes),
      // Control methods
      setNodeFailure: (nodeIndex: number, shouldFail: boolean) => {
        if (nodes[nodeIndex]) {
          nodes[nodeIndex].ping = shouldFail 
            ? jest.fn().mockRejectedValue(new Error('Node failed'))
            : jest.fn().mockResolvedValue('PONG');
          nodes[nodeIndex].status = shouldFail ? 'disconnected' : 'ready';
        }
      }
    };
  }

  static createDatabaseConnection(initialPoolSize: number = 10) {
    let poolStatus = {
      total: initialPoolSize,
      available: Math.floor(initialPoolSize * 0.8),
      waiting: 0,
      active: Math.floor(initialPoolSize * 0.2)
    };

    return {
      query: jest.fn().mockResolvedValue([{ result: 1 }]),
      getPoolStatus: jest.fn().mockImplementation(() => ({ ...poolStatus })),
      // Control methods
      setPoolStatus: (newStatus: Partial<typeof poolStatus>) => {
        poolStatus = { ...poolStatus, ...newStatus };
      }
    };
  }

  static createExternalService(serviceName: string, baseLatency: number = 50) {
    let isHealthy = true;
    let currentLatency = baseLatency;
    let errorRate = 0; // 0-1 representing percentage of requests that should fail

    return {
      healthCheck: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, currentLatency));
        
        if (!isHealthy || Math.random() < errorRate) {
          throw new Error(`${serviceName} service unavailable`);
        }
        
        return {
          status: 'healthy',
          latencyMs: currentLatency,
          timestamp: new Date().toISOString()
        };
      }),
      // Control methods
      setHealthy: (healthy: boolean) => { isHealthy = healthy; },
      setLatency: (latency: number) => { currentLatency = latency; },
      setErrorRate: (rate: number) => { errorRate = Math.max(0, Math.min(1, rate)); }
    };
  }
}

// Assertion helpers for health check results
export const healthAssertions = {
  expectHealthyResult: (result: any) => {
    expect(result.status).toBe('healthy');
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.error).toBeUndefined();
  },

  expectUnhealthyResult: (result: any, expectedError?: string) => {
    expect(result.status).toBe('unhealthy');
    expect(typeof result.latencyMs).toBe('number');
    expect(result.error).toBeDefined();
    if (expectedError) {
      expect(result.error).toContain(expectedError);
    }
  },

  expectDegradedResult: (result: any, expectedWarnings?: string[]) => {
    expect(result.status).toBe('degraded');
    expect(typeof result.latencyMs).toBe('number');
    if (expectedWarnings) {
      expect(result.warnings).toEqual(expect.arrayContaining(expectedWarnings));
    }
  },

  expectOverallHealth: (health: any, expectedStatus: string, expectedChecks: number) => {
    expect(health.status).toBe(expectedStatus);
    expect(health.summary.total).toBe(expectedChecks);
    expect(typeof health.uptime).toBe('number');
    expect(health.uptime).toBeGreaterThan(0);
    expect(health.environment).toBeDefined();
    expect(health.version).toBeDefined();
    expect(health.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  }
};

// Scenario builders for complex test cases
export class TestScenarioBuilder {
  private checks: any[] = [];
  private checkerConfig: any = {};
  private endpointConfig: any = {};

  addRedisCheck(config: any = {}) {
    this.checks.push({
      type: 'redis',
      config,
      mock: HealthCheckMockFactory.createRedisCluster()
    });
    return this;
  }

  addDatabaseCheck(config: any = {}) {
    this.checks.push({
      type: 'database',
      config,
      mock: HealthCheckMockFactory.createDatabaseConnection()
    });
    return this;
  }

  addMemoryCheck(config: any = {}) {
    this.checks.push({
      type: 'memory',
      config
    });
    return this;
  }

  addCustomCheck(name: string, checkFn: () => Promise<any>, options: any = {}) {
    this.checks.push({
      type: 'custom',
      name,
      checkFn,
      options
    });
    return this;
  }

  withCheckerConfig(config: any) {
    this.checkerConfig = { ...this.checkerConfig, ...config };
    return this;
  }

  withEndpointConfig(config: any) {
    this.endpointConfig = { ...this.endpointConfig, ...config };
    return this;
  }

  build() {
    return {
      checks: this.checks,
      checkerConfig: this.checkerConfig,
      endpointConfig: this.endpointConfig
    };
  }
}

// Network simulation utilities for testing distributed scenarios
export class NetworkSimulator {
  private latencyMs: number = 0;
  private packetLoss: number = 0;
  private isPartitioned: boolean = false;

  setLatency(ms: number) {
    this.latencyMs = ms;
  }

  setPacketLoss(rate: number) {
    this.packetLoss = Math.max(0, Math.min(1, rate));
  }

  setNetworkPartition(partitioned: boolean) {
    this.isPartitioned = partitioned;
  }

  async simulateNetworkCall<T>(fn: () => Promise<T>): Promise<T> {
    // Simulate network partition
    if (this.isPartitioned) {
      throw new Error('Network partition - connection timeout');
    }

    // Simulate packet loss
    if (Math.random() < this.packetLoss) {
      throw new Error('Network packet lost');
    }

    // Simulate latency
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }

    return fn();
  }

  reset() {
    this.latencyMs = 0;
    this.packetLoss = 0;
    this.isPartitioned = false;
  }
}

// Resource monitoring for memory and CPU usage during tests
export class ResourceMonitor {
  private measurements: Array<{
    timestamp: number;
    memory: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  }> = [];
  
  private monitoring = false;
  private intervalId?: NodeJS.Timeout;

  start(intervalMs: number = 100) {
    if (this.monitoring) return;

    this.monitoring = true;
    let lastCpuUsage = process.cpuUsage();

    this.intervalId = setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      
      this.measurements.push({
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpuUsage: currentCpuUsage
      });

      lastCpuUsage = process.cpuUsage();
    }, intervalMs);
  }

  stop() {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  getReport() {
    const memoryUsages = this.measurements.map(m => m.memory.rss);
    const heapUsages = this.measurements.map(m => m.memory.heapUsed);

    return {
      duration: this.measurements.length > 0 ? 
        this.measurements[this.measurements.length - 1].timestamp - this.measurements[0].timestamp : 0,
      samples: this.measurements.length,
      memory: {
        peak: Math.max(...memoryUsages),
        average: memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length,
        final: memoryUsages[memoryUsages.length - 1] || 0
      },
      heap: {
        peak: Math.max(...heapUsages),
        average: heapUsages.reduce((sum, val) => sum + val, 0) / heapUsages.length,
        final: heapUsages[heapUsages.length - 1] || 0
      }
    };
  }

  reset() {
    this.stop();
    this.measurements = [];
  }
}

// Test data generators for realistic scenarios
export const generateTestData = {
  // Generate realistic database connection pool scenarios
  databasePoolScenarios: () => [
    { name: 'healthy', available: 8, waiting: 0, active: 2, total: 10 },
    { name: 'busy', available: 2, waiting: 3, active: 8, total: 10 },
    { name: 'exhausted', available: 0, waiting: 10, active: 10, total: 10 },
    { name: 'overloaded', available: 1, waiting: 15, active: 9, total: 10 }
  ],

  // Generate memory usage scenarios
  memoryScenarios: () => [
    { 
      name: 'low_usage',
      rss: 100 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024,
      expected: 'healthy'
    },
    {
      name: 'moderate_usage', 
      rss: 300 * 1024 * 1024,
      heapUsed: 200 * 1024 * 1024,
      expected: 'degraded'
    },
    {
      name: 'high_usage',
      rss: 600 * 1024 * 1024, 
      heapUsed: 400 * 1024 * 1024,
      expected: 'unhealthy'
    }
  ],

  // Generate latency scenarios for different services
  latencyScenarios: () => [
    { service: 'redis', healthy: 10, degraded: 100, unhealthy: 1000 },
    { service: 'database', healthy: 50, degraded: 500, unhealthy: 5000 },
    { service: 'external_api', healthy: 100, degraded: 2000, unhealthy: 10000 }
  ]
};

// Chaos engineering utilities for testing resilience
export class ChaosEngineer {
  private scenarios: Array<{
    name: string;
    probability: number;
    effect: () => Promise<void>;
    cleanup?: () => Promise<void>;
  }> = [];

  addScenario(
    name: string, 
    probability: number, 
    effect: () => Promise<void>,
    cleanup?: () => Promise<void>
  ) {
    this.scenarios.push({ name, probability, effect, cleanup });
    return this;
  }

  async maybeInjectChaos(): Promise<string[]> {
    const triggeredScenarios: string[] = [];

    for (const scenario of this.scenarios) {
      if (Math.random() < scenario.probability) {
        await scenario.effect();
        triggeredScenarios.push(scenario.name);
      }
    }

    return triggeredScenarios;
  }

  async cleanup() {
    for (const scenario of this.scenarios) {
      if (scenario.cleanup) {
        await scenario.cleanup();
      }
    }
  }

  // Pre-built chaos scenarios
  static networkChaos() {
    return new ChaosEngineer()
      .addScenario('high_latency', 0.1, async () => {
        // Simulate high network latency
      })
      .addScenario('packet_loss', 0.05, async () => {
        // Simulate packet loss
      })
      .addScenario('connection_timeout', 0.02, async () => {
        // Simulate connection timeouts
      });
  }

  static resourceChaos() {
    return new ChaosEngineer()
      .addScenario('memory_spike', 0.1, async () => {
        // Simulate memory spike
        const bigBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
        await new Promise(resolve => setTimeout(resolve, 1000));
      })
      .addScenario('cpu_spike', 0.05, async () => {
        // Simulate CPU spike
        const start = Date.now();
        while (Date.now() - start < 500) {
          Math.random() * Math.random();
        }
      });
  }

  static serviceChaos() {
    return new ChaosEngineer()
      .addScenario('service_unavailable', 0.1, async () => {
        // Will be implemented by test to make service unavailable
      })
      .addScenario('slow_response', 0.2, async () => {
        // Will be implemented by test to add delays
      });
  }
}

// Test reporting and analysis
export class TestReporter {
  private testResults: Array<{
    testName: string;
    duration: number;
    status: 'passed' | 'failed' | 'skipped';
    metrics?: any;
    error?: string;
  }> = [];

  recordTest(testName: string, result: {
    duration: number;
    status: 'passed' | 'failed' | 'skipped';
    metrics?: any;
    error?: string;
  }) {
    this.testResults.push({ testName, ...result });
  }

  generateReport() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;

    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        successRate: total > 0 ? (passed / total) * 100 : 0,
        totalDuration,
        averageDuration: avgDuration
      },
      failures: this.testResults
        .filter(r => r.status === 'failed')
        .map(r => ({ name: r.testName, error: r.error })),
      slowTests: this.testResults
        .filter(r => r.duration > avgDuration * 2)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
    };
  }

  reset() {
    this.testResults = [];
  }
}

// Export everything for easy importing
export default {
  setupHealthTests,
  createMockHealthResult,
  createMockOverallHealth,
  PerformanceTimer,
  LoadTester,
  HealthCheckMockFactory,
  healthAssertions,
  TestScenarioBuilder,
  NetworkSimulator,
  ResourceMonitor,
  generateTestData,
  ChaosEngineer,
  TestReporter
};






