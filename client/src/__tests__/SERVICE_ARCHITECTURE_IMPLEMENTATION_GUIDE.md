# Service Architecture Modernization - Implementation Guide

## Quick Start Guide

This guide provides step-by-step instructions for implementing the service architecture modernization plan.

## Phase 1: Foundation Setup (Week 1)

### 1.1 Create Service Architecture Guidelines

Create the service architecture guidelines file:

```typescript
// client/src/lib/lib/services/architecture-guidelines.ts

/**
 * Service Architecture Guidelines
 * 
 * This document defines the standards and patterns for service development
 * in the modernized architecture.
 */

export interface ServiceArchitectureGuidelines {
  // Service Design Principles
  singleResponsibility: boolean;
  interfaceBasedDesign: boolean;
  dependencyInjection: boolean;
  errorHandling: boolean;
  cachingStrategy: boolean;
  
  // Service Structure Requirements
  maxLinesPerService: number;
  maxDependenciesPerService: number;
  requiredInterfaces: string[];
  
  // Testing Requirements
  minimumTestCoverage: number;
  requiredTestTypes: string[];
}

export const SERVICE_ARCHITECTURE_GUIDELINES: ServiceArchitectureGuidelines = {
  singleResponsibility: true,
  interfaceBasedDesign: true,
  dependencyInjection: true,
  errorHandling: true,
  cachingStrategy: true,
  maxLinesPerService: 200,
  maxDependenciesPerService: 5,
  requiredInterfaces: ['IService', 'IServiceLifecycle'],
  minimumTestCoverage: 90,
  requiredTestTypes: ['unit', 'integration', 'error-handling']
};
```

### 1.2 Implement Error Handling Framework

Create the error handling framework:

```typescript
// client/src/lib/lib/services/error-handling.ts

/**
 * Service Error Handling Framework
 * 
 * Provides consistent error handling patterns across all services.
 */

export abstract class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ValidationError extends ServiceError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR');
  }
}

export class NetworkError extends ServiceError {
  constructor(message: string, public readonly statusCode?: number) {
    super(`Network error: ${message}`, 'NETWORK_ERROR');
  }
}

export class CacheError extends ServiceError {
  constructor(operation: string, message: string) {
    super(`Cache ${operation} failed: ${message}`, 'CACHE_ERROR');
  }
}

export class ServiceErrorHandler {
  static handleServiceError(error: unknown, context: string): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new ServiceError(
        `Service error in ${context}: ${error.message}`, 
        'SERVICE_ERROR', 
        error
      );
    }
    
    return new ServiceError(`Unknown error in ${context}`, 'UNKNOWN_ERROR');
  }
  
  static logServiceError(error: ServiceError, logger: any): void {
    logger.error('Service error occurred', {
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      originalError: error.originalError
    });
  }
}
```

### 1.3 Implement Unified Caching Strategy

Create the caching framework:

```typescript
// client/src/lib/lib/services/cache-service.ts

/**
 * Unified Cache Service
 * 
 * Provides consistent caching patterns across all services.
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  strategy: 'memory' | 'session' | 'persistent';
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, config?: Partial<CacheConfig>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getStats(): CacheStats;
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
}

export class CacheServiceImpl implements ICacheService {
  private readonly caches = new Map<string, CacheEntry<any>>();
  private readonly defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    strategy: 'memory'
  };
  
  private stats = {
    hits: 0,
    misses: 0
  };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.caches.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.caches.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, config?: Partial<CacheConfig>): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const expiresAt = Date.now() + finalConfig.ttl;
    
    this.caches.set(key, { 
      value, 
      expiresAt, 
      createdAt: Date.now() 
    });
    
    this.cleanup();
  }

  async delete(key: string): Promise<void> {
    this.caches.delete(key);
  }

  async clear(): Promise<void> {
    this.caches.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of this.caches.keys()) {
      if (regex.test(key)) {
        this.caches.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;
    
    return {
      totalEntries: this.caches.size,
      memoryUsage: this.calculateMemoryUsage(),
      hitRate,
      missRate
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.caches.entries()) {
      if (now > entry.expiresAt) {
        this.caches.delete(key);
      }
    }
  }

  private calculateMemoryUsage(): number {
    // Simple memory usage calculation
    return this.caches.size * 1024; // Rough estimate
  }
}
```

## Phase 2: Service Migration Implementation (Weeks 2-6)

### 2.1 User Service Decomposition

#### Step 1: Create Authentication Service

```typescript
// client/src/features/auth/model/auth-service.ts

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  refreshToken(): Promise<void>;
  validateToken(token: string): Promise<boolean>;
}

export class AuthServiceImpl implements IAuthService {
  constructor(
    private readonly apiService: IApiService,
    private readonly cacheService: ICacheService,
    private readonly logger: ILogger
  ) {}

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await this.apiService.post('/auth/login', credentials);
      const session = response.data as AuthSession;
      
      // Cache session
      await this.cacheService.set(`session:${session.user.id}`, session, {
        ttl: session.tokens.expiresIn * 1000
      });
      
      this.logger.info('User logged in successfully', { userId: session.user.id });
      return session;
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'AuthService.login');
    }
  }

  async logout(): Promise<void> {
    try {
      const session = await this.getCurrentUser();
      if (session) {
        await this.apiService.post('/auth/logout', { sessionId: session.sessionId });
        await this.cacheService.delete(`session:${session.user.id}`);
      }
    } catch (error) {
      this.logger.warn('Logout failed', { error });
      // Continue with cleanup even if API call fails
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // Try to get from cache first
      const cachedSession = await this.cacheService.get<AuthSession>('current_session');
      if (cachedSession) {
        return cachedSession.user;
      }
      
      // Fallback to API
      const response = await this.apiService.get('/auth/me');
      return response.data as AuthUser;
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'AuthService.getCurrentUser');
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const session = await this.getCurrentUser();
      if (!session) {
        throw new ServiceError('No active session', 'NO_SESSION');
      }
      
      const response = await this.apiService.post('/auth/refresh', {
        refreshToken: session.tokens.refreshToken
      });
      
      const newSession = response.data as AuthSession;
      await this.cacheService.set(`session:${session.user.id}`, newSession, {
        ttl: newSession.tokens.expiresIn * 1000
      });
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'AuthService.refreshToken');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.apiService.post('/auth/validate', { token });
      return response.data.valid;
    } catch (error) {
      this.logger.warn('Token validation failed', { error });
      return false;
    }
  }
}
```

#### Step 2: Create User Profile Service

```typescript
// client/src/features/users/model/profile-service.ts

export interface IUserProfileService {
  getProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  deleteProfile(userId: string): Promise<void>;
  uploadAvatar(userId: string, file: File): Promise<string>;
}

export class UserProfileServiceImpl implements IUserProfileService {
  constructor(
    private readonly apiService: IApiService,
    private readonly cacheService: ICacheService,
    private readonly logger: ILogger
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      // Try cache first
      const cachedProfile = await this.cacheService.get<UserProfile>(`profile:${userId}`);
      if (cachedProfile) {
        return cachedProfile;
      }
      
      // Fetch from API
      const response = await this.apiService.get(`/users/${userId}/profile`);
      const profile = response.data as UserProfile;
      
      // Cache for 10 minutes
      await this.cacheService.set(`profile:${userId}`, profile, { ttl: 10 * 60 * 1000 });
      
      return profile;
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'UserProfileService.getProfile');
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await this.apiService.put(`/users/${userId}/profile`, updates);
      const updatedProfile = response.data as UserProfile;
      
      // Update cache
      await this.cacheService.set(`profile:${userId}`, updatedProfile, { ttl: 10 * 60 * 1000 });
      
      this.logger.info('Profile updated successfully', { userId });
      return updatedProfile;
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'UserProfileService.updateProfile');
    }
  }

  async deleteProfile(userId: string): Promise<void> {
    try {
      await this.apiService.delete(`/users/${userId}/profile`);
      await this.cacheService.delete(`profile:${userId}`);
      
      this.logger.info('Profile deleted successfully', { userId });
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'UserProfileService.deleteProfile');
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await this.apiService.post(`/users/${userId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const avatarUrl = response.data.url as string;
      
      // Update cached profile
      const cachedProfile = await this.cacheService.get<UserProfile>(`profile:${userId}`);
      if (cachedProfile) {
        cachedProfile.avatar_url = avatarUrl;
        await this.cacheService.set(`profile:${userId}`, cachedProfile, { ttl: 10 * 60 * 1000 });
      }
      
      return avatarUrl;
    } catch (error) {
      throw ServiceErrorHandler.handleServiceError(error, 'UserProfileService.uploadAvatar');
    }
  }
}
```

### 2.2 Service Factory Implementation

```typescript
// client/src/lib/lib/services/service-factory.ts

/**
 * Service Factory for Dependency Injection
 * 
 * Provides centralized service instantiation with dependency injection.
 */

export class ServiceFactory {
  private static instances = new Map<string, unknown>();
  private static dependencies = new Map<string, () => unknown>();

  // Register service dependencies
  static registerDependency<T>(name: string, factory: () => T): void {
    this.dependencies.set(name, factory);
  }

  // Get or create service instance
  static getService<T>(name: string): T {
    if (!this.instances.has(name)) {
      const factory = this.dependencies.get(name);
      if (!factory) {
        throw new Error(`Service factory not registered for: ${name}`);
      }
      
      this.instances.set(name, factory());
    }
    
    return this.instances.get(name) as T;
  }

  // Clear all instances (for testing)
  static clearInstances(): void {
    this.instances.clear();
  }

  // Service instantiation methods
  static getAuthService(): IAuthService {
    return this.getService<IAuthService>('authService');
  }

  static getUserProfileService(): IUserProfileService {
    return this.getService<IUserProfileService>('userProfileService');
  }

  static getDashboardService(): IUserDashboardService {
    return this.getService<IUserDashboardService>('dashboardService');
  }

  static getEngagementService(): IUserEngagementService {
    return this.getService<IUserEngagementService>('engagementService');
  }

  static getCacheService(): ICacheService {
    return this.getService<ICacheService>('cacheService');
  }
}

// Initialize service dependencies
export function initializeServices(): void {
  ServiceFactory.registerDependency('cacheService', () => new CacheServiceImpl());
  ServiceFactory.registerDependency('authService', () => new AuthServiceImpl(
    ApiService.getInstance(),
    ServiceFactory.getCacheService(),
    Logger.getInstance()
  ));
  ServiceFactory.registerDependency('userProfileService', () => new UserProfileServiceImpl(
    ApiService.getInstance(),
    ServiceFactory.getCacheService(),
    Logger.getInstance()
  ));
  ServiceFactory.registerDependency('dashboardService', () => new UserDashboardServiceImpl(
    ApiService.getInstance(),
    ServiceFactory.getCacheService(),
    Logger.getInstance()
  ));
  ServiceFactory.registerDependency('engagementService', () => new UserEngagementServiceImpl(
    ApiService.getInstance(),
    ServiceFactory.getCacheService(),
    Logger.getInstance()
  ));
}
```

## Phase 3: Testing Implementation (Weeks 7-8)

### 3.1 Create Testing Utilities

```typescript
// client/src/lib/lib/services/testing-utils.ts

/**
 * Service Testing Utilities
 * 
 * Provides utilities for testing services with proper mocking.
 */

export class MockServiceFactory {
  static createMockAuthService(): vitest.Mocked<IAuthService> {
    return {
      login: vitest.fn(),
      logout: vitest.fn(),
      getCurrentUser: vitest.fn(),
      refreshToken: vitest.fn(),
      validateToken: vitest.fn(),
    };
  }

  static createMockUserProfileService(): vitest.Mocked<IUserProfileService> {
    return {
      getProfile: vitest.fn(),
      updateProfile: vitest.fn(),
      deleteProfile: vitest.fn(),
      uploadAvatar: vitest.fn(),
    };
  }

  static createMockCacheService(): vitest.Mocked<ICacheService> {
    return {
      get: vitest.fn(),
      set: vitest.fn(),
      delete: vitest.fn(),
      clear: vitest.fn(),
      invalidate: vitest.fn(),
      getStats: vitest.fn(),
    };
  }

  static createMockApiService(): vitest.Mocked<IApiService> {
    return {
      get: vitest.fn(),
      post: vitest.fn(),
      put: vitest.fn(),
      delete: vitest.fn(),
      patch: vitest.fn(),
    };
  }

  static createMockLogger(): vitest.Mocked<ILogger> {
    return {
      info: vitest.fn(),
      warn: vitest.fn(),
      error: vitest.fn(),
      debug: vitest.fn(),
    };
  }
}

export abstract class ServiceTestBase<T> {
  protected service: T;
  protected mocks: Record<string, vitest.Mocked<unknown>> = {};

  protected abstract createService(): T;
  protected abstract setupMocks(): void;

  protected beforeEach(): void {
    this.setupMocks();
    this.service = this.createService();
  }

  protected afterEach(): void {
    vitest.clearAllMocks();
    ServiceFactory.clearInstances();
  }

  protected verifyMocks(): void {
    Object.values(this.mocks).forEach(mock => {
      expect(mock).toBeDefined();
    });
  }

  protected expectServiceError(
    promise: Promise<any>,
    expectedCode: string,
    expectedMessage?: string
  ): Promise<void> {
    return expect(promise).rejects.toMatchObject({
      code: expectedCode,
      ...(expectedMessage && { message: expect.stringContaining(expectedMessage) })
    });
  }
}
```

### 3.2 Example Service Test

```typescript
// client/src/features/users/model/profile-service.test.ts

import { ServiceTestBase } from '@shared/lib/services/testing-utils';
import { UserProfileServiceImpl } from './profile-service';
import { MockServiceFactory } from '@shared/lib/services/testing-utils';

describe('UserProfileService', () => {
  class TestUserProfileService extends ServiceTestBase<IUserProfileService> {
    protected createService(): IUserProfileService {
      return new UserProfileServiceImpl(
        this.mocks.apiService as any,
        this.mocks.cacheService as any,
        this.mocks.logger as any
      );
    }

    protected setupMocks(): void {
      this.mocks.apiService = MockServiceFactory.createMockApiService();
      this.mocks.cacheService = MockServiceFactory.createMockCacheService();
      this.mocks.logger = MockServiceFactory.createMockLogger();
    }
  }

  let test: TestUserProfileService;

  beforeEach(() => {
    test = new TestUserProfileService();
    test.beforeEach();
  });

  afterEach(() => {
    test.afterEach();
  });

  describe('getProfile', () => {
    it('should return cached profile when available', async () => {
      const userId = 'user123';
      const cachedProfile = { id: userId, name: 'Test User', email: 'test@example.com' };
      
      test.mocks.cacheService.get.mockResolvedValue(cachedProfile);
      
      const result = await test.service.getProfile(userId);
      
      expect(result).toEqual(cachedProfile);
      expect(test.mocks.cacheService.get).toHaveBeenCalledWith(`profile:${userId}`);
      expect(test.mocks.apiService.get).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache when not available', async () => {
      const userId = 'user123';
      const apiProfile = { id: userId, name: 'Test User', email: 'test@example.com' };
      
      test.mocks.cacheService.get.mockResolvedValue(null);
      test.mocks.apiService.get.mockResolvedValue({ data: apiProfile });
      
      const result = await test.service.getProfile(userId);
      
      expect(result).toEqual(apiProfile);
      expect(test.mocks.apiService.get).toHaveBeenCalledWith(`/users/${userId}/profile`);
      expect(test.mocks.cacheService.set).toHaveBeenCalledWith(
        `profile:${userId}`, 
        apiProfile, 
        { ttl: 10 * 60 * 1000 }
      );
    });

    it('should handle API errors gracefully', async () => {
      const userId = 'user123';
      
      test.mocks.cacheService.get.mockResolvedValue(null);
      test.mocks.apiService.get.mockRejectedValue(new Error('API Error'));
      
      await test.expectServiceError(
        test.service.getProfile(userId),
        'SERVICE_ERROR',
        'API Error'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile and cache', async () => {
      const userId = 'user123';
      const updates = { name: 'Updated Name' };
      const updatedProfile = { id: userId, name: 'Updated Name', email: 'test@example.com' };
      
      test.mocks.apiService.put.mockResolvedValue({ data: updatedProfile });
      
      const result = await test.service.updateProfile(userId, updates);
      
      expect(result).toEqual(updatedProfile);
      expect(test.mocks.apiService.put).toHaveBeenCalledWith(`/users/${userId}/profile`, updates);
      expect(test.mocks.cacheService.set).toHaveBeenCalledWith(
        `profile:${userId}`,
        updatedProfile,
        { ttl: 10 * 60 * 1000 }
      );
    });
  });
});
```

## Phase 4: Migration Execution (Weeks 9-12)

### 4.1 Gradual Migration Strategy

```typescript
// client/src/lib/lib/services/migration-utils.ts

/**
 * Migration Utilities
 * 
 * Provides utilities for gradual migration from legacy to new services.
 */

export class MigrationUtils {
  private static legacyMode = false;

  static enableLegacyMode(): void {
    this.legacyMode = true;
  }

  static disableLegacyMode(): void {
    this.legacyMode = false;
  }

  static isLegacyMode(): boolean {
    return this.legacyMode;
  }

  static async migrateService<T>(
    legacyService: () => Promise<T>,
    newService: () => Promise<T>,
    serviceName: string
  ): Promise<T> {
    if (this.isLegacyMode()) {
      console.warn(`Using legacy service: ${serviceName}`);
      return legacyService();
    } else {
      return newService();
    }
  }
}

// Legacy compatibility wrapper
export class LegacyUserServiceWrapper {
  private readonly userProfileService: IUserProfileService;
  private readonly dashboardService: IUserDashboardService;
  private readonly engagementService: IUserEngagementService;

  constructor() {
    this.userProfileService = ServiceFactory.getUserProfileService();
    this.dashboardService = ServiceFactory.getDashboardService();
    this.engagementService = ServiceFactory.getEngagementService();
  }

  // Maintain legacy method signatures with deprecation warnings
  async getUserProfile(userId?: string): Promise<UserProfile> {
    console.warn('LegacyUserService.getUserProfile is deprecated. Use UserProfileService instead.');
    return this.userProfileService.getProfile(userId || 'current');
  }

  async getDashboardData(): Promise<DashboardData> {
    console.warn('LegacyUserService.getDashboardData is deprecated. Use DashboardService instead.');
    return this.dashboardService.getDashboardData();
  }

  async getSavedBills(page: number, limit: number): Promise<SavedBillsResponse> {
    console.warn('LegacyUserService.getSavedBills is deprecated. Use EngagementService instead.');
    return this.engagementService.getSavedBills(page, limit);
  }
}
```

### 4.2 Feature Flag Implementation

```typescript
// client/src/lib/lib/services/feature-flags.ts

/**
 * Feature Flags for Migration
 * 
 * Controls which services are used during migration.
 */

export interface FeatureFlags {
  useNewAuthService: boolean;
  useNewUserProfileService: boolean;
  useNewDashboardService: boolean;
  useNewEngagementService: boolean;
}

export class FeatureFlagService {
  private static flags: FeatureFlags = {
    useNewAuthService: false,
    useNewUserProfileService: false,
    useNewDashboardService: false,
    useNewEngagementService: false,
  };

  static setFlags(flags: Partial<FeatureFlags>): void {
    this.flags = { ...this.flags, ...flags };
  }

  static getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  static isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }
}
```

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create service architecture guidelines
- [ ] Implement error handling framework
- [ ] Implement unified caching strategy
- [ ] Create testing utilities base classes

### Phase 2: Service Migration (Weeks 2-6)
- [ ] Create Authentication Service
- [ ] Create User Profile Service
- [ ] Create User Dashboard Service
- [ ] Create User Engagement Service
- [ ] Create Service Factory
- [ ] Implement dependency injection
- [ ] Create legacy compatibility wrappers

### Phase 3: Testing (Weeks 7-8)
- [ ] Create comprehensive unit tests
- [ ] Create integration tests
- [ ] Create error handling tests
- [ ] Create performance tests
- [ ] Validate test coverage > 90%

### Phase 4: Migration (Weeks 9-12)
- [ ] Enable feature flags for new services
- [ ] Gradually migrate consumers
- [ ] Monitor performance and errors
- [ ] Remove legacy services
- [ ] Cleanup and optimization

## Success Criteria

### Performance Targets
- Service response time: < 100ms (cached), < 500ms (API)
- Memory usage: < 50MB additional overhead
- Bundle size: No increase due to architecture

### Quality Targets
- Test coverage: > 90% for all services
- Error handling: 100% of methods have consistent error handling
- Caching: 80% of read operations use appropriate caching

### Maintainability Targets
- Service size: < 200 lines per service
- Dependencies: < 5 per service
- Interface coverage: 100% of services implement interfaces

## Troubleshooting

### Common Issues

1. **Service not found errors**
   - Ensure service is registered in ServiceFactory
   - Check dependency injection order

2. **Caching issues**
   - Verify cache keys are unique
   - Check TTL values are appropriate

3. **Error handling inconsistencies**
   - Use ServiceErrorHandler consistently
   - Ensure all error types are covered

4. **Testing failures**
   - Verify mocks are properly set up
   - Check test isolation

### Performance Monitoring

```typescript
// Performance monitoring utility
export class ServicePerformanceMonitor {
  static async measureServiceCall<T>(
    serviceName: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      console.log(`Service ${serviceName}.${operation}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Service ${serviceName}.${operation} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}
```

This implementation guide provides a comprehensive roadmap for executing the service architecture modernization plan with clear steps, examples, and success criteria.
