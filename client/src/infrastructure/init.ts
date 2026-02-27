/**
 * Infrastructure Initialization Module
 * 
 * This module provides centralized initialization for all infrastructure services
 * using the dependency injection container. Services are initialized in three phases
 * to ensure proper dependency order and eliminate circular dependencies.
 * 
 * Phase 1 (CORE): Services with no dependencies
 * Phase 2 (FOUNDATION): Services that depend on core services
 * Phase 3 (BUSINESS): Services that depend on foundation services
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import {
  DIContainer,
  ServiceRegistry,
  createServiceToken,
  createServiceFactory,
  ServicePhase,
  initializeInThreePhases,
  type IDIContainer,
  type PhasedServiceFactory,
} from './consolidation/di-container';

// Import core services
import { eventBus } from './events';
import { secureStorage } from './storage';

// Import foundation services
import { logger } from './logging';
import { cacheInvalidationManager } from './cache';
import { observability, initializeObservability } from './observability';

// Import business services
import { unifiedErrorHandler } from './error';
import { globalApiClient } from './api';
import { store } from './store';

/**
 * Service tokens for all infrastructure services
 */
export const ServiceTokens = {
  // Core services (Phase 1)
  EventBus: createServiceToken('EventBus'),
  Storage: createServiceToken('Storage'),

  // Foundation services (Phase 2)
  Logger: createServiceToken('Logger'),
  Cache: createServiceToken('Cache'),
  Observability: createServiceToken('Observability'),

  // Business services (Phase 3)
  ErrorHandler: createServiceToken('ErrorHandler'),
  APIClient: createServiceToken('APIClient'),
  Store: createServiceToken('Store'),
} as const;

/**
 * Create service factories for all infrastructure services
 */
function createServiceFactories(): Map<string, PhasedServiceFactory> {
  const factories = new Map<string, PhasedServiceFactory>();

  // ============================================================================
  // Phase 1: Core Services (no dependencies)
  // ============================================================================

  factories.set(
    'EventBus',
    createServiceFactory(
      () => eventBus,
      {
        dependencies: [],
        singleton: true,
        phase: ServicePhase.CORE,
      }
    )
  );

  factories.set(
    'Storage',
    createServiceFactory(
      () => secureStorage,
      {
        dependencies: [],
        singleton: true,
        phase: ServicePhase.CORE,
      }
    )
  );

  // ============================================================================
  // Phase 2: Foundation Services (depend on core)
  // ============================================================================

  factories.set(
    'Logger',
    createServiceFactory(
      (container: IDIContainer) => {
        // Logger is already initialized, just return it
        return logger;
      },
      {
        dependencies: [ServiceTokens.EventBus],
        singleton: true,
        phase: ServicePhase.FOUNDATION,
      }
    )
  );

  factories.set(
    'Cache',
    createServiceFactory(
      (container: IDIContainer) => {
        // Cache manager is already initialized with storage
        return cacheInvalidationManager;
      },
      {
        dependencies: [ServiceTokens.Storage],
        singleton: true,
        phase: ServicePhase.FOUNDATION,
      }
    )
  );

  factories.set(
    'Observability',
    createServiceFactory(
      (container: IDIContainer) => {
        // Initialize observability with configuration
        initializeObservability({
          errorMonitoring: {
            enabled: true,
            environment: process.env.NODE_ENV || 'development',
          },
          performance: {
            enabled: true,
            webVitalsEnabled: true,
          },
          analytics: {
            enabled: true,
            debugMode: process.env.NODE_ENV === 'development',
          },
          telemetry: {
            enabled: true,
          },
        });

        return observability;
      },
      {
        dependencies: [ServiceTokens.Logger],
        singleton: true,
        phase: ServicePhase.FOUNDATION,
      }
    )
  );

  // ============================================================================
  // Phase 3: Business Services (depend on foundation)
  // ============================================================================

  factories.set(
    'ErrorHandler',
    createServiceFactory(
      (container: IDIContainer) => {
        // Error handler is already initialized with observability and logger
        return unifiedErrorHandler;
      },
      {
        dependencies: [
          ServiceTokens.Logger,
          ServiceTokens.EventBus,
          ServiceTokens.Observability,
        ],
        singleton: true,
        phase: ServicePhase.BUSINESS,
      }
    )
  );

  factories.set(
    'APIClient',
    createServiceFactory(
      (container: IDIContainer) => {
        // API client is already initialized with cache and error handler
        return globalApiClient;
      },
      {
        dependencies: [
          ServiceTokens.Cache,
          ServiceTokens.ErrorHandler,
          ServiceTokens.Logger,
        ],
        singleton: true,
        phase: ServicePhase.BUSINESS,
      }
    )
  );

  factories.set(
    'Store',
    createServiceFactory(
      (container: IDIContainer) => {
        // Redux store is already configured
        return store;
      },
      {
        dependencies: [ServiceTokens.APIClient, ServiceTokens.ErrorHandler],
        singleton: true,
        phase: ServicePhase.BUSINESS,
      }
    )
  );

  return factories;
}

/**
 * Initialize all infrastructure services using the DI container
 * 
 * This function initializes services in three phases:
 * 1. Core: EventBus, Storage
 * 2. Foundation: Logger, Cache, Observability
 * 3. Business: ErrorHandler, APIClient, Store
 * 
 * Requirements: 6.1, 6.2, 6.3
 * 
 * @returns ServiceRegistry containing all initialized services
 */
export function initializeInfrastructure(): ServiceRegistry {
  const container = new DIContainer();
  const factories = createServiceFactories();

  // Use the three-phase initialization helper
  const registry = initializeInThreePhases(container, factories);

  // Log successful initialization
  logger.info('✅ Infrastructure initialized successfully', {
    component: 'Infrastructure',
    services: registry.getServiceNames(),
  });

  return registry;
}

/**
 * Get a service from the registry
 * 
 * @param registry - Service registry
 * @param serviceName - Name of the service to retrieve
 * @returns The service instance or undefined if not found
 */
export function getService<T>(registry: ServiceRegistry, serviceName: string): T | undefined {
  return registry.get<T>(serviceName);
}

/**
 * Check if all services are initialized
 * 
 * @param registry - Service registry
 * @returns True if all services are initialized
 */
export function isInfrastructureReady(registry: ServiceRegistry): boolean {
  return registry.allInitialized();
}

/**
 * Export the service registry type for use in the application
 */
export type { ServiceRegistry } from './consolidation/di-container';
