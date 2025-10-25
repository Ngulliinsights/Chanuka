import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard validation tests
 * Following navigation component validation testing patterns
 */

import {
  validateActionItem,
  validateActivitySummary,
  validateTrackedTopic,
  validateDashboardConfig,
  validateDashboardData,
  safeValidateActionItem,
  safeValidateTrackedTopic,
  safeValidateDashboardConfig
} from '../validation';
import { DashboardValidationError } from '../errors';

describe('Dashboard Validation', () => {
  describe('validateActionItem', () => {
    const validActionItem = {
      id: 'action-1',
      title: 'Test Action',
      description: 'Test Description',
      priority: 'High' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate a valid action item', () => {
      expect(() => validateActionItem(validActionItem)).not.toThrow();
      const result = validateActionItem(validActionItem);
      expect(result).toEqual(validActionItem);
    });

    it('should throw error for missing required fields', () => {
      const invalidItem = { ...validActionItem };
      delete (invalidItem as any).id;

      expect(() => validateActionItem(invalidItem)).toThrow(DashboardValidationError);
    });

    it('should throw error for empty title', () => {
      const invalidItem = { ...validActionItem, title: '' };

      expect(() => validateActionItem(invalidItem)).toThrow(DashboardValidationError);
    });

    it('should throw error for title too long', () => {
      const invalidItem = { ...validActionItem, title: 'a'.repeat(201) };

      expect(() => validateActionItem(invalidItem)).toThrow(DashboardValidationError);
    });

    it('should throw error for description too long', () => {
      const invalidItem = { ...validActionItem, description: 'a'.repeat(1001) };

      expect(() => validateActionItem(invalidItem)).toThrow(DashboardValidationError);
    });

    it('should throw error for invalid priority', () => {
      const invalidItem = { ...validActionItem, priority: 'Invalid' as any };

      expect(() => validateActionItem(invalidItem)).toThrow(DashboardValidationError);
    });

    it('should validate optional fields', () => {
      const itemWithOptionals = {
        ...validActionItem,
        dueDate: new Date(),
        category: 'Legislative',
        billId: 'bill-123',
        completed: true
      };

      expect(() => validateActionItem(itemWithOptionals)).not.toThrow();
    });
  });

  describe('validateActivitySummary', () => {
    const validSummary = {
      billsTracked: 5,
      actionsNeeded: 3,
      topicsCount: 8,
      recentActivity: 12,
      completedActions: 7,
      pendingActions: 3,
      lastUpdated: new Date()
    };

    it('should validate a valid activity summary', () => {
      expect(() => validateActivitySummary(validSummary)).not.toThrow();
      const result = validateActivitySummary(validSummary);
      expect(result).toEqual(validSummary);
    });

    it('should throw error for negative values', () => {
      const invalidSummary = { ...validSummary, billsTracked: -1 };

      expect(() => validateActivitySummary(invalidSummary)).toThrow(DashboardValidationError);
    });

    it('should throw error for non-integer values', () => {
      const invalidSummary = { ...validSummary, actionsNeeded: 3.5 };

      expect(() => validateActivitySummary(invalidSummary)).toThrow(DashboardValidationError);
    });

    it('should throw error for missing required fields', () => {
      const invalidSummary = { ...validSummary };
      delete (invalidSummary as any).lastUpdated;

      expect(() => validateActivitySummary(invalidSummary)).toThrow(DashboardValidationError);
    });
  });

  describe('validateTrackedTopic', () => {
    const validTopic = {
      id: 'topic-1',
      name: 'Healthcare',
      category: 'legislative' as const,
      billCount: 5,
      isActive: true,
      createdAt: new Date()
    };

    it('should validate a valid tracked topic', () => {
      expect(() => validateTrackedTopic(validTopic)).not.toThrow();
      const result = validateTrackedTopic(validTopic);
      expect(result).toEqual(validTopic);
    });

    it('should throw error for empty name', () => {
      const invalidTopic = { ...validTopic, name: '' };

      expect(() => validateTrackedTopic(invalidTopic)).toThrow(DashboardValidationError);
    });

    it('should throw error for name too long', () => {
      const invalidTopic = { ...validTopic, name: 'a'.repeat(101) };

      expect(() => validateTrackedTopic(invalidTopic)).toThrow(DashboardValidationError);
    });

    it('should throw error for invalid category', () => {
      const invalidTopic = { ...validTopic, category: 'invalid' as any };

      expect(() => validateTrackedTopic(invalidTopic)).toThrow(DashboardValidationError);
    });

    it('should throw error for negative bill count', () => {
      const invalidTopic = { ...validTopic, billCount: -1 };

      expect(() => validateTrackedTopic(invalidTopic)).toThrow(DashboardValidationError);
    });

    it('should validate optional fields', () => {
      const topicWithOptionals = {
        ...validTopic,
        description: 'Healthcare related bills',
        keywords: ['health', 'medical']
      };

      expect(() => validateTrackedTopic(topicWithOptionals)).not.toThrow();
    });

    it('should throw error for description too long', () => {
      const invalidTopic = {
        ...validTopic,
        description: 'a'.repeat(501)
      };

      expect(() => validateTrackedTopic(invalidTopic)).toThrow(DashboardValidationError);
    });

    it('should throw error for keyword too long', () => {
      const invalidTopic = {
        ...validTopic,
        keywords: ['a'.repeat(51)]
      };

      expect(() => validateTrackedTopic(invalidTopic)).toThrow(DashboardValidationError);
    });
  });

  describe('validateDashboardConfig', () => {
    const validConfig = {
      refreshInterval: 30000,
      maxActionItems: 10,
      maxTrackedTopics: 20,
      enableAutoRefresh: true,
      showCompletedActions: false,
      defaultView: 'activity' as const
    };

    it('should validate a valid dashboard config', () => {
      expect(() => validateDashboardConfig(validConfig)).not.toThrow();
      const result = validateDashboardConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should throw error for refresh interval too short', () => {
      const invalidConfig = { ...validConfig, refreshInterval: 500 };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(DashboardValidationError);
    });

    it('should throw error for refresh interval too long', () => {
      const invalidConfig = { ...validConfig, refreshInterval: 4000000 };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(DashboardValidationError);
    });

    it('should throw error for invalid max items', () => {
      const invalidConfig = { ...validConfig, maxActionItems: 0 };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(DashboardValidationError);
    });

    it('should throw error for too many max items', () => {
      const invalidConfig = { ...validConfig, maxActionItems: 101 };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(DashboardValidationError);
    });

    it('should throw error for invalid default view', () => {
      const invalidConfig = { ...validConfig, defaultView: 'invalid' as any };

      expect(() => validateDashboardConfig(invalidConfig)).toThrow(DashboardValidationError);
    });
  });

  describe('validateDashboardData', () => {
    const validData = {
      summary: {
        billsTracked: 5,
        actionsNeeded: 3,
        topicsCount: 8,
        recentActivity: 12,
        completedActions: 7,
        pendingActions: 3,
        lastUpdated: new Date()
      },
      actionItems: [],
      trackedTopics: [],
      isLoading: false,
      error: null,
      lastRefresh: new Date()
    };

    it('should validate valid dashboard data', () => {
      expect(() => validateDashboardData(validData)).not.toThrow();
      const result = validateDashboardData(validData);
      expect(result).toEqual(validData);
    });

    it('should validate with error state', () => {
      const dataWithError = {
        ...validData,
        error: new Error('Test error'),
        lastRefresh: null
      };

      expect(() => validateDashboardData(dataWithError)).not.toThrow();
    });
  });

  describe('Safe validation functions', () => {
    describe('safeValidateActionItem', () => {
      it('should return success for valid item', () => {
        const validItem = {
          id: 'action-1',
          title: 'Test Action',
          description: 'Test Description',
          priority: 'High' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = safeValidateActionItem(validItem);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validItem);
        expect(result.error).toBeUndefined();
      });

      it('should return error for invalid item', () => {
        const invalidItem = { id: '', title: '', description: '' };

        const result = safeValidateActionItem(invalidItem);
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(DashboardValidationError);
      });
    });

    describe('safeValidateTrackedTopic', () => {
      it('should return success for valid topic', () => {
        const validTopic = {
          id: 'topic-1',
          name: 'Healthcare',
          category: 'legislative' as const,
          billCount: 5,
          isActive: true,
          createdAt: new Date()
        };

        const result = safeValidateTrackedTopic(validTopic);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validTopic);
        expect(result.error).toBeUndefined();
      });

      it('should return error for invalid topic', () => {
        const invalidTopic = { id: '', name: '', category: 'invalid' };

        const result = safeValidateTrackedTopic(invalidTopic);
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(DashboardValidationError);
      });
    });

    describe('safeValidateDashboardConfig', () => {
      it('should return success for valid config', () => {
        const validConfig = {
          refreshInterval: 30000,
          maxActionItems: 10,
          maxTrackedTopics: 20,
          enableAutoRefresh: true,
          showCompletedActions: false,
          defaultView: 'activity' as const
        };

        const result = safeValidateDashboardConfig(validConfig);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validConfig);
        expect(result.error).toBeUndefined();
      });

      it('should return error for invalid config', () => {
        const invalidConfig = { refreshInterval: -1 };

        const result = safeValidateDashboardConfig(invalidConfig);
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(DashboardValidationError);
      });
    });
  });
});