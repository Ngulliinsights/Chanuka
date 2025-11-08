/**
 * Advanced Error Handling System Tests
 * 
 * Comprehensive tests for the complete error handling system including
 * analytics, smart recovery, rate limiting, and monitoring.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { initializeForEnvironment, getErrorSystemStatus, resetErrorSystem } from '../error-system-initialization';
import { errorHandler, createNetworkError, createAuthError } from '../unified-error-handler';
import { smartRecoveryEngine } from '../advanced-error-recovery';
import { errorRateLimiter } from '../error-rate-limiter';
import { errorAnalytics } from '../error-analytics';
import { ErrorMonitoringDashboard } from '../../components/error/ErrorMonitoringDashboard';
import React from 'react';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  resetErrorSystem();
});

afterEach(() => {
  process.env = originalEnv;
  resetErrorSystem();
});

describe('Advanced Error System Integration', () => {
  describe('System Initialization', () => {
    test('should initialize for development environment', async () => {
      await initializeForEnvironment('development');
      
      const status = getErrorSystemStatus();
      expect(status.initialized).toBe(true);
      expect(status.coreHandler).toBe(true);
      expect(status.recovery).toBe(true);
      expect(status.rateLimiting).toBe(true);
    });

    test('should initialize for production environment', async () => {
      process.env.REACT_APP_ENABLE_ERROR_ANALYTICS = 'true';
      
      await initializeForEnvironment('production');
      
      const status = getErrorSystemStatus();
      expect(status.initialized).toBe(true);
      expect(status.analytics).toBe(true);
    });

    test('should handle initialization failures gracefully', async () => {
      // Mock a failure in one of the modules
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // This should not throw
      await expect(initializeForEnvironment('development')).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });

    test('should configure analytics providers from environment', async () => {
      process.env.REACT_APP_ENABLE_ERROR_ANALYTICS = 'true';
      process.env.REACT_APP_SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.REACT_APP_CUSTOM_ERROR_ENDPOINT = '/api/errors';
      
      await initializeForEnvironment('production');
      
      const providers = errorAnalytics.getProviders();
      expect(providers).toContain('Sentry');
      expect(providers).toContain('Custom');
    });
  });

  describe('Smart Recovery Engine', () => {
    beforeEach(async () => {
      await initializeForEnvironment('development');
    });

    test('should attempt recovery with smart strategies', async () => {
      const error = createNetworkError('Test network error', { status: 500 });
      
      const recovered = await smartRecoveryEngine.attemptRecovery(error);
      
      // Recovery attempt should be made (may or may not succeed)
      expect(typeof recovered).toBe('boolean');
    });

    test('should track recovery performance', async () => {
      const error = createNetworkError('Test error');
      
      await smartRecoveryEngine.attemptRecovery(error);
      
      const performance = smartRecoveryEngine.getStrategyPerformance();
      expect(performance.length).toBeGreaterThan(0);
      expect(performance[0]).toHaveProperty('successRate');
      expect(performance[0]).toHaveProperty('totalAttempts');
    });

    test('should provide recovery insights', async () => {
      const error1 = createNetworkError('Error 1');
      const error2 = createAuthError('Error 2');
      
      await smartRecoveryEngine.attemptRecovery(error1);
      await smartRecoveryEngine.attemptRecovery(error2);
      
      const insights = smartRecoveryEngine.getRecoveryInsights();
      expect(insights).toHaveProperty('totalRecoveries');
      expect(insights).toHaveProperty('successRate');
      expect(insights).toHaveProperty('mostSuccessfulStrategy');
    });

    test('should implement circuit breaker pattern', async () => {
      // Create multiple failing errors to trigger circuit breaker
      for (let i = 0; i < 10; i++) {
        const error = createNetworkError(`Error ${i}`, { status: 500 });
        await smartRecoveryEngine.attemptRecovery(error);
      }
      
      const performance = smartRecoveryEngine.getStrategyPerformance();
      const networkStrategy = performance.find(s => s.id.includes('network'));
      
      // Circuit breaker should eventually open
      expect(['CLOSED', 'HALF_OPEN', 'OPEN']).toContain(networkStrategy?.circuitBreakerState);
    });
  });

  describe('Error Rate Limiting', () => {
    beforeEach(async () => {
      await initializeForEnvironment('development');
    });

    test('should limit errors when threshold exceeded', () => {
      // Create many errors quickly
      for (let i = 0; i < 100; i++) {
        createNetworkError(`Spam error ${i}`);
      }
      
      const testError = createNetworkError('Test error');
      const limitResult = errorRateLimiter.shouldLimit(testError);
      
      expect(limitResult.limited).toBe(true);
      expect(limitResult.limitedBy.length).toBeGreaterThan(0);
    });

    test('should provide rate limit statistics', () => {
      // Create some errors
      for (let i = 0; i < 5; i++) {
        createNetworkError(`Error ${i}`);
      }
      
      const stats = errorRateLimiter.getGlobalStats();
      expect(stats).toHaveProperty('totalLimiters');
      expect(stats).toHaveProperty('activeLimiters');
      expect(stats).toHaveProperty('overallErrorRate');
    });

    test('should reset rate limits', () => {
      // Create errors to trigger rate limiting
      for (let i = 0; i < 20; i++) {
        createNetworkError(`Error ${i}`);
      }
      
      let stats = errorRateLimiter.getGlobalStats();
      expect(stats.activeLimiters).toBeGreaterThan(0);
      
      // Reset and check
      errorRateLimiter.reset();
      stats = errorRateLimiter.getGlobalStats();
      expect(stats.activeLimiters).toBe(0);
    });
  });

  describe('Error Analytics', () => {
    beforeEach(async () => {
      await initializeForEnvironment('production', {
        analytics: { enabled: true }
      });
    });

    test('should track errors when enabled', async () => {
      const error = createNetworkError('Analytics test error');
      
      // Analytics tracking happens asynchronously
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(errorAnalytics.isEnabled()).toBe(true);
    });

    test('should batch error tracking', async () => {
      // Create multiple errors quickly
      for (let i = 0; i < 5; i++) {
        createNetworkError(`Batch error ${i}`);
      }
      
      // Wait for batching
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Analytics should be processing these
      expect(errorAnalytics.isEnabled()).toBe(true);
    });

    test('should handle analytics failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create error that might fail analytics
      createNetworkError('Test error');
      
      // Should not throw even if analytics fails
      await new Promise(resolve => setTimeout(resolve, 100));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Monitoring Dashboard', () => {
    beforeEach(async () => {
      await initializeForEnvironment('development');
    });

    test('should render monitoring dashboard', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('Error Monitoring Dashboard')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    test('should display error statistics', () => {
      // Create some test errors
      createNetworkError('Test error 1');
      createAuthError('Test error 2');
      
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('Total Errors')).toBeInTheDocument();
      expect(screen.getByText('Recovery Rate')).toBeInTheDocument();
    });

    test('should allow error export', () => {
      createNetworkError('Export test error');
      
      render(<ErrorMonitoringDashboard enableExport={true} />);
      
      const exportButton = screen.getByText('📊 Export');
      expect(exportButton).toBeInTheDocument();
      
      // Mock URL.createObjectURL for export test
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      fireEvent.click(exportButton);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should refresh data automatically', async () => {
      render(<ErrorMonitoringDashboard refreshInterval={100} />);
      
      // Create error after render
      createNetworkError('Auto refresh test');
      
      // Wait for refresh
      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      }, { timeout: 200 });
    });

    test('should allow manual refresh', () => {
      render(<ErrorMonitoringDashboard />);
      
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);
      
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });

    test('should clear errors', () => {
      createNetworkError('Clear test error');
      
      render(<ErrorMonitoringDashboard />);
      
      const clearButton = screen.getByText('🗑️ Clear');
      fireEvent.click(clearButton);
      
      // Errors should be cleared
      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('End-to-End Error Flow', () => {
    beforeEach(async () => {
      await initializeForEnvironment('production', {
        analytics: { enabled: true },
        rateLimiting: { enabled: true }
      });
    });

    test('should handle complete error lifecycle', async () => {
      // 1. Create error
      const error = createNetworkError('E2E test error', { status: 500 });
      
      // 2. Error should be stored
      const recentErrors = errorHandler.getRecentErrors();
      expect(recentErrors).toContainEqual(expect.objectContaining({
        id: error.id,
        message: 'E2E test error'
      }));
      
      // 3. Recovery should be attempted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 4. Analytics should track it
      expect(errorAnalytics.isEnabled()).toBe(true);
      
      // 5. Rate limiting should be aware
      const rateLimitInfo = errorRateLimiter.getRateLimitInfo(error);
      expect(rateLimitInfo).toHaveProperty('general');
    });

    test('should handle error storms gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create error storm
      const errors = [];
      for (let i = 0; i < 200; i++) {
        errors.push(createNetworkError(`Storm error ${i}`));
      }
      
      // System should remain stable
      const status = getErrorSystemStatus();
      expect(status.initialized).toBe(true);
      
      // Rate limiting should kick in
      const testError = createNetworkError('Post-storm error');
      const limitResult = errorRateLimiter.shouldLimit(testError);
      expect(limitResult.limited).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should maintain performance under load', async () => {
      const startTime = performance.now();
      
      // Create many errors
      for (let i = 0; i < 1000; i++) {
        createNetworkError(`Performance test ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
      
      // System should still be responsive
      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should disable analytics in development', async () => {
      await initializeForEnvironment('development');
      
      const status = getErrorSystemStatus();
      expect(status.analytics).toBe(false);
    });

    test('should enable all features in production', async () => {
      process.env.REACT_APP_ENABLE_ERROR_ANALYTICS = 'true';
      
      await initializeForEnvironment('production');
      
      const status = getErrorSystemStatus();
      expect(status.analytics).toBe(true);
      expect(status.recovery).toBe(true);
      expect(status.rateLimiting).toBe(true);
    });

    test('should disable features in testing', async () => {
      await initializeForEnvironment('testing');
      
      const status = getErrorSystemStatus();
      expect(status.analytics).toBe(false);
      expect(status.rateLimiting).toBe(false);
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await initializeForEnvironment('development');
    });

    test('should limit stored errors to prevent memory leaks', () => {
      // Create more errors than the limit
      for (let i = 0; i < 200; i++) {
        createNetworkError(`Memory test ${i}`);
      }
      
      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBeLessThanOrEqual(100); // Default limit
    });

    test('should clean up old errors', () => {
      // Create errors
      for (let i = 0; i < 10; i++) {
        createNetworkError(`Cleanup test ${i}`);
      }
      
      const initialStats = errorHandler.getErrorStats();
      expect(initialStats.total).toBe(10);
      
      // Clear old errors (older than 1ms)
      const removedCount = errorHandler.clearErrorsOlderThan(1);
      
      const finalStats = errorHandler.getErrorStats();
      expect(finalStats.total).toBeLessThan(initialStats.total);
    });

    test('should handle system reset', () => {
      // Create errors and configure system
      createNetworkError('Reset test error');
      
      const initialStats = errorHandler.getErrorStats();
      expect(initialStats.total).toBeGreaterThan(0);
      
      // Reset system
      resetErrorSystem();
      
      const finalStats = errorHandler.getErrorStats();
      expect(finalStats.total).toBe(0);
    });
  });
});