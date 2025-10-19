import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseError, ErrorSeverity, ErrorDomain } from '../errors/base-error';

class TestError extends BaseError {
  constructor(message: string, options?: any) {
    super(message, options);
  }
}

describe('BaseError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('constructor', () => {
    it('should create error with default values', () => {
      const error = new TestError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.source).toBe('unknown');
      expect(error.metadata.retryable).toBe(false);
      expect(error.metadata.attemptCount).toBe(0);
    });

    it('should create error with custom options', () => {
      const error = new TestError('Custom message', {
        statusCode: 400,
        code: 'CUSTOM_ERROR',
        domain: ErrorDomain.VALIDATION,
        severity: ErrorSeverity.HIGH,
        source: 'test',
        retryable: true,
        context: { field: 'email' }
      });

      expect(error.message).toBe('Custom message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.metadata.domain).toBe(ErrorDomain.VALIDATION);
      expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.source).toBe('test');
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.context).toEqual({ field: 'email' });
    });

    it('should generate unique error IDs', () => {
      const error1 = new TestError('Error 1');
      const error2 = new TestError('Error 2');

      expect(error1.errorId).not.toBe(error2.errorId);
      expect(typeof error1.errorId).toBe('string');
      expect(error1.errorId.startsWith('err_')).toBe(true);
    });
  });

  describe('error relationships', () => {
    it('should detect related errors by correlation ID', () => {
      const parent = new TestError('Parent', { correlationId: 'test-correlation' });
      const child = new TestError('Child', { correlationId: 'test-correlation' });

      expect(parent.isRelatedTo(child)).toBe(true);
      expect(child.isRelatedTo(parent)).toBe(true);
    });

    it('should detect parent-child relationships', () => {
      const parent = new TestError('Parent');
      const child = parent.createChildError('Child');

      expect(parent.isRelatedTo(child)).toBe(true);
      expect(child.isRelatedTo(parent)).toBe(true);
      expect(child.metadata.parentErrorId).toBe(parent.errorId);
      expect(child.metadata.correlationId).toBe(parent.errorId);
    });

    it('should return false for unrelated errors', () => {
      const error1 = new TestError('Error 1');
      const error2 = new TestError('Error 2');

      expect(error1.isRelatedTo(error2)).toBe(false);
    });
  });

  describe('user message', () => {
    it('should return message by default', () => {
      const error = new TestError('Test message');
      expect(error.getUserMessage()).toBe('Test message');
    });

    it('should cache user message', () => {
      const error = new TestError('Test');
      const message1 = error.getUserMessage();
      const message2 = error.getUserMessage();

      expect(message1).toBe(message2);
      expect(message1).toBe('Test');
    });
  });

  describe('recovery strategies', () => {
    it('should attempt automatic recovery', async () => {
      const mockAction = vi.fn().mockResolvedValue(undefined);
      const error = new TestError('Recoverable error', {
        recoveryStrategies: [{
          name: 'retry',
          description: 'Retry the operation',
          automatic: true,
          action: mockAction
        }]
      });

      const recovered = await error.attemptRecovery();

      expect(recovered).toBe(true);
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(error.metadata.attemptCount).toBe(1);
      expect(error.metadata.lastAttempt).toBeInstanceOf(Date);
    });

    it('should skip manual recovery strategies', async () => {
      const mockAction = vi.fn();
      const error = new TestError('Error', {
        recoveryStrategies: [{
          name: 'manual',
          description: 'Manual recovery',
          automatic: false,
          action: mockAction
        }]
      });

      const recovered = await error.attemptRecovery();

      expect(recovered).toBe(false);
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle recovery failures', async () => {
      const mockAction = vi.fn().mockRejectedValue(new Error('Recovery failed'));
      const error = new TestError('Error', {
        recoveryStrategies: [{
          name: 'failing',
          description: 'Failing recovery',
          automatic: true,
          action: mockAction
        }]
      });

      const recovered = await error.attemptRecovery();

      expect(recovered).toBe(false);
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(error.metadata.attemptCount).toBe(1);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const error = new TestError('Test error', {
        statusCode: 400,
        code: 'TEST_ERROR',
        context: { userId: 123 }
      });

      const json = error.toJSON();

      expect(json.error).toBeDefined();
      expect(json.error.id).toBe(error.errorId);
      expect(json.error.message).toBe('Test error');
      expect(json.error.code).toBe('TEST_ERROR');
      expect(json.error.statusCode).toBe(400);
      expect(json.error.metadata.context).toEqual({ userId: 123 });
    });

    it('should convert to string', () => {
      const error = new TestError('Test');
      const str = error.toString();

      expect(typeof str).toBe('string');
      expect(str).toContain('Test');
      expect(str).toContain(error.errorId);
    });

    it('should deserialize from JSON', () => {
      const original = new TestError('Original', {
        statusCode: 404,
        domain: ErrorDomain.VALIDATION
      });

      const json = original.toJSON();
      const deserialized = BaseError.fromJSON(json);

      expect(deserialized.message).toBe('Original');
      expect(deserialized.statusCode).toBe(404);
      expect(deserialized.metadata.domain).toBe(ErrorDomain.VALIDATION);
    });

    it('should handle deserialization errors', () => {
      expect(() => BaseError.fromJSON('invalid')).toThrow();
      expect(() => BaseError.fromJSON({})).toThrow();
    });
  });

  describe('retry logic', () => {
    it('should allow retries when retryable', () => {
      const error = new TestError('Retryable', { retryable: true });

      expect(error.shouldRetry(3)).toBe(true);
      expect(error.metadata.attemptCount).toBe(0);
    });

    it('should prevent retries when not retryable', () => {
      const error = new TestError('Not retryable', { retryable: false });

      expect(error.shouldRetry(3)).toBe(false);
    });

    it('should respect max attempts', () => {
      const error = new TestError('Retryable', { retryable: true });

      // Simulate attempts
      error.metadata.attemptCount = 2;

      expect(error.shouldRetry(3)).toBe(true);
      expect(error.shouldRetry(2)).toBe(false);
    });
  });

  describe('safe logging', () => {
    it('should remove sensitive context for logging', () => {
      const error = new TestError('Test', {
        context: { password: 'secret', userId: 123 }
      });

      const safeLog = error.toSafeLog();

      expect(safeLog.error.metadata.context).toBeUndefined();
      expect(safeLog.error.message).toBe('Test');
    });
  });
});




































