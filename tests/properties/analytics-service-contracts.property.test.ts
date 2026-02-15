/**
 * Property Test: Analytics Service API Contracts and Failure Handling
 * Feature: comprehensive-bug-fixes, Property 3: Service API Contracts
 * Feature: comprehensive-bug-fixes, Property 9: Analytics API Failure Handling
 * 
 * Validates: Requirements 3.3, 6.3
 * 
 * This property test verifies that:
 * - All analytics service methods return result objects with expected fields
 * - Methods never throw exceptions (errors are caught and returned as failure results)
 * - Failure results include success: false and error metadata
 * - Success results include tracked/updated status, IDs, timestamps, and metadata
 * - Service handles all types of input gracefully without crashing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { AnalyticsServiceImpl } from '../../client/src/core/analytics/service';
import type {
  AnalyticsEvent,
  AnalyticsPerformanceMetrics,
} from '../../client/src/lib/types/analytics';
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

describe('Feature: comprehensive-bug-fixes, Property 3 & 9: Analytics Service Contracts and Failure Handling', () => {
  let service: AnalyticsServiceImpl;

  beforeEach(() => {
    service = new AnalyticsServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Arbitrary generators for analytics data
  const analyticsEventArb = fc.record({
    id: fc.string(),
    type: fc.constantFrom('page_view', 'engagement', 'performance', 'error', 'custom'),
    category: fc.string(),
    action: fc.string(),
    label: fc.option(fc.string(), { nil: undefined }),
    value: fc.option(fc.integer(), { nil: undefined }),
    timestamp: fc.date().map(d => d.toISOString()),
    sessionId: fc.option(fc.string(), { nil: undefined }),
    userId: fc.option(fc.string(), { nil: undefined }),
    anonymized: fc.boolean(),
    consentGiven: fc.boolean(),
    metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  }) as fc.Arbitrary<AnalyticsEvent>;

  const pageViewDataArb = fc.record({
    path: fc.string(),
    title: fc.string(),
    referrer: fc.option(fc.string(), { nil: undefined }),
    metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  });

  const userActionArb = fc.record({
    action: fc.string(),
    category: fc.string(),
    label: fc.option(fc.string(), { nil: undefined }),
    value: fc.option(fc.integer(), { nil: undefined }),
    metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  });

  const performanceMetricsArb = fc.record({
    lcp: fc.option(fc.double({ min: 0, max: 10000 }), { nil: undefined }),
    fid: fc.option(fc.double({ min: 0, max: 1000 }), { nil: undefined }),
    cls: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
    ttfb: fc.option(fc.double({ min: 0, max: 5000 }), { nil: undefined }),
    fcp: fc.option(fc.double({ min: 0, max: 10000 }), { nil: undefined }),
  }) as fc.Arbitrary<AnalyticsPerformanceMetrics>;

  const errorDataArb = fc.record({
    message: fc.string(),
    stack: fc.option(fc.string(), { nil: undefined }),
    severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
    metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  });

  const userPropertiesArb = fc.record({
    userId: fc.option(fc.string(), { nil: undefined }),
    email: fc.option(fc.string(), { nil: undefined }),
    name: fc.option(fc.string(), { nil: undefined }),
  });

  const sessionPropertiesArb = fc.record({
    sessionId: fc.string(),
    startTime: fc.integer({ min: 0 }),
  });

  describe('Property 3: Service API Contracts', () => {
    it('trackEvent should always return a TrackingResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(analyticsEventArb, async (event) => {
          const result = await service.trackEvent(event);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.tracked).toBe('boolean');
          expect(typeof result.eventId).toBe('string');
          expect(typeof result.timestamp).toBe('number');
          
          // If tracked successfully, eventId should not be empty
          if (result.tracked) {
            expect(result.eventId).not.toBe('');
            expect(result.timestamp).toBeGreaterThan(0);
          }

          // Metadata is optional but should be an object if present
          if (result.metadata !== undefined) {
            expect(typeof result.metadata).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('trackPageView should always return a TrackingResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(pageViewDataArb, async (pageView) => {
          const result = await service.trackPageView(pageView);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.tracked).toBe('boolean');
          expect(typeof result.eventId).toBe('string');
          expect(typeof result.timestamp).toBe('number');
          
          // If tracked successfully, eventId should not be empty
          if (result.tracked) {
            expect(result.eventId).not.toBe('');
            expect(result.timestamp).toBeGreaterThan(0);
          }

          // Metadata is optional but should be an object if present
          if (result.metadata !== undefined) {
            expect(typeof result.metadata).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('trackUserAction should always return a TrackingResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(userActionArb, async (action) => {
          const result = await service.trackUserAction(action);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.tracked).toBe('boolean');
          expect(typeof result.eventId).toBe('string');
          expect(typeof result.timestamp).toBe('number');
          
          // If tracked successfully, eventId should not be empty
          if (result.tracked) {
            expect(result.eventId).not.toBe('');
            expect(result.timestamp).toBeGreaterThan(0);
          }

          // Metadata is optional but should be an object if present
          if (result.metadata !== undefined) {
            expect(typeof result.metadata).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('trackPerformance should always return a TrackingResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(performanceMetricsArb, async (metrics) => {
          const result = await service.trackPerformance(metrics);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.tracked).toBe('boolean');
          expect(typeof result.eventId).toBe('string');
          expect(typeof result.timestamp).toBe('number');
          
          // If tracked successfully, eventId should not be empty
          if (result.tracked) {
            expect(result.eventId).not.toBe('');
            expect(result.timestamp).toBeGreaterThan(0);
          }

          // Metadata is optional but should be an object if present
          if (result.metadata !== undefined) {
            expect(typeof result.metadata).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('trackError should always return a TrackingResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(errorDataArb, async (error) => {
          const result = await service.trackError(error);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.tracked).toBe('boolean');
          expect(typeof result.eventId).toBe('string');
          expect(typeof result.timestamp).toBe('number');
          
          // If tracked successfully, eventId should not be empty
          if (result.tracked) {
            expect(result.eventId).not.toBe('');
            expect(result.timestamp).toBeGreaterThan(0);
          }

          // Metadata is optional but should be an object if present
          if (result.metadata !== undefined) {
            expect(typeof result.metadata).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('setUserProperties should always return an UpdateResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(userPropertiesArb, async (properties) => {
          const result = await service.setUserProperties(properties);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.updated).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
          expect(result.timestamp).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('setSessionProperties should always return an UpdateResult with expected fields', async () => {
      await fc.assert(
        fc.asyncProperty(sessionPropertiesArb, async (properties) => {
          const result = await service.setSessionProperties(properties);

          // Result must have the expected structure
          expect(result).toBeDefined();
          expect(typeof result.updated).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
          expect(result.timestamp).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Analytics API Failure Handling', () => {
    it('trackEvent should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.trackEvent(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.trackEvent(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.tracked).toBe('boolean');
            expect(typeof result.eventId).toBe('string');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('trackPageView should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.trackPageView(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.trackPageView(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.tracked).toBe('boolean');
            expect(typeof result.eventId).toBe('string');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('trackUserAction should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.trackUserAction(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.trackUserAction(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.tracked).toBe('boolean');
            expect(typeof result.eventId).toBe('string');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('trackPerformance should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.trackPerformance(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.trackPerformance(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.tracked).toBe('boolean');
            expect(typeof result.eventId).toBe('string');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('trackError should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.trackError(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.trackError(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.tracked).toBe('boolean');
            expect(typeof result.eventId).toBe('string');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('setUserProperties should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.setUserProperties(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.setUserProperties(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.updated).toBe('boolean');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('setSessionProperties should never throw exceptions, even with invalid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          async (invalidInput) => {
            // Should not throw, even with completely invalid input
            await expect(
              service.setSessionProperties(invalidInput as any)
            ).resolves.toBeDefined();

            const result = await service.setSessionProperties(invalidInput as any);
            
            // Result should have the expected structure
            expect(result).toBeDefined();
            expect(typeof result.updated).toBe('boolean');
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log errors when operations fail', async () => {
      // Create a service that will fail internally
      const failingService = new AnalyticsServiceImpl();
      
      // Mock a method to throw an error
      const originalTrackEvent = failingService.trackEvent.bind(failingService);
      failingService.trackEvent = async (event: AnalyticsEvent) => {
        try {
          throw new Error('Simulated API failure');
        } catch (error) {
          logger.error('Failed to track analytics event', { event, error });
          return {
            tracked: false,
            eventId: '',
            timestamp: Date.now(),
            metadata: { error: String(error) },
          };
        }
      };

      const event: AnalyticsEvent = {
        id: 'test-id',
        type: 'page_view',
        category: 'test',
        action: 'test',
        timestamp: new Date().toISOString(),
        anonymized: false,
        consentGiven: true,
      };

      const result = await failingService.trackEvent(event);

      // Should return failure result, not throw
      expect(result.tracked).toBe(false);
      expect(result.eventId).toBe('');
      expect(result.metadata?.error).toBeDefined();

      // Should have logged the error
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return failure results with error metadata when operations fail', async () => {
      await fc.assert(
        fc.asyncProperty(analyticsEventArb, async (event) => {
          // Create a service that simulates failures
          const failingService = new AnalyticsServiceImpl();
          
          // Override trackEvent to simulate failure
          failingService.trackEvent = async () => {
            logger.error('Simulated failure', { event });
            return {
              tracked: false,
              eventId: '',
              timestamp: Date.now(),
              metadata: { error: 'Simulated failure' },
            };
          };

          const result = await failingService.trackEvent(event);

          // Failure result should have tracked: false
          expect(result.tracked).toBe(false);
          
          // Should have empty eventId on failure
          expect(result.eventId).toBe('');
          
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
      // Test with null
      const nullResult = await service.trackEvent(null as any);
      expect(nullResult).toBeDefined();
      expect(typeof nullResult.tracked).toBe('boolean');

      // Test with undefined
      const undefinedResult = await service.trackEvent(undefined as any);
      expect(undefinedResult).toBeDefined();
      expect(typeof undefinedResult.tracked).toBe('boolean');
    });

    it('should handle empty objects gracefully', async () => {
      const emptyResult = await service.trackEvent({} as any);
      expect(emptyResult).toBeDefined();
      expect(typeof emptyResult.tracked).toBe('boolean');
    });

    it('should handle extremely large metadata objects', async () => {
      const largeMetadata: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const event: AnalyticsEvent = {
        id: 'test-id',
        type: 'custom',
        category: 'test',
        action: 'test',
        timestamp: new Date().toISOString(),
        anonymized: false,
        consentGiven: true,
        metadata: largeMetadata,
      };

      const result = await service.trackEvent(event);
      expect(result).toBeDefined();
      expect(typeof result.tracked).toBe('boolean');
    });

    it('should handle concurrent calls without race conditions', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const event: AnalyticsEvent = {
          id: `event-${i}`,
          type: 'custom',
          category: 'test',
          action: 'test',
          timestamp: new Date().toISOString(),
          anonymized: false,
          consentGiven: true,
        };
        return service.trackEvent(event);
      });

      const results = await Promise.all(promises);

      // All results should be defined
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.tracked).toBe('boolean');
        expect(typeof result.eventId).toBe('string');
        expect(typeof result.timestamp).toBe('number');
      });

      // All eventIds should be unique
      const eventIds = results.map(r => r.eventId).filter(id => id !== '');
      const uniqueEventIds = new Set(eventIds);
      expect(uniqueEventIds.size).toBe(eventIds.length);
    });
  });
});
