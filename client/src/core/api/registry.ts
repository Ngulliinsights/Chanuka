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
 */

import { ApiService } from '@client/types';

import { logger } from '@client/utils/logger';

import { globalErrorHandler, ErrorFactory, ErrorCode } from './errors';

// ============================================================================
// Type Definitions
// ============================================================================

type ServiceConstructor = new (...args: any[]) => ApiService;

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
    readonly healthCheckCount: number;
    readonly lastHealthCheck?: Date;
    readonly lastHealthStatus?: boolean;
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
     */
    register(
        name: string,
        serviceClass: ServiceConstructor,
        dependencies: string[] = [],
        singleton: boolean = true
    ): void {
        if (this.services.has(name)) {
            throw ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_DUPLICATE_ENTITY,
                `Service '${name}' is already registered`,
                { serviceName: name }
            );
        }

        // Validate that the service class is actually a constructor
        if (typeof serviceClass !== 'function') {
            throw ErrorFactory.createValidationError(
                ErrorCode.VALIDATION_INVALID_INPUT,
                `Service class for '${name}' must be a constructor function`,
                { serviceName: name, receivedType: typeof serviceClass }
            );
        }

        const metadata: ServiceMetadata = {
            name,
            constructor: serviceClass,
            dependencies: Object.freeze([...dependencies]),
            registeredAt: new Date(),
            singleton
        };

        this.services.set(name, metadata);
        this.initializationOrder.push(name);

        logger.debug('Service registered', {
            component: 'ServiceRegistry',
            serviceName: name,
            dependencies: dependencies.length,
            singleton
        });
    }

    /**
     * Retrieves or creates a service instance.
     * 
     * For singleton services, returns the existing instance if available.
     * For non-singleton services, creates a new instance each time.
     * 
     * Dependencies are automatically resolved and injected before returning.
     * 
     * @param name - Name of the service to retrieve
     * @returns Promise resolving to the service instance
     */
    async get<T extends ApiService>(name: string): Promise<T> {
        const metadata = this.services.get(name);

        if (!metadata) {
            throw ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_ENTITY_NOT_FOUND,
                `Service '${name}' not found in registry`,
                {
                    serviceName: name,
                    availableServices: this.getRegisteredServices()
                }
            );
        }

        // Return existing instance for singletons
        if (metadata.singleton && this.instances.has(name)) {
            return this.instances.get(name)!.instance as T;
        }

        // Create new instance with dependency resolution
        return this.createServiceInstance<T>(name, metadata);
    }

    /**
     * Creates a new service instance with full dependency resolution and initialization.
     */
    private async createServiceInstance<T extends ApiService>(
        name: string,
        metadata: ServiceMetadata
    ): Promise<T> {
        try {
            // Resolve all dependencies first
            const dependencies = await this.resolveDependencies(name, metadata.dependencies);

            // Create the service instance
            const serviceInstance = new metadata.constructor() as ApiService;

            // Inject dependencies if the service supports it
            if ('setDependencies' in serviceInstance && typeof serviceInstance.setDependencies === 'function') {
                (serviceInstance as any).setDependencies(dependencies);
            }

            // Initialize the service
            if ('initialize' in serviceInstance && typeof serviceInstance.initialize === 'function') {
                await serviceInstance.initialize();
            }

            // Store the instance if it's a singleton
            if (metadata.singleton) {
                const instanceData: ServiceInstance = {
                    instance: serviceInstance,
                    initializedAt: new Date(),
                    healthCheckCount: 0
                };
                this.instances.set(name, instanceData);
            }

            logger.info('Service instance created', {
                component: 'ServiceRegistry',
                serviceName: name,
                singleton: metadata.singleton
            });

            return serviceInstance as T;
        } catch (error) {
            const enhancedError = ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_OPERATION_FAILED,
                `Failed to create service instance '${name}'`,
                {
                    serviceName: name,
                    originalError: error instanceof Error ? error.message : 'Unknown error'
                }
            );

            await globalErrorHandler.handleError(enhancedError, {
                component: 'ServiceRegistry',
                operation: 'createServiceInstance',
                serviceName: name
            });

            throw enhancedError;
        }
    }

    /**
     * Resolves all dependencies for a service, detecting circular dependencies.
     */
    private async resolveDependencies(
        serviceName: string,
        dependencyNames: ReadonlyArray<string>
    ): Promise<Record<string, ApiService>> {
        const dependencies: Record<string, ApiService> = {};
        const visited = new Set<string>();
        const path: string[] = [];

        await this.resolveDependenciesRecursive(serviceName, dependencyNames, dependencies, visited, path);

        return dependencies;
    }

    /**
     * Recursive dependency resolution with circular dependency detection.
     */
    private async resolveDependenciesRecursive(
        serviceName: string,
        dependencyNames: ReadonlyArray<string>,
        resolved: Record<string, ApiService>,
        visited: Set<string>,
        path: string[]
    ): Promise<void> {
        for (const depName of dependencyNames) {
            // Check for circular dependency
            if (path.includes(depName)) {
                const cycle = [...path, depName].join(' → ');
                throw ErrorFactory.createBusinessError(
                    ErrorCode.BUSINESS_INVALID_STATE,
                    `Circular dependency detected: ${cycle}`,
                    { serviceName, dependencyName: depName, cycle }
                );
            }

            // Skip if already resolved
            if (resolved[depName]) {
                continue;
            }

            // Verify dependency exists
            const depMetadata = this.services.get(depName);
            if (!depMetadata) {
                throw ErrorFactory.createBusinessError(
                    ErrorCode.BUSINESS_ENTITY_NOT_FOUND,
                    `Dependency '${depName}' not found for service '${serviceName}'`,
                    { serviceName, dependencyName: depName }
                );
            }

            // Add to path for cycle detection
            path.push(depName);

            // Recursively resolve dependencies of the dependency
            if (depMetadata.dependencies.length > 0) {
                await this.resolveDependenciesRecursive(
                    depName,
                    depMetadata.dependencies,
                    resolved,
                    visited,
                    path
                );
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
     */
    async initializeAll(): Promise<void> {
        if (this.isInitializing) {
            logger.warn('Service initialization already in progress', {
                component: 'ServiceRegistry'
            });
            return;
        }

        this.isInitializing = true;
        const initialized = new Set<string>();
        const startTime = Date.now();

        try {
            logger.info('Starting service initialization', {
                component: 'ServiceRegistry',
                serviceCount: this.initializationOrder.length
            });

            for (const serviceName of this.initializationOrder) {
                if (!initialized.has(serviceName)) {
                    await this.get(serviceName);
                    initialized.add(serviceName);
                }
            }

            const duration = Date.now() - startTime;
            logger.info('Service initialization complete', {
                component: 'ServiceRegistry',
                serviceCount: initialized.size,
                duration: `${duration}ms`
            });
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Cleans up all service instances by calling their cleanup methods.
     * This should be called when the application is shutting down.
     */
    async cleanupAll(): Promise<void> {
        const cleanupPromises: Promise<void>[] = [];

        logger.info('Starting service cleanup', {
            component: 'ServiceRegistry',
            serviceCount: this.instances.size
        });

        // Cleanup in reverse order of initialization
        const instanceArray = Array.from(this.instances.entries()).reverse();

        for (const [name, { instance }] of instanceArray) {
            if ('cleanup' in instance && typeof instance.cleanup === 'function') {
                cleanupPromises.push(
                    instance.cleanup().catch((error: Error) => {
                        logger.error('Service cleanup failed', {
                            component: 'ServiceRegistry',
                            serviceName: name,
                            error: error.message
                        });
                    })
                );
            }
        }

        await Promise.allSettled(cleanupPromises);
        this.instances.clear();

        logger.info('Service cleanup complete', {
            component: 'ServiceRegistry'
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
     */
    getInstance<T extends ApiService>(name: string): T | null {
        const instanceData = this.instances.get(name);
        return instanceData ? (instanceData.instance as T) : null;
    }

    /**
     * Replaces a service instance (useful for testing or hot-reloading).
     */
    replaceInstance(name: string, instance: ApiService): void {
        if (!this.services.has(name)) {
            throw ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_ENTITY_NOT_FOUND,
                `Cannot replace instance: Service '${name}' is not registered`,
                { serviceName: name }
            );
        }

        const instanceData: ServiceInstance = {
            instance,
            initializedAt: new Date(),
            healthCheckCount: 0
        };

        this.instances.set(name, instanceData);

        logger.info('Service instance replaced', {
            component: 'ServiceRegistry',
            serviceName: name
        });
    }

    /**
     * Removes a service instance (will be recreated on next get).
     */
    removeInstance(name: string): void {
        this.instances.delete(name);
        logger.debug('Service instance removed', {
            component: 'ServiceRegistry',
            serviceName: name
        });
    }

    /**
     * Performs health checks on all initialized services.
     * Returns a health status map for monitoring and diagnostics.
     */
    async getServiceHealth(): Promise<Record<string, ServiceHealthStatus>> {
        const health: Record<string, ServiceHealthStatus> = {};

        for (const name of this.services.keys()) {
            const instanceData = this.instances.get(name);

            if (!instanceData) {
                health[name] = {
                    status: 'not_initialized',
                    message: 'Service has not been instantiated'
                };
                continue;
            }

            const { instance } = instanceData;

            // Check if service has a health check method
            if ('healthCheck' in instance && typeof instance.healthCheck === 'function') {
                try {
                    const isHealthy = await instance.healthCheck();

                    // Update instance metadata
                    const updatedData: ServiceInstance = {
                        ...instanceData,
                        healthCheckCount: instanceData.healthCheckCount + 1,
                        lastHealthCheck: new Date(),
                        lastHealthStatus: isHealthy
                    };
                    this.instances.set(name, updatedData);

                    health[name] = {
                        status: isHealthy ? 'healthy' : 'unhealthy',
                        lastCheck: updatedData.lastHealthCheck!.toISOString(),
                        checkCount: updatedData.healthCheckCount
                    };
                } catch (error) {
                    health[name] = {
                        status: 'unhealthy',
                        message: error instanceof Error ? error.message : 'Health check failed',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            } else {
                // Assume healthy if no health check method exists
                health[name] = {
                    status: 'healthy',
                    message: 'No health check implemented'
                };
            }
        }

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
     */
    reset(): void {
        this.services.clear();
        this.instances.clear();
        this.initializationOrder.length = 0;

        logger.warn('Service registry has been reset', {
            component: 'ServiceRegistry'
        });
    }
}

// ============================================================================
// Service Health Status Types
// ============================================================================

interface ServiceHealthStatus {
    readonly status: 'healthy' | 'unhealthy' | 'not_initialized';
    readonly message?: string;
    readonly error?: string;
    readonly lastCheck?: string;
    readonly checkCount?: number;
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
    constructor(private readonly registry: ServiceRegistry) { }

    /**
     * Creates or retrieves a service with optional configuration.
     * If the service implements a configure() method, it will be called
     * with the provided configuration.
     */
    async createService<T extends ApiService>(
        name: string,
        config?: Record<string, unknown>
    ): Promise<T> {
        const service = await this.registry.get<T>(name);

        // Apply configuration if service supports it
        if (config && 'configure' in service && typeof service.configure === 'function') {
            await service.configure(config);

            logger.debug('Service configured', {
                component: 'ServiceFactory',
                serviceName: name
            });
        }

        return service;
    }

    /**
     * Creates multiple services with their configurations in parallel.
     */
    async createServices(
        services: Array<{ name: string; config?: Record<string, unknown> }>
    ): Promise<void> {
        const promises = services.map(({ name, config }) =>
            this.createService(name, config).catch(error => {
                logger.error('Failed to create service', {
                    component: 'ServiceFactory',
                    serviceName: name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            })
        );

        await Promise.all(promises);
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
 * 
 * Usage:
 * @Service('myService', ['dependency1', 'dependency2'])
 * class MyService implements ApiService {
 *   // ...
 * }
 */
export function Service(name: string, dependencies: string[] = []) {
    return function <T extends ServiceConstructor>(constructor: T) {
        const locator = ServiceLocator.getInstance();
        locator.registerService(name, constructor, dependencies);
        return constructor;
    };
}

/**
 * @Inject decorator for property-based dependency injection.
 * 
 * Usage:
 * class MyService implements ApiService {
 *   @Inject('otherService')
 *   private otherService!: OtherService;
 * }
 */
export function Inject(serviceName: string) {
    return function (target: any, propertyKey: string) {
        Object.defineProperty(target, propertyKey, {
            get: function () {
                const locator = ServiceLocator.getInstance();
                return locator.getService(serviceName);
            },
            enumerable: true,
            configurable: true
        });
    };
}

// ============================================================================
// Global Service Locator Instance
// ============================================================================

export const globalServiceLocator = ServiceLocator.getInstance();

// Register core services - using dynamic imports to avoid circular dependencies
const registerCoreServices = async () => {
  try {
    const { StateManagementService } = await import('@client/services/stateManagementService');
    const { BillTrackingService } = await import('@client/services/billTrackingService');
    const { WebSocketService } = await import('@client/services/webSocketService');

    // Register services with the global locator
    globalServiceLocator.registerService('stateManagementService', StateManagementService);
    globalServiceLocator.registerService('billTrackingService', BillTrackingService);
    globalServiceLocator.registerService('webSocketService', WebSocketService, ['stateManagementService']);
    
    logger.info('Core services registered successfully', { component: 'ServiceRegistry' });
  } catch (error) {
    logger.error('Failed to register core services', { component: 'ServiceRegistry', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Register services asynchronously to avoid initialization order issues
registerCoreServices();

/**
 * Helper function to get services globally.
 */
export async function getService<T extends ApiService>(name: string): Promise<T> {
    return globalServiceLocator.getService<T>(name);
}

/**
 * Helper function to register services globally.
 */
export function registerService(
    name: string,
    serviceClass: ServiceConstructor,
    dependencies: string[] = []
): void {
    globalServiceLocator.registerService(name, serviceClass, dependencies);
}