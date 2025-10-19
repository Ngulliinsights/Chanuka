import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlerChain, RecoveryHandler, LoggingHandler } from '../handlers/error-handler-chain';
import { ValidationError } from '../errors/specialized';

describe('ErrorHandlerChain', () => {
  let chain: ErrorHandlerChain;

  beforeEach(() => {
    chain = new ErrorHandlerChain();
  });

  describe('addHandler', () => {
    it('should add handlers to the chain', () => {
      const handler = new RecoveryHandler();
      chain.addHandler(handler);

      const handlers = chain.getHandlers();
      expect(handlers).toContain(handler);
    });

    it('should sort handlers by priority', () => {
      const highPriorityHandler = { ...new RecoveryHandler(), priority: 1 };
      const lowPriorityHandler = { ...new LoggingHandler(), priority: 10 };

      chain.addHandler(lowPriorityHandler);
      chain.addHandler(highPriorityHandler);

      const handlers = chain.getHandlers();
      expect(handlers[0]).toBe(highPriorityHandler);
      expect(handlers[1]).toBe(lowPriorityHandler);
    });
  });

  describe('process', () => {
    it('should process error through handler chain', async () => {
      const mockHandler = {
        priority: 1,
        name: 'mock',
        canHandle: vi.fn().mockReturnValue(true),
        handle: vi.fn().mockResolvedValue(null),
      };

      chain.addHandler(mockHandler);

      const error = new ValidationError('Test error');
      const result = await chain.process(error);

      expect(mockHandler.canHandle).toHaveBeenCalledWith(error);
      expect(mockHandler.handle).toHaveBeenCalledWith(error);
      expect(result).toBe(error);
    });

    it('should return original error if no handler can handle it', async () => {
      const mockHandler = {
        priority: 1,
        name: 'mock',
        canHandle: vi.fn().mockReturnValue(false),
        handle: vi.fn(),
      };

      chain.addHandler(mockHandler);

      const error = new ValidationError('Test error');
      const result = await chain.process(error);

      expect(result).toBe(error);
      expect(mockHandler.handle).not.toHaveBeenCalled();
    });

    it('should handle errors in priority order', async () => {
      const highPriorityHandler = {
        priority: 1,
        name: 'high',
        canHandle: vi.fn().mockReturnValue(true),
        handle: vi.fn().mockResolvedValue(null),
      };

      const lowPriorityHandler = {
        priority: 10,
        name: 'low',
        canHandle: vi.fn().mockReturnValue(true),
        handle: vi.fn().mockResolvedValue(null),
      };

      chain.addHandler(lowPriorityHandler);
      chain.addHandler(highPriorityHandler);

      const error = new ValidationError('Test error');
      await chain.process(error);

      expect(highPriorityHandler.handle).toHaveBeenCalled();
      expect(lowPriorityHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('removeHandler', () => {
    it('should remove handler by name', () => {
      const handler = new RecoveryHandler();
      chain.addHandler(handler);

      expect(chain.getHandlers()).toContain(handler);

      chain.removeHandler('recovery');

      expect(chain.getHandlers()).not.toContain(handler);
    });
  });

  describe('clearHandlers', () => {
    it('should clear all handlers', () => {
      chain.addHandler(new RecoveryHandler());
      chain.addHandler(new LoggingHandler());

      expect(chain.getHandlers()).toHaveLength(2);

      chain.clearHandlers();

      expect(chain.getHandlers()).toHaveLength(0);
    });
  });
});

describe('RecoveryHandler', () => {
  let handler: RecoveryHandler;

  beforeEach(() => {
    handler = new RecoveryHandler();
  });

  it('should have correct priority and name', () => {
    expect(handler.priority).toBe(1);
    expect(handler.name).toBe('recovery');
  });

  it('should handle retryable errors', () => {
    const retryableError = new ValidationError('Retryable error');
    retryableError.metadata.retryable = true;

    expect(handler.canHandle(retryableError)).toBe(true);
  });

  it('should not handle non-retryable errors', () => {
    const nonRetryableError = new ValidationError('Non-retryable error');
    nonRetryableError.metadata.retryable = false;

    expect(handler.canHandle(nonRetryableError)).toBe(false);
  });
});

describe('LoggingHandler', () => {
  let handler: LoggingHandler;

  beforeEach(() => {
    handler = new LoggingHandler();
  });

  it('should have correct priority and name', () => {
    expect(handler.priority).toBe(10);
    expect(handler.name).toBe('logging');
  });

  it('should handle all errors', () => {
    const error = new ValidationError('Test error');
    expect(handler.canHandle(error)).toBe(true);
  });
});




































