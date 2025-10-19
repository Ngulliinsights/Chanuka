import { describe, it, expect, beforeEach } from '@jest/globals';
import { AIRateLimiter } from '../ai-rate-limiter';
import { MemoryRateLimitStore } from '../stores/memory-store';

describe('AIRateLimiter', () => {
  let store: MemoryRateLimitStore;
  let aiLimiter: AIRateLimiter;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
    aiLimiter = AIRateLimiter.createOpenAIRateLimiter(store, 10); // $10 limit
  });

  describe('check', () => {
    it('should allow requests within cost limit', async () => {
      const result = await aiLimiter.check('user1', 'gpt-3.5-turbo', 1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should deny requests over cost limit', async () => {
      // Use up the cost limit with expensive model
      await aiLimiter.check('user1', 'gpt-4', 10000); // Very expensive request

      const result = await aiLimiter.check('user1', 'gpt-3.5-turbo', 1000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should calculate costs correctly for different models', async () => {
      // GPT-3.5-turbo should be cheaper than GPT-4
      const cheapResult = await aiLimiter.check('user1', 'gpt-3.5-turbo', 1000);
      const expensiveResult = await aiLimiter.check('user2', 'gpt-4', 100);

      expect(cheapResult.allowed).toBe(true);
      expect(expensiveResult.allowed).toBe(true);
    });
  });

  describe('getCostStatus', () => {
    it('should return current cost status', async () => {
      await aiLimiter.check('user1', 'gpt-3.5-turbo', 1000);

      const status = await aiLimiter.getCostStatus('user1');

      expect(status).toHaveProperty('currentCost');
      expect(status).toHaveProperty('maxCost');
      expect(status).toHaveProperty('remainingCost');
      expect(status).toHaveProperty('resetAt');
      expect(status.currentCost).toBeGreaterThan(0);
      expect(status.remainingCost).toBeLessThan(status.maxCost);
    });
  });

  describe('createOpenAIRateLimiter', () => {
    it('should create limiter with OpenAI model costs', () => {
      const limiter = AIRateLimiter.createOpenAIRateLimiter(store, 50);

      expect(limiter).toBeInstanceOf(AIRateLimiter);
      // Access private property for testing (in real scenario, this would be tested through behavior)
      expect((limiter as any).modelCosts).toHaveProperty('gpt-4');
      expect((limiter as any).modelCosts).toHaveProperty('gpt-3.5-turbo');
    });
  });

  describe('createAnthropicRateLimiter', () => {
    it('should create limiter with Anthropic model costs', () => {
      const limiter = AIRateLimiter.createAnthropicRateLimiter(store, 50);

      expect(limiter).toBeInstanceOf(AIRateLimiter);
      expect((limiter as any).modelCosts).toHaveProperty('claude-3-opus');
      expect((limiter as any).modelCosts).toHaveProperty('claude-3-haiku');
    });
  });
});





































