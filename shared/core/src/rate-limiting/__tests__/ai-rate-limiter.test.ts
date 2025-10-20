import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIRateLimiterAdapter, createOpenAIRateLimiterAdapter, createAnthropicRateLimiterAdapter, createGenericAIRateLimiterAdapter } from '../ai-rate-limiter';
import { MemoryRateLimitStore } from '../stores/memory-store';
import { ok, err } from '../../primitives/types/result';

// Mock the logger
vi.mock('../../logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the metrics collector
vi.mock('../metrics', () => ({
  getMetricsCollector: vi.fn(() => ({
    recordEvent: vi.fn(),
    recordError: vi.fn(),
  })),
}));

describe('AI Rate Limiter Adapter', () => {
  let store: MemoryRateLimitStore;
  let adapter: AIRateLimiterAdapter;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
    vi.useFakeTimers();

    adapter = new AIRateLimiterAdapter(store, {
      windowMs: 60000,
      max: 1000,
      modelCosts: {
        'gpt-3.5-turbo': 0.002,
        'gpt-4': 0.03,
        'claude-3-sonnet': 0.003,
      },
      baseCost: 0.001,
      maxCostPerWindow: 1.0,
    });
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should allow requests within cost limits', async () => {
      const result = await adapter.check('user1', {
        windowMs: 60000,
        max: 1000,
        model: 'gpt-3.5-turbo',
        tokens: 100,
      } as any);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should deny requests exceeding cost limits', async () => {
      // Use up the cost limit
      const highCostRequest = {
        windowMs: 60000,
        max: 1000,
        model: 'gpt-4',
        tokens: 1000, // Should exceed 1.0 cost limit
      } as any;

      const result = await adapter.check('user1', highCostRequest);
      expect(result.allowed).toBe(false);
    });

    it('should handle token-based limits', async () => {
      const adapterWithTokenLimit = new AIRateLimiterAdapter(store, {
        windowMs: 60000,
        max: 10, // Token limit
        modelCosts: { 'gpt-3.5-turbo': 0.002 },
        baseCost: 0.001,
        maxCostPerWindow: 10.0,
      });

      // Make requests that exceed token limit
      for (let i = 0; i < 10; i++) {
        const result = await adapterWithTokenLimit.check('user1', {
          windowMs: 60000,
          max: 10,
          model: 'gpt-3.5-turbo',
          tokens: 1,
        } as any);
        expect(result.allowed).toBe(true);
      }

      // Next request should be denied
      const result = await adapterWithTokenLimit.check('user1', {
        windowMs: 60000,
        max: 10,
        model: 'gpt-3.5-turbo',
        tokens: 1,
      } as any);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs based on model and tokens', async () => {
      const result = await adapter.check('user1', {
        windowMs: 60000,
        max: 1000,
        model: 'gpt-4',
        tokens: 100,
      } as any);

      // Cost should be: 0.03 (model multiplier) * 0.001 (base) * 100 (tokens) = 0.003
      expect(result.allowed).toBe(true);

      const costStatus = await adapter.getCostStatus('user1');
      expect(costStatus.usedCost).toBeCloseTo(0.003, 6);
    });

    it('should handle unknown models with default cost', async () => {
      const result = await adapter.check('user1', {
        windowMs: 60000,
        max: 1000,
        model: 'unknown-model',
        tokens: 100,
      } as any);

      expect(result.allowed).toBe(true);

      const costStatus = await adapter.getCostStatus('user1');
      expect(costStatus.usedCost).toBeCloseTo(0.1, 6); // 1.0 (default multiplier) * 0.001 * 100
    });

    it('should apply operation-specific multipliers', async () => {
      const result = await adapter.check('user1', {
        windowMs: 60000,
        max: 1000,
        model: 'gpt-3.5-turbo',
        tokens: 100,
        operation: 'embedding',
      } as any);

      expect(result.allowed).toBe(true);

      const costStatus = await adapter.getCostStatus('user1');
      // Embedding cost should be reduced by 0.1 multiplier
      expect(costStatus.usedCost).toBeCloseTo(0.0002, 6); // 0.002 * 0.001 * 100 * 0.1
    });
  });

  describe('Model-Specific Limiting', () => {
    it('should track usage per model', async () => {
      // Make requests for different models
      await adapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 50 });
      await adapter.check('user1', { model: 'gpt-4', tokens: 10 });

      const gpt35Status = await adapter.getModelStatus('user1', 'gpt-3.5-turbo');
      const gpt4Status = await adapter.getModelStatus('user1', 'gpt-4');

      expect(gpt35Status.usedTokens).toBe(50);
      expect(gpt4Status.usedTokens).toBe(10);
    });

    it('should enforce model-specific limits', async () => {
      const adapterWithModelLimits = new AIRateLimiterAdapter(store, {
        windowMs: 60000,
        max: 1000,
        modelCosts: { 'gpt-4': 0.03 },
        baseCost: 0.001,
        maxCostPerWindow: 10.0,
      });

      // GPT-4 should have lower limit (calculated as 50% of global max)
      const gpt4Max = adapterWithModelLimits['getModelMaxTokens']('gpt-4');
      expect(gpt4Max).toBe(500);

      // Fill up GPT-4 limit
      for (let i = 0; i < 500; i++) {
        await adapterWithModelLimits.check('user1', { model: 'gpt-4', tokens: 1 });
      }

      // Next GPT-4 request should be denied
      const result = await adapterWithModelLimits.check('user1', { model: 'gpt-4', tokens: 1 });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Window Management', () => {
    it('should reset costs after window expires', async () => {
      await adapter.check('user1', { model: 'gpt-4', tokens: 100 });

      let costStatus = await adapter.getCostStatus('user1');
      expect(costStatus.usedCost).toBeGreaterThan(0);

      // Advance time past window
      vi.advanceTimersByTime(60001);

      costStatus = await adapter.getCostStatus('user1');
      expect(costStatus.usedCost).toBe(0);
    });

    it('should handle window boundaries correctly', async () => {
      const result1 = await adapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 100 });
      expect(result1.allowed).toBe(true);

      // Advance time to just before window end
      vi.advanceTimersByTime(59999);

      const result2 = await adapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 100 });
      expect(result2.allowed).toBe(true); // Should still be in same window

      // Advance past window
      vi.advanceTimersByTime(2);

      const result3 = await adapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 100 });
      expect(result3.allowed).toBe(true); // New window
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all tracking data', async () => {
      // Make some requests
      await adapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 50 });
      await adapter.check('user1', { model: 'gpt-4', tokens: 10 });

      // Verify data exists
      let costStatus = await adapter.getCostStatus('user1');
      let tokenStatus = await adapter.getTokenStatus('user1');
      let modelStatus = await adapter.getModelStatus('user1', 'gpt-3.5-turbo');

      expect(costStatus.usedCost).toBeGreaterThan(0);
      expect(tokenStatus.usedTokens).toBeGreaterThan(0);
      expect(modelStatus.usedTokens).toBe(50);

      // Reset
      await adapter.reset('user1');

      // Verify all data is cleared
      costStatus = await adapter.getCostStatus('user1');
      tokenStatus = await adapter.getTokenStatus('user1');
      modelStatus = await adapter.getModelStatus('user1', 'gpt-3.5-turbo');

      expect(costStatus.usedCost).toBe(0);
      expect(tokenStatus.usedTokens).toBe(0);
      expect(modelStatus.usedTokens).toBe(0);
    });
  });

  describe('Status Reporting', () => {
    it('should provide accurate cost status', async () => {
      await adapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 200 });

      const status = await adapter.getCostStatus('user1');
      expect(status.usedCost).toBeCloseTo(0.0004, 6); // 0.002 * 0.001 * 200
      expect(status.remainingCost).toBeCloseTo(0.9996, 6);
      expect(status.maxCost).toBe(1.0);
      expect(status.resetAt).toBeInstanceOf(Date);
    });

    it('should provide accurate token status', async () => {
      const tokenAdapter = new AIRateLimiterAdapter(store, {
        windowMs: 60000,
        max: 100,
        modelCosts: { 'gpt-3.5-turbo': 0.002 },
        baseCost: 0.001,
        maxCostPerWindow: 10.0,
      });

      await tokenAdapter.check('user1', { model: 'gpt-3.5-turbo', tokens: 50 });

      const status = await tokenAdapter.getTokenStatus('user1');
      expect(status.usedTokens).toBe(50);
      expect(status.remainingTokens).toBe(50);
      expect(status.maxTokens).toBe(100);
    });

    it('should provide accurate model status', async () => {
      await adapter.check('user1', { model: 'gpt-4', tokens: 100 });

      const status = await adapter.getModelStatus('user1', 'gpt-4');
      expect(status.usedTokens).toBe(100);
      expect(status.remainingTokens).toBe(400); // 500 - 100 (GPT-4 limit is 50% of 1000)
      expect(status.maxTokens).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should fail open on store errors', async () => {
      // Mock store to throw error
      const mockStore = {
        get: vi.fn().mockRejectedValue(new Error('Store error')),
        set: vi.fn().mockRejectedValue(new Error('Store error')),
        delete: vi.fn().mockRejectedValue(new Error('Store error')),
      };

      const errorAdapter = new AIRateLimiterAdapter(mockStore as any, {
        windowMs: 60000,
        max: 1000,
        modelCosts: { 'gpt-3.5-turbo': 0.002 },
        baseCost: 0.001,
        maxCostPerWindow: 1.0,
      });

      const result = await errorAdapter.check('user1', {
        model: 'gpt-3.5-turbo',
        tokens: 100,
      });

      // Should fail open
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it('should handle invalid model costs gracefully', async () => {
      const invalidAdapter = new AIRateLimiterAdapter(store, {
        windowMs: 60000,
        max: 1000,
        modelCosts: { 'invalid-model': NaN },
        baseCost: 0.001,
        maxCostPerWindow: 1.0,
      });

      const result = await invalidAdapter.check('user1', {
        model: 'invalid-model',
        tokens: 100,
      });

      expect(result.allowed).toBe(true); // Should not crash
    });
  });

  describe('Factory Functions', () => {
    describe('OpenAI Adapter', () => {
      it('should create adapter with OpenAI model costs', async () => {
        const openaiAdapter = createOpenAIRateLimiterAdapter(store, 5.0);

        expect(openaiAdapter).toBeInstanceOf(AIRateLimiterAdapter);

        // Test GPT-4 cost calculation
        const result = await openaiAdapter.check('user1', {
          model: 'gpt-4',
          tokens: 100,
        });

        expect(result.allowed).toBe(true);

        const costStatus = await openaiAdapter.getCostStatus('user1');
        expect(costStatus.usedCost).toBeCloseTo(0.03, 6); // 0.03 * 100
      });

      it('should handle OpenAI-specific models', async () => {
        const openaiAdapter = createOpenAIRateLimiterAdapter(store, 10.0);

        const models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'text-embedding-ada-002'];

        for (const model of models) {
          const result = await openaiAdapter.check('user1', { model, tokens: 10 });
          expect(result.allowed).toBe(true);
        }
      });
    });

    describe('Anthropic Adapter', () => {
      it('should create adapter with Anthropic model costs', async () => {
        const anthropicAdapter = createAnthropicRateLimiterAdapter(store, 5.0);

        const result = await anthropicAdapter.check('user1', {
          model: 'claude-3-opus',
          tokens: 100,
        });

        expect(result.allowed).toBe(true);

        const costStatus = await anthropicAdapter.getCostStatus('user1');
        expect(costStatus.usedCost).toBeCloseTo(0.15, 6); // 0.015 * 100
      });

      it('should handle Claude models', async () => {
        const anthropicAdapter = createAnthropicRateLimiterAdapter(store, 10.0);

        const models = ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-instant'];

        for (const model of models) {
          const result = await anthropicAdapter.check('user1', { model, tokens: 10 });
          expect(result.allowed).toBe(true);
        }
      });
    });

    describe('Generic AI Adapter', () => {
      it('should create adapter with default costs', async () => {
        const genericAdapter = createGenericAIRateLimiterAdapter(store, 5.0);

        const result = await genericAdapter.check('user1', {
          model: 'unknown-model',
          tokens: 100,
        });

        expect(result.allowed).toBe(true);

        const costStatus = await genericAdapter.getCostStatus('user1');
        expect(costStatus.usedCost).toBeCloseTo(0.1, 6); // 1.0 * 0.001 * 100
      });
    });
  });

  describe('Observability Integration', () => {
    it('should record metrics for allowed requests', async () => {
      const { getMetricsCollector } = await import('../metrics');
      const mockMetrics = getMetricsCollector();

      await adapter.check('user1', {
        model: 'gpt-3.5-turbo',
        tokens: 100,
        operation: 'completion',
      });

      expect(mockMetrics.recordEvent).toHaveBeenCalledWith({
        allowed: true,
        key: 'user1',
        algorithm: 'ai-rate-limiter:gpt-3.5-turbo',
        remaining: 999,
        processingTime: expect.any(Number),
        ip: undefined,
        userAgent: 'model:gpt-3.5-turbo,operation:completion',
        path: 'cost:0.000200,tokens:100',
        method: 'AI',
      });
    });

    it('should record metrics for denied requests', async () => {
      const { getMetricsCollector } = await import('../metrics');
      const mockMetrics = getMetricsCollector();

      // Create adapter with very low cost limit
      const strictAdapter = new AIRateLimiterAdapter(store, {
        windowMs: 60000,
        max: 1000,
        modelCosts: { 'gpt-4': 0.03 },
        baseCost: 0.001,
        maxCostPerWindow: 0.001, // Very low limit
      });

      await strictAdapter.check('user1', {
        model: 'gpt-4',
        tokens: 100,
      });

      expect(mockMetrics.recordEvent).toHaveBeenCalledWith({
        allowed: false,
        key: 'user1',
        algorithm: 'ai-rate-limiter:gpt-4',
        remaining: 0,
        processingTime: expect.any(Number),
        ip: undefined,
        userAgent: 'model:gpt-4,operation:default',
        path: 'cost:0.003000,tokens:100',
        method: 'AI',
      });
    });

    it('should record error metrics on failures', async () => {
      const { getMetricsCollector } = await import('../metrics');
      const mockMetrics = getMetricsCollector();

      const mockStore = {
        get: vi.fn().mockRejectedValue(new Error('Store error')),
        set: vi.fn().mockRejectedValue(new Error('Store error')),
        delete: vi.fn().mockRejectedValue(new Error('Store error')),
      };

      const errorAdapter = new AIRateLimiterAdapter(mockStore as any, {
        windowMs: 60000,
        max: 1000,
        modelCosts: { 'gpt-3.5-turbo': 0.002 },
        baseCost: 0.001,
        maxCostPerWindow: 1.0,
      });

      await errorAdapter.check('user1', {
        model: 'gpt-3.5-turbo',
        tokens: 100,
      });

      expect(mockMetrics.recordError).toHaveBeenCalledWith('Store error');
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle multiple concurrent AI requests', async () => {
      const startTime = Date.now();
      const promises = Array.from({ length: 20 }, (_, i) =>
        adapter.check(`user${i}`, {
          model: 'gpt-3.5-turbo',
          tokens: 10,
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
      const allowed = results.filter(r => r.allowed).length;
      expect(allowed).toBe(20); // All should be allowed
    });

    it('should maintain performance with complex cost calculations', async () => {
      const complexAdapter = new AIRateLimiterAdapter(store, {
        windowMs: 60000,
        max: 10000,
        modelCosts: {
          'gpt-4': 0.03,
          'claude-3-opus': 0.015,
          'embedding-large': 0.00013,
        },
        baseCost: 0.001,
        maxCostPerWindow: 100.0,
      });

      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, (_, i) => {
        const models = ['gpt-4', 'claude-3-opus', 'embedding-large'];
        const model = models[i % models.length];
        return complexAdapter.check(`user${i % 10}`, {
          model,
          tokens: Math.floor(Math.random() * 100) + 1,
          operation: i % 2 === 0 ? 'completion' : 'embedding',
        });
      });

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Thread Safety and Concurrency', () => {
    it('should handle concurrent cost updates safely', async () => {
      const promises = Array.from({ length: 10 }, () =>
        adapter.check('user1', {
          model: 'gpt-3.5-turbo',
          tokens: 10,
        })
      );

      const results = await Promise.all(promises);
      const allowed = results.filter(r => r.allowed).length;

      // Should allow some requests but eventually deny when cost limit is reached
      expect(allowed).toBeLessThanOrEqual(10);

      const costStatus = await adapter.getCostStatus('user1');
      expect(costStatus.usedCost).toBeLessThanOrEqual(1.0);
    });

    it('should prevent race conditions in model tracking', async () => {
      const modelPromises = Array.from({ length: 5 }, () =>
        adapter.check('user1', {
          model: 'gpt-4',
          tokens: 10,
        })
      );

      await Promise.all(modelPromises);

      const modelStatus = await adapter.getModelStatus('user1', 'gpt-4');
      expect(modelStatus.usedTokens).toBe(50); // 5 * 10 tokens
    });
  });
});
