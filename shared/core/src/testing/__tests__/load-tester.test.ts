/**
 * Load Tester Tests
 * 
 * Comprehensive tests for load testing utilities, performance benchmarks,
 * and stress testing capabilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { LoadTester } from '../load-tester';
import { logger } from '@shared/core/src/observability/logging';

describe('LoadTester', () => {
  let loadTester: LoadTester;

  beforeEach(() => {
    loadTester = new LoadTester({
      maxConcurrency: 10,
      defaultTimeout: 5000,
      enableMetrics: true,
      enableReporting: true,
    });
  });

  afterEach(() => {
    loadTester?.destroy();
  });

  describe('Basic Load Testing', () => {
    it('should run simple load test', async () => {
      const testFunction = vi.fn().mockResolvedValue('success');

      const result = await loadTester.run({
        name: 'simple-test',
        testFunction,
        concurrency: 5,
        iterations: 10,
        duration: undefined,
      });

      expect(result.totalRequests).toBe(10);
      expect(result.successfulRequests).toBe(10);
      expect(result.failedRequests).toBe(0);
      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(testFunction).toHaveBeenCalledTimes(10);
    });

    it('should run duration-based load test', async () => {
      const testFunction = vi.fn().mockResolvedValue('success');

      const result = await loadTester.run({
        name: 'duration-test',
        testFunction,
        concurrency: 3,
        iterations: undefined,
        duration: 1000, // 1 second
      });

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.successfulRequests).toBe(result.totalRequests);
      expect(result.failedRequests).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(1000);
    });

    it('should handle test function failures', async () => {
      const testFunction = vi.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValue('success');

      const result = await loadTester.run({
        name: 'failure-test',
        testFunction,
        concurrency: 1,
        iterations: 5,
        duration: undefined,
      });

      expect(result.totalRequests).toBe(5);
      expect(result.successfulRequests).toBe(3);
      expect(result.failedRequests).toBe(2);
      expect(result.errorRate).toBe(0.4);
    });

    it('should respect concurrency limits', async () => {
      let activeCalls = 0;
      let maxConcurrentCalls = 0;

      const testFunction = vi.fn().mockImplementation(async () => {
        activeCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCalls);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        activeCalls--;
        return 'success';
      });












































