/**
 * Error Recovery Strategies Tests
 *
 * Tests for retry, fallback, circuit breaker, and fail-fast patterns
 * across all four client systems (Security, Hooks, Library Services, Service Architecture).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ErrorDomain, ErrorSeverity, RecoveryAction } from '@client/infrastructure/error/constants';
import { coreErrorHandler } from '@client/infrastructure/error/handler';
import {
  networkRetryStrategy,
  cacheClearStrategy,
  pageReloadStrategy,
  authRefreshStrategy,
  authRetryStrategy,
  authLogoutStrategy,
  cacheFallbackStrategy,
  cacheRecoveryStrategy,
  gracefulDegradationStrategy,
  offlineModeStrategy,
  reducedFunctionalityStrategy,
  connectionAwareRetryStrategy,
  defaultRecoveryStrategies,
  executeRecovery,
  isRecoverable,
  registerDefaultRecoveryStrategies,
} from '@client/infrastructure/error/recovery';
import { AppError } from '@client/infrastructure/error/types';

// Mock dependencies
vi.mock('../../../core/error/handler', () => ({
  coreErrorHandler: {
    addRecoveryStrategy: vi.fn(),
  },
}));

// Mock window and navigator for browser-specific functionality
const mockWindow = {
  location: { href: 'http://test.com', reload: vi.fn() },
  caches: {
    keys: vi.fn(() => Promise.resolve(['test-cache'])),
    delete: vi.fn(() => Promise.resolve(true)),
    open: vi.fn(),
  },
  dispatchEvent: vi.fn(),
};

const mockNavigator = {
  onLine: true,
  userAgent: 'TestAgent/1.0',
  connection: {
    effectiveType: '4g',
  },
};

Object.defineProperty(window, 'location', { value: mockWindow.location, writable: true });
Object.defineProperty(window, 'caches', { value: mockWindow.caches, writable: true });
Object.defineProperty(window, 'dispatchEvent', { value: mockWindow.dispatchEvent, writable: true });
Object.defineProperty(navigator, 'onLine', { value: mockNavigator.onLine, writable: true });
Object.defineProperty(navigator, 'userAgent', { value: mockNavigator.userAgent, writable: true });
Object.defineProperty(navigator, 'connection', { value: mockNavigator.connection, writable: true });

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

describe('Network Retry Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recover network errors that are retryable', () => {
    const networkError = new AppError('Network error', 'NETWORK_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      retryable: true,
      retryCount: 0,
    });

    expect(networkRetryStrategy.canRecover(networkError)).toBe(true);
  });

  it('should not recover network errors with too many retries', () => {
    const networkError = new AppError('Network error', 'NETWORK_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      retryable: true,
      retryCount: 3,
    });

    expect(networkRetryStrategy.canRecover(networkError)).toBe(false);
  });

  it('should not recover non-network errors', () => {
    const validationError = new AppError('Validation error', 'VALIDATION_ERROR', ErrorDomain.VALIDATION, ErrorSeverity.MEDIUM, {
      retryable: true,
    });

    expect(networkRetryStrategy.canRecover(validationError)).toBe(false);
  });

  it('should have correct strategy properties', () => {
    expect(networkRetryStrategy.id).toBe('network-retry');
    expect(networkRetryStrategy.name).toBe('Network Retry');
    expect(networkRetryStrategy.priority).toBe(1);
    expect(networkRetryStrategy.maxRetries).toBe(3);
  });
});

describe('Cache Clear Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should recover critical errors that are recoverable', () => {
    const criticalError = new AppError('Critical error', 'CRITICAL_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL, {
      recoverable: true,
    });

    expect(cacheClearStrategy.canRecover(criticalError)).toBe(true);
  });

  it('should not recover non-critical errors', () => {
    const mediumError = new AppError('Medium error', 'MEDIUM_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      recoverable: true,
    });

    expect(cacheClearStrategy.canRecover(mediumError)).toBe(false);
  });

  it('should clear caches and reload page on recovery', async () => {
    const criticalError = new AppError('Critical error', 'CRITICAL_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL, {
      recoverable: true,
    });

    const result = await cacheClearStrategy.recover(criticalError);

    expect(result).toBe(true);
    expect(mockWindow.caches.keys).toHaveBeenCalled();
    expect(mockWindow.caches.delete).toHaveBeenCalledWith('test-cache');

    // Fast-forward timers to trigger reload
    vi.advanceTimersByTime(600);
    expect(mockWindow.location.reload).toHaveBeenCalled();
  });

  it('should handle cache clear failures gracefully', async () => {
    mockWindow.caches.keys.mockRejectedValueOnce(new Error('Cache error'));

    const criticalError = new AppError('Critical error', 'CRITICAL_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL, {
      recoverable: true,
    });

    const result = await cacheClearStrategy.recover(criticalError);

    expect(result).toBe(false);
  });
});

describe('Page Reload Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should recover high severity errors that are recoverable', () => {
    const highError = new AppError('High error', 'HIGH_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.HIGH, {
      recoverable: true,
    });

    expect(pageReloadStrategy.canRecover(highError)).toBe(true);
  });

  it('should recover critical errors', () => {
    const criticalError = new AppError('Critical error', 'CRITICAL_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL, {
      recoverable: true,
    });

    expect(pageReloadStrategy.canRecover(criticalError)).toBe(true);
  });

  it('should not recover medium or low severity errors', () => {
    const mediumError = new AppError('Medium error', 'MEDIUM_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      recoverable: true,
    });

    const lowError = new AppError('Low error', 'LOW_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.LOW, {
      recoverable: true,
    });

    expect(pageReloadStrategy.canRecover(mediumError)).toBe(false);
    expect(pageReloadStrategy.canRecover(lowError)).toBe(false);
  });

  it('should reload page on recovery', async () => {
    const highError = new AppError('High error', 'HIGH_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.HIGH, {
      recoverable: true,
    });

    const result = await pageReloadStrategy.recover(highError);

    expect(result).toBe(true);

    // Fast-forward timers to trigger reload
    vi.advanceTimersByTime(1100);
    expect(mockWindow.location.reload).toHaveBeenCalled();
  });
});

describe('Authentication Strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Auth Refresh Strategy', () => {
    it('should recover authentication errors that are recoverable', () => {
      const authError = new AppError('Auth error', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        recoverable: true,
      });

      expect(authRefreshStrategy.canRecover(authError)).toBe(true);
    });

    it('should attempt token refresh when refresh token exists', async () => {
      mockStorage.getItem.mockImplementation((key) => {
        if (key === 'refresh_token') return 'refresh-token-123';
        return null;
      });

      // Mock fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'new-token', refreshToken: 'new-refresh' }),
        } as Response)
      );

      const authError = new AppError('Auth error', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        recoverable: true,
      });

      const result = await authRefreshStrategy.recover(authError);

      expect(result).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-token');
      expect(mockStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
    });

    it('should redirect to login when no refresh token', async () => {
      mockStorage.getItem.mockReturnValue(null);

      const authError = new AppError('Auth error', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        recoverable: true,
      });

      const result = await authRefreshStrategy.recover(authError);

      expect(result).toBe(false);

      // Fast-forward timers to trigger redirect
      vi.advanceTimersByTime(1100);
      expect(mockWindow.location.href).toBe('/auth/login');
    });
  });

  describe('Auth Retry Strategy', () => {
    it('should recover on first retry for auth-related errors', () => {
      const authError = new AppError('Token expired', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        retryCount: 0,
      });

      expect(authRetryStrategy.canRecover(authError)).toBe(true);
    });

    it('should not recover after multiple retries', () => {
      const authError = new AppError('Token expired', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        retryCount: 2,
      });

      expect(authRetryStrategy.canRecover(authError)).toBe(false);
    });

    it('should wait and check for valid tokens', async () => {
      mockStorage.getItem.mockReturnValue('valid-token');

      const authError = new AppError('Token expired', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        retryCount: 0,
      });

      const result = await authRetryStrategy.recover(authError);

      expect(result).toBe(true);
    });
  });

  describe('Auth Logout Strategy', () => {
    it('should recover after multiple failed auth attempts', () => {
      const authError = new AppError('Auth failed', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        retryCount: 2,
      });

      expect(authLogoutStrategy.canRecover(authError)).toBe(true);
    });

    it('should clear tokens and redirect to login', async () => {
      const authError = new AppError('Auth failed', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
        retryCount: 2,
      });

      const result = await authLogoutStrategy.recover(authError);

      expect(result).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('refreshToken');

      // Fast-forward timers to trigger redirect
      vi.advanceTimersByTime(1100);
      expect(mockWindow.location.href).toBe('/auth/login');
    });
  });
});

describe('Cache Fallback Strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Fallback Strategy', () => {
    it('should recover network-related errors', () => {
      const networkError = new AppError('Network offline', 'NETWORK_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);

      expect(cacheFallbackStrategy.canRecover(networkError)).toBe(true);
    });

    it('should recover when offline', () => {
      mockNavigator.onLine = false;
      const error = new AppError('Connection lost', 'CONNECTION_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);

      expect(cacheFallbackStrategy.canRecover(error)).toBe(true);
      mockNavigator.onLine = true; // Reset
    });

    it('should check for cached API data', async () => {
      mockWindow.caches.keys.mockResolvedValue(['api-cache']);
      const mockCache = {
        keys: vi.fn().mockResolvedValue([
          new Request('/api/data'),
          new Request('/api/users'),
        ]),
      };
      mockWindow.caches.open = vi.fn().mockResolvedValue(mockCache);

      const error = new AppError('Network error', 'NETWORK_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
      const result = await cacheFallbackStrategy.recover(error);

      expect(result).toBe(true);
      expect(mockWindow.caches.open).toHaveBeenCalledWith('api-cache');
    });
  });

  describe('Cache Recovery Strategy', () => {
    it('should recover network and timeout errors', () => {
      const timeoutError = new AppError('Request timeout', 'TIMEOUT_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);

      expect(cacheRecoveryStrategy.canRecover(timeoutError)).toBe(true);
    });

    it('should use stale-while-revalidate pattern', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn().mockReturnValue(new Date().toISOString()),
        },
      };
      const mockCache = {
        match: vi.fn().mockResolvedValue(mockResponse),
        keys: vi.fn().mockResolvedValue([]),
      };
      mockWindow.caches.open = vi.fn().mockResolvedValue(mockCache);

      const error = new AppError('Server error', 'SERVER_ERROR', ErrorDomain.EXTERNAL_SERVICE, ErrorSeverity.MEDIUM);
      const result = await cacheRecoveryStrategy.recover(error);

      expect(result).toBe(true);
    });
  });
});

describe('Degradation Strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Graceful Degradation Strategy', () => {
    it('should always be available as last resort', () => {
      const anyError = new AppError('Any error', 'ANY_ERROR', ErrorDomain.UNKNOWN, ErrorSeverity.LOW);

      expect(gracefulDegradationStrategy.canRecover(anyError)).toBe(true);
    });

    it('should check for service worker and offline capabilities', async () => {
      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ active: true }) },
        writable: true,
      });

      const error = new AppError('Service error', 'SERVICE_ERROR', ErrorDomain.EXTERNAL_SERVICE, ErrorSeverity.HIGH);
      const result = await gracefulDegradationStrategy.recover(error);

      expect(result).toBe(true);
    });
  });

  describe('Offline Mode Strategy', () => {
    it('should recover when offline', () => {
      mockNavigator.onLine = false;
      const error = new AppError('Offline error', 'OFFLINE_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);

      expect(offlineModeStrategy.canRecover(error)).toBe(true);
      mockNavigator.onLine = true; // Reset
    });

    it('should enable offline mode when cache is available', async () => {
      mockWindow.caches.keys.mockResolvedValue(['offline-cache']);

      const error = new AppError('Connection error', 'CONNECTION_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM);
      const result = await offlineModeStrategy.recover(error);

      expect(result).toBe(true);
      expect(document.documentElement.classList.contains('offline-mode')).toBe(true);
    });
  });

  describe('Reduced Functionality Strategy', () => {
    it('should recover after multiple server failures', () => {
      const error = new AppError('Server error', 'SERVER_ERROR', ErrorDomain.EXTERNAL_SERVICE, ErrorSeverity.HIGH, {
        retryCount: 3,
      });

      expect(reducedFunctionalityStrategy.canRecover(error)).toBe(true);
    });

    it('should enable reduced functionality mode', async () => {
      const error = new AppError('API failure', 'API_ERROR', ErrorDomain.EXTERNAL_SERVICE, ErrorSeverity.HIGH, {
        retryCount: 3,
      });

      const result = await reducedFunctionalityStrategy.recover(error);

      expect(result).toBe(true);
      expect(document.documentElement.classList.contains('reduced-functionality')).toBe(true);
    });
  });
});

describe('Connection-Aware Retry Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recover on slow connections with few retries', () => {
    mockNavigator.connection.effectiveType = 'slow';
    const error = new AppError('Slow connection', 'SLOW_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      retryCount: 0,
    });

    expect(connectionAwareRetryStrategy.canRecover(error)).toBe(true);
  });

  it('should not recover after too many retries', () => {
    mockNavigator.connection.effectiveType = 'slow';
    const error = new AppError('Slow connection', 'SLOW_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      retryCount: 2,
    });

    expect(connectionAwareRetryStrategy.canRecover(error)).toBe(false);
  });

  it('should wait longer and check connection improvement', async () => {
    mockNavigator.connection.effectiveType = '4g';

    const error = new AppError('Connection error', 'CONNECTION_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      retryCount: 0,
    });

    const result = await connectionAwareRetryStrategy.recover(error);

    expect(result).toBe(true);
  });
});

describe('Recovery Execution Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeRecovery', () => {
    it('should execute retry recovery', async () => {
      const result = await executeRecovery('test-error', RecoveryAction.RETRY);

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RETRY);
    });

    it('should execute cache clear recovery', async () => {
      const result = await executeRecovery('test-error', RecoveryAction.CACHE_CLEAR);

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.CACHE_CLEAR);
    });

    it('should execute page reload recovery', async () => {
      const result = await executeRecovery('test-error', RecoveryAction.RELOAD);

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.RELOAD);

      // Fast-forward timers to trigger reload
      vi.advanceTimersByTime(1100);
      expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    it('should execute redirect recovery', async () => {
      const result = await executeRecovery('test-error', RecoveryAction.REDIRECT);

      expect(result.success).toBe(true);
      expect(result.action).toBe(RecoveryAction.REDIRECT);

      // Fast-forward timers to trigger redirect
      vi.advanceTimersByTime(1100);
      expect(mockWindow.location.href).toBe('/');
    });
  });
});

describe('Recovery Strategy Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register default recovery strategies', () => {
    registerDefaultRecoveryStrategies();

    expect(coreErrorHandler.addRecoveryStrategy).toHaveBeenCalledTimes(defaultRecoveryStrategies.length);
    defaultRecoveryStrategies.forEach(strategy => {
      expect(coreErrorHandler.addRecoveryStrategy).toHaveBeenCalledWith(strategy);
    });
  });

  it('should have all expected default strategies', () => {
    const strategyIds = defaultRecoveryStrategies.map(s => s.id);

    expect(strategyIds).toContain('network-retry');
    expect(strategyIds).toContain('cache-clear');
    expect(strategyIds).toContain('auth-refresh');
    expect(strategyIds).toContain('auth-retry');
    expect(strategyIds).toContain('auth-logout');
    expect(strategyIds).toContain('cache-fallback');
    expect(strategyIds).toContain('cache-recovery');
    expect(strategyIds).toContain('graceful-degradation');
    expect(strategyIds).toContain('offline-mode');
    expect(strategyIds).toContain('reduced-functionality');
    expect(strategyIds).toContain('connection-aware-retry');
    expect(strategyIds).toContain('page-reload');
  });
});

describe('Error Recoverability Detection', () => {
  it('should detect recoverable network errors', () => {
    const networkError = new AppError('Network error', 'NETWORK_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      recoverable: true,
    });

    expect(isRecoverable(networkError)).toBe(true);
  });

  it('should detect recoverable auth errors', () => {
    const authError = new AppError('Auth error', 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
      recoverable: true,
    });

    expect(isRecoverable(authError)).toBe(true);
  });

  it('should not recover critical errors', () => {
    const criticalError = new AppError('Critical error', 'CRITICAL_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL);

    expect(isRecoverable(criticalError)).toBe(false);
  });

  it('should handle unknown error types', () => {
    expect(isRecoverable(null)).toBe(false);
    expect(isRecoverable(undefined)).toBe(false);
    expect(isRecoverable('string error')).toBe(false);
    expect(isRecoverable({})).toBe(false);
  });
});

describe('Cross-System Recovery Consistency', () => {
  it('should maintain consistent strategy interface across all strategies', () => {
    defaultRecoveryStrategies.forEach(strategy => {
      expect(strategy).toHaveProperty('id');
      expect(strategy).toHaveProperty('name');
      expect(strategy).toHaveProperty('description');
      expect(strategy).toHaveProperty('canRecover');
      expect(strategy).toHaveProperty('recover');
      expect(strategy).toHaveProperty('priority');
      expect(typeof strategy.canRecover).toBe('function');
      expect(typeof strategy.recover).toBe('function');
    });
  });

  it('should have unique strategy IDs', () => {
    const ids = defaultRecoveryStrategies.map(s => s.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid priority ranges', () => {
    defaultRecoveryStrategies.forEach(strategy => {
      expect(strategy.priority).toBeGreaterThan(0);
      expect(strategy.priority).toBeLessThan(20);
    });
  });
});
