/**
 * Service Registry and Dependency Injection System
 *
 * This module implements a comprehensive service registry with dependency injection,
 * lifecycle management, and health monitoring capabilities. It provides a centralized
 * way to manage service instances throughout the application lifecycle.
 *
 * Key features:
 * - Dependency injection with automatic resolution
 * - Circular dependency detection
 * - Service lifecycle management (initialization and cleanup)
 * - Health checking and monitoring
 * - Service factory pattern for configured instances
 * - Decorators for simplified service registration
 *
 * @module ServiceRegistry
 */

import { logger } from '@client/utils/logger';

import { ErrorFactory } from '../error';

import { ApiService } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

type ServiceConstructor = new (...args: unknown[]) => ApiService;

interface ServiceMetadata {
  readonly name: string;
  readonly constructor: ServiceConstructor;
  readonly dependencies: ReadonlyArray<string>;
  readonly registeredAt: Date;
  readonly singleton: boolean;
}

interface ServiceInstance {
  readonly instance: ApiService;
  readonly initializedAt: Date;
  healthCheckCount: number;
  lastHealthCheck?: Date;
  lastHealthStatus?: boolean;
}

interface ServiceHealthStatus {
  readonly status: 'healthy' | 'unhealthy' | 'not_initialized';
  readonly message?: string;
  readonly error?: string;
  readonly lastCheck?: string;
  readonly checkCount?: number;
}

// ============================================================================
// Service Registry Implementation
// ============================================================================

/**
 * ServiceRegistry manages the registration, instantiation, and lifecycle
 * of services throughout the application. It supports dependency injection,
 * ensuring that services receive their dependencies automatically.
 *
 * The registry maintains both service definitions (metadata) and instances,
 * allowing for lazy initialization and proper cleanup.
 */
export class ServiceRegistry {
  private readonly services = new Map<string, ServiceMetadata>();
  private readonly instances = new Map<string, ServiceInstance>();
  private readonly initializationOrder: string[] = [];
  private isInitializing = false;

  // Track currently initializing services to prevent concurrent initialization issues
  private readonly pendingInitializations = new Map<string, Promise<ApiService>>();

  /**
   * Registers a service class with its dependencies.
   *
   * The service will not be instantiated until it's requested via get().
   * This allows for lazy initialization and better startup performance.
   *
   * @param name - Unique identifier for the service
   * @param serviceClass - Constructor function for the service
   * @param dependencies - Names of services this service depends on
   * @param singleton - Whether to maintain a single instance (default: true)
   * @throws Error if service is already registered or if serviceClass is invalid
   */
  register(
    name: string,
    serviceClass: ServiceConstructor,
    dependencies: string[] = [],
    singleton = true
  ): void {
    if (this.services.has(name)) {
      throw ErrorFactory.createBusinessError(`Service '${name}' is already registered`, {
        serviceName: name,
      });
    }

    if (typeof serviceClass !== 'function') {
      throw ErrorFactory.createValidationError(
        `Service class for '${name}' must be a constructor function`,
        { serviceName: name, receivedType: typeof serviceClass }
      );
    }

    const metadata: ServiceMetadata = {
      name,
      constructor: serviceClass,
      dependencies: Object.freeze([...dependencies]),
      registeredAt: new Date(),
      singleton,
    };

    this.services.set(name, metadata);
    this.initializationOrder.push(name);

    logger.debug('Service registered', {
      component: 'ServiceRegistry',
      serviceName: name,
      dependencies: dependencies.length,
      singleton,
    });
  }

  /**
   * Retrieves or creates a service instance.
   *
   * For singleton services, returns the existing instance if available.
   * For non-singleton services, creates a new instance each time.
   * Dependencies are automatically resolved and injected.
   *
   * This method prevents race conditions by tracking pending initializations,
   * ensuring that if multiple callers request the same service concurrently,
   * only one initialization occurs.
   *
   * @param name - Name of the service to retrieve
   * @returns Promise resolving to the service instance
   * @throws Error if service is not registered
   */
  async get<T extends ApiService>(name: string): Promise<T> {
    const metadata = this.services.get(name);

    if (!metadata) {
      throw ErrorFactory.createBusinessError(`Service '${name}' not found in registry`, {
        serviceName: name,
        availableServices: this.getRegisteredServices(),
      });
    }

    // Return existing instance for singletons
    if (metadata.singleton) {
      const existing = this.instances.get(name);
      if (existing) {
        return existing.instance as T;
      }

      // Check if initialization is in progress to prevent duplicate initialization
      const pending = this.pendingInitializations.get(name);
      if (pending) {
        return pending as Promise<T>;
      }
    }

    // Create new instance with dependency resolution
    return this.createServiceInstance<T>(name, metadata);
  }

  /**
   * Creates a new service instance with full dependency resolution and initialization.
   * This method handles the complete lifecycle: dependency resolution, instantiation,
   * dependency injection, and initialization.
   *
   * @private
   */
  private async createServiceInstance<T extends ApiService>(
    name: string,
    metadata: ServiceMetadata
  ): Promise<T> {
    // Create a promise for this initialization to prevent concurrent duplicate initialization
    const initializationPromise = (async (): Promise<T> => {
      try {
        // Resolve all dependencies first
        const dependencies = await this.resolveDependencies(name, metadata.dependencies);

        // Create the service instance
        const serviceInstance = new metadata.constructor() as ApiService;

        // Inject dependencies if the service supports it
        if (
          'setDependencies' in serviceInstance &&
          typeof serviceInstance.setDependencies === 'function'
        ) {
          (
            serviceInstance as unknown as {
              setDependencies: (deps: Record<string, ApiService>) => void;
            }
          ).setDependencies(dependencies);
        }

        // Initialize the service
        if ('initialize' in serviceInstance && typeof serviceInstance.initialize === 'function') {
          await (serviceInstance as unknown as { initialize: () => Promise<void> }).initialize();
        }

        // Store the instance if it's a singleton
        if (metadata.singleton) {
          const instanceData: ServiceInstance = {
            instance: serviceInstance,
            initializedAt: new Date(),
            healthCheckCount: 0,
          };
          this.instances.set(name, instanceData);
        }

        logger.info('Service instance created', {
          component: 'ServiceRegistry',
          serviceName: name,
          singleton: metadata.singleton,
        });

        return serviceInstance as T;
      } catch (error) {
        const enhancedError = ErrorFactory.createBusinessError(
          `Failed to create service instance '${name}'`,
          {
            serviceName: name,
            originalError: error instanceof Error ? error.message : 'Unknown error',
          }
        );

        logger.error('Service instance creation failed', {
          component: 'ServiceRegistry',
          operation: 'createServiceInstance',
          serviceName: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw enhancedError;
      } finally {
        // Clean up pending initialization tracking
        this.pendingInitializations.delete(name);
      }
    })();

    // Track this initialization to prevent duplicate concurrent initialization
    if (metadata.singleton) {
      this.pendingInitializations.set(name, initializationPromise);
    }

    return initializationPromise;
  }

  /**
   * Resolves all dependencies for a service, detecting circular dependencies.
   * This method builds a complete dependency graph and validates it before
   * beginning any instantiation.
   *
   * @private
   */
  private async resolveDependencies(
    serviceName: string,
    dependencyNames: ReadonlyArray<string>
  ): Promise<Record<string, ApiService>> {
    const dependencies: Record<string, ApiService> = {};
    const path: string[] = [serviceName];

    await this.resolveDependenciesRecursive(dependencyNames, dependencies, path);

    return dependencies;
  }

  /**
   * Recursive dependency resolution with circular dependency detection.
   * This uses a path tracking approach to detect cycles efficiently.
   *
   * @private
   */
  private async resolveDependenciesRecursive(
    dependencyNames: ReadonlyArray<string>,
    resolved: Record<string, ApiService>,
    path: string[]
  ): Promise<void> {
    for (const depName of dependencyNames) {
      // Check for circular dependency
      if (path.includes(depName)) {
        const cycle = [...path, depName].join(' → ');
        throw ErrorFactory.createBusinessError(`Circular dependency detected: ${cycle}`, {
          dependencyName: depName,
          cycle,
        });
      }

      // Skip if already resolved
      if (resolved[depName]) {
        continue;
      }

      // Verify dependency exists
      const depMetadata = this.services.get(depName);
      if (!depMetadata) {
        throw ErrorFactory.createBusinessError(
          `Dependency '${depName}' not found for service requiring it`,
          {
            dependencyName: depName,
            requiredBy: path[path.length - 1],
          }
        );
      }

      // Add to path for cycle detection
      path.push(depName);

      // Recursively resolve dependencies of this dependency
      if (depMetadata.dependencies.length > 0) {
        await this.resolveDependenciesRecursive(depMetadata.dependencies, resolved, path);
      }

      // Get or create the dependency instance
      resolved[depName] = await this.get(depName);

      // Remove from path after resolution
      path.pop();
    }
  }

  /**
   * Checks if a service is registered in the registry.
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Checks if a service has been instantiated.
   */
  isInitialized(name: string): boolean {
    return this.instances.has(name);
  }

  /**
   * Initializes all registered services in dependency order.
   * This is useful for eagerly loading services at application startup.
   * The method is idempotent and safe to call multiple times.
   */
  async initializeAll(): Promise<void> {
    if (this.isInitializing) {
      logger.warn('Service initialization already in progress', {
        component: 'ServiceRegistry',
      });
      return;
    }

    this.isInitializing = true;
    const startTime = Date.now();

    try {
      logger.info('Starting service initialization', {
        component: 'ServiceRegistry',
        serviceCount: this.initializationOrder.length,
      });

      // Initialize services in order, but skip already initialized ones
      const initPromises = this.initializationOrder
        .filter(name => !this.instances.has(name))
        .map(name => this.get(name));

      await Promise.all(initPromises);

      const duration = Date.now() - startTime;
      logger.info('Service initialization complete', {
        component: 'ServiceRegistry',
        serviceCount: this.instances.size,
        duration: `${duration}ms`,
      });
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Cleans up all service instances by calling their cleanup methods.
   * Services are cleaned up in reverse initialization order to ensure
   * dependencies are still available during cleanup.
   *
   * This should be called when the application is shutting down.
   */
  async cleanupAll(): Promise<void> {
    logger.info('Starting service cleanup', {
      component: 'ServiceRegistry',
      serviceCount: this.instances.size,
    });

    // Cleanup in reverse order of initialization
    const instanceArray = Array.from(this.instances.entries()).reverse();

    // Use allSettled to ensure all cleanup attempts complete even if some fail
    const results = await Promise.allSettled(
      instanceArray.map(async ([name, { instance }]) => {
        if ('cleanup' in instance && typeof instance.cleanup === 'function') {
          try {
            await (instance as unknown as { cleanup: () => Promise<void> }).cleanup();
            logger.debug('Service cleaned up successfully', {
              component: 'ServiceRegistry',
              serviceName: name,
            });
          } catch (error) {
            logger.error('Service cleanup failed', {
              component: 'ServiceRegistry',
              serviceName: name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
          }
        }
      })
    );

    // Count failures for reporting
    const failures = results.filter(r => r.status === 'rejected').length;

    this.instances.clear();

    logger.info('Service cleanup complete', {
      component: 'ServiceRegistry',
      successful: results.length - failures,
      failed: failures,
    });
  }

  /**
   * Returns a list of all registered service names.
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Returns the dependencies for a specific service.
   */
  getServiceDependencies(name: string): string[] {
    const metadata = this.services.get(name);
    return metadata ? Array.from(metadata.dependencies) : [];
  }

  /**
   * Returns the initialization order of services.
   */
  getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  /**
   * Gets a service instance without creating it.
   * Returns null if the service hasn't been instantiated yet.
   *
   * This is useful for optional dependencies or checking service state.
   */
  getInstance<T extends ApiService>(name: string): T | null {
    const instanceData = this.instances.get(name);
    return instanceData ? (instanceData.instance as T) : null;
  }

  /**
   * Replaces a service instance (useful for testing or hot-reloading).
   * This allows you to swap out implementations at runtime.
   *
   * @param name - Name of the service to replace
   * @param instance - New service instance
   * @throws Error if service is not registered
   */
  replaceInstance(name: string, instance: ApiService): void {
    if (!this.services.has(name)) {
      throw ErrorFactory.createBusinessError(
        `Cannot replace instance: Service '${name}' is not registered`,
        {
          serviceName: name,
        }
      );
    }

    const instanceData: ServiceInstance = {
      instance,
      initializedAt: new Date(),
      healthCheckCount: 0,
    };

    this.instances.set(name, instanceData);

    logger.info('Service instance replaced', {
      component: 'ServiceRegistry',
      serviceName: name,
    });
  }

  /**
   * Removes a service instance (will be recreated on next get).
   * This forces re-initialization on the next access.
   */
  removeInstance(name: string): void {
    this.instances.delete(name);
    logger.debug('Service instance removed', {
      component: 'ServiceRegistry',
      serviceName: name,
    });
  }

  /**
   * Performs health checks on all initialized services.
   * Returns a health status map for monitoring and diagnostics.
   *
   * Health checks run in parallel for better performance with many services.
   */
  async getServiceHealth(): Promise<Record<string, ServiceHealthStatus>> {
    const health: Record<string, ServiceHealthStatus> = {};

    const healthCheckPromises = Array.from(this.services.keys()).map(async name => {
      const instanceData = this.instances.get(name);

      if (!instanceData) {
        health[name] = {
          status: 'not_initialized',
          message: 'Service has not been instantiated',
        };
        return;
      }

      const { instance } = instanceData;

      // Check if service has a health check method
      if ('healthCheck' in instance && typeof instance.healthCheck === 'function') {
        try {
          const isHealthy = await (
            instance as unknown as {
              healthCheck: () => Promise<boolean>;
            }
          ).healthCheck();

          // Update instance metadata atomically
          instanceData.healthCheckCount++;
          instanceData.lastHealthCheck = new Date();
          instanceData.lastHealthStatus = isHealthy;

          health[name] = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            lastCheck: instanceData.lastHealthCheck.toISOString(),
            checkCount: instanceData.healthCheckCount,
          };
        } catch (error) {
          health[name] = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      } else {
        // Assume healthy if no health check method exists
        health[name] = {
          status: 'healthy',
          message: 'No health check implemented',
        };
      }
    });

    await Promise.all(healthCheckPromises);
    return health;
  }

  /**
   * Gets detailed metadata about a registered service.
   */
  getServiceMetadata(name: string): ServiceMetadata | null {
    return this.services.get(name) || null;
  }

  /**
   * Clears all registrations and instances (use with extreme caution).
   * This is primarily useful for testing scenarios where you need a clean slate.
   */
  reset(): void {
    this.services.clear();
    this.instances.clear();
    this.initializationOrder.length = 0;
    this.pendingInitializations.clear();

    logger.warn('Service registry has been reset', {
      component: 'ServiceRegistry',
    });
  }
}

// ============================================================================
// Service Factory
// ============================================================================

/**
 * ServiceFactory provides a convenient way to create service instances
 * with specific configurations. It wraps the registry and adds configuration
 * support for services that implement a configure() method.
 */
export class ServiceFactory {
  constructor(private readonly registry: ServiceRegistry) {}

  /**
   * Creates or retrieves a service with optional configuration.
   * If the service implements a configure() method, it will be called
   * with the provided configuration after initialization.
   *
   * @param name - Name of the service to create
   * @param config - Optional configuration object
   * @returns Promise resolving to the configured service instance
   */
  async createService<T extends ApiService>(
    name: string,
    config?: Record<string, unknown>
  ): Promise<T> {
    const service = await this.registry.get<T>(name);

    // Apply configuration if service supports it
    if (config && 'configure' in service && typeof service.configure === 'function') {
      await (
        service as unknown as {
          configure: (config: Record<string, unknown>) => Promise<void>;
        }
      ).configure(config);

      logger.debug('Service configured', {
        component: 'ServiceFactory',
        serviceName: name,
      });
    }

    return service;
  }

  /**
   * Creates multiple services with their configurations in parallel.
   * This is more efficient than creating services sequentially when
   * services don't depend on each other.
   *
   * @param services - Array of service configurations
   * @throws Error if any service creation fails
   */
  async createServices(
    services: Array<{ name: string; config?: Record<string, unknown> }>
  ): Promise<void> {
    await Promise.all(
      services.map(({ name, config }) =>
        this.createService(name, config).catch(error => {
          logger.error('Failed to create service', {
            component: 'ServiceFactory',
            serviceName: name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        })
      )
    );
  }
}

// ============================================================================
// Service Locator Pattern
// ============================================================================

/**
 * ServiceLocator provides global access to the service registry.
 * This implements the Service Locator pattern, which is useful for
 * accessing services from anywhere in the application without explicit
 * dependency injection.
 *
 * Note: While convenient, overuse of the Service Locator pattern can
 * make dependencies less explicit. Prefer constructor injection when possible.
 */
export class ServiceLocator {
  private static instance: ServiceLocator;
  private readonly registry: ServiceRegistry;
  private readonly factory: ServiceFactory;

  private constructor() {
    this.registry = new ServiceRegistry();
    this.factory = new ServiceFactory(this.registry);
  }

  /**
   * Gets the singleton instance of the ServiceLocator.
   * Creates it on first access (lazy initialization).
   */
  static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }

  getRegistry(): ServiceRegistry {
    return this.registry;
  }

  getFactory(): ServiceFactory {
    return this.factory;
  }

  async getService<T extends ApiService>(name: string): Promise<T> {
    return this.registry.get<T>(name);
  }

  registerService(
    name: string,
    serviceClass: ServiceConstructor,
    dependencies: string[] = []
  ): void {
    this.registry.register(name, serviceClass, dependencies);
  }

  hasService(name: string): boolean {
    return this.registry.has(name);
  }
}

// ============================================================================
// Decorators for Service Registration
// ============================================================================

/**
 * @Service decorator for automatic service registration.
 * This provides a declarative way to register services at class definition time.
 *
 * Usage:
 * @Service('myService', ['dependency1', 'dependency2'])
 * class MyService implements ApiService {
 *   // Implementation
 * }
 */
export function Service(name: string, dependencies: string[] = []) {
  return function <T extends ServiceConstructor>(constructor: T): T {
    const locator = ServiceLocator.getInstance();
    locator.registerService(name, constructor, dependencies);
    return constructor;
  };
}

/**
 * @Inject decorator for property-based dependency injection.
 * This creates a getter that lazily retrieves the service from the locator.
 *
 * Usage:
 * class MyService implements ApiService {
 *   @Inject('otherService')
 *   private otherService!: OtherService;
 * }
 *
 * Note: The property will return a Promise, so you'll need to await it:
 * const result = await this.otherService;
 */
export function Inject(serviceName: string) {
  return function (target: object, propertyKey: string): void {
    Object.defineProperty(target, propertyKey, {
      get: function () {
        const locator = ServiceLocator.getInstance();
        return locator.getService(serviceName);
      },
      enumerable: true,
      configurable: true,
    });
  };
}

// ============================================================================
// Global Service Locator Instance
// ============================================================================

export const globalServiceLocator = ServiceLocator.getInstance();

/**
 * Registers core services with the global locator.
 * This uses dynamic imports to avoid circular dependencies and allows
 * for graceful failure if services aren't available yet.
 */
const registerCoreServices = async (): Promise<void> => {
  try {
    // Note: Uncomment and adjust these imports as services become available
    // const { BillTrackingService } = await import('@client/features/bills/services/tracking');
    // const { WebSocketService } = await import('@client/services/webSocketService');

    // globalServiceLocator.registerService('billTrackingService', BillTrackingService);
    // globalServiceLocator.registerService('webSocketService', WebSocketService);

    logger.info('Core services registered successfully', {
      component: 'ServiceRegistry',
    });
  } catch (error) {
    logger.error('Failed to register core services', {
      component: 'ServiceRegistry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Register services asynchronously to avoid blocking module initialization
registerCoreServices().catch(error => {
  logger.error('Async service registration failed', {
    component: 'ServiceRegistry',
    error: error instanceof Error ? error.message : 'Unknown error',
  });
});

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Helper function to get services globally.
 * This provides a simpler API for service retrieval without needing
 * to access the locator directly.
 *
 * @param name - Name of the service to retrieve
 * @returns Promise resolving to the service instance
 */
export async function getService<T extends ApiService>(name: string): Promise<T> {
  return globalServiceLocator.getService<T>(name);
}

/**
 * Helper function to register services globally.
 * This provides a simpler API for service registration without needing
 * to access the locator directly.
 *
 * @param name - Unique identifier for the service
 * @param serviceClass - Constructor function for the service
 * @param dependencies - Names of services this service depends on
 */
export function registerService(
  name: string,
  serviceClass: ServiceConstructor,
  dependencies: string[] = []
): void {
  globalServiceLocator.registerService(name, serviceClass, dependencies);
}
