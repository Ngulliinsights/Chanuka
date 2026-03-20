/**
 * Dependency Injection Container
 * 
 * This module provides a dependency injection container that manages service
 * instantiation and dependency resolution. It supports three-phase initialization
 * (core → foundation → business services) to eliminate circular dependencies.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * Token used to identify a service in the container
 */
export interface ServiceToken<T = any> {
  /** Unique name for the service */
  name: string;
  /** Optional type information (for type safety) */
  type?: new (...args: any[]) => T;
}

/**
 * Factory function that creates a service instance
 */
export interface ServiceFactory<T = any> {
  /** Function that creates the service instance */
  create: (container: IDIContainer) => T;
  /** List of service tokens this factory depends on */
  dependencies: ServiceToken[];
  /** Whether this service should be a singleton (true) or transient (false) */
  singleton: boolean;
}

/**
 * Dependency Injection Container interface
 */
export interface IDIContainer {
  /**
   * Register a service with the container
   * 
   * @param token - Service token to register
   * @param factory - Factory function to create the service
   */
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;

  /**
   * Resolve a service from the container
   * 
   * @param token - Service token to resolve
   * @returns The service instance
   * @throws Error if service is not registered or has circular dependencies
   */
  resolve<T>(token: ServiceToken<T>): T;

  /**
   * Resolve all services registered with a given name pattern
   * 
   * @param pattern - Pattern to match service names (supports wildcards)
   * @returns Array of service instances
   */
  resolveAll(pattern: string): any[];

  /**
   * Clear all registered services and cached instances
   */
  clear(): void;

  /**
   * Check if a service is registered
   * 
   * @param token - Service token to check
   * @returns True if the service is registered
   */
  has<T>(token: ServiceToken<T>): boolean;

  /**
   * Get all registered service names
   * 
   * @returns Array of service names
   */
  getServiceNames(): string[];
}

/**
 * Service initialization phase
 */
export enum ServicePhase {
  /** Core services with no dependencies (EventBus, Storage) */
  CORE = 'CORE',
  /** Foundation services that depend on core (Logger, Cache, Observability) */
  FOUNDATION = 'FOUNDATION',
  /** Business services that depend on foundation (ErrorHandler, APIClient, Store) */
  BUSINESS = 'BUSINESS',
}

/**
 * Extended service factory with phase information
 */
export interface PhasedServiceFactory<T = any> extends ServiceFactory<T> {
  /** Initialization phase for this service */
  phase: ServicePhase;
}

/**
 * Circular dependency error
 */
export class CircularDependencyError extends Error {
  constructor(
    public readonly path: string[],
    message?: string
  ) {
    super(message || `Circular dependency detected: ${path.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Service not found error
 */
export class ServiceNotFoundError extends Error {
  constructor(
    public readonly serviceName: string,
    message?: string
  ) {
    super(message || `Service not found: ${serviceName}`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Dependency Injection Container implementation
 */
export class DIContainer implements IDIContainer {
  private factories = new Map<string, ServiceFactory>();
  private instances = new Map<string, any>();
  private resolving = new Set<string>();

  /**
   * Register a service with the container
   */
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.factories.set(token.name, factory);
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: ServiceToken<T>): T {
    const serviceName = token.name;

    // Check if service is registered
    if (!this.factories.has(serviceName)) {
      throw new ServiceNotFoundError(serviceName);
    }

    const factory = this.factories.get(serviceName)!;

    // Return cached instance for singletons
    if (factory.singleton && this.instances.has(serviceName)) {
      return this.instances.get(serviceName) as T;
    }

    // Detect circular dependencies
    if (this.resolving.has(serviceName)) {
      const path = Array.from(this.resolving);
      path.push(serviceName);
      throw new CircularDependencyError(path);
    }

    // Mark as resolving
    this.resolving.add(serviceName);

    try {
      // Resolve dependencies first
      const dependencies = factory.dependencies.map(dep => this.resolve(dep));

      // Create the service instance
      const instance = factory.create(this);

      // Cache singleton instances
      if (factory.singleton) {
        this.instances.set(serviceName, instance);
      }

      return instance as T;
    } finally {
      // Remove from resolving set
      this.resolving.delete(serviceName);
    }
  }

  /**
   * Resolve all services matching a pattern
   */
  resolveAll(pattern: string): any[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingServices: any[] = [];

    for (const serviceName of this.factories.keys()) {
      if (regex.test(serviceName)) {
        matchingServices.push(this.resolve({ name: serviceName }));
      }
    }

    return matchingServices;
  }

  /**
   * Clear all registered services and cached instances
   */
  clear(): void {
    this.factories.clear();
    this.instances.clear();
    this.resolving.clear();
  }

  /**
   * Check if a service is registered
   */
  has<T>(token: ServiceToken<T>): boolean {
    return this.factories.has(token.name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Service registry that holds initialized services
 */
export class ServiceRegistry {
  private services = new Map<string, any>();

  /**
   * Register a service instance
   */
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Check if all services are initialized
   */
  allInitialized(): boolean {
    return this.services.size > 0;
  }

  /**
   * Get all service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
  }
}

/**
 * Helper function to create a service token
 */
export function createServiceToken<T>(name: string, type?: new (...args: any[]) => T): ServiceToken<T> {
  return { name, type };
}

/**
 * Helper function to create a service factory
 */
export function createServiceFactory<T>(
  create: (container: IDIContainer) => T,
  options: {
    dependencies?: ServiceToken[];
    singleton?: boolean;
    phase?: ServicePhase;
  } = {}
): PhasedServiceFactory<T> {
  return {
    create,
    dependencies: options.dependencies || [],
    singleton: options.singleton !== false, // Default to singleton
    phase: options.phase || ServicePhase.BUSINESS,
  };
}

/**
 * Three-phase initialization helper
 * 
 * This function initializes services in three phases to ensure proper
 * dependency order and eliminate circular dependencies:
 * 
 * 1. Core: Services with no dependencies (EventBus, Storage)
 * 2. Foundation: Services that depend on core (Logger, Cache, Observability)
 * 3. Business: Services that depend on foundation (ErrorHandler, APIClient, Store)
 */
export function initializeInThreePhases(
  container: IDIContainer,
  factories: Map<string, PhasedServiceFactory>
): ServiceRegistry {
  const registry = new ServiceRegistry();

  // Phase 1: Core services
  const coreServices = Array.from(factories.entries())
    .filter(([_, factory]) => factory.phase === ServicePhase.CORE);
  
  for (const [name, factory] of coreServices) {
    const token = createServiceToken(name);
    container.register(token, factory);
    const instance = container.resolve(token);
    registry.register(name, instance);
  }

  // Phase 2: Foundation services
  const foundationServices = Array.from(factories.entries())
    .filter(([_, factory]) => factory.phase === ServicePhase.FOUNDATION);
  
  for (const [name, factory] of foundationServices) {
    const token = createServiceToken(name);
    container.register(token, factory);
    const instance = container.resolve(token);
    registry.register(name, instance);
  }

  // Phase 3: Business services
  const businessServices = Array.from(factories.entries())
    .filter(([_, factory]) => factory.phase === ServicePhase.BUSINESS);
  
  for (const [name, factory] of businessServices) {
    const token = createServiceToken(name);
    container.register(token, factory);
    const instance = container.resolve(token);
    registry.register(name, instance);
  }

  return registry;
}

/**
 * Validates that a set of service factories has no circular dependencies
 * 
 * @param factories - Map of service factories to validate
 * @throws CircularDependencyError if circular dependencies are detected
 */
export function validateNoCycles(factories: Map<string, ServiceFactory>): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(serviceName: string, path: string[]): void {
    if (recursionStack.has(serviceName)) {
      throw new CircularDependencyError([...path, serviceName]);
    }

    if (visited.has(serviceName)) {
      return;
    }

    visited.add(serviceName);
    recursionStack.add(serviceName);

    const factory = factories.get(serviceName);
    if (factory) {
      for (const dep of factory.dependencies) {
        visit(dep.name, [...path, serviceName]);
      }
    }

    recursionStack.delete(serviceName);
  }

  for (const serviceName of factories.keys()) {
    visit(serviceName, []);
  }
}
