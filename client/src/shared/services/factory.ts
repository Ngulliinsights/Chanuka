/**
 * Service Factory and Dependency Injection System
 *
 * Provides a comprehensive dependency injection container with:
 * - Service registration and resolution
 * - Lifecycle management (singleton, transient, scoped)
 * - Service dependencies and initialization
 * - Service validation and health checks
 * - Service configuration and options
 */

import { ServiceError, DependencyError, ConfigurationError, ServiceErrorFactory } from './errors';
import { logger } from '@client/shared/utils/logger';

// ============================================================================
// SERVICE LIFECYCLE AND REGISTRATION
// ============================================================================

export enum ServiceLifecycle {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

export interface ServiceRegistration {
  /** Service identifier */
  id: string;
  /** Service factory function */
  factory: (container: ServiceContainer) => unknown;
  /** Service lifecycle */
  lifecycle: ServiceLifecycle;
  /** Service dependencies */
  dependencies: string[];
  /** Service configuration */
  config?: Record<string, unknown>;
  /** Service metadata */
  metadata?: {
    version?: string;
    description?: string;
    tags?: string[];
  };
}

export interface ServiceInstance {
  /** Service instance */
  instance: unknown;
  /** Service registration */
  registration: ServiceRegistration;
  /** Creation timestamp */
  created: Date;
  /** Last access timestamp */
  lastAccess?: Date;
  /** Health status */
  health?: 'healthy' | 'unhealthy' | 'unknown';
}

// ============================================================================
// SERVICE CONTAINER
// ============================================================================

export class ServiceContainer {
  private services: Map<string, ServiceInstance> = new Map();
  private registrations: Map<string, ServiceRegistration> = new Map();
  private scopedServices: Map<string, ServiceInstance> = new Map();
  private isInitialized = false;

  /**
   * Register a service
   */
  register(registration: ServiceRegistration): this {
    if (this.isInitialized) {
      throw new ConfigurationError('Cannot register services after container initialization', 'register');
    }

    this.registrations.set(registration.id, registration);
    return this;
  }

  /**
   * Register multiple services
   */
  registerMany(registrations: ServiceRegistration[]): this {
    for (const registration of registrations) {
      this.register(registration);
    }
    return this;
  }

  /**
   * Resolve a service by ID
   */
  resolve<T>(id: string): T {
    try {
      // Check scoped services first
      if (this.scopedServices.has(id)) {
        const scopedInstance = this.scopedServices.get(id)!;
        scopedInstance.lastAccess = new Date();
        return scopedInstance.instance as T;
      }

      // Check singleton services
      if (this.services.has(id)) {
        const singletonInstance = this.services.get(id)!;
        singletonInstance.lastAccess = new Date();
        return singletonInstance.instance as T;
      }

      // Create new instance
      const registration = this.registrations.get(id);
      if (!registration) {
        throw new DependencyError(id, `Service ${id} is not registered`);
      }

      const instance = this.createInstance(registration);
      const serviceInstance: ServiceInstance = {
        instance,
        registration,
        created: new Date(),
        lastAccess: new Date(),
        health: 'unknown'
      };

      // Store based on lifecycle
      if (registration.lifecycle === ServiceLifecycle.SINGLETON) {
        this.services.set(id, serviceInstance);
      } else if (registration.lifecycle === ServiceLifecycle.SCOPED) {
        this.scopedServices.set(id, serviceInstance);
      }

      return instance as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw ServiceErrorFactory.createDependencyError(id, `Failed to resolve service: ${errorMessage}`, 'resolve', { originalError: error });
    }
  }

  /**
   * Check if service is registered
   */
  isRegistered(id: string): boolean {
    return this.registrations.has(id);
  }

  /**
   * Get service registration
   */
  getRegistration(id: string): ServiceRegistration | undefined {
    return this.registrations.get(id);
  }

  /**
   * Get all registered service IDs
   */
  getRegisteredServices(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Initialize the container
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate all registrations
      this.validateRegistrations();

      // Initialize singleton services
      for (const [id, registration] of this.registrations) {
        if (registration.lifecycle === ServiceLifecycle.SINGLETON) {
          try {
            const instance = this.createInstance(registration);
            this.services.set(id, {
              instance,
              registration,
              created: new Date(),
              lastAccess: new Date(),
              health: 'unknown'
            });
          } catch (error) {
            logger.error('Failed to initialize singleton service', { id, error });
            throw ServiceErrorFactory.createDependencyError(id, `Failed to initialize singleton service: ${error.message}`, 'initialize', { originalError: error });
          }
        }
      }

      this.isInitialized = true;
      logger.info('Service container initialized successfully');
    } catch (error) {
      throw ServiceErrorFactory.createSystemError('Service container initialization failed', 'ServiceContainer', 'initialize', { originalError: error });
    }
  }

  /**
   * Dispose the container
   */
  async dispose(): Promise<void> {
    try {
      // Dispose scoped services
      for (const service of this.scopedServices.values()) {
        await this.disposeService(service);
      }
      this.scopedServices.clear();

      // Dispose singleton services
      for (const service of this.services.values()) {
        await this.disposeService(service);
      }
      this.services.clear();

      this.isInitialized = false;
      logger.info('Service container disposed successfully');
    } catch (error) {
      throw ServiceErrorFactory.createSystemError('Service container disposal failed', 'ServiceContainer', 'dispose', { originalError: error });
    }
  }

  /**
   * Create service instance with dependency resolution
   */
  private createInstance(registration: ServiceRegistration): unknown {
    // Resolve dependencies
    const dependencies: unknown[] = [];
    for (const depId of registration.dependencies) {
      const dependency = this.resolve(depId);
      dependencies.push(dependency);
    }

    // Create instance
    try {
      return registration.factory(this);
    } catch (error) {
      throw ServiceErrorFactory.createDependencyError(registration.id, `Failed to create service instance: ${error.message}`, 'createInstance', { originalError: error });
    }
  }

  /**
   * Dispose service instance
   */
  private async disposeService(service: ServiceInstance): Promise<void> {
    if (typeof (service.instance as any).dispose === 'function') {
      try {
        await (service.instance as any).dispose();
      } catch (error) {
        logger.warn('Service disposal failed', { serviceId: service.registration.id, error });
      }
    }
  }

  /**
   * Validate service registrations
   */
  private validateRegistrations(): void {
    for (const [id, registration] of this.registrations) {
      // Check dependencies
      for (const depId of registration.dependencies) {
        if (!this.registrations.has(depId)) {
          throw new ConfigurationError(`Service ${id} depends on unregistered service ${depId}`, 'validateRegistrations');
        }
      }

      // Check for circular dependencies
      this.validateCircularDependencies(id, new Set());
    }
  }

  /**
   * Validate circular dependencies
   */
  private validateCircularDependencies(serviceId: string, visited: Set<string>): void {
    if (visited.has(serviceId)) {
      throw new ConfigurationError(`Circular dependency detected for service ${serviceId}`, 'validateCircularDependencies');
    }

    visited.add(serviceId);
    const registration = this.registrations.get(serviceId);

    if (registration) {
      for (const depId of registration.dependencies) {
        this.validateCircularDependencies(depId, new Set(visited));
      }
    }

    visited.delete(serviceId);
  }

  /**
   * Get service health status
   */
  async getHealthStatus(id: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    const service = this.services.get(id) || this.scopedServices.get(id);
    if (!service) {
      return 'unknown';
    }

    try {
      if (typeof (service.instance as any).healthCheck === 'function') {
        const health = await (service.instance as any).healthCheck();
        service.health = health ? 'healthy' : 'unhealthy';
      }
    } catch (error) {
      service.health = 'unhealthy';
      logger.warn('Service health check failed', { id, error });
    }

    return service.health || 'unknown';
  }

  /**
   * Get container statistics
   */
  getStatistics(): {
    totalServices: number;
    singletonServices: number;
    scopedServices: number;
    transientServices: number;
    initialized: boolean;
  } {
    const singletonCount = Array.from(this.services.values()).filter(s => s.registration.lifecycle === ServiceLifecycle.SINGLETON).length;
    const scopedCount = Array.from(this.scopedServices.values()).filter(s => s.registration.lifecycle === ServiceLifecycle.SCOPED).length;
    const transientCount = Array.from(this.registrations.values()).filter(r => r.lifecycle === ServiceLifecycle.TRANSIENT).length;

    return {
      totalServices: this.registrations.size,
      singletonServices: singletonCount,
      scopedServices: scopedCount,
      transientServices: transientCount,
      initialized: this.isInitialized
    };
  }
}

// ============================================================================
// SERVICE FACTORY
// ============================================================================

export class ServiceFactory {
  private static container: ServiceContainer | null = null;
  private static isConfigured = false;

  /**
   * Configure the service factory
   */
  static configure(config: {
    registrations: ServiceRegistration[];
    container?: ServiceContainer;
  }): void {
    if (this.isConfigured) {
      throw new ConfigurationError('Service factory already configured', 'configure');
    }

    this.container = config.container || new ServiceContainer();

    try {
      this.container.registerMany(config.registrations);
      this.isConfigured = true;
      logger.info('Service factory configured successfully');
    } catch (error) {
      throw ServiceErrorFactory.createConfigurationError('configure', `Failed to configure service factory: ${error.message}`, { originalError: error });
    }
  }

  /**
   * Initialize the service factory
   */
  static async initialize(): Promise<void> {
    if (!this.container) {
      throw new ConfigurationError('Service factory not configured', 'initialize');
    }

    try {
      await this.container.initialize();
    } catch (error) {
      throw ServiceErrorFactory.createSystemError('Service factory initialization failed', 'ServiceFactory', 'initialize', { originalError: error });
    }
  }

  /**
   * Dispose the service factory
   */
  static async dispose(): Promise<void> {
    if (!this.container) {
      return;
    }

    try {
      await this.container.dispose();
      this.isConfigured = false;
    } catch (error) {
      throw ServiceErrorFactory.createSystemError('Service factory disposal failed', 'ServiceFactory', 'dispose', { originalError: error });
    }
  }

  /**
   * Resolve a service
   */
  static resolve<T>(id: string): T {
    if (!this.container) {
      throw new ConfigurationError('Service factory not configured', 'resolve');
    }

    return this.container.resolve<T>(id);
  }

  /**
   * Check if service is registered
   */
  static isRegistered(id: string): boolean {
    if (!this.container) {
      return false;
    }

    return this.container.isRegistered(id);
  }

  /**
   * Get service registration
   */
  static getRegistration(id: string): ServiceRegistration | undefined {
    if (!this.container) {
      return undefined;
    }

    return this.container.getRegistration(id);
  }

  /**
   * Get all registered services
   */
  static getRegisteredServices(): string[] {
    if (!this.container) {
      return [];
    }

    return this.container.getRegisteredServices();
  }

  /**
   * Get service health status
   */
  static async getHealthStatus(id: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    if (!this.container) {
      return 'unknown';
    }

    return this.container.getHealthStatus(id);
  }

  /**
   * Get factory statistics
   */
  static getStatistics(): {
    totalServices: number;
    singletonServices: number;
    scopedServices: number;
    transientServices: number;
    initialized: boolean;
  } {
    if (!this.container) {
      return {
        totalServices: 0,
        singletonServices: 0,
        scopedServices: 0,
        transientServices: 0,
        initialized: false
      };
    }

    return this.container.getStatistics();
  }

  /**
   * Create a service registration
   */
  static createRegistration(config: {
    id: string;
    factory: (container: ServiceContainer) => unknown;
    lifecycle?: ServiceLifecycle;
    dependencies?: string[];
    config?: Record<string, unknown>;
    metadata?: {
      version?: string;
      description?: string;
      tags?: string[];
    };
  }): ServiceRegistration {
    return {
      id: config.id,
      factory: config.factory,
      lifecycle: config.lifecycle || ServiceLifecycle.TRANSIENT,
      dependencies: config.dependencies || [],
      config: config.config,
      metadata: config.metadata
    };
  }
}

// ============================================================================
// DECORATORS FOR SERVICE REGISTRATION
// ============================================================================

/**
 * Service decorator for automatic registration
 */
export function Service(config: {
  id?: string;
  lifecycle?: ServiceLifecycle;
  dependencies?: string[];
  config?: Record<string, unknown>;
  metadata?: {
    version?: string;
    description?: string;
    tags?: string[];
  };
}) {
  return function (target: any) {
    const serviceId = config.id || target.name;
    const registration = ServiceFactory.createRegistration({
      id: serviceId,
      factory: (container: ServiceContainer) => new target(container),
      lifecycle: config.lifecycle,
      dependencies: config.dependencies,
      config: config.config,
      metadata: config.metadata
    });

    // Register the service
    if (ServiceFactory.isRegistered(serviceId)) {
      logger.warn(`Service ${serviceId} already registered, skipping`);
    } else {
      // We need to defer registration until the factory is configured
      // This is a simplified implementation
      logger.info(`Service ${serviceId} marked for registration`);
    }

    return target;
  };
}

/**
 * Inject decorator for dependency injection
 */
export function Inject(serviceId: string) {
  return function (target: any, propertyKey: string) {
    const originalDescriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

    Object.defineProperty(target, propertyKey, {
      get() {
        return ServiceFactory.resolve(serviceId);
      },
      set() {
        // Read-only property
      },
      enumerable: true,
      configurable: true
    });
  };
}

// ============================================================================
// SERVICE LIFECYCLE INTERFACES
// ============================================================================

/**
 * Service lifecycle interface
 */
export interface ServiceLifecycleInterface {
  /** Initialize service */
  init?(): Promise<void>;
  /** Dispose service */
  dispose?(): Promise<void>;
  /** Health check */
  healthCheck?(): Promise<boolean>;
  /** Get service info */
  getInfo?(): {
    name: string;
    version?: string;
    description?: string;
    dependencies: string[];
  };
}

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  /** Service name */
  name: string;
  /** Service version */
  version: string;
  /** Service description */
  description?: string;
  /** Service dependencies */
  dependencies?: string[];
  /** Service options */
  options?: Record<string, unknown>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a singleton service registration
 */
export function createSingletonRegistration<T>(
  id: string,
  factory: (container: ServiceContainer) => T,
  dependencies: string[] = [],
  config?: Record<string, unknown>
): ServiceRegistration {
  return ServiceFactory.createRegistration({
    id,
    factory,
    lifecycle: ServiceLifecycle.SINGLETON,
    dependencies,
    config
  });
}

/**
 * Create a transient service registration
 */
export function createTransientRegistration<T>(
  id: string,
  factory: (container: ServiceContainer) => T,
  dependencies: string[] = [],
  config?: Record<string, unknown>
): ServiceRegistration {
  return ServiceFactory.createRegistration({
    id,
    factory,
    lifecycle: ServiceLifecycle.TRANSIENT,
    dependencies,
    config
  });
}

/**
 * Create a scoped service registration
 */
export function createScopedRegistration<T>(
  id: string,
  factory: (container: ServiceContainer) => T,
  dependencies: string[] = [],
  config?: Record<string, unknown>
): ServiceRegistration {
  return ServiceFactory.createRegistration({
    id,
    factory,
    lifecycle: ServiceLifecycle.SCOPED,
    dependencies,
    config
  });
}

// Export default container and factory
export const container = new ServiceContainer();
