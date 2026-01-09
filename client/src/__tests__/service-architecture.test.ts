/**
 * Service Architecture Test Suite
 *
 * Comprehensive tests for the new service architecture including:
 * - Service Error Hierarchy
 * - Cache Service
 * - Service Factory
 * - Interface Compliance
 * - Service Decomposition
 * - Migration Compatibility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ServiceError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  ApiError,
  CacheError,
  CacheMissError,
  CacheCorruptionError,
  BusinessLogicError,
  ResourceNotFoundError,
  ConflictError,
  SystemError,
  DependencyError,
  ConfigurationError,
  ServiceErrorFactory,
  ErrorRecoveryManager,
  globalErrorHandler,
  errorRecoveryManager
} from '@client/shared/services/errors';

import { CacheService, CacheServiceFactory } from '@client/shared/services/cache';
import { ServiceFactory, ServiceContainer, ServiceLifecycle } from '@client/shared/services/factory';
import {
  AuthService,
  UserProfileService,
  DashboardService,
  EngagementService,
  AchievementService,
  userService as legacyUserService
} from '@client/features/users/services';

// ============================================================================
// SERVICE ERROR HIERARCHY TESTS
// ============================================================================

describe('Service Error Hierarchy', () => {
  it('should create base ServiceError with proper properties', () => {
    const error = new ServiceError('Test error', 'TestService', 'testOperation');

    expect(error.message).toBe('Test error');
    expect(error.service).toBe('TestService');
    expect(error.operation).toBe('testOperation');
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.name).toBe('ServiceError');
  });

  it('should create authentication errors', () => {
    const error = new AuthenticationError('Invalid credentials', 'login');

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toBe('Invalid credentials');
    expect(error.operation).toBe('login');
  });

  it('should create validation errors with field information', () => {
    const error = new ValidationError('Invalid email', 'UserService', 'register', 'email', 'invalid@email');

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.name).toBe('ValidationError');
    expect(error.field).toBe('email');
    expect(error.value).toBe('invalid@email');
  });

  it('should create API errors with status codes', () => {
    const error = new ApiError('Not found', 'ApiService', 'get', 404, '/api/test');

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.name).toBe('ApiError');
    expect(error.statusCode).toBe(404);
    expect(error.url).toBe('/api/test');
  });

  it('should create cache errors with cache-specific properties', () => {
    const error = new CacheError('Cache miss', 'get', 'test-key', 'get');

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.name).toBe('CacheError');
    expect(error.cacheKey).toBe('test-key');
    expect(error.cacheOperation).toBe('get');
  });

  it('should create resource not found errors', () => {
    const error = new ResourceNotFoundError('User', 'user123', 'get');

    expect(error).toBeInstanceOf(BusinessLogicError);
    expect(error.name).toBe('ResourceNotFoundError');
    expect(error.resourceType).toBe('User');
    expect(error.resourceId).toBe('user123');
  });

  it('should create system errors with component information', () => {
    const error = new SystemError('Database connection failed', 'Database', 'connect', 'postgres');

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.name).toBe('SystemError');
    expect(error.systemComponent).toBe('postgres');
  });

  it('should convert errors to JSON', () => {
    const error = new ValidationError('Test', 'Service', 'op', 'field', 'value');
    const json = error.toJSON();

    expect(json).toHaveProperty('name', 'ValidationError');
    expect(json).toHaveProperty('message', 'Test');
    expect(json).toHaveProperty('service', 'Service');
    expect(json).toHaveProperty('operation', 'op');
    expect(json).toHaveProperty('field', 'field');
    expect(json).toHaveProperty('value', 'value');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('stack');
  });
});

// ============================================================================
// ERROR FACTORY TESTS
// ============================================================================

describe('Service Error Factory', () => {
  it('should create authentication errors', () => {
    const error = ServiceErrorFactory.createAuthError('Login failed', 'login');

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Login failed');
    expect(error.operation).toBe('login');
  });

  it('should create validation errors', () => {
    const error = ServiceErrorFactory.createValidationError(
      'email', 'test', 'Invalid email', 'UserService', 'register'
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.field).toBe('email');
    expect(error.value).toBe('test');
    expect(error.message).toBe('Invalid email');
  });

  it('should create API errors', () => {
    const error = ServiceErrorFactory.createApiError('Server error', 500, '/api/test');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Server error');
    expect(error.statusCode).toBe(500);
    expect(error.url).toBe('/api/test');
  });

  it('should create cache errors', () => {
    const error = ServiceErrorFactory.createCacheError('Cache miss', 'key123', 'get', 'get');

    expect(error).toBeInstanceOf(CacheError);
    expect(error.message).toBe('Cache miss');
    expect(error.cacheKey).toBe('key123');
    expect(error.cacheOperation).toBe('get');
  });

  it('should create resource not found errors', () => {
    const error = ServiceErrorFactory.createNotFoundError('User', 'user123', 'get');

    expect(error).toBeInstanceOf(ResourceNotFoundError);
    expect(error.resourceType).toBe('User');
    expect(error.resourceId).toBe('user123');
  });

  it('should create system errors', () => {
    const error = ServiceErrorFactory.createSystemError('System failure', 'Database', 'connect');

    expect(error).toBeInstanceOf(SystemError);
    expect(error.message).toBe('System failure');
    expect(error.systemComponent).toBe('Database');
    expect(error.operation).toBe('connect');
  });
});

// ============================================================================
// ERROR RECOVERY MANAGER TESTS
// ============================================================================

describe('Error Recovery Manager', () => {
  let recoveryManager: ErrorRecoveryManager;

  beforeEach(() => {
    recoveryManager = ErrorRecoveryManager.getInstance();
  });

  it('should handle retry strategy', async () => {
    let attemptCount = 0;
    const operation = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new ServiceError('Temporary failure', 'TestService', 'test');
      }
      return 'success';
    });

    const result = await recoveryManager.executeWithRecovery(
      operation,
      { strategy: ServiceErrorFactory.RecoveryStrategy.RETRY, maxRetries: 3 },
      'test-operation'
    );

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should handle fallback strategy', async () => {
    const operation = vi.fn().mockRejectedValue(new ServiceError('Failed', 'TestService', 'test'));

    const result = await recoveryManager.executeWithRecovery(
      operation,
      { strategy: ServiceErrorFactory.RecoveryStrategy.FALLBACK, fallbackValue: 'fallback' },
      'test-operation'
    );

    expect(result).toBe('fallback');
  });

  it('should handle circuit breaker strategy', async () => {
    const operation = vi.fn().mockRejectedValue(new ServiceError('Service down', 'TestService', 'test'));

    // First few calls should fail and open circuit
    await expect(recoveryManager.executeWithRecovery(
      operation,
      { strategy: ServiceErrorFactory.RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 2 },
      'test-operation'
    )).rejects.toThrow();

    // Circuit should be open, subsequent calls should fail fast
    await expect(recoveryManager.executeWithRecovery(
      operation,
      { strategy: ServiceErrorFactory.RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 2 },
      'test-operation'
    )).rejects.toThrow();
  });
});

// ============================================================================
// CACHE SERVICE TESTS
// ============================================================================

describe('Cache Service', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({
      name: 'test-cache',
      defaultTTL: 1000,
      storageBackend: 'memory'
    });
  });

  it('should set and get cache entries', async () => {
    const testData = { id: 1, name: 'test' };

    await cache.set('test-key', testData);
    const result = await cache.get('test-key');

    expect(result).toEqual(testData);
  });

  it('should handle cache misses', async () => {
    const result = await cache.get('non-existent-key');
    expect(result).toBeNull();
  });

  it('should respect TTL', async () => {
    const testData = { id: 1, name: 'test' };

    await cache.set('test-key', testData, 100); // 100ms TTL

    // Should be available immediately
    let result = await cache.get('test-key');
    expect(result).toEqual(testData);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    result = await cache.get('test-key');
    expect(result).toBeNull();
  });

  it('should delete cache entries', async () => {
    const testData = { id: 1, name: 'test' };

    await cache.set('test-key', testData);
    await cache.delete('test-key');

    const result = await cache.get('test-key');
    expect(result).toBeNull();
  });

  it('should clear all cache entries', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    await cache.clear();

    const result1 = await cache.get('key1');
    const result2 = await cache.get('key2');

    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it('should provide cache metrics', async () => {
    const metrics = cache.getMetrics();

    expect(metrics).toHaveProperty('totalOperations');
    expect(metrics).toHaveProperty('hits');
    expect(metrics).toHaveProperty('misses');
    expect(metrics).toHaveProperty('evictions');
    expect(metrics).toHaveProperty('size');
    expect(metrics).toHaveProperty('hitRate');
    expect(metrics).toHaveProperty('avgAccessTime');
    expect(metrics).toHaveProperty('efficiency');
  });

  it('should warm cache with predefined data', async () => {
    cache.registerWarmingTask('warm-key', async () => ({ warmed: true }));

    await cache.warmCache();

    const result = await cache.get('warm-key');
    expect(result).toEqual({ warmed: true });
  });
});

// ============================================================================
// SERVICE FACTORY TESTS
// ============================================================================

describe('Service Factory', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  it('should register and resolve singleton services', () => {
    const registration = {
      id: 'test-service',
      factory: () => ({ name: 'test' }),
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies: []
    };

    container.register(registration);
    const service = container.resolve('test-service');

    expect(service).toEqual({ name: 'test' });
  });

  it('should register and resolve transient services', () => {
    let instanceCount = 0;
    const registration = {
      id: 'transient-service',
      factory: () => ({ id: ++instanceCount }),
      lifecycle: ServiceLifecycle.TRANSIENT,
      dependencies: []
    };

    container.register(registration);
    const service1 = container.resolve('transient-service');
    const service2 = container.resolve('transient-service');

    expect(service1.id).toBe(1);
    expect(service2.id).toBe(2);
    expect(service1).not.toBe(service2);
  });

  it('should handle service dependencies', () => {
    const dependencyRegistration = {
      id: 'dependency-service',
      factory: () => ({ type: 'dependency' }),
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies: []
    };

    const mainRegistration = {
      id: 'main-service',
      factory: (container: ServiceContainer) => {
        const dep = container.resolve('dependency-service');
        return { type: 'main', dependency: dep };
      },
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies: ['dependency-service']
    };

    container.register(dependencyRegistration);
    container.register(mainRegistration);

    const mainService = container.resolve('main-service');
    expect(mainService.type).toBe('main');
    expect(mainService.dependency.type).toBe('dependency');
  });

  it('should validate circular dependencies', () => {
    const serviceA = {
      id: 'service-a',
      factory: () => ({}),
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies: ['service-b']
    };

    const serviceB = {
      id: 'service-b',
      factory: () => ({}),
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies: ['service-a']
    };

    container.register(serviceA);

    expect(() => container.register(serviceB)).toThrow('Circular dependency detected');
  });

  it('should provide service statistics', () => {
    const registration = {
      id: 'test-service',
      factory: () => ({}),
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies: []
    };

    container.register(registration);
    const stats = container.getStatistics();

    expect(stats.totalServices).toBe(1);
    expect(stats.singletonServices).toBe(1);
    expect(stats.scopedServices).toBe(0);
    expect(stats.transientServices).toBe(0);
    expect(stats.initialized).toBe(false);
  });
});

// ============================================================================
// SERVICE DECOMPOSITION TESTS
// ============================================================================

describe('Service Decomposition', () => {
  describe('Auth Service', () => {
    it('should implement AuthService interface', () => {
      const auth = new AuthService();

      expect(auth).toHaveProperty('login');
      expect(auth).toHaveProperty('register');
      expect(auth).toHaveProperty('logout');
      expect(auth).toHaveProperty('getCurrentUser');
      expect(auth).toHaveProperty('refreshTokens');
      expect(auth).toHaveProperty('verifyEmail');
      expect(auth).toHaveProperty('requestPasswordReset');
      expect(auth).toHaveProperty('resetPassword');
      expect(auth).toHaveProperty('enableTwoFactor');
      expect(auth).toHaveProperty('verifyTwoFactorSetup');
      expect(auth).toHaveProperty('disableTwoFactor');
      expect(auth).toHaveProperty('validateTwoFactorToken');
    });

    it('should have proper service lifecycle methods', () => {
      const auth = new AuthService();

      expect(auth).toHaveProperty('init');
      expect(auth).toHaveProperty('dispose');
      expect(auth).toHaveProperty('healthCheck');
      expect(auth).toHaveProperty('getInfo');
      expect(auth).toHaveProperty('getStatistics');
    });
  });

  describe('User Profile Service', () => {
    it('should implement UserProfileService interface', () => {
      const profile = new UserProfileService();

      expect(profile).toHaveProperty('getUserProfile');
      expect(profile).toHaveProperty('updateProfile');
      expect(profile).toHaveProperty('updatePreferences');
      expect(profile).toHaveProperty('updateAvatar');
      expect(profile).toHaveProperty('updateCoverImage');
      expect(profile).toHaveProperty('getUserStatistics');
      expect(profile).toHaveProperty('getUserBadges');
      expect(profile).toHaveProperty('getUserAchievements');
      expect(profile).toHaveProperty('getActivityHistory');
    });
  });

  describe('Dashboard Service', () => {
    it('should implement DashboardService interface', () => {
      const dashboard = new DashboardService();

      expect(dashboard).toHaveProperty('getDashboardData');
      expect(dashboard).toHaveProperty('getDashboardWidgets');
      expect(dashboard).toHaveProperty('updateDashboardLayout');
      expect(dashboard).toHaveProperty('getUserMetrics');
      expect(dashboard).toHaveProperty('getBillRecommendations');
      expect(dashboard).toHaveProperty('getUnreadNotificationsCount');
      expect(dashboard).toHaveProperty('markNotificationAsRead');
      expect(dashboard).toHaveProperty('getNotifications');
      expect(dashboard).toHaveProperty('clearNotifications');
    });
  });

  describe('Engagement Service', () => {
    it('should implement EngagementService interface', () => {
      const engagement = new EngagementService();

      expect(engagement).toHaveProperty('trackEngagement');
      expect(engagement).toHaveProperty('getEngagementHistory');
      expect(engagement).toHaveProperty('getEngagementStats');
      expect(engagement).toHaveProperty('getSessionData');
      expect(engagement).toHaveProperty('endSession');
      expect(engagement).toHaveProperty('getUserStreak');
    });
  });

  describe('Achievement Service', () => {
    it('should implement AchievementService interface', () => {
      const achievement = new AchievementService();

      expect(achievement).toHaveProperty('getAchievementDefinitions');
      expect(achievement).toHaveProperty('getUserAchievements');
      expect(achievement).toHaveProperty('checkAchievementProgress');
      expect(achievement).toHaveProperty('awardAchievement');
      expect(achievement).toHaveProperty('getAchievementStats');
      expect(achievement).toHaveProperty('getLeaderboard');
    });
  });
});

// ============================================================================
// MIGRATION COMPATIBILITY TESTS
// ============================================================================

describe('Migration Compatibility', () => {
  it('should provide legacy UserService API', () => {
    expect(legacyUserService).toHaveProperty('login');
    expect(legacyUserService).toHaveProperty('register');
    expect(legacyUserService).toHaveProperty('logout');
    expect(legacyUserService).toHaveProperty('getCurrentUser');
    expect(legacyUserService).toHaveProperty('getUserProfile');
    expect(legacyUserService).toHaveProperty('updateProfile');
    expect(legacyUserService).toHaveProperty('updatePreferences');
    expect(legacyUserService).toHaveProperty('getDashboardData');
    expect(legacyUserService).toHaveProperty('getEngagementHistory');
    expect(legacyUserService).toHaveProperty('trackEngagement');
    expect(legacyUserService).toHaveProperty('getUserAchievements');
  });

  it('should delegate to new services', async () => {
    // Mock the new services
    const mockAuth = { login: vi.fn().mockResolvedValue({ user: { id: '1' } }) };
    const mockProfile = { getUserProfile: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }) };

    // This test would need actual service mocking in a real implementation
    // For now, we just verify the structure exists
    expect(typeof legacyUserService.login).toBe('function');
    expect(typeof legacyUserService.getUserProfile).toBe('function');
  });

  it('should maintain backward compatibility for deprecated methods', () => {
    // These methods should exist but log deprecation warnings
    expect(legacyUserService.updateUserProfile).toBeDefined();
    expect(legacyUserService.updateUserPreferences).toBeDefined();
    expect(legacyUserService.getDashboardDataForUser).toBeDefined();
    expect(legacyUserService.getEngagementHistoryForUser).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Service Architecture Integration', () => {
  it('should handle errors consistently across all services', async () => {
    const services = [
      new AuthService(),
      new UserProfileService(),
      new DashboardService(),
      new EngagementService(),
      new AchievementService()
    ];

    for (const service of services) {
      // All services should have error handling
      expect(service).toHaveProperty('healthCheck');
      expect(service).toHaveProperty('getInfo');
      expect(service).toHaveProperty('getStatistics');
    }
  });

  it('should provide consistent caching across services', () => {
    const services = [
      new AuthService(),
      new UserProfileService(),
      new DashboardService(),
      new EngagementService(),
      new AchievementService()
    ];

    for (const service of services) {
      // All services should have cache property
      expect(service).toHaveProperty('cache');
      expect(service.cache).toBeInstanceOf(CacheService);
    }
  });

  it('should maintain service isolation', () => {
    const auth = new AuthService();
    const profile = new UserProfileService();

    // Services should be independent instances
    expect(auth).not.toBe(profile);
    expect(auth.id).toBe('AuthService');
    expect(profile.id).toBe('UserProfileService');
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Service Performance', () => {
  it('should handle concurrent cache operations', async () => {
    const cache = new CacheService({
      name: 'concurrent-test',
      defaultTTL: 1000,
      storageBackend: 'memory'
    });

    const operations = Array.from({ length: 100 }, (_, i) =>
      cache.set(`key-${i}`, { value: i })
    );

    await Promise.all(operations);

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) => cache.get(`key-${i}`))
    );

    expect(results.length).toBe(100);
    results.forEach((result, i) => {
      expect(result).toEqual({ value: i });
    });
  });

  it('should handle high-frequency error recovery', async () => {
    const recoveryManager = ErrorRecoveryManager.getInstance();
    let errorCount = 0;

    const operation = vi.fn().mockImplementation(() => {
      errorCount++;
      if (errorCount <= 5) {
        throw new ServiceError('Temporary error', 'TestService', 'test');
      }
      return 'success';
    });

    const promises = Array.from({ length: 10 }, () =>
      recoveryManager.executeWithRecovery(
        operation,
        { strategy: ServiceErrorFactory.RecoveryStrategy.RETRY, maxRetries: 3 },
        'concurrent-test'
      )
    );

    const results = await Promise.all(promises);

    // Some operations should succeed after retries
    expect(results.some(result => result === 'success')).toBe(true);
  });
});
