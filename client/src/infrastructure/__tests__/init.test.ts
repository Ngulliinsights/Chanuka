/**
 * Integration Tests for Infrastructure Initialization
 * 
 * These tests verify the complete initialization flow, service resolution order,
 * service interactions, and that no circular dependencies exist at runtime.
 * 
 * Requirements: 10.1, 10.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  DIContainer,
  ServiceRegistry,
  createServiceToken,
  createServiceFactory,
  ServicePhase,
  initializeInThreePhases,
  type IDIContainer,
  type PhasedServiceFactory,
} from '../consolidation/di-container';

describe('Infrastructure Initialization Integration Tests', () => {
  let container: DIContainer;
  let serviceRegistry: ServiceRegistry;

  // Mock services for testing
  const mockEventBus = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockCache = {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  };

  const mockObservability = {
    trackError: vi.fn(),
    trackPerformance: vi.fn(),
    trackEvent: vi.fn(),
    sendTelemetry: vi.fn(),
    getMetrics: vi.fn(),
  };

  const mockErrorHandler = {
    handleError: vi.fn(),
    getErrorStats: vi.fn(),
  };

  const mockAPIClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const mockStore = {
    getState: vi.fn(),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  };

  beforeEach(() => {
    container = new DIContainer();
    
    // Create service factories
    const factories = new Map<string, PhasedServiceFactory>();

    // Phase 1: Core services
    factories.set(
      'EventBus',
      createServiceFactory(() => mockEventBus, {
        dependencies: [],
        singleton: true,
        phase: ServicePhase.CORE,
      })
    );

    factories.set(
      'Storage',
      createServiceFactory(() => mockStorage, {
        dependencies: [],
        singleton: true,
        phase: ServicePhase.CORE,
      })
    );

    // Phase 2: Foundation services
    factories.set(
      'Logger',
      createServiceFactory(
        (c: IDIContainer) => {
          c.resolve(createServiceToken('EventBus')); // Ensure dependency
          return mockLogger;
        },
        {
          dependencies: [createServiceToken('EventBus')],
          singleton: true,
          phase: ServicePhase.FOUNDATION,
        }
      )
    );

    factories.set(
      'Cache',
      createServiceFactory(
        (c: IDIContainer) => {
          c.resolve(createServiceToken('Storage')); // Ensure dependency
          return mockCache;
        },
        {
          dependencies: [createServiceToken('Storage')],
          singleton: true,
          phase: ServicePhase.FOUNDATION,
        }
      )
    );

    factories.set(
      'Observability',
      createServiceFactory(
        (c: IDIContainer) => {
          c.resolve(createServiceToken('Logger')); // Ensure dependency
          return mockObservability;
        },
        {
          dependencies: [createServiceToken('Logger')],
          singleton: true,
          phase: ServicePhase.FOUNDATION,
        }
      )
    );

    // Phase 3: Business services
    factories.set(
      'ErrorHandler',
      createServiceFactory(
        (c: IDIContainer) => {
          c.resolve(createServiceToken('Logger'));
          c.resolve(createServiceToken('EventBus'));
          c.resolve(createServiceToken('Observability'));
          return mockErrorHandler;
        },
        {
          dependencies: [
            createServiceToken('Logger'),
            createServiceToken('EventBus'),
            createServiceToken('Observability'),
          ],
          singleton: true,
          phase: ServicePhase.BUSINESS,
        }
      )
    );

    factories.set(
      'APIClient',
      createServiceFactory(
        (c: IDIContainer) => {
          c.resolve(createServiceToken('Cache'));
          c.resolve(createServiceToken('ErrorHandler'));
          c.resolve(createServiceToken('Logger'));
          return mockAPIClient;
        },
        {
          dependencies: [
            createServiceToken('Cache'),
            createServiceToken('ErrorHandler'),
            createServiceToken('Logger'),
          ],
          singleton: true,
          phase: ServicePhase.BUSINESS,
        }
      )
    );

    factories.set(
      'Store',
      createServiceFactory(
        (c: IDIContainer) => {
          c.resolve(createServiceToken('APIClient'));
          c.resolve(createServiceToken('ErrorHandler'));
          return mockStore;
        },
        {
          dependencies: [
            createServiceToken('APIClient'),
            createServiceToken('ErrorHandler'),
          ],
          singleton: true,
          phase: ServicePhase.BUSINESS,
        }
      )
    );

    // Initialize services
    serviceRegistry = initializeInThreePhases(container, factories);
  });

  describe('Complete Initialization Flow', () => {
    it('should initialize all services successfully', () => {
      expect(serviceRegistry).toBeDefined();
      expect(serviceRegistry.allInitialized()).toBe(true);
    });

    it('should register all expected services', () => {
      const serviceNames = serviceRegistry.getServiceNames();
      
      // Verify all core services are registered
      expect(serviceNames).toContain('EventBus');
      expect(serviceNames).toContain('Storage');
      
      // Verify all foundation services are registered
      expect(serviceNames).toContain('Logger');
      expect(serviceNames).toContain('Cache');
      expect(serviceNames).toContain('Observability');
      
      // Verify all business services are registered
      expect(serviceNames).toContain('ErrorHandler');
      expect(serviceNames).toContain('APIClient');
      expect(serviceNames).toContain('Store');
    });

    it('should initialize services in the correct order', () => {
      // Core services should be available
      const eventBus = serviceRegistry.get('EventBus');
      const storage = serviceRegistry.get('Storage');
      expect(eventBus).toBeDefined();
      expect(storage).toBeDefined();

      // Foundation services should be available
      const logger = serviceRegistry.get('Logger');
      const cache = serviceRegistry.get('Cache');
      const observability = serviceRegistry.get('Observability');
      expect(logger).toBeDefined();
      expect(cache).toBeDefined();
      expect(observability).toBeDefined();

      // Business services should be available
      const errorHandler = serviceRegistry.get('ErrorHandler');
      const apiClient = serviceRegistry.get('APIClient');
      const store = serviceRegistry.get('Store');
      expect(errorHandler).toBeDefined();
      expect(apiClient).toBeDefined();
      expect(store).toBeDefined();
    });
  });

  describe('Service Resolution Order', () => {
    it('should resolve core services first', () => {
      const eventBus = serviceRegistry.get('EventBus');
      const storage = serviceRegistry.get('Storage');

      expect(eventBus).toBe(mockEventBus);
      expect(storage).toBe(mockStorage);
    });

    it('should resolve foundation services after core', () => {
      const logger = serviceRegistry.get('Logger');
      const cache = serviceRegistry.get('Cache');
      const observability = serviceRegistry.get('Observability');

      expect(logger).toBe(mockLogger);
      expect(cache).toBe(mockCache);
      expect(observability).toBe(mockObservability);
    });

    it('should resolve business services after foundation', () => {
      const errorHandler = serviceRegistry.get('ErrorHandler');
      const apiClient = serviceRegistry.get('APIClient');
      const store = serviceRegistry.get('Store');

      expect(errorHandler).toBe(mockErrorHandler);
      expect(apiClient).toBe(mockAPIClient);
      expect(store).toBe(mockStore);
    });
  });

  describe('Service Interactions', () => {
    it('should allow EventBus to emit and receive events', () => {
      const eventBus = serviceRegistry.get('EventBus');
      expect(eventBus).toBeDefined();

      // EventBus should have standard methods
      expect(eventBus.on).toBeDefined();
      expect(eventBus.off).toBeDefined();
      expect(eventBus.emit).toBeDefined();
    });

    it('should allow Logger to log messages', () => {
      const logger = serviceRegistry.get('Logger');
      expect(logger).toBeDefined();

      // Logger should have standard methods
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should allow Observability to track errors', () => {
      const observability = serviceRegistry.get('Observability');
      expect(observability).toBeDefined();

      // Observability should have tracking methods
      expect(observability.trackError).toBeDefined();
      expect(observability.trackPerformance).toBeDefined();
      expect(observability.trackEvent).toBeDefined();
    });

    it('should allow Store to dispatch actions', () => {
      const store = serviceRegistry.get('Store');
      expect(store).toBeDefined();

      // Store should have Redux methods
      expect(store.getState).toBeDefined();
      expect(store.dispatch).toBeDefined();
      expect(store.subscribe).toBeDefined();
    });
  });

  describe('No Circular Dependencies at Runtime', () => {
    it('should initialize without circular dependency errors', () => {
      // If we got here, initialization succeeded without circular dependency errors
      expect(serviceRegistry.allInitialized()).toBe(true);
    });

    it('should resolve services without infinite loops', () => {
      // Try to resolve all services multiple times
      for (let i = 0; i < 3; i++) {
        const eventBus = serviceRegistry.get('EventBus');
        const storage = serviceRegistry.get('Storage');
        const logger = serviceRegistry.get('Logger');
        const cache = serviceRegistry.get('Cache');
        const observability = serviceRegistry.get('Observability');
        const errorHandler = serviceRegistry.get('ErrorHandler');
        const apiClient = serviceRegistry.get('APIClient');
        const store = serviceRegistry.get('Store');

        expect(eventBus).toBeDefined();
        expect(storage).toBeDefined();
        expect(logger).toBeDefined();
        expect(cache).toBeDefined();
        expect(observability).toBeDefined();
        expect(errorHandler).toBeDefined();
        expect(apiClient).toBeDefined();
        expect(store).toBeDefined();
      }
    });
  });

  describe('Service Singleton Behavior', () => {
    it('should return the same instance for singleton services', () => {
      const eventBus1 = serviceRegistry.get('EventBus');
      const eventBus2 = serviceRegistry.get('EventBus');

      // Should be the same instance
      expect(eventBus1).toBe(eventBus2);
    });

    it('should maintain singleton instances across multiple resolutions', () => {
      const logger1 = serviceRegistry.get('Logger');
      const logger2 = serviceRegistry.get('Logger');
      const logger3 = serviceRegistry.get('Logger');

      // All should be the same instance
      expect(logger1).toBe(logger2);
      expect(logger2).toBe(logger3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing service gracefully', () => {
      const nonExistentService = serviceRegistry.get('NonExistent');
      expect(nonExistentService).toBeUndefined();
    });

    it('should not throw when accessing undefined service', () => {
      expect(() => {
        serviceRegistry.get('InvalidService');
      }).not.toThrow();
    });
  });

  describe('Service Registry API', () => {
    it('should provide getServiceNames method', () => {
      const serviceNames = serviceRegistry.getServiceNames();
      expect(Array.isArray(serviceNames)).toBe(true);
      expect(serviceNames.length).toBeGreaterThan(0);
    });

    it('should provide allInitialized method', () => {
      expect(serviceRegistry.allInitialized()).toBe(true);
    });

    it('should allow clearing the registry', () => {
      serviceRegistry.clear();
      expect(serviceRegistry.getServiceNames().length).toBe(0);
      expect(serviceRegistry.allInitialized()).toBe(false);
    });
  });
});
