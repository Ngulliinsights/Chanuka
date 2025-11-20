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

/**
 * Tests for ObservabilityStack and CorrelationManager
 */

import { ObservabilityStack, AsyncCorrelationManager } from '../stack';
import { ObservabilityConfig } from '../interfaces';

describe('AsyncCorrelationManager', () => {
  let correlationManager: AsyncCorrelationManager;

  beforeEach(() => {
    correlationManager = new AsyncCorrelationManager();
  });

  describe('startRequest', () => {
    it('should generate correlation ID when not provided', () => {
      const context = correlationManager.startRequest();
      
      expect(context.correlationId).toBeDefined();
      expect(context.correlationId).toMatch(/^corr_\d+_[a-z0-9]+$/);
      expect(context.traceId).toBeDefined();
      expect(context.requestId).toBeDefined();
    });

    it('should use provided correlation ID', () => {
      const customCorrelationId = 'custom-correlation-id';
      const context = correlationManager.startRequest({ correlationId: customCorrelationId });
      
      expect(context.correlationId).toBe(customCorrelationId);
    });

    it('should preserve provided context fields', () => { const inputContext = {
        correlationId: 'test-corr-id',
        user_id: 'user-123',
        session_id: 'session-456',
        metadata: { key: 'value'  }
      };
      
      const context = correlationManager.startRequest(inputContext);
      
      expect(context.correlationId).toBe(inputContext.correlationId);
      expect(context.user_id).toBe(inputContext.user_id);
      expect(context.session_id).toBe(inputContext.session_id);
      expect(context.metadata).toEqual(inputContext.metadata);
    });
  });

  describe('context management', () => {
    it('should return undefined when no context is active', () => {
      expect(correlationManager.getCorrelationId()).toBeUndefined();
      expect(correlationManager.getContext()).toBeUndefined();
    });

    it('should provide context within withContext', () => {
      const context = correlationManager.startRequest({ correlationId: 'test-id' });
      
      correlationManager.withContext(context, () => {
        expect(correlationManager.getCorrelationId()).toBe('test-id');
        expect(correlationManager.getContext()).toEqual(context);
      });
    });

    it('should provide context within withContextAsync', async () => {
      const context = correlationManager.startRequest({ correlationId: 'async-test-id' });
      
      await correlationManager.withContextAsync(context, async () => {
        expect(correlationManager.getCorrelationId()).toBe('async-test-id');
        expect(correlationManager.getContext()).toEqual(context);
      });
    });

    it('should handle nested contexts correctly', () => {
      const outerContext = correlationManager.startRequest({ correlationId: 'outer' });
      const innerContext = correlationManager.startRequest({ correlationId: 'inner' });
      
      correlationManager.withContext(outerContext, () => {
        expect(correlationManager.getCorrelationId()).toBe('outer');
        
        correlationManager.withContext(innerContext, () => {
          expect(correlationManager.getCorrelationId()).toBe('inner');
        });
        
        expect(correlationManager.getCorrelationId()).toBe('outer');
      });
    });
  });

  describe('metadata management', () => {
    it('should set and get metadata within context', () => {
      const context = correlationManager.startRequest();
      
      correlationManager.withContext(context, () => {
        correlationManager.setMetadata('testKey', 'testValue');
        expect(correlationManager.getMetadata('testKey')).toBe('testValue');
      });
    });

    it('should return undefined for metadata outside context', () => {
      correlationManager.setMetadata('testKey', 'testValue');
      expect(correlationManager.getMetadata('testKey')).toBeUndefined();
    });
  });
});

describe('ObservabilityStack', () => {
  let stack: ObservabilityStack;

  beforeEach(() => {
    stack = new ObservabilityStack();
  });

  describe('initialization', () => {
    it('should initialize successfully with default config', async () => {
      const result = await stack.initialize();
      
      expect(result.isSuccess()).toBe(true);
      expect(stack.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await stack.initialize();
      const result = await stack.initialize();
      
      expect(result.isSuccess()).toBe(true);
    });

    it('should initialize with custom config', async () => {
      const config: ObservabilityConfig = {
        logging: { level: 'debug', format: 'pretty' },
        metrics: { enabled: true, prefix: 'test' },
        tracing: { enabled: true, serviceName: 'test-service' },
        health: { enabled: true, checkInterval: 60000 }
      };
      
      const customStack = new ObservabilityStack(config);
      const result = await customStack.initialize();
      
      expect(result.isSuccess()).toBe(true);
      expect(customStack.getConfig().logging?.level).toBe('debug');
      expect(customStack.getConfig().tracing?.serviceName).toBe('test-service');
    });
  });

  describe('component access', () => {
    beforeEach(async () => {
      await stack.initialize();
    });

    it('should provide access to logger', () => {
      const logger = stack.getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should provide access to metrics collector', () => {
      const metrics = stack.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.counter).toBe('function');
    });

    it('should provide access to tracer', () => {
      const tracer = stack.getTracer();
      expect(tracer).toBeDefined();
      expect(typeof tracer.startSpan).toBe('function');
    });

    it('should provide access to health checker', () => {
      const health = stack.getHealth();
      expect(health).toBeDefined();
      expect(typeof health.checkHealth).toBe('function');
    });

    it('should provide access to correlation manager', () => {
      const correlation = stack.getCorrelation();
      expect(correlation).toBeDefined();
      expect(typeof correlation.startRequest).toBe('function');
    });

    it('should throw error when accessing uninitialized components', () => {
      const uninitializedStack = new ObservabilityStack();
      
      expect(() => uninitializedStack.getLogger()).toThrow();
      expect(() => uninitializedStack.getMetrics()).toThrow();
      expect(() => uninitializedStack.getTracer()).toThrow();
      expect(() => uninitializedStack.getHealth()).toThrow();
    });
  });

  describe('correlation context', () => {
    beforeEach(async () => {
      await stack.initialize();
    });

    it('should start request context', () => {
      const context = stack.startRequest();
      
      expect(context.correlationId).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.requestId).toBeDefined();
    });

    it('should provide correlation context methods', () => {
      const context = stack.startRequest({ correlationId: 'test-correlation' });
      
      stack.withContext(context, () => {
        expect(stack.getCorrelationId()).toBe('test-correlation');
        expect(stack.getContext()).toEqual(context);
      });
    });

    it('should handle async correlation context', async () => {
      const context = stack.startRequest({ correlationId: 'async-correlation' });
      
      await stack.withContextAsync(context, async () => {
        expect(stack.getCorrelationId()).toBe('async-correlation');
        expect(stack.getContext()).toEqual(context);
      });
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await stack.initialize();
      const result = await stack.shutdown();
      
      expect(result.isSuccess()).toBe(true);
      expect(stack.isInitialized()).toBe(false);
    });

    it('should handle shutdown of uninitialized stack', async () => {
      const result = await stack.shutdown();
      expect(result.isSuccess()).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('should throw error for invalid tracing config', () => {
      expect(() => {
        new ObservabilityStack({
          tracing: { enabled: true, serviceName: '' }
        });
      }).toThrow();
    });

    it('should provide normalized config', () => {
      const config = stack.getConfig();
      
      expect(config.logging).toBeDefined();
      expect(config.metrics).toBeDefined();
      expect(config.tracing).toBeDefined();
      expect(config.health).toBeDefined();
      expect(config.correlation).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should work with all components together', async () => {
    const config: ObservabilityConfig = {
      logging: { level: 'info' },
      metrics: { enabled: true },
      tracing: { enabled: true, serviceName: 'integration-test' },
      health: { enabled: true }
    };
    
    const stack = new ObservabilityStack(config);
    const initResult = await stack.initialize();
    
    expect(initResult.isSuccess()).toBe(true);
    
    // Test correlation context
    const context = stack.startRequest({ user_id: 'test-user'  });
    
    await stack.withContextAsync(context, async () => {
      // Test logger
      const logger = stack.getLogger();
      logger.info('Test message');
      
      // Test metrics
      const metrics = stack.getMetrics();
      metrics.counter('test.counter', 1);
      
      // Test tracer
      const tracer = stack.getTracer();
      const span = tracer.startSpan('test-operation');
      span.setAttribute('test', 'value');
      span.end();
      
      // Test health
      const health = stack.getHealth();
      const healthResult = await health.checkHealth();
      expect(healthResult.isSuccess()).toBe(true);
      
      // Verify correlation context is maintained
      expect(stack.getCorrelationId()).toBe(context.correlationId);
    });
    
    const shutdownResult = await stack.shutdown();
    expect(shutdownResult.isSuccess()).toBe(true);
  });
});


