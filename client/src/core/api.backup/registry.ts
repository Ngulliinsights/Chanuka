// Service Registry for Dependency Injection in Unified API Client Architecture
// Based on the consolidated API client design specifications

import { ApiService } from '@client/types';
import { globalErrorHandler, ErrorFactory, ErrorCode } from './errors';

// Service Registry Pattern Implementation
export class ServiceRegistry {
    private services = new Map<string, ApiService>();
    private dependencies = new Map<string, string[]>();
    private serviceInstances = new Map<string, any>();
    private initializationOrder: string[] = [];

    register(name: string, serviceClass: new (...args: any[]) => ApiService, dependencies: string[] = []): void {
        if (this.services.has(name)) {
            throw ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_DUPLICATE_ENTITY,
                `Service '${name}' is already registered`
            );
        }

        this.services.set(name, serviceClass as any);
        this.dependencies.set(name, dependencies);

        // Add to initialization order (topological sort would be better, but this is simpler)
        this.initializationOrder.push(name);
    }

    async get<T extends ApiService>(name: string): Promise<T> {
        // Return existing instance if already created
        if (this.serviceInstances.has(name)) {
            return this.serviceInstances.get(name) as T;
        }

        const serviceClass = this.services.get(name);
        if (!serviceClass) {
            throw ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_ENTITY_NOT_FOUND,
                `Service '${name}' not found in registry`
            );
        }

        // Resolve dependencies
        const dependencyNames = this.dependencies.get(name) || [];
        const dependencies: Record<string, ApiService> = {};

        for (const depName of dependencyNames) {
            try {
                dependencies[depName] = await this.get(depName);
            } catch (error) {
              throw ErrorFactory.createBusinessError(
                ErrorCode.BUSINESS_INVALID_STATE,
                `Failed to resolve dependency '${depName}' for service '${name}': ${(error as Error).message}`
              );
            }
        }

        // Create service instance
        let serviceInstance: ApiService;
        try {
            serviceInstance = new (serviceClass as any)();

            // Inject dependencies if the service supports it
            if ('setDependencies' in serviceInstance) {
                (serviceInstance as any).setDependencies(dependencies);
            }

            // Initialize service if it has an initialize method
            if ('initialize' in serviceInstance && typeof serviceInstance.initialize === 'function') {
                await serviceInstance.initialize();
            }

            // Store the instance
            this.serviceInstances.set(name, serviceInstance);

            return serviceInstance as T;
        } catch (error) {
            await globalErrorHandler.handleError(error as Error, {
                component: 'registry',
                operation: 'get',
                serviceName: name
            });
            throw error;
        }
    }

    has(name: string): boolean {
        return this.services.has(name);
    }

    async initializeAll(): Promise<void> {
        const initialized = new Set<string>();

        for (const serviceName of this.initializationOrder) {
            if (!initialized.has(serviceName)) {
                await this.get(serviceName);
                initialized.add(serviceName);
            }
        }
    }

    async cleanupAll(): Promise<void> {
        const cleanupPromises: Promise<void>[] = [];

        for (const [name, instance] of this.serviceInstances) {
            if (instance && 'cleanup' in instance && typeof instance.cleanup === 'function') {
                cleanupPromises.push(
                  instance.cleanup().catch((error: any) => {
                    console.error(`Error cleaning up service '${name}':`, error);
                  })
                );
            }
        }

        await Promise.allSettled(cleanupPromises);
        this.serviceInstances.clear();
    }

    getRegisteredServices(): string[] {
        return Array.from(this.services.keys());
    }

    getServiceDependencies(name: string): string[] {
        return this.dependencies.get(name) || [];
    }

    getInitializationOrder(): string[] {
        return [...this.initializationOrder];
    }

    // Advanced dependency resolution with cycle detection
    private resolveDependencies(serviceName: string, visited: Set<string> = new Set(), path: string[] = []): string[] {
        if (visited.has(serviceName)) {
            if (path.includes(serviceName)) {
                throw new Error(`Circular dependency detected: ${path.join(' -> ')} -> ${serviceName}`);
            }
            return [];
        }

        visited.add(serviceName);
        path.push(serviceName);

        const dependencies = this.dependencies.get(serviceName) || [];
        const resolved: string[] = [];

        for (const dep of dependencies) {
            if (!this.services.has(dep)) {
                throw new Error(`Dependency '${dep}' not found for service '${serviceName}'`);
            }

            resolved.push(...this.resolveDependencies(dep, visited, path));
            resolved.push(dep);
        }

        path.pop();
        return [...new Set(resolved)]; // Remove duplicates while preserving order
    }

    // Get service instance without creating it
    getInstance<T extends ApiService>(name: string): T | null {
        return this.serviceInstances.get(name) as T || null;
    }

    // Replace service instance (useful for testing)
    replaceInstance(name: string, instance: ApiService): void {
        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' is not registered`);
        }
        this.serviceInstances.set(name, instance);
    }

    // Remove service instance
    removeInstance(name: string): void {
        this.serviceInstances.delete(name);
    }

    // Get service health status
    async getServiceHealth(): Promise<Record<string, 'healthy' | 'unhealthy' | 'not_initialized'>> {
        const health: Record<string, 'healthy' | 'unhealthy' | 'not_initialized'> = {};

        for (const name of this.services.keys()) {
            const instance = this.serviceInstances.get(name);

            if (!instance) {
                health[name] = 'not_initialized';
                continue;
            }

            // Check if service has a health check method
            if ('healthCheck' in instance && typeof instance.healthCheck === 'function') {
                try {
                    const isHealthy = await instance.healthCheck();
                    health[name] = isHealthy ? 'healthy' : 'unhealthy';
                } catch (error) {
                    health[name] = 'unhealthy';
                }
            } else {
                // Assume healthy if no health check method
                health[name] = 'healthy';
            }
        }

        return health;
    }
}

// Service Factory for creating services with configuration
export class ServiceFactory {
    private registry: ServiceRegistry;

    constructor(registry: ServiceRegistry) {
        this.registry = registry;
    }

    // Create a service with specific configuration
    async createService<T extends ApiService>(
        name: string,
        config?: Record<string, any>
    ): Promise<T> {
        const service = await this.registry.get<T>(name);

        // Apply configuration if service supports it
        if (config && 'configure' in service && typeof service.configure === 'function') {
            await service.configure(config);
        }

        return service;
    }

    // Create multiple services at once
    async createServices(services: Array<{ name: string; config?: Record<string, any> }>): Promise<void> {
        const promises = services.map(({ name, config }) =>
            this.createService(name, config).catch(error => {
                console.error(`Failed to create service '${name}':`, error);
                throw error;
            })
        );

        await Promise.all(promises);
    }
}

// Service Locator Pattern for global access
export class ServiceLocator {
    private static instance: ServiceLocator;
    private registry: ServiceRegistry;
    private factory: ServiceFactory;

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

    registerService(name: string, serviceClass: new (...args: any[]) => ApiService, dependencies: string[] = []): void {
        this.registry.register(name, serviceClass, dependencies);
    }

    hasService(name: string): boolean {
        return this.registry.has(name);
    }
}

// Decorator for automatic service registration
export function Service(name: string, dependencies: string[] = []) {
    return function <T extends new (...args: any[]) => ApiService>(constructor: T) {
        // Register service when module is loaded
        const locator = ServiceLocator.getInstance();
        locator.registerService(name, constructor, dependencies);

        return constructor;
    };
}

// Decorator for dependency injection
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

// Global service locator instance
export const globalServiceLocator = ServiceLocator.getInstance();

// Helper function to get services globally
export async function getService<T extends ApiService>(name: string): Promise<T> {
    return globalServiceLocator.getService<T>(name);
}

// Helper function to register services globally
export function registerService(name: string, serviceClass: new (...args: any[]) => ApiService, dependencies: string[] = []): void {
    globalServiceLocator.registerService(name, serviceClass, dependencies);
}