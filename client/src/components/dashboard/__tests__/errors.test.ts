import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard errors tests
 * Following navigation component error testing patterns
 */

import {
  DashboardError,
  DashboardDataFetchError,
  DashboardValidationError,
  DashboardConfigurationError,
  DashboardActionError,
  DashboardTopicError,
  DashboardErrorType
} from '../errors';

describe('Dashboard Errors', () => {
  describe('DashboardError', () => {
    it('should create error with default values', () => {
      const error = new DashboardError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('DashboardError');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
    });

    it('should create error with custom values', () => {
      const details = { field: 'test', value: 'invalid' };
      const error = new DashboardError(
        'Custom error',
        DashboardErrorType.DASHBOARD_VALIDATION_ERROR,
        422,
        details
      );

      expect(error.message).toBe('Custom error');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_VALIDATION_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(details);
    });

    it('should maintain proper stack trace', () => {
      const error = new DashboardError('Test error');
      expect(error.stack).toBeDefined();
    });

    it('should be instance of Error', () => {
      const error = new DashboardError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DashboardError);
    });
  });

  describe('DashboardDataFetchError', () => {
    it('should create data fetch error with endpoint', () => {
      const error = new DashboardDataFetchError('/api/dashboard/summary');

      expect(error.message).toBe('Failed to fetch dashboard data from /api/dashboard/summary');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_DATA_FETCH_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details?.endpoint).toBe('/api/dashboard/summary');
    });

    it('should create data fetch error with reason', () => {
      const error = new DashboardDataFetchError('/api/dashboard/summary', 'Network timeout');

      expect(error.message).toBe('Failed to fetch dashboard data from /api/dashboard/summary: Network timeout');
      expect(error.details?.reason).toBe('Network timeout');
    });

    it('should create data fetch error with additional details', () => {
      const details = { retryCount: 3, lastAttempt: new Date() };
      const error = new DashboardDataFetchError('/api/dashboard/summary', 'Network timeout', details);

      expect(error.details?.retryCount).toBe(3);
      expect(error.details?.lastAttempt).toBeDefined();
    });
  });

  describe('DashboardValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new DashboardValidationError('Invalid priority', 'priority', 'Invalid');

      expect(error.message).toBe('Invalid priority');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_VALIDATION_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details?.field).toBe('priority');
      expect(error.details?.value).toBe('Invalid');
    });

    it('should create validation error with additional details', () => {
      const zodError = { errors: [{ message: 'Invalid enum value' }] };
      const error = new DashboardValidationError(
        'Invalid priority',
        'priority',
        'Invalid',
        { zodError }
      );

      expect(error.details?.zodError).toEqual(zodError);
    });
  });

  describe('DashboardConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new DashboardConfigurationError('Invalid configuration');

      expect(error.message).toBe('Invalid configuration');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_CONFIGURATION_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should create configuration error with details', () => {
      const config = { refreshInterval: -1 };
      const error = new DashboardConfigurationError('Invalid refresh interval', { config });

      expect(error.details?.config).toEqual(config);
    });
  });

  describe('DashboardActionError', () => {
    it('should create action error with action name', () => {
      const error = new DashboardActionError('complete');

      expect(error.message).toBe('Dashboard action failed: complete');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_ACTION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details?.action).toBe('complete');
    });

    it('should create action error with reason', () => {
      const error = new DashboardActionError('complete', 'Action item not found');

      expect(error.message).toBe('Dashboard action failed: complete - Action item not found');
      expect(error.details?.reason).toBe('Action item not found');
    });

    it('should create action error with additional details', () => {
      const details = { actionId: 'action-123', userId: 'user-456' };
      const error = new DashboardActionError('complete', 'Permission denied', details);

      expect(error.details?.actionId).toBe('action-123');
      expect(error.details?.userId).toBe('user-456');
    });
  });

  describe('DashboardTopicError', () => {
    it('should create topic error with operation', () => {
      const error = new DashboardTopicError('add');

      expect(error.message).toBe('Topic add failed');
      expect(error.type).toBe(DashboardErrorType.DASHBOARD_TOPIC_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details?.operation).toBe('add');
    });

    it('should create topic error with topic ID', () => {
      const error = new DashboardTopicError('remove', 'topic-123');

      expect(error.message).toBe('Topic remove failed for topic topic-123');
      expect(error.details?.topicId).toBe('topic-123');
    });

    it('should create topic error with reason', () => {
      const error = new DashboardTopicError('update', 'topic-123', 'Topic name already exists');

      expect(error.message).toBe('Topic update failed for topic topic-123: Topic name already exists');
      expect(error.details?.reason).toBe('Topic name already exists');
    });

    it('should create topic error with additional details', () => {
      const details = { duplicateName: 'Healthcare', userId: 'user-456' };
      const error = new DashboardTopicError('add', undefined, 'Duplicate name', details);

      expect(error.details?.duplicateName).toBe('Healthcare');
      expect(error.details?.userId).toBe('user-456');
    });
  });

  describe('Error inheritance', () => {
    it('should have all specific errors inherit from DashboardError', () => {
      const dataFetchError = new DashboardDataFetchError('/api/test');
      const validationError = new DashboardValidationError('Invalid', 'field', 'value');
      const configError = new DashboardConfigurationError('Config error');
      const actionError = new DashboardActionError('test');
      const topicError = new DashboardTopicError('test');

      expect(dataFetchError).toBeInstanceOf(DashboardError);
      expect(validationError).toBeInstanceOf(DashboardError);
      expect(configError).toBeInstanceOf(DashboardError);
      expect(actionError).toBeInstanceOf(DashboardError);
      expect(topicError).toBeInstanceOf(DashboardError);
    });

    it('should have all errors inherit from Error', () => {
      const dashboardError = new DashboardError('Test');
      const dataFetchError = new DashboardDataFetchError('/api/test');
      const validationError = new DashboardValidationError('Invalid', 'field', 'value');

      expect(dashboardError).toBeInstanceOf(Error);
      expect(dataFetchError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(Error);
    });
  });

  describe('Error serialization', () => {
    it('should serialize error properties correctly', () => {
      const error = new DashboardValidationError('Invalid priority', 'priority', 'Invalid');
      
      const serialized = JSON.parse(JSON.stringify({
        message: error.message,
        type: error.type,
        statusCode: error.statusCode,
        details: error.details,
        isOperational: error.isOperational
      }));

      expect(serialized.message).toBe('Invalid priority');
      expect(serialized.type).toBe(DashboardErrorType.DASHBOARD_VALIDATION_ERROR);
      expect(serialized.statusCode).toBe(422);
      expect(serialized.details.field).toBe('priority');
      expect(serialized.details.value).toBe('Invalid');
      expect(serialized.isOperational).toBe(true);
    });
  });
});