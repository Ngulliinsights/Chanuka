import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Loading validation tests
 * Following navigation component patterns for testing
 */

import {
  validateLoadingProgress,
  validateLoadingStage,
  validateLoadingOperation,
  validateLoadingConfig,
  safeValidateLoadingProgress,
  safeValidateLoadingOperation,
  normalizeLoadingSize,
  normalizeLoadingType,
  isValidProgressPercentage,
} from '../validation';
import { LoadingValidationError } from '../errors';
import { DEFAULT_LOADING_CONFIG } from '../constants';

describe('Loading Validation', () => {
  describe('validateLoadingProgress', () => {
    it('should validate correct progress object', () => {
      const progress = {
        loaded: 5,
        total: 10,
        phase: 'critical' as const,
        currentAsset: '/test/asset.jpg',
      };
      
      const result = validateLoadingProgress(progress);
      expect(result).toEqual(progress);
    });

    it('should throw error for loaded > total', () => {
      const progress = {
        loaded: 15,
        total: 10,
        phase: 'critical' as const,
      };
      
      expect(() => validateLoadingProgress(progress)).toThrow(LoadingValidationError);
    });

    it('should throw error for negative values', () => {
      const progress = {
        loaded: -5,
        total: 10,
        phase: 'critical' as const,
      };
      
      expect(() => validateLoadingProgress(progress)).toThrow(LoadingValidationError);
    });

    it('should throw error for invalid phase', () => {
      const progress = {
        loaded: 5,
        total: 10,
        phase: 'invalid' as any,
      };
      
      expect(() => validateLoadingProgress(progress)).toThrow(LoadingValidationError);
    });
  });

  describe('validateLoadingStage', () => {
    it('should validate correct stage object', () => {
      const stage = {
        id: 'test-stage',
        message: 'Testing stage',
        duration: 5000,
        retryable: true,
      };
      
      const result = validateLoadingStage(stage);
      expect(result).toEqual(stage);
    });

    it('should throw error for empty ID', () => {
      const stage = {
        id: '',
        message: 'Testing stage',
      };
      
      expect(() => validateLoadingStage(stage)).toThrow(LoadingValidationError);
    });

    it('should throw error for empty message', () => {
      const stage = {
        id: 'test-stage',
        message: '',
      };
      
      expect(() => validateLoadingStage(stage)).toThrow(LoadingValidationError);
    });

    it('should throw error for message too long', () => {
      const stage = {
        id: 'test-stage',
        message: 'a'.repeat(201), // 201 characters
      };
      
      expect(() => validateLoadingStage(stage)).toThrow(LoadingValidationError);
    });

    it('should throw error for negative duration', () => {
      const stage = {
        id: 'test-stage',
        message: 'Testing stage',
        duration: -1000,
      };
      
      expect(() => validateLoadingStage(stage)).toThrow(LoadingValidationError);
    });
  });

  describe('validateLoadingOperation', () => {
    it('should validate correct operation object', () => {
      const operation = {
        id: 'test-op',
        type: 'component' as const,
        message: 'Loading component',
        priority: 'medium' as const,
        progress: 50,
        stage: 'loading',
        startTime: Date.now(),
        timeout: 5000,
        retryCount: 1,
        maxRetries: 3,
        connectionAware: true,
      };
      
      const result = validateLoadingOperation(operation);
      expect(result).toEqual(operation);
    });

    it('should throw error for retryCount > maxRetries', () => {
      const operation = {
        id: 'test-op',
        type: 'component' as const,
        message: 'Loading component',
        priority: 'medium' as const,
        startTime: Date.now(),
        retryCount: 5,
        maxRetries: 3,
        connectionAware: true,
      };
      
      expect(() => validateLoadingOperation(operation)).toThrow(LoadingValidationError);
    });

    it('should throw error for invalid timeout', () => {
      const operation = {
        id: 'test-op',
        type: 'component' as const,
        message: 'Loading component',
        priority: 'medium' as const,
        startTime: Date.now(),
        timeout: 500, // Less than minimum 1000ms
        retryCount: 0,
        maxRetries: 3,
        connectionAware: true,
      };
      
      expect(() => validateLoadingOperation(operation)).toThrow(LoadingValidationError);
    });

    it('should throw error for progress out of range', () => {
      const operation = {
        id: 'test-op',
        type: 'component' as const,
        message: 'Loading component',
        priority: 'medium' as const,
        progress: 150, // > 100
        startTime: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        connectionAware: true,
      };
      
      expect(() => validateLoadingOperation(operation)).toThrow(LoadingValidationError);
    });
  });

  describe('validateLoadingConfig', () => {
    it('should validate correct config object', () => {
      const result = validateLoadingConfig(DEFAULT_LOADING_CONFIG);
      expect(result).toEqual(DEFAULT_LOADING_CONFIG);
    });

    it('should throw error for invalid maxRetries', () => {
      const config = {
        ...DEFAULT_LOADING_CONFIG,
        errorHandling: {
          ...DEFAULT_LOADING_CONFIG.errorHandling,
          maxRetries: 15, // > 10
        },
      };
      
      expect(() => validateLoadingConfig(config)).toThrow(LoadingValidationError);
    });

    it('should throw error for invalid retryDelay', () => {
      const config = {
        ...DEFAULT_LOADING_CONFIG,
        errorHandling: {
          ...DEFAULT_LOADING_CONFIG.errorHandling,
          retryDelay: 50, // < 100
        },
      };
      
      expect(() => validateLoadingConfig(config)).toThrow(LoadingValidationError);
    });

    it('should throw error for invalid maxConcurrentOperations', () => {
      const config = {
        ...DEFAULT_LOADING_CONFIG,
        performance: {
          ...DEFAULT_LOADING_CONFIG.performance,
          maxConcurrentOperations: 25, // > 20
        },
      };
      
      expect(() => validateLoadingConfig(config)).toThrow(LoadingValidationError);
    });
  });

  describe('safeValidateLoadingProgress', () => {
    it('should return success for valid progress', () => {
      const progress = {
        loaded: 5,
        total: 10,
        phase: 'critical' as const,
      };
      
      const result = safeValidateLoadingProgress(progress);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(progress);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid progress', () => {
      const progress = {
        loaded: 15,
        total: 10,
        phase: 'critical' as const,
      };
      
      const result = safeValidateLoadingProgress(progress);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(LoadingValidationError);
    });
  });

  describe('safeValidateLoadingOperation', () => {
    it('should return success for valid operation', () => {
      const operation = {
        id: 'test-op',
        type: 'component' as const,
        message: 'Loading component',
        priority: 'medium' as const,
        startTime: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        connectionAware: true,
      };
      
      const result = safeValidateLoadingOperation(operation);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(operation);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid operation', () => {
      const operation = {
        id: 'test-op',
        type: 'component' as const,
        message: 'Loading component',
        priority: 'medium' as const,
        startTime: Date.now(),
        retryCount: 5,
        maxRetries: 3,
        connectionAware: true,
      };
      
      const result = safeValidateLoadingOperation(operation);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(LoadingValidationError);
    });
  });

  describe('normalizeLoadingSize', () => {
    it('should return valid size as-is', () => {
      expect(normalizeLoadingSize('sm')).toBe('sm');
      expect(normalizeLoadingSize('md')).toBe('md');
      expect(normalizeLoadingSize('lg')).toBe('lg');
    });

    it('should return default for invalid size', () => {
      expect(normalizeLoadingSize('invalid')).toBe('md');
      expect(normalizeLoadingSize(null)).toBe('md');
      expect(normalizeLoadingSize(undefined)).toBe('md');
    });
  });

  describe('normalizeLoadingType', () => {
    it('should return valid type as-is', () => {
      expect(normalizeLoadingType('page')).toBe('page');
      expect(normalizeLoadingType('component')).toBe('component');
      expect(normalizeLoadingType('progressive')).toBe('progressive');
    });

    it('should return default for invalid type', () => {
      expect(normalizeLoadingType('invalid')).toBe('component');
      expect(normalizeLoadingType(null)).toBe('component');
      expect(normalizeLoadingType(undefined)).toBe('component');
    });
  });

  describe('isValidProgressPercentage', () => {
    it('should return true for valid percentages', () => {
      expect(isValidProgressPercentage(0)).toBe(true);
      expect(isValidProgressPercentage(50)).toBe(true);
      expect(isValidProgressPercentage(100)).toBe(true);
    });

    it('should return false for invalid percentages', () => {
      expect(isValidProgressPercentage(-1)).toBe(false);
      expect(isValidProgressPercentage(101)).toBe(false);
      expect(isValidProgressPercentage(NaN)).toBe(false);
    });
  });
});

