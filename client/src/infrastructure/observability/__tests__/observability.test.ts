/**
 * Unit Tests: Observability Module
 * 
 * Tests for the unified observability module covering:
 * - Error tracking with various error contexts
 * - Performance metric collection
 * - Analytics event tracking
 * - Telemetry data aggregation
 * 
 * Requirements: 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { observability } from '../index';
import type { ErrorContext, PerformanceMetric, AnalyticsEvent, TelemetryData } from '../types';

// Mock the sub-modules
vi.mock('../error-monitoring', () => ({
  trackError: vi.fn(),
  initializeErrorMonitoring: vi.fn(),
}));

vi.mock('../performance', () => ({
  trackPerformance: vi.fn(() => Promise.resolve()),
  initializePerformanceMonitoring: vi.fn(),
}));

vi.mock('../analytics', () => ({
  trackEvent: vi.fn(),
  initializeAnalyticsTracking: vi.fn(),
}));

vi.mock('../telemetry', () => ({
  sendTelemetry: vi.fn().mockResolvedValue(undefined),
  initializeTelemetry: vi.fn(),
}));

// Import mocked modules
import * as errorMonitoring from '../error-monitoring';
import * as performance from '../performance';
import * as analytics from '../analytics';
import * as telemetry from '../telemetry';

describe('Observability Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Tracking', () => {
    it('should track error with basic context', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        component: 'TestComponent',
        operation: 'testOperation',
      };

      // Act
      observability.trackError(error, context);

      // Assert
      expect(errorMonitoring.trackError).toHaveBeenCalledWith(error, context);
      expect(errorMonitoring.trackError).toHaveBeenCalledTimes(1);
    });

    it('should track error with full context including userId', () => {
      // Arrange
      const error = new Error('Test error with user context');
      const context: ErrorContext = {
        component: 'UserComponent',
        operation: 'userOperation',
        userId: 'user-123',
        metadata: {
          action: 'submit',
          formId: 'contact-form',
        },
      };

      // Act
      observability.trackError(error, context);

      // Assert
      expect(errorMonitoring.trackError).toHaveBeenCalledWith(error, context);
      expect(errorMonitoring.trackError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Metric Collection', () => {
    it('should track performance metric with basic data', () => {
      // Arrange
      const metric: PerformanceMetric = {
        name: 'page-load',
        value: 1500,
        unit: 'ms',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      };

      // Act
      observability.trackPerformance(metric);

      // Assert
      expect(performance.trackPerformance).toHaveBeenCalledWith(metric);
      expect(performance.trackPerformance).toHaveBeenCalledTimes(1);
    });

    it('should track performance metric with category and metadata', () => {
      // Arrange
      const metric: PerformanceMetric = {
        name: 'api-response',
        value: 250,
        unit: 'ms',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        category: 'network',
        metadata: {
          endpoint: '/api/users',
          method: 'GET',
          statusCode: 200,
        },
      };

      // Act
      observability.trackPerformance(metric);

      // Assert
      expect(performance.trackPerformance).toHaveBeenCalledWith(metric);
      expect(performance.trackPerformance).toHaveBeenCalledTimes(1);
    });

    it('should handle performance tracking errors gracefully', () => {
      // Arrange
      vi.mocked(performance.trackPerformance).mockRejectedValueOnce(new Error('Tracking failed'));
      
      const metric: PerformanceMetric = {
        name: 'test-metric',
        value: 100,
        unit: 'ms',
        timestamp: new Date(),
      };

      // Act & Assert - should not throw
      expect(() => observability.trackPerformance(metric)).not.toThrow();
    });
  });

  describe('Analytics Event Tracking', () => {
    it('should track analytics event with basic data', () => {
      // Arrange
      const event: AnalyticsEvent = {
        name: 'button_click',
        properties: {
          buttonId: 'submit-btn',
          page: 'contact',
        },
      };

      // Act
      observability.trackEvent(event);

      // Assert
      expect(analytics.trackEvent).toHaveBeenCalledWith(event);
      expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('should track analytics event with user and session context', () => {
      // Arrange
      const event: AnalyticsEvent = {
        name: 'page_view',
        properties: {
          page: '/dashboard',
          referrer: '/home',
        },
        timestamp: new Date('2024-01-01T00:00:00Z'),
        userId: 'user-456',
        sessionId: 'session-789',
      };

      // Act
      observability.trackEvent(event);

      // Assert
      expect(analytics.trackEvent).toHaveBeenCalledWith(event);
      expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('should track analytics event without properties', () => {
      // Arrange
      const event: AnalyticsEvent = {
        name: 'app_opened',
      };

      // Act
      observability.trackEvent(event);

      // Assert
      expect(analytics.trackEvent).toHaveBeenCalledWith(event);
      expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Telemetry Data Aggregation', () => {
    it('should send telemetry data with basic payload', async () => {
      // Arrange
      const data: TelemetryData = {
        type: 'system_health',
        payload: {
          cpuUsage: 45,
          memoryUsage: 60,
          activeConnections: 10,
        },
      };

      // Act
      await observability.sendTelemetry(data);

      // Assert
      expect(telemetry.sendTelemetry).toHaveBeenCalledWith(data);
      expect(telemetry.sendTelemetry).toHaveBeenCalledTimes(1);
    });

    it('should send telemetry data with timestamp', async () => {
      // Arrange
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const data: TelemetryData = {
        type: 'performance_snapshot',
        payload: {
          fps: 60,
          renderTime: 16,
        },
        timestamp,
      };

      // Act
      await observability.sendTelemetry(data);

      // Assert
      expect(telemetry.sendTelemetry).toHaveBeenCalledWith(data);
      expect(telemetry.sendTelemetry).toHaveBeenCalledTimes(1);
    });

    it('should handle telemetry send failures', async () => {
      // Arrange
      vi.mocked(telemetry.sendTelemetry).mockRejectedValueOnce(new Error('Network error'));
      
      const data: TelemetryData = {
        type: 'test_data',
        payload: { test: true },
      };

      // Act & Assert
      await expect(observability.sendTelemetry(data)).rejects.toThrow('Network error');
    });
  });

  describe('Observability Metrics', () => {
    it('should return observability metrics structure', () => {
      // Act
      const metrics = observability.getMetrics();

      // Assert
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('analytics');
      expect(metrics).toHaveProperty('telemetry');
      
      expect(metrics.errors).toHaveProperty('total');
      expect(metrics.errors).toHaveProperty('byComponent');
      expect(metrics.errors).toHaveProperty('recent');
      
      expect(metrics.performance).toHaveProperty('averages');
      expect(metrics.performance).toHaveProperty('recent');
      
      expect(metrics.analytics).toHaveProperty('eventCount');
      expect(metrics.analytics).toHaveProperty('recentEvents');
      
      expect(metrics.telemetry).toHaveProperty('dataPointsSent');
    });
  });
});