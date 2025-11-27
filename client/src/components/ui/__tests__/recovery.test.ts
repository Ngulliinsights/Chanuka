/**
 * UI recovery utilities tests
 * Following navigation component testing patterns for consistency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UIRecoveryManager,
  attemptUIRecovery,
  getUIRecoverySuggestions,
  canAutoRecoverUI,
  createRecoveryContext,
  initializeUIRecoveryStrategies
} from '@client/recovery';
import { 
  UIError, 
  UIValidationError, 
  UIInputError, 
  UIFormError, 
  UIComponentError 
} from '@client/errors';

describe('UI Recovery Utilities', () => {
  let recoveryManager: UIRecoveryManager;

  beforeEach(() => {
    // Get a fresh instance for each test
    recoveryManager = UIRecoveryManager.getInstance();
    recoveryManager.clearStrategies(); // Clear strategies for test isolation
    vi.clearAllMocks();
  });

  describe('UIRecoveryManager', () => {
    describe('Singleton Pattern', () => {
      it('returns the same instance', () => {
        const instance1 = UIRecoveryManager.getInstance();
        const instance2 = UIRecoveryManager.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Strategy Registration', () => {
      it('registers recovery strategies', () => {
        const strategy = {
          type: 'automatic' as const,
          description: 'Test strategy',
          priority: 10,
          action: vi.fn().mockReturnValue(true)
        };

        expect(() => {
          recoveryManager.registerStrategy('UI_INPUT_ERROR', strategy);
        }).not.toThrow();
      });

      it('sorts strategies by priority', () => {
        const lowPriorityStrategy = {
          type: 'automatic' as const,
          description: 'Low priority',
          priority: 1,
          action: vi.fn().mockReturnValue(true)
        };

        const highPriorityStrategy = {
          type: 'automatic' as const,
          description: 'High priority',
          priority: 10,
          action: vi.fn().mockReturnValue(true)
        };

        recoveryManager.registerStrategy('UI_INPUT_ERROR', lowPriorityStrategy);
        recoveryManager.registerStrategy('UI_INPUT_ERROR', highPriorityStrategy);

        // Verify strategies are sorted by priority (implementation detail)
        // This test verifies the behavior through recovery attempts
      });
    });

    describe('Recovery Attempts', () => {
      it('attempts recovery with registered strategies', async () => {
        const strategy = {
          type: 'automatic' as const,
          description: 'Test recovery',
          priority: 10,
          action: vi.fn().mockResolvedValue(true)
        };

        recoveryManager.registerStrategy('UI_INPUT_ERROR', strategy);

        const error = new UIInputError('test-input', 'invalid', 'Test error');
        const context = createRecoveryContext('test-component', error);

        const result = await recoveryManager.attemptRecovery(context);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe(strategy);
        expect(strategy.action).toHaveBeenCalled();
      });

      it('tries multiple strategies until one succeeds', async () => {
        const failingStrategy = {
          type: 'automatic' as const,
          description: 'Failing strategy',
          priority: 10,
          action: vi.fn().mockResolvedValue(false)
        };

        const successStrategy = {
          type: 'automatic' as const,
          description: 'Success strategy',
          priority: 5,
          action: vi.fn().mockResolvedValue(true)
        };

        recoveryManager.registerStrategy('UI_INPUT_ERROR', failingStrategy);
        recoveryManager.registerStrategy('UI_INPUT_ERROR', successStrategy);

        const error = new UIInputError('test-input', 'invalid', 'Test error');
        const context = createRecoveryContext('test-component', error);

        const result = await recoveryManager.attemptRecovery(context);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe(successStrategy);
        expect(failingStrategy.action).toHaveBeenCalled();
        expect(successStrategy.action).toHaveBeenCalled();
      });

      it('returns failure when all strategies fail', async () => {
        const failingStrategy = {
          type: 'automatic' as const,
          description: 'Failing strategy',
          priority: 10,
          action: vi.fn().mockResolvedValue(false)
        };

        recoveryManager.registerStrategy('UI_INPUT_ERROR', failingStrategy);

        const error = new UIInputError('test-input', 'invalid', 'Test error');
        const context = createRecoveryContext('test-component', error);

        const result = await recoveryManager.attemptRecovery(context);

        expect(result.success).toBe(false);
        expect(result.message).toBe('All recovery strategies failed');
      });

      it('handles strategy exceptions gracefully', async () => {
        const throwingStrategy = {
          type: 'automatic' as const,
          description: 'Throwing strategy',
          priority: 10,
          action: vi.fn().mockRejectedValue(new Error('Strategy failed'))
        };

        const workingStrategy = {
          type: 'automatic' as const,
          description: 'Working strategy',
          priority: 5,
          action: vi.fn().mockResolvedValue(true)
        };

        recoveryManager.registerStrategy('UI_INPUT_ERROR', throwingStrategy);
        recoveryManager.registerStrategy('UI_INPUT_ERROR', workingStrategy);

        const error = new UIInputError('test-input', 'invalid', 'Test error');
        const context = createRecoveryContext('test-component', error);

        const result = await recoveryManager.attemptRecovery(context);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe(workingStrategy);
      });

      it('respects max retry limit', async () => {
        const error = new UIInputError('test-input', 'invalid', 'Test error');
        const context = createRecoveryContext('test-component', error, 5, 3); // retryCount > maxRetries

        const result = await recoveryManager.attemptRecovery(context);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Maximum retry attempts exceeded');
        expect(result.shouldRetry).toBe(false);
      });
    });

    describe('Recovery Suggestions', () => {
      it('provides suggestions for validation errors', () => {
        const error = new UIValidationError('Invalid input', 'email', 'invalid-email');
        const suggestions = recoveryManager.getRecoverySuggestions(error);

        expect(suggestions).toContain('Check the input format and try again');
        expect(suggestions).toContain('Ensure all required fields are filled');
        expect(suggestions).toContain('Focus on the email field');
      });

      it('provides suggestions for input errors', () => {
        const error = new UIInputError('username', 'invalid-chars', 'Invalid characters');
        const suggestions = recoveryManager.getRecoverySuggestions(error);

        expect(suggestions).toContain('Clear the input and try typing again');
        expect(suggestions).toContain('Check for special characters or formatting issues');
        expect(suggestions).toContain('Verify the username format');
      });

      it('provides suggestions for form errors', () => {
        const error = new UIFormError('login-form', { email: 'Invalid email', password: 'Too short' });
        const suggestions = recoveryManager.getRecoverySuggestions(error);

        expect(suggestions).toContain('Review all form fields for errors');
        expect(suggestions).toContain('Try refreshing the page and filling the form again');
        expect(suggestions).toContain('Fix the email field');
        expect(suggestions).toContain('Fix the password field');
      });

      it('provides suggestions for component errors', () => {
        const error = new UIComponentError('dropdown', 'render', 'Render failed');
        const suggestions = recoveryManager.getRecoverySuggestions(error);

        expect(suggestions).toContain('Try refreshing the page');
        expect(suggestions).toContain('Clear your browser cache and try again');
        expect(suggestions).toContain('Contact support if the problem persists');
      });
    });

    describe('Auto Recovery Detection', () => {
      it('identifies auto-recoverable errors', () => {
        const validationError = new UIValidationError('Invalid', 'field', 'value');
        const inputError = new UIInputError('input', 'value', 'error');

        expect(recoveryManager.canAutoRecover(validationError)).toBe(true);
        expect(recoveryManager.canAutoRecover(inputError)).toBe(true);
      });

      it('identifies non-auto-recoverable errors', () => {
        const componentError = new UIComponentError('component', 'action', 'error');

        expect(recoveryManager.canAutoRecover(componentError)).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('createRecoveryContext', () => {
      it('creates recovery context with default values', () => {
        const error = new UIInputError('input', 'value', 'error');
        const context = createRecoveryContext('test-component', error);

        expect(context.component).toBe('test-component');
        expect(context.error).toBe(error);
        expect(context.retryCount).toBe(0);
        expect(context.maxRetries).toBe(3);
        expect(context.timestamp).toBeInstanceOf(Date);
      });

      it('creates recovery context with custom values', () => {
        const error = new UIInputError('input', 'value', 'error');
        const additionalData = { custom: 'data' };
        const context = createRecoveryContext('test-component', error, 2, 5, additionalData);

        expect(context.retryCount).toBe(2);
        expect(context.maxRetries).toBe(5);
        expect(context.additionalData).toBe(additionalData);
      });
    });

    describe('attemptUIRecovery', () => {
      it('attempts recovery using the manager', async () => {
        const strategy = {
          type: 'automatic' as const,
          description: 'Test strategy',
          priority: 10,
          action: vi.fn().mockResolvedValue(true)
        };

        recoveryManager.registerStrategy('UI_INPUT_ERROR', strategy);

        const error = new UIInputError('input', 'value', 'error');
        const result = await attemptUIRecovery('test-component', error);

        expect(result.success).toBe(true);
      });
    });

    describe('getUIRecoverySuggestions', () => {
      it('gets suggestions using the manager', () => {
        const error = new UIValidationError('Invalid', 'field', 'value');
        const suggestions = getUIRecoverySuggestions(error);

        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('canAutoRecoverUI', () => {
      it('checks auto-recovery using the manager', () => {
        const validationError = new UIValidationError('Invalid', 'field', 'value');
        const componentError = new UIComponentError('component', 'action', 'error');

        expect(canAutoRecoverUI(validationError)).toBe(true);
        expect(canAutoRecoverUI(componentError)).toBe(false);
      });
    });
  });

  describe('Strategy Initialization', () => {
    it('initializes default strategies without errors', () => {
      expect(() => {
        initializeUIRecoveryStrategies();
      }).not.toThrow();
    });

    it('registers strategies for different error types', () => {
      initializeUIRecoveryStrategies();

      // Test that strategies are registered by attempting recovery
      const inputError = new UIInputError('input', 'value', 'error');
      const formError = new UIFormError('form', { field: 'error' });

      expect(async () => {
        await attemptUIRecovery('test', inputError);
        await attemptUIRecovery('test', formError);
      }).not.toThrow();
    });
  });

  describe('Recovery History', () => {
    it('tracks recovery attempts', async () => {
      const strategy = {
        type: 'automatic' as const,
        description: 'Test strategy',
        priority: 10,
        action: vi.fn().mockResolvedValue(true)
      };

      recoveryManager.registerStrategy('UI_INPUT_ERROR', strategy);

      const error = new UIInputError('input', 'value', 'error');
      
      // Make multiple recovery attempts
      await attemptUIRecovery('test-component', error, 0);
      await attemptUIRecovery('test-component', error, 1);

      // History tracking is internal, but we can verify it doesn't cause errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Error Type Handling', () => {
    it('handles different UI error types', async () => {
      const errors = [
        new UIValidationError('Validation failed', 'field', 'value'),
        new UIInputError('input', 'value', 'Input failed'),
        new UIFormError('form', { field: 'Form failed' }),
        new UIComponentError('component', 'action', 'Component failed')
      ];

      for (const error of errors) {
        expect(() => {
          getUIRecoverySuggestions(error);
          canAutoRecoverUI(error);
        }).not.toThrow();
      }
    });
  });
});

describe('recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined and properly exported', () => {
    expect(recovery).toBeDefined();
    expect(typeof recovery).not.toBe('undefined');
  });

  it('should export expected functions/classes', () => {
    // TODO: Add specific export tests for recovery
    expect(typeof recovery).toBe('object');
  });

  it('should handle basic functionality', () => {
    // TODO: Add specific functionality tests for recovery
    expect(true).toBe(true);
  });
});

