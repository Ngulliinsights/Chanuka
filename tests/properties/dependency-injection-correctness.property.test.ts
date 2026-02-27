/**
 * Property Test: Dependency Injection Correctness
 * Feature: client-infrastructure-consolidation, Property 6: Dependency Injection Correctness
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * This property test verifies that:
 * - Services are initialized in the correct order (dependencies before dependents)
 * - Circular dependencies are detected and throw descriptive errors
 * - Singleton services return the same instance on multiple resolutions
 * - Transient services return new instances on each resolution
 * - Three-phase initialization (core → foundation → business) works correctly
 * - Service resolution fails gracefully for unregistered services
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  DIContainer,
  ServiceRegistry,
  CircularDependencyError,
  ServiceNotFoundError,
  createServiceToken,
  createServiceFactory,
  initializeInThreePhases,
  validateNoCycles,
  ServicePhase,
  type ServiceToken,
  type ServiceFactory,
  type PhasedServiceFactory,
} from '@client/infrastructure/consolidation/di-container';

// ============================================================================
// Arbitrary Generators for Service Definitions
// ============================================================================

/**
 * Generate a valid service name
 */
const arbitraryServiceName = fc.string({ minLength: 3, maxLength: 20 })
  .filter(name => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name));

/**
 * Generate a service token
 */
const arbitraryServiceToken = arbitraryServiceName.map(name => 
  createServiceToken(name)
);

/**
 * Generate a simple service factory with no dependencies
 */
const arbitrarySimpleFactory = fc.record({
  value: fc.anything(),
  singleton: fc.boolean(),
}).map(({ value, singleton }) => 
  createServiceFactory(
    () => ({ value }),
    { dependencies: [], singleton }
  )
);

/**
 * Generate a service dependency graph (acyclic)
 * Returns a map of service names to their dependencies
 */
const arbitraryAcyclicDependencyGraph = fc.integer({ min: 3, max: 10 }).chain(numServices => {
  const serviceNames = Array.from({ length: numServices }, (_, i) => `Service${i}`);
  
  return fc.record(
    Object.fromEntries(
      serviceNames.map((name, index) => [
        name,
        // Each service can only depend on services with lower indices (ensures acyclic)
        index === 0 
          ? fc.constant([]) // First service has no dependencies
          : fc.array(
              fc.constantFrom(...serviceNames.slice(0, index)),
              { maxLength: Math.min(3, index) }
            )
      ])
    )
  );
});

/**
 * Generate a circular dependency graph
 * Returns a map of service names with at least one cycle
 */
const arbitraryCircularDependencyGraph = fc.constantFrom(
  // Simple cycle: A -> B -> A
  {
    ServiceA: ['ServiceB'],
    ServiceB: ['ServiceA'],
  },
  // Three-way cycle: A -> B -> C -> A
  {
    ServiceA: ['ServiceB'],
    ServiceB: ['ServiceC'],
    ServiceC: ['ServiceA'],
  },
  // Complex cycle with multiple paths
  {
    ServiceA: ['ServiceB', 'ServiceC'],
    ServiceB: ['ServiceD'],
    ServiceC: ['ServiceD'],
    ServiceD: ['ServiceA'],
  }
);

/**
 * Generate phased service factories for three-phase initialization
 */
const arbitraryPhasedFactories = fc.record({
  coreCount: fc.integer({ min: 1, max: 3 }),
  foundationCount: fc.integer({ min: 1, max: 3 }),
  businessCount: fc.integer({ min: 1, max: 3 }),
}).chain(({ coreCount, foundationCount, businessCount }) => {
  const coreServices = Array.from({ length: coreCount }, (_, i) => ({
    name: `Core${i}`,
    phase: ServicePhase.CORE,
    dependencies: [] as string[],
  }));

  const foundationServices = Array.from({ length: foundationCount }, (_, i) => ({
    name: `Foundation${i}`,
    phase: ServicePhase.FOUNDATION,
    // Foundation services can depend on core services
    dependencies: fc.sample(fc.subarray(coreServices.map(s => s.name), { minLength: 0, maxLength: coreCount }), 1)[0],
  }));

  const businessServices = Array.from({ length: businessCount }, (_, i) => ({
    name: `Business${i}`,
    phase: ServicePhase.BUSINESS,
    // Business services can depend on core and foundation services
    dependencies: fc.sample(
      fc.subarray(
        [...coreServices, ...foundationServices].map(s => s.name),
        { minLength: 0, maxLength: Math.min(3, coreCount + foundationCount) }
      ),
      1
    )[0],
  }));

  return fc.constant([...coreServices, ...foundationServices, ...businessServices]);
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 6: Dependency Injection Correctness', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('Property 6.1: Singleton Consistency', () => {
    it('should return the same instance for singleton services on multiple resolutions', () => {
      fc.assert(
        fc.property(
          arbitraryServiceName,
          fc.anything(),
          (serviceName, value) => {
            const token = createServiceToken(serviceName);
            const factory = createServiceFactory(
              () => ({ value, timestamp: Date.now() }),
              { singleton: true }
            );

            container.register(token, factory);

            const instance1 = container.resolve(token);
            const instance2 = container.resolve(token);

            // Singleton: same instance reference
            expect(instance1).toBe(instance2);
            expect(instance1.timestamp).toBe(instance2.timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.2: Transient Uniqueness', () => {
    it('should return new instances for transient services on each resolution', () => {
      fc.assert(
        fc.property(
          arbitraryServiceName,
          fc.anything(),
          (serviceName, value) => {
            const token = createServiceToken(serviceName);
            const factory = createServiceFactory(
              () => ({ value, timestamp: Date.now() }),
              { singleton: false }
            );

            container.register(token, factory);

            const instance1 = container.resolve(token);
            const instance2 = container.resolve(token);

            // Transient: different instances (may have same value but different references)
            expect(instance1).not.toBe(instance2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.3: Dependency Resolution Order', () => {
    it('should resolve dependencies before dependent services', () => {
      fc.assert(
        fc.property(
          arbitraryAcyclicDependencyGraph,
          (dependencyGraph) => {
            // Use a custom container that tracks resolution order
            const customContainer = new DIContainer();
            const resolutionOrder: string[] = [];
            
            // Override resolve to track order
            const originalResolve = customContainer.resolve.bind(customContainer);
            customContainer.resolve = function<T>(token: ServiceToken<T>): T {
              const serviceName = token.name;
              
              // Track when resolution starts (before dependencies)
              if (!resolutionOrder.includes(serviceName)) {
                resolutionOrder.push(serviceName);
              }
              
              return originalResolve(token);
            };

            // Register all services
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const token = createServiceToken(serviceName);
              const depTokens = dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                (c) => {
                  // Resolve dependencies
                  const resolvedDeps = depTokens.map(depToken => c.resolve(depToken));
                  
                  return { name: serviceName, dependencies: resolvedDeps };
                },
                { dependencies: depTokens, singleton: true }
              );

              customContainer.register(token, factory);
            }

            // Resolve all services
            for (const serviceName of Object.keys(dependencyGraph)) {
              customContainer.resolve(createServiceToken(serviceName));
            }

            // Verify: for each service, all its dependencies appear before it in resolution order
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const serviceIndex = resolutionOrder.indexOf(serviceName);
              
              // Service should be in resolution order
              expect(serviceIndex).toBeGreaterThanOrEqual(0);
              
              for (const dep of dependencies) {
                const depIndex = resolutionOrder.indexOf(dep);
                
                // Dependency should be in resolution order
                expect(depIndex).toBeGreaterThanOrEqual(0);
                
                // Dependency must be resolved before the service that depends on it
                expect(depIndex).toBeLessThan(serviceIndex);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6.4: Circular Dependency Detection', () => {
    it('should detect and throw CircularDependencyError for circular dependencies', () => {
      fc.assert(
        fc.property(
          arbitraryCircularDependencyGraph,
          (dependencyGraph) => {
            // Register all services with circular dependencies
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const token = createServiceToken(serviceName);
              const depTokens = dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                (c) => {
                  const resolvedDeps = depTokens.map(depToken => c.resolve(depToken));
                  return { name: serviceName, dependencies: resolvedDeps };
                },
                { dependencies: depTokens, singleton: true }
              );

              container.register(token, factory);
            }

            // Attempting to resolve any service should throw CircularDependencyError
            const firstService = Object.keys(dependencyGraph)[0];
            
            expect(() => {
              container.resolve(createServiceToken(firstService));
            }).toThrow(CircularDependencyError);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include the complete dependency path in CircularDependencyError', () => {
      fc.assert(
        fc.property(
          arbitraryCircularDependencyGraph,
          (dependencyGraph) => {
            // Register all services
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const token = createServiceToken(serviceName);
              const depTokens = dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                (c) => {
                  const resolvedDeps = depTokens.map(depToken => c.resolve(depToken));
                  return { name: serviceName, dependencies: resolvedDeps };
                },
                { dependencies: depTokens, singleton: true }
              );

              container.register(token, factory);
            }

            // Attempt resolution and capture error
            const firstService = Object.keys(dependencyGraph)[0];
            
            try {
              container.resolve(createServiceToken(firstService));
              throw new Error('Expected CircularDependencyError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(CircularDependencyError);
              
              if (error instanceof CircularDependencyError) {
                // Verify path is non-empty and contains service names
                expect(error.path.length).toBeGreaterThan(0);
                expect(error.path.every(name => typeof name === 'string')).toBe(true);
                
                // Verify the path shows the cycle (first and last should be related)
                const serviceNames = Object.keys(dependencyGraph);
                expect(serviceNames.some(name => error.path.includes(name))).toBe(true);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 6.5: Service Not Found Error', () => {
    it('should throw ServiceNotFoundError for unregistered services', () => {
      fc.assert(
        fc.property(
          arbitraryServiceName,
          (serviceName) => {
            const token = createServiceToken(serviceName);

            // Don't register the service
            expect(() => {
              container.resolve(token);
            }).toThrow(ServiceNotFoundError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include the service name in ServiceNotFoundError', () => {
      fc.assert(
        fc.property(
          arbitraryServiceName,
          (serviceName) => {
            const token = createServiceToken(serviceName);

            try {
              container.resolve(token);
              throw new Error('Expected ServiceNotFoundError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(ServiceNotFoundError);
              
              if (error instanceof ServiceNotFoundError) {
                expect(error.serviceName).toBe(serviceName);
                expect(error.message).toContain(serviceName);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6.6: Three-Phase Initialization Order', () => {
    it('should initialize services in correct phase order (core → foundation → business)', () => {
      fc.assert(
        fc.property(
          arbitraryPhasedFactories,
          (serviceDefinitions) => {
            const initializationOrder: Array<{ name: string; phase: ServicePhase }> = [];
            const factories = new Map<string, PhasedServiceFactory>();

            // Create factories for all services
            for (const serviceDef of serviceDefinitions) {
              const depTokens = serviceDef.dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                (c) => {
                  // Track initialization order
                  initializationOrder.push({ name: serviceDef.name, phase: serviceDef.phase });
                  
                  // Resolve dependencies
                  const resolvedDeps = depTokens.map(depToken => c.resolve(depToken));
                  
                  return { name: serviceDef.name, dependencies: resolvedDeps };
                },
                { 
                  dependencies: depTokens, 
                  singleton: true,
                  phase: serviceDef.phase 
                }
              );

              factories.set(serviceDef.name, factory);
            }

            // Initialize using three-phase initialization
            const registry = initializeInThreePhases(container, factories);

            // Verify all services are initialized
            expect(registry.allInitialized()).toBe(true);

            // Verify phase order: all CORE before FOUNDATION, all FOUNDATION before BUSINESS
            const coreServices = initializationOrder.filter(s => s.phase === ServicePhase.CORE);
            const foundationServices = initializationOrder.filter(s => s.phase === ServicePhase.FOUNDATION);
            const businessServices = initializationOrder.filter(s => s.phase === ServicePhase.BUSINESS);

            if (coreServices.length > 0 && foundationServices.length > 0) {
              const lastCoreIndex = initializationOrder.lastIndexOf(coreServices[coreServices.length - 1]);
              const firstFoundationIndex = initializationOrder.indexOf(foundationServices[0]);
              expect(lastCoreIndex).toBeLessThan(firstFoundationIndex);
            }

            if (foundationServices.length > 0 && businessServices.length > 0) {
              const lastFoundationIndex = initializationOrder.lastIndexOf(foundationServices[foundationServices.length - 1]);
              const firstBusinessIndex = initializationOrder.indexOf(businessServices[0]);
              expect(lastFoundationIndex).toBeLessThan(firstBusinessIndex);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 6.7: Cycle Validation', () => {
    it('should validate acyclic dependency graphs without throwing', () => {
      fc.assert(
        fc.property(
          arbitraryAcyclicDependencyGraph,
          (dependencyGraph) => {
            const factories = new Map<string, ServiceFactory>();

            // Create factories
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const depTokens = dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                () => ({ name: serviceName }),
                { dependencies: depTokens, singleton: true }
              );

              factories.set(serviceName, factory);
            }

            // Should not throw for acyclic graphs
            expect(() => {
              validateNoCycles(factories);
            }).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw CircularDependencyError for cyclic dependency graphs', () => {
      fc.assert(
        fc.property(
          arbitraryCircularDependencyGraph,
          (dependencyGraph) => {
            const factories = new Map<string, ServiceFactory>();

            // Create factories
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const depTokens = dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                () => ({ name: serviceName }),
                { dependencies: depTokens, singleton: true }
              );

              factories.set(serviceName, factory);
            }

            // Should throw for cyclic graphs
            expect(() => {
              validateNoCycles(factories);
            }).toThrow(CircularDependencyError);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 6.8: Service Registry Completeness', () => {
    it('should register all initialized services in the registry', () => {
      fc.assert(
        fc.property(
          arbitraryAcyclicDependencyGraph,
          (dependencyGraph) => {
            const registry = new ServiceRegistry();

            // Register and initialize all services
            for (const [serviceName, dependencies] of Object.entries(dependencyGraph)) {
              const token = createServiceToken(serviceName);
              const depTokens = dependencies.map(dep => createServiceToken(dep));

              const factory = createServiceFactory(
                (c) => {
                  const resolvedDeps = depTokens.map(depToken => c.resolve(depToken));
                  return { name: serviceName, dependencies: resolvedDeps };
                },
                { dependencies: depTokens, singleton: true }
              );

              container.register(token, factory);
            }

            // Resolve all services and add to registry
            for (const serviceName of Object.keys(dependencyGraph)) {
              const token = createServiceToken(serviceName);
              const instance = container.resolve(token);
              registry.register(serviceName, instance);
            }

            // Verify all services are in the registry
            const registeredNames = registry.getServiceNames();
            const expectedNames = Object.keys(dependencyGraph);

            expect(registeredNames.sort()).toEqual(expectedNames.sort());
            expect(registry.allInitialized()).toBe(true);

            // Verify all services can be retrieved
            for (const serviceName of expectedNames) {
              const service = registry.get(serviceName);
              expect(service).toBeDefined();
              expect(service.name).toBe(serviceName);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
