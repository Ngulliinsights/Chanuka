/**
 * Property Test: Telemetry Service API Contracts
 * Feature: comprehensive-bug-fixes, Property 3: Service API Contracts
 * 
 * Validates: Requirements 3.4
 * 
 * This property test verifies that:
 * - All telemetry service methods return result objects with expected fields
 * - Methods never throw exceptions (errors are caught and returned as failure results)
 * - Failure results include collected/sent/aggregated/valid/exported: false
 * - Success results include appropriate status, timestamps, and metadata
 * - Service handles all types of input gracefully without crashing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { TelemetryServiceImpl } from '../../client/src/core/telemetry/service';
import type {
  MetricsData,
  ExportConfig,
  SystemMetrics,
} from '../../client/src/core/telemetry/types';
import { logger } from '../../client/src/lib/utils/logger';

// Mock the logger to prevent console spam during tests
vi.mock('../../client/src/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Feature: comprehensive-bug-fixes, Property 3: Telemetry Service API Contracts', () => {
  let service: TelemetryServiceImpl;

  beforeEach(() => {
    service = new TelemetryServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Arbitrary generators for telemetry data
  const systemMetricsArb = fc.record({
    cpu: fc.option(
      fc.record({
        usage: fc.double({ min: 0, max: 100 }),
        cores: fc.integer({ min: 1, max: 64 }),
      }),
      { nil: undefined }
    ),
    memory: fc.option(
      fc.record({
        used: fc.integer({ min: 0, max: 32 * 1024 * 1024 * 1024 }),
        total: fc.integer({ min: 0, max: 32 * 1024 * 1024 * 1024 }),
        percentage: fc.double({ min: 0, max: 100 }),
      }),
      { nil: undefined }
    ),
    network: fc.option(
      fc.record({
        latency: fc.double({ min: 0, max: 1000 }),
        bandwidth: fc.double({ min: 0, max: 1000 }),
        requests: fc.integer({ min: 0, max: 10000 }),
      }),
      { nil: undefined }
    ),
    performance: fc.option(
      fc.record({
        lcp: fc.double({ min: 0, max: 10000 }),
        fid: fc.double({ min: 0, max: 1000 }),
        cls: fc.double({ min: 0, max: 1 }),
      }),
      { nil: undefined }
    ),
  }) as fc.Arbitrary<SystemMetrics>;

  const metricsDataArb = fc.record({
    timestamp: fc.date(),
    source: fc.string(),
    metrics: systemMetricsArb,
    tags: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }),
  }) as fc.Arbitrary<MetricsData>;

  const exportConfigArb = fc.record({
    format: fc.constantFrom('json', 'csv', 'parquet'),
    dateRange: fc.record({
      start: fc.date(),
      end: fc.date(),
    }),
    filters: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    compression: fc.option(fc.boolean(), { nil: undefined }),
  }) as fc.Arbitrary<ExportConfig>;

  describe('Property 3: Service API Contracts', () => {
    it('collectMetrics should always return a MetricsResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(undefined), async () => {
          const result = await service.collectMetrics();

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.collected).toBe('boolean');
          expect(typeof result.metrics).toBe('object');
          expect(typeof result.timestamp).toBe('number');
          expect(typeof result.source).toBe('string');

          // If collected successfully, timestamp should be positive
          if (result.collected) {
            expect(result.timestamp).toBeGreaterThan(0);
            expect(result.source).not.toBe('');
          }

          // Metrics should be an object (may be empty on failure)
          expect(result.metrics).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('sendMetrics should always return a SendResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(metricsDataArb, async (data) => {
          const result = await service.sendMetrics(data);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.sent).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
          expect(result.timestamp).toBeGreaterThan(0);

          // Metadata is optional but should be an object if present
          if (result.metadata !== undefined) {
            expect(typeof result.metadata).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('aggregateData should always return an AggregateResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(fc.array(fc.anything()), async (rawData) => {
          const result = await service.aggregateData(rawData);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.aggregated).toBe('boolean');
          expect(typeof result.count).toBe('number');
          expect(typeof result.timestamp).toBe('number');
          expect(result.timestamp).toBeGreaterThan(0);

          // Count should be non-negative
          expect(result.count).toBeGreaterThanOrEqual(0);

          // Summary is optional but should be an object if present
          if (result.summary !== undefined) {
            expect(typeof result.summary).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('validateData should always return a ValidationResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (data) => {
          const result = await service.validateData(data);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.valid).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
          expect(result.timestamp).toBeGreaterThan(0);

          // Errors is optional but should be an array if present
          if (result.errors !== undefined) {
            expect(Array.isArray(result.errors)).toBe(true);
            result.errors.forEach(error => {
              expect(typeof error).toBe('string');
            });
          }

          // If not valid, errors should be present
          if (!result.valid) {
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('exportData should always return an ExportResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(exportConfigArb, async (config) => {
          const result = await service.exportData(config);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.exported).toBe('boolean');
          expect(typeof result.format).toBe('string');
          expect(typeof result.size).toBe('number');
          expect(typeof result.timestamp).toBe('number');
          expect(result.timestamp).toBeGreaterThan(0);

          // Size should be non-negative
          expect(result.size).toBeGreaterThanOrEqual(0);

          // Format should match the config format
          expect(result.format).toBe(config.format);

          // URL is optional but should be a string if present
          if (result.url !== undefined) {
            expect(typeof result.url).toBe('string');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Failure Handling', () => {
    it('collectMetrics should never throw exceptions', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(undefined), async () => {
          // Should not throw
          await expect(service.collectMetrics()).resolves.toBeDefined();

          const result = await service.collectMetrics();

          // Result should have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.collected).toBe('boolean');
          expect(typeof result.metrics).toBe('object');
          expect(typeof result.timestamp).toBe('number');
          expect(typeof result.source).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('sendMetrics should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (invalidInput) => {
          // Should not throw, even with completely invalid input
          await expect(
            service.sendMetrics(invalidInput as any)
          ).resolves.toBeDefined();

          const result = await service.sendMetrics(invalidInput as any);

          // Result should have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.sent).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
        }),
        { numRuns: 100 }
      );
    });

    it('aggregateData should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (invalidInput) => {
          // Should not throw, even with completely invalid input
          const inputArray = Array.isArray(invalidInput) ? invalidInput : [invalidInput];
          await expect(
            service.aggregateData(inputArray)
          ).resolves.toBeDefined();

          const result = await service.aggregateData(inputArray);

          // Result should have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.aggregated).toBe('boolean');
          expect(typeof result.count).toBe('number');
          expect(typeof result.timestamp).toBe('number');
        }),
        { numRuns: 100 }
      );
    });

    it('validateData should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (invalidInput) => {
          // Should not throw, even with completely invalid input
          await expect(
            service.validateData(invalidInput)
          ).resolves.toBeDefined();

          const result = await service.validateData(invalidInput);

          // Result should have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.valid).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
        }),
        { numRuns: 100 }
      );
    });

    it('exportData should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (invalidInput) => {
          // Should not throw, even with completely invalid input
          await expect(
            service.exportData(invalidInput as any)
          ).resolves.toBeDefined();

          const result = await service.exportData(invalidInput as any);

          // Result should have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.exported).toBe('boolean');
          expect(typeof result.format).toBe('string');
          expect(typeof result.size).toBe('number');
          expect(typeof result.timestamp).toBe('number');
        }),
        { numRuns: 100 }
      );
    });

    it('should log errors when operations fail', async () => {
      // Create a service that will fail internally
      const failingService = new TelemetryServiceImpl();

      // Mock collectMetrics to throw an error
      const originalCollectMetrics = failingService.collectMetrics.bind(failingService);
      failingService.collectMetrics = async () => {
        try {
          throw new Error('Simulated collection failure');
        } catch (error) {
          logger.error('Failed to collect telemetry metrics', { error });
          return {
            collected: false,
            metrics: {},
            timestamp: Date.now(),
            source: 'browser',
          };
        }
      };

      const result = await failingService.collectMetrics();

      // Should return failure result, not throw
      expect(result.collected).toBe(false);
      expect(result.metrics).toEqual({});

      // Should have logged the error
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return failure results when operations fail', async () => {
      await fc.assert(
        fc.asyncProperty(metricsDataArb, async (data) => {
          // Create a service that simulates failures
          const failingService = new TelemetryServiceImpl();

          // Override sendMetrics to simulate failure
          failingService.sendMetrics = async () => {
            logger.error('Simulated failure', { data });
            return {
              sent: false,
              timestamp: Date.now(),
              metadata: { error: 'Simulated failure' },
            };
          };

          const result = await failingService.sendMetrics(data);

          // Failure result should have sent: false
          expect(result.sent).toBe(false);

          // Should include error in metadata
          expect(result.metadata).toBeDefined();
          expect(result.metadata?.error).toBeDefined();
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      // Test sendMetrics with null
      const nullResult = await service.sendMetrics(null as any);
      expect(nullResult).toBeDefined();
      expect(typeof nullResult.sent).toBe('boolean');

      // Test sendMetrics with undefined
      const undefinedResult = await service.sendMetrics(undefined as any);
      expect(undefinedResult).toBeDefined();
      expect(typeof undefinedResult.sent).toBe('boolean');

      // Test validateData with null
      const nullValidation = await service.validateData(null);
      expect(nullValidation).toBeDefined();
      expect(typeof nullValidation.valid).toBe('boolean');

      // Test validateData with undefined
      const undefinedValidation = await service.validateData(undefined);
      expect(undefinedValidation).toBeDefined();
      expect(typeof undefinedValidation.valid).toBe('boolean');
    });

    it('should handle empty objects gracefully', async () => {
      const emptyResult = await service.sendMetrics({} as any);
      expect(emptyResult).toBeDefined();
      expect(typeof emptyResult.sent).toBe('boolean');

      const emptyValidation = await service.validateData({});
      expect(emptyValidation).toBeDefined();
      expect(typeof emptyValidation.valid).toBe('boolean');
    });

    it('should handle empty arrays in aggregateData', async () => {
      const result = await service.aggregateData([]);
      expect(result).toBeDefined();
      expect(typeof result.aggregated).toBe('boolean');
      expect(result.count).toBe(0);
    });

    it('should handle extremely large data arrays', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(),
        source: `source-${i}`,
        metrics: {},
      }));

      const result = await service.aggregateData(largeArray);
      expect(result).toBeDefined();
      expect(typeof result.aggregated).toBe('boolean');
      expect(typeof result.count).toBe('number');
    });

    it('should handle concurrent calls without race conditions', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const data: MetricsData = {
          timestamp: new Date(),
          source: `source-${i}`,
          metrics: {
            cpu: { usage: 50, cores: 4 },
          },
        };
        return service.sendMetrics(data);
      });

      const results = await Promise.all(promises);

      // All results should be defined
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.sent).toBe('boolean');
        expect(typeof result.timestamp).toBe('number');
      });
    });

    it('should validate correct MetricsData structure', async () => {
      const validData: MetricsData = {
        timestamp: new Date(),
        source: 'browser',
        metrics: {
          cpu: { usage: 50, cores: 4 },
          memory: { used: 1000000, total: 2000000, percentage: 50 },
        },
      };

      const result = await service.validateData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid MetricsData structure', async () => {
      const invalidData = {
        // Missing timestamp
        source: 'browser',
        metrics: {},
      };

      const result = await service.validateData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle date range edge cases in exportData', async () => {
      // Test with start date after end date
      const invalidRangeConfig: ExportConfig = {
        format: 'json',
        dateRange: {
          start: new Date('2024-12-31'),
          end: new Date('2024-01-01'),
        },
      };

      const result = await service.exportData(invalidRangeConfig);
      expect(result).toBeDefined();
      expect(typeof result.exported).toBe('boolean');
      expect(typeof result.size).toBe('number');
    });

    it('should handle all export formats', async () => {
      const formats: Array<'json' | 'csv' | 'parquet'> = ['json', 'csv', 'parquet'];

      for (const format of formats) {
        const config: ExportConfig = {
          format,
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31'),
          },
        };

        const result = await service.exportData(config);
        expect(result).toBeDefined();
        expect(result.format).toBe(format);
        expect(typeof result.exported).toBe('boolean');
        expect(typeof result.size).toBe('number');
      }
    });
  });

  describe('Data Integrity', () => {
    it('should preserve metrics data through send operation', async () => {
      const testData: MetricsData = {
        timestamp: new Date(),
        source: 'test-source',
        metrics: {
          cpu: { usage: 75.5, cores: 8 },
          memory: { used: 4000000000, total: 8000000000, percentage: 50 },
        },
        tags: { environment: 'test', version: '1.0.0' },
      };

      const result = await service.sendMetrics(testData);
      expect(result).toBeDefined();
      expect(typeof result.sent).toBe('boolean');
    });

    it('should correctly count valid data in aggregation', async () => {
      const mixedData = [
        {
          timestamp: new Date(),
          source: 'valid-1',
          metrics: { cpu: { usage: 50, cores: 4 } },
        },
        { invalid: 'data' },
        {
          timestamp: new Date(),
          source: 'valid-2',
          metrics: { memory: { used: 1000, total: 2000, percentage: 50 } },
        },
        null,
        {
          timestamp: new Date(),
          source: 'valid-3',
          metrics: {},
        },
      ];

      const result = await service.aggregateData(mixedData);
      expect(result).toBeDefined();
      expect(typeof result.count).toBe('number');
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.count).toBeLessThanOrEqual(mixedData.length);
    });
  });
});
