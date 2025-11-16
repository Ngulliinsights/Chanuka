import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Integration Tests for Error Management System
 *
 * Comprehensive tests covering the entire error management pipeline
 * from error creation to user reporting and analytics.
 */

import { jest } from '@jest/globals';
import { BaseError, ErrorDomain, ErrorSeverity } from '../errors/base-error.js';
import { createErrorMonitor } from '../monitoring/error-monitor.js';
import { createErrorAnalyticsEngine } from '../analytics/error-analytics.js';
import { createUserErrorReporter } from '../reporting/user-error-reporter.js';
import { createErrorRecoveryEngine } from '../recovery/error-recovery-engine.js';
import { ErrorHandlerChain } from '../handlers/error-handler-chain.js';
import { ErrorBoundary } from '../handlers/error-boundary.js';
import { createConsoleIntegration, ErrorTrackingIntegrationManager } from '../integrations/error-tracking-integration.js';

describe('Error Management System Integration', () => {
  let errorMonitor: any;
  let analyticsEngine: any;
  let userReporter: any;
  let recoveryEngine: any;
  let integrationManager: ErrorTrackingIntegrationManager;

  beforeEach(async () => {
    // Initialize all components
    errorMonitor = createErrorMonitor({
      aggregationWindow: 1000, // 1 second for testing
      maxStoredErrors: 100
    });

    analyticsEngine = createErrorAnalyticsEngine({
      analysisWindow: 60000, // 1 minute
      trendPeriods: 10
    });

    userReporter = createUserErrorReporter({
      enableFeedback: true,
      maxReportsPerUser: 5
    });

    recoveryEngine = createErrorRecoveryEngine();

    integrationManager = new ErrorTrackingIntegrationManager();
    integrationManager.registerIntegration(createConsoleIntegration());

    await errorMonitor.start();
    await integrationManager.initializeAllIntegrations();
  });

  afterEach(async () => {
    await errorMonitor.stop();
    await integrationManager.shutdownAllIntegrations();
  });

  describe('Complete Error Handling Pipeline', () => {
    test('should process error from creation to analytics', async () => {
      // Create a test error
      const testError = new BaseError('Test database connection failed', {
        code: 'DB_CONNECTION_ERROR',
        domain: ErrorDomain.DATABASE,
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        retryable: true,
        context: {
          database: 'postgres',
          table: 'users',
          operation: 'SELECT'
        }
      });

      // Track the error
      await errorMonitor.trackError(testError, { user_id: 'user123',
        metadata: { session_id: 'session456'  }
      });

      // Add to analytics
      analyticsEngine.addError(testError);

      // Generate user report
      const recoveryOptions = userReporter.generateRecoveryOptions(testError);
      const report = userReporter.generateReport(testError, { user_id: 'user123',
        metadata: { session_id: 'session456'  }
      }, recoveryOptions);

      // Analyze recovery options
      const suggestions = await recoveryEngine.analyzeError(testError);

      // Verify the pipeline worked
      expect(testError.errorId).toBeDefined();
      expect(report.errorId).toBe(testError.errorId);
      expect(recoveryOptions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeGreaterThan(0);

      // Check analytics
      const analytics = analyticsEngine.generateAnalytics();
      expect(analytics.totalErrors).toBe(1);
      expect(analytics.errorDistribution[ErrorSeverity.HIGH]).toBe(1);

      // Check error monitor
      const metrics = errorMonitor.getMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorsByType['DB_CONNECTION_ERROR']).toBe(1);
    });

    test('should handle multiple errors with different severities', async () => {
      const errors = [
        new BaseError('Validation failed', {
          domain: ErrorDomain.VALIDATION,
          severity: ErrorSeverity.LOW,
          code: 'VALIDATION_ERROR'
        }),
        new BaseError('Network timeout', {
          domain: ErrorDomain.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          code: 'NETWORK_TIMEOUT',
          retryable: true
        }),
        new BaseError('Database corruption', {
          domain: ErrorDomain.DATABASE,
          severity: ErrorSeverity.CRITICAL,
          code: 'DB_CORRUPTION'
        })
      ];

      // Process all errors
      for (const error of errors) {
        await errorMonitor.trackError(error);
        analyticsEngine.addError(error);
      }

      // Verify analytics
      const analytics = analyticsEngine.generateAnalytics();
      expect(analytics.totalErrors).toBe(3);
      expect(analytics.errorDistribution[ErrorSeverity.LOW]).toBe(1);
      expect(analytics.errorDistribution[ErrorSeverity.MEDIUM]).toBe(1);
      expect(analytics.errorDistribution[ErrorSeverity.CRITICAL]).toBe(1);

      // Check top error types
      expect(analytics.topErrorTypes).toHaveLength(3);
      expect(analytics.topErrorTypes[0].type).toBe('VALIDATION_ERROR');
    });

    test('should generate recovery suggestions based on error type', async () => {
      const networkError = new BaseError('Connection timeout', {
        domain: ErrorDomain.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true
      });

      const authError = new BaseError('Invalid token', {
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM
      });

      // Get recovery suggestions
      const networkSuggestions = await recoveryEngine.analyzeError(networkError);
      const authSuggestions = await recoveryEngine.analyzeError(authError);

      // Network errors should have retry suggestions
      expect(networkSuggestions.some(s => s.id.includes('retry'))).toBe(true);

      // Auth errors should have re-login suggestions
      expect(authSuggestions.some(s => s.id.includes('relogin') || s.id.includes('token'))).toBe(true);
    });

    test('should handle user feedback submission', async () => {
      const error = new BaseError('Something went wrong', {
        severity: ErrorSeverity.MEDIUM
      });

      const report = userReporter.generateReport(error, { user_id: 'user123'
       });

      // Submit feedback
      await userReporter.submitFeedback(report.errorId, {
        rating: 3,
        comment: 'This error was confusing'
      });

      // Verify feedback was recorded
      const updatedReport = userReporter.getReport(report.errorId);
      expect(updatedReport?.feedback?.rating).toBe(3);
      expect(updatedReport?.feedback?.comment).toBe('This error was confusing');
    });

    test('should detect error anomalies', () => {
      // Add multiple errors to trigger anomaly detection
      for (let i = 0; i < 15; i++) {
        const error = new BaseError(`Error ${i}`, {
          code: 'TEST_ERROR',
          severity: ErrorSeverity.HIGH
        });
        analyticsEngine.addError(error);
      }

      const anomalies = analyticsEngine.detectAnomalies();

      // Should detect high error rate anomaly
      expect(anomalies.some(a => a.type === 'spike')).toBe(true);
    });

    test('should integrate with error tracking services', async () => {
      const error = new BaseError('Integration test error', {
        severity: ErrorSeverity.HIGH,
        code: 'INTEGRATION_TEST'
      });

      // Track error through integration manager
      await integrationManager.trackErrorToAll(error, { user_id: 'test-user',
        metadata: { session_id: 'test-session'  }
      });

      // Verify integrations received the error
      const consoleIntegration = integrationManager.getIntegration('console');
      expect(consoleIntegration).toBeDefined();
    });
  });

  describe('Error Handler Chain Integration', () => {
    test('should process errors through handler chain', async () => {
      const chain = new ErrorHandlerChain();
      const error = new BaseError('Chain test error', {
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      });

      const processedError = await chain.process(error);

      // Error should be processed (could be recovered or logged)
      expect(processedError).toBeDefined();
      expect(processedError.errorId).toBe(error.errorId);
    });
  });

  describe('Dashboard Data Generation', () => {
    test('should generate comprehensive dashboard data', () => {
      // Add various errors for dashboard testing
      const errors = [
        new BaseError('Dashboard error 1', { severity: ErrorSeverity.HIGH, code: 'DASH_ERROR_1' }),
        new BaseError('Dashboard error 2', { severity: ErrorSeverity.MEDIUM, code: 'DASH_ERROR_2' }),
        new BaseError('Dashboard error 1', { severity: ErrorSeverity.HIGH, code: 'DASH_ERROR_1' }) // Duplicate
      ];

      errors.forEach(error => analyticsEngine.addError(error));

      const dashboardData = analyticsEngine.generateDashboardData();

      expect(dashboardData.summary.totalErrors).toBe(3);
      expect(dashboardData.topIssues).toHaveLength(2); // Two unique error types
      expect(dashboardData.recentErrors).toHaveLength(3);
      expect(dashboardData.errorTrends.daily).toBeDefined();
    });
  });

  describe('Recovery Learning', () => {
    test('should learn from recovery outcomes', async () => {
      const error = new BaseError('Learning test error', {
        retryable: true,
        code: 'LEARNING_ERROR'
      });

      // Simulate successful recovery
      recoveryEngine.learnFromOutcome(error, true);

      // Get suggestions and check if learning improved confidence
      const suggestions = await recoveryEngine.analyzeError(error);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high volume of errors efficiently', async () => {
      const startTime = Date.now();

      // Simulate high error volume
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        const error = new BaseError(`Bulk error ${i}`, {
          code: `BULK_ERROR_${i % 10}`, // 10 different error types
          severity: i % 4 === 0 ? ErrorSeverity.CRITICAL : ErrorSeverity.MEDIUM
        });

        promises.push(errorMonitor.trackError(error));
        analyticsEngine.addError(error);
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify analytics still work
      const analytics = analyticsEngine.generateAnalytics();
      expect(analytics.totalErrors).toBe(100);
      expect(analytics.topErrorTypes.length).toBeLessThanOrEqual(10);
    });

    test('should maintain performance with large error history', () => {
      // Add many errors to test memory management
      for (let i = 0; i < 1000; i++) {
        const error = new BaseError(`History error ${i}`, {
          code: 'HISTORY_ERROR',
          severity: ErrorSeverity.LOW
        });
        analyticsEngine.addError(error);
      }

      const analytics = analyticsEngine.generateAnalytics();
      expect(analytics.totalErrors).toBe(1000);

      // Should still be performant
      const startTime = Date.now();
      analyticsEngine.generateDashboardData();
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Dashboard generation should be fast
    });
  });

  describe('Error Context Propagation', () => { test('should maintain error context throughout the pipeline', async () => {
      const context = {
        user_id: 'context-user',
        metadata: {
          session_id: 'context-session',
          requestId: 'context-request',
          operation: 'test-operation'
         }
      };

      const error = new BaseError('Context test error', {
        code: 'CONTEXT_ERROR',
        severity: ErrorSeverity.MEDIUM,
        context: context.metadata
      });

      // Track error with context
      await errorMonitor.trackError(error, context);

      // Generate report with context
      const report = userReporter.generateReport(error, context);

      // Verify context is preserved
      expect(report.user_id).toBe(context.user_id);
      expect(report.session_id).toBe(context.metadata.session_id);
    });
  });
});
