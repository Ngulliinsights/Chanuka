/**
 * Integration Tests
 *
 * Tests for validation integration with error handling and observability.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateForm, validateField } from '../validator';
import { coreErrorHandler } from '../../error/handler';
import { ErrorDomain } from '../../error/constants';

describe('Validation Integration', () => {
  beforeEach(() => {
    // Initialize error handler if not already initialized
    if (!coreErrorHandler.getConfig().enableGlobalHandlers) {
      coreErrorHandler.initialize({
        enableGlobalHandlers: false,
        enableRecovery: false,
        logErrors: false,
        enableAnalytics: false,
      });
    }

    // Clear previous errors
    coreErrorHandler.clearErrors();
  });

  describe('Error Handler Integration', () => {
    it('should track validation errors in error handler', () => {
      const result = validateField('email', 'invalid-email', {
        required: true,
        email: true,
      });

      expect(result.success).toBe(false);

      // Check that error was tracked
      const stats = coreErrorHandler.getErrorStats();
      expect(stats.byType[ErrorDomain.VALIDATION]).toBeGreaterThan(0);
    });

    it('should include validation context in tracked errors', () => {
      validateField('email', 'invalid-email', { email: true });

      const recentErrors = coreErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].type).toBe(ErrorDomain.VALIDATION);
      expect(recentErrors[0].context?.component).toBe('Validator');
      expect(recentErrors[0].context?.operation).toBe('validate');
    });

    it('should track form validation errors', () => {
      const formData = {
        email: 'invalid',
        password: '123',
      };

      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8 },
      };

      const result = validateForm(formData, schema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Check error was tracked
      const recentErrors = coreErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].type).toBe(ErrorDomain.VALIDATION);
    });

    it('should include field errors in error details', () => {
      const formData = {
        email: 'invalid',
        password: '123',
      };

      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8 },
      };

      validateForm(formData, schema);

      const recentErrors = coreErrorHandler.getRecentErrors(1);
      expect(recentErrors[0].details?.fields).toBeDefined();
      expect(Array.isArray(recentErrors[0].details?.fields)).toBe(true);
    });
  });

  describe('Error Serialization', () => {
    it('should serialize validation errors correctly', () => {
      const result = validateField('email', 'invalid', { email: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Validation error should be serializable
      const serialized = result.error?.toJSON();
      expect(serialized).toBeDefined();
      expect(serialized?.type).toBe(ErrorDomain.VALIDATION);
      expect(serialized?.code).toBe('VALIDATION_ERROR');
    });

    it('should preserve field information in serialization', () => {
      const formData = {
        email: 'invalid',
      };

      const schema = {
        email: { required: true, email: true },
      };

      const result = validateForm(formData, schema);

      const serialized = result.error?.toJSON();
      expect(serialized?.details?.fields).toBeDefined();
    });
  });

  describe('Validation Error Recovery', () => {
    it('should mark validation errors as non-recoverable', () => {
      const result = validateField('email', 'invalid', { email: true });

      expect(result.success).toBe(false);
      expect(result.error?.recoverable).toBe(false);
      expect(result.error?.retryable).toBe(false);
    });

    it('should not trigger recovery strategies for validation errors', () => {
      const result = validateField('email', 'invalid', { email: true });

      expect(result.error?.recoveryStrategies).toHaveLength(0);
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should track multiple validation errors separately', () => {
      coreErrorHandler.clearErrors();

      validateField('email', 'invalid1', { email: true });
      validateField('email', 'invalid2', { email: true });
      validateField('email', 'invalid3', { email: true });

      const stats = coreErrorHandler.getErrorStats();
      expect(stats.byType[ErrorDomain.VALIDATION]).toBe(3);
    });

    it('should maintain error history', () => {
      coreErrorHandler.clearErrors();

      validateField('email', 'invalid1', { email: true });
      validateField('password', '123', { minLength: 8 });

      const recentErrors = coreErrorHandler.getRecentErrors(10);
      expect(recentErrors.length).toBeGreaterThanOrEqual(2);
      expect(recentErrors.every(e => e.type === ErrorDomain.VALIDATION)).toBe(true);
    });
  });
});
