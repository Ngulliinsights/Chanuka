import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenBucket, TokenBucketConfig } from '../algorithms/token-bucket';
import { SlidingWindow, SlidingWindowConfig } from '../algorithms/sliding-window';
import { FixedWindow, FixedWindowConfig } from '../algorithms/fixed-window';
import { ok, err } from '../../primitives/types/result';

describe('Rate Limiting Algorithms', () => {
  describe('TokenBucket', () => {
    let config: TokenBucketConfig;
    let algorithm: TokenBucket;

    beforeEach(() => {
      config = {
        capacity: 10,
        refillRate: 1, // 1 token per millisecond
        initialTokens: 5
      };
      algorithm = new TokenBucket(config);
    });

    describe('Basic Functionality', () => {
      it('should allow requests within capacity', async () => {
        const result = await algorithm.checkLimit('user1', 3);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should deny requests exceeding capacity', async () => {
        const result = await algorithm.checkLimit('user1', 15);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(false);
      });

      it('should default cost to 1', async () => {
        const result = await algorithm.checkLimit('user1');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should track tokens per key independently', async () => {
        await algorithm.checkLimit('user1', 3);
        await algorithm.checkLimit('user2', 3);

        const remaining1 = await algorithm.getRemaining('user1');
        const remaining2 = await algorithm.getRemaining('user2');

        expect(remaining1.isOk()).toBe(true);
        expect(remaining2.isOk()).toBe(true);
        expect(remaining1.unwrap()).toBe(2); // 5 - 3 = 2
        expect(remaining2.unwrap()).toBe(2); // 5 - 3 = 2
      });
    });

    describe('Token Refilling', () => {
      it('should refill tokens over time', async () => {
        // Use up all tokens
        await algorithm.checkLimit('user1', 5);
        let remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(0);

        // Wait for refill (simulate time passing)
        vi.advanceTimersByTime(1000); // 1 second = 1000 tokens

        remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(10); // Should be at capacity
      });

      it('should not exceed capacity during refill', async () => {
        // Use some tokens
        await algorithm.checkLimit('user1', 2);
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(3);

        // Wait for more tokens than needed to reach capacity
        vi.advanceTimersByTime(10000); // 10 seconds = 10000 tokens

        const remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(10); // Should cap at capacity
      });
    });

    describe('Reset Functionality', () => {
      it('should reset tokens to capacity', async () => {
        await algorithm.checkLimit('user1', 4);
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(1);

        const resetResult = await algorithm.reset('user1');
        expect(resetResult.isOk()).toBe(true);

        const remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(10);
      });

      it('should handle reset for non-existent key', async () => {
        const resetResult = await algorithm.reset('nonexistent');
        expect(resetResult.isOk()).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid cost values', async () => {
        const result = await algorithm.checkLimit('user1', -1);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true); // Should still work but not consume tokens
      });

      it('should handle zero cost', async () => {
        const result = await algorithm.checkLimit('user1', 0);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very small refill rates', async () => {
        const slowConfig: TokenBucketConfig = {
          capacity: 10,
          refillRate: 0.001, // Very slow refill
          initialTokens: 10
        };
        const slowAlgorithm = new TokenBucket(slowConfig);

        await slowAlgorithm.checkLimit('user1', 10);
        expect((await slowAlgorithm.getRemaining('user1')).unwrap()).toBe(0);

        vi.advanceTimersByTime(1000); // Should add 1 token
        expect((await slowAlgorithm.getRemaining('user1')).unwrap()).toBe(1);
      });

      it('should handle capacity of 1', async () => {
        const smallConfig: TokenBucketConfig = {
          capacity: 1,
          refillRate: 1,
          initialTokens: 1
        };
        const smallAlgorithm = new TokenBucket(smallConfig);

        expect((await smallAlgorithm.checkLimit('user1')).unwrap()).toBe(true);
        expect((await smallAlgorithm.checkLimit('user1')).unwrap()).toBe(false);
      });
    });

    describe('Concurrency', () => {
      it('should handle concurrent requests', async () => {
        const promises = Array.from({ length: 10 }, () =>
          algorithm.checkLimit('user1', 1)
        );

        const results = await Promise.all(promises);
        const allowed = results.filter(r => r.isOk() && r.unwrap()).length;
        const denied = results.filter(r => r.isOk() && !r.unwrap()).length;

        expect(allowed + denied).toBe(10);
        expect(allowed).toBeLessThanOrEqual(5); // Initial tokens
        expect(denied).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('SlidingWindow', () => {
    let config: SlidingWindowConfig;
    let algorithm: SlidingWindow;

    beforeEach(() => {
      config = {
        windowSize: 1000, // 1 second window
        maxRequests: 5
      };
      algorithm = new SlidingWindow(config);
    });

    describe('Basic Functionality', () => {
      it('should allow requests within window limit', async () => {
        for (let i = 0; i < 5; i++) {
          const result = await algorithm.checkLimit('user1');
          expect(result.isOk()).toBe(true);
          expect(result.unwrap()).toBe(true);
        }
      });

      it('should deny requests exceeding window limit', async () => {
        // Fill the window
        for (let i = 0; i < 5; i++) {
          await algorithm.checkLimit('user1');
        }

        const result = await algorithm.checkLimit('user1');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(false);
      });

      it('should handle custom costs', async () => {
        const result = await algorithm.checkLimit('user1', 3);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);

        const remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(2);
      });
    });

    describe('Window Sliding', () => {
      it('should allow requests after window expires', async () => {
        // Fill the window
        for (let i = 0; i < 5; i++) {
          await algorithm.checkLimit('user1');
        }
        expect((await algorithm.checkLimit('user1')).unwrap()).toBe(false);

        // Wait for window to slide
        vi.advanceTimersByTime(1000);

        const result = await algorithm.checkLimit('user1');
        expect(result.unwrap()).toBe(true);
      });

      it('should partially allow requests in sliding window', async () => {
        // Add requests at different times
        await algorithm.checkLimit('user1'); // t=0
        vi.advanceTimersByTime(300);
        await algorithm.checkLimit('user1'); // t=300
        vi.advanceTimersByTime(300);
        await algorithm.checkLimit('user1'); // t=600

        // At t=600, we have 3 requests in last 1000ms
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(2);

        vi.advanceTimersByTime(500); // t=1100
        // Now only 2 requests in last 1000ms (t=300, t=600)
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(3);
      });
    });

    describe('Reset Functionality', () => {
      it('should clear all requests for a key', async () => {
        for (let i = 0; i < 3; i++) {
          await algorithm.checkLimit('user1');
        }
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(2);

        const resetResult = await algorithm.reset('user1');
        expect(resetResult.isOk()).toBe(true);

        const remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(5);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero max requests', async () => {
        const zeroConfig: SlidingWindowConfig = {
          windowSize: 1000,
          maxRequests: 0
        };
        const zeroAlgorithm = new SlidingWindow(zeroConfig);

        const result = await zeroAlgorithm.checkLimit('user1');
        expect(result.unwrap()).toBe(false);
      });

      it('should handle very small windows', async () => {
        const smallConfig: SlidingWindowConfig = {
          windowSize: 1, // 1ms window
          maxRequests: 1
        };
        const smallAlgorithm = new SlidingWindow(smallConfig);

        expect((await smallAlgorithm.checkLimit('user1')).unwrap()).toBe(true);
        vi.advanceTimersByTime(2);
        expect((await smallAlgorithm.checkLimit('user1')).unwrap()).toBe(true);
      });
    });
  });

  describe('FixedWindow', () => {
    let config: FixedWindowConfig;
    let algorithm: FixedWindow;

    beforeEach(() => {
      config = {
        windowDuration: 1000, // 1 second windows
        maxRequests: 5
      };
      algorithm = new FixedWindow(config);
    });

    describe('Basic Functionality', () => {
      it('should allow requests within window limit', async () => {
        for (let i = 0; i < 5; i++) {
          const result = await algorithm.checkLimit('user1');
          expect(result.isOk()).toBe(true);
          expect(result.unwrap()).toBe(true);
        }
      });

      it('should deny requests exceeding window limit', async () => {
        // Fill the window
        for (let i = 0; i < 5; i++) {
          await algorithm.checkLimit('user1');
        }

        const result = await algorithm.checkLimit('user1');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(false);
      });
    });

    describe('Window Transitions', () => {
      it('should reset counter at window boundary', async () => {
        // Fill current window
        for (let i = 0; i < 5; i++) {
          await algorithm.checkLimit('user1');
        }
        expect((await algorithm.checkLimit('user1')).unwrap()).toBe(false);

        // Advance to next window
        vi.advanceTimersByTime(1000);

        const result = await algorithm.checkLimit('user1');
        expect(result.unwrap()).toBe(true);

        const remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(4);
      });

      it('should handle window boundary precision', async () => {
        await algorithm.checkLimit('user1');
        vi.advanceTimersByTime(999); // Just before window end
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(4);

        vi.advanceTimersByTime(1); // Cross window boundary
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(5);
      });
    });

    describe('Reset Functionality', () => {
      it('should reset counter for current window', async () => {
        for (let i = 0; i < 3; i++) {
          await algorithm.checkLimit('user1');
        }
        expect((await algorithm.getRemaining('user1')).unwrap()).toBe(2);

        const resetResult = await algorithm.reset('user1');
        expect(resetResult.isOk()).toBe(true);

        const remaining = await algorithm.getRemaining('user1');
        expect(remaining.unwrap()).toBe(5);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero max requests', async () => {
        const zeroConfig: FixedWindowConfig = {
          windowDuration: 1000,
          maxRequests: 0
        };
        const zeroAlgorithm = new FixedWindow(zeroConfig);

        const result = await zeroAlgorithm.checkLimit('user1');
        expect(result.unwrap()).toBe(false);
      });

      it('should handle very long windows', async () => {
        const longConfig: FixedWindowConfig = {
          windowDuration: 3600000, // 1 hour
          maxRequests: 1000
        };
        const longAlgorithm = new FixedWindow(longConfig);

        for (let i = 0; i < 1000; i++) {
          expect((await longAlgorithm.checkLimit('user1')).unwrap()).toBe(true);
        }
        expect((await longAlgorithm.checkLimit('user1')).unwrap()).toBe(false);
      });
    });
  });

  describe('Cross-Algorithm Consistency', () => {
    it('should handle same interface across algorithms', async () => {
      const tokenBucket = new TokenBucket({ capacity: 5, refillRate: 1 });
      const slidingWindow = new SlidingWindow({ windowSize: 1000, maxRequests: 5 });
      const fixedWindow = new FixedWindow({ windowDuration: 1000, maxRequests: 5 });

      const algorithms = [tokenBucket, slidingWindow, fixedWindow];

      for (const algorithm of algorithms) {
        // All should have the same interface
        expect(typeof algorithm.checkLimit).toBe('function');
        expect(typeof algorithm.reset).toBe('function');
        expect(typeof algorithm.getRemaining).toBe('function');

        // All should return Result types
        const checkResult = await algorithm.checkLimit('test');
        expect(checkResult).toHaveProperty('isOk');
        expect(checkResult).toHaveProperty('isErr');

        const resetResult = await algorithm.reset('test');
        expect(resetResult).toHaveProperty('isOk');
        expect(resetResult).toHaveProperty('isErr');

        const remainingResult = await algorithm.getRemaining('test');
        expect(remainingResult).toHaveProperty('isOk');
        expect(remainingResult).toHaveProperty('isErr');
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const algorithm = new TokenBucket({ capacity: 1000, refillRate: 100 });

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, () =>
        algorithm.checkLimit('user1', 1)
      );

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should maintain performance with many keys', async () => {
      const algorithm = new TokenBucket({ capacity: 10, refillRate: 1 });

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, (_, i) =>
        algorithm.checkLimit(`user${i}`, 1)
      );

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});


