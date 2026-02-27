/**
 * Unit tests for Dependency Injection Container
 * 
 * Tests service registration, resolution, lifecycle management,
 * and circular dependency detection.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
  type IDIContainer,
  type ServiceToken,
  type ServiceFactory,
  type PhasedServiceFactory,
} from '../di-container';

describe('DIContainer', () => {
  let container: IDIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('Service Registration', () => {
    it('should register a service successfully', () => {
      const token = createServiceToken('TestService');
      const factory = createServiceFactory(() => ({ value: 42 }));

      container.register(token, factory);

      expect(container.has(token)).toBe(true);
    });

    it('should allow registering multiple services', () => {
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');
      const factory1 = createServiceFactory(() => ({ name: 'service1' }));
      const factory2 = createServiceFactory(() => ({ name: 'service2' }));

      container.register(token1, factory1);
      container.register(token2, factory2);

      expect(container.has(token1)).toBe(true);
      expect(container.has(token2)).toBe(true);
    });

    it('should return false for unregistered services', () => {
      const token = createServiceToken('UnregisteredService');
      expect(container.has(token)).toBe(false);
    });

    it('should get all registered service names', () => {
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');
      const factory = createServiceFactory(() => ({}));

      container.register(token1, factory);
      container.register(token2, factory);

      const names = container.getServiceNames();
      expect(names).toContain('Service1');
      expect(names).toContain('Service2');
      expect(names).toHaveLength(2);
    });
  });

  describe('Service Resolution', () => {
    it('should resolve a simple service', () => {
      const token = createServiceToken('TestService');
      const factory = createServiceFactory(() => ({ value: 42 }));

      container.register(token, factory);
      const service = container.resolve(token);

      expect(service).toEqual({ value: 42 });
    });

    it('should throw ServiceNotFoundError for unregistered service', () => {
      const token = createServiceToken('UnregisteredService');

      expect(() => container.resolve(token)).toThrow(ServiceNotFoundError);
      expect(() => container.resolve(token)).toThrow('Service not found: UnregisteredService');
    });

    it('should resolve service with dependencies', () => {
      const depToken = createServiceToken('Dependency');
      const serviceToken = createServiceToken('Service');

      const depFactory = createServiceFactory(() => ({ value: 10 }));
      const serviceFactory = createServiceFactory(
        (c) => {
          const dep = c.resolve(depToken);
          return { result: dep.value * 2 };
        },
        { dependencies: [depToken] }
      );

      container.register(depToken, depFactory);
      container.register(serviceToken, serviceFactory);

      const service = container.resolve(serviceToken);
      expect(service).toEqual({ result: 20 });
    });

    it('should resolve service with multiple dependencies', () => {
      const dep1Token = createServiceToken('Dep1');
      const dep2Token = createServiceToken('Dep2');
      const serviceToken = createServiceToken('Service');

      container.register(dep1Token, createServiceFactory(() => ({ a: 5 })));
      container.register(dep2Token, createServiceFactory(() => ({ b: 10 })));
      container.register(
        serviceToken,
        createServiceFactory(
          (c) => {
            const dep1 = c.resolve(dep1Token);
            const dep2 = c.resolve(dep2Token);
            return { sum: dep1.a + dep2.b };
          },
          { dependencies: [dep1Token, dep2Token] }
        )
      );

      const service = container.resolve(serviceToken);
      expect(service).toEqual({ sum: 15 });
    });

    it('should resolve all services matching a pattern', () => {
      container.register(
        createServiceToken('Service1'),
        createServiceFactory(() => ({ id: 1 }))
      );
      container.register(
        createServiceToken('Service2'),
        createServiceFactory(() => ({ id: 2 }))
      );
      container.register(
        createServiceToken('OtherService'),
        createServiceFactory(() => ({ id: 3 }))
      );

      const services = container.resolveAll('^Service[12]$');
      expect(services).toHaveLength(2);
      expect(services.map(s => s.id).sort()).toEqual([1, 2]);
    });
  });

  describe('Singleton Lifecycle', () => {
    it('should return same instance for singleton services', () => {
      const token = createServiceToken('SingletonService');
      const factory = createServiceFactory(() => ({ id: Math.random() }), {
        singleton: true,
      });

      container.register(token, factory);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });

    it('should create singleton by default', () => {
      const token = createServiceToken('DefaultService');
      const factory = createServiceFactory(() => ({ id: Math.random() }));

      container.register(token, factory);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).toBe(instance2);
    });
  });

  describe('Transient Lifecycle', () => {
    it('should return new instance for transient services', () => {
      const token = createServiceToken('TransientService');
      const factory = createServiceFactory(() => ({ id: Math.random() }), {
        singleton: false,
      });

      container.register(token, factory);

      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect direct circular dependency', () => {
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');

      const factory1 = createServiceFactory(
        (c) => {
          const dep = c.resolve(token2);
          return { dep };
        },
        { dependencies: [token2] }
      );

      const factory2 = createServiceFactory(
        (c) => {
          const dep = c.resolve(token1);
          return { dep };
        },
        { dependencies: [token1] }
      );

      container.register(token1, factory1);
      container.register(token2, factory2);

      expect(() => container.resolve(token1)).toThrow(CircularDependencyError);
    });

    it('should detect indirect circular dependency', () => {
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');
      const token3 = createServiceToken('Service3');

      container.register(
        token1,
        createServiceFactory((c) => ({ dep: c.resolve(token2) }), {
          dependencies: [token2],
        })
      );

      container.register(
        token2,
        createServiceFactory((c) => ({ dep: c.resolve(token3) }), {
          dependencies: [token3],
        })
      );

      container.register(
        token3,
        createServiceFactory((c) => ({ dep: c.resolve(token1) }), {
          dependencies: [token1],
        })
      );

      expect(() => container.resolve(token1)).toThrow(CircularDependencyError);
    });

    it('should include dependency path in circular dependency error', () => {
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');

      container.register(
        token1,
        createServiceFactory((c) => c.resolve(token2), { dependencies: [token2] })
      );
      container.register(
        token2,
        createServiceFactory((c) => c.resolve(token1), { dependencies: [token1] })
      );

      try {
        container.resolve(token1);
        expect.fail('Should have thrown CircularDependencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError);
        const circularError = error as CircularDependencyError;
        expect(circularError.path).toContain('Service1');
        expect(circularError.path).toContain('Service2');
      }
    });
  });

  describe('Container Management', () => {
    it('should clear all services and instances', () => {
      const token = createServiceToken('TestService');
      const factory = createServiceFactory(() => ({ value: 42 }));

      container.register(token, factory);
      container.resolve(token);

      expect(container.has(token)).toBe(true);

      container.clear();

      expect(container.has(token)).toBe(false);
      expect(container.getServiceNames()).toHaveLength(0);
    });

    it('should allow re-registration after clear', () => {
      const token = createServiceToken('TestService');
      const factory1 = createServiceFactory(() => ({ value: 1 }));
      const factory2 = createServiceFactory(() => ({ value: 2 }));

      container.register(token, factory1);
      const service1 = container.resolve(token);
      expect(service1.value).toBe(1);

      container.clear();

      container.register(token, factory2);
      const service2 = container.resolve(token);
      expect(service2.value).toBe(2);
    });
  });
});

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  it('should register and retrieve services', () => {
    const service = { name: 'TestService' };
    registry.register('test', service);

    const retrieved = registry.get('test');
    expect(retrieved).toBe(service);
  });

  it('should return undefined for unregistered services', () => {
    const retrieved = registry.get('nonexistent');
    expect(retrieved).toBeUndefined();
  });

  it('should check if all services are initialized', () => {
    expect(registry.allInitialized()).toBe(false);

    registry.register('service1', {});
    expect(registry.allInitialized()).toBe(true);
  });

  it('should get all service names', () => {
    registry.register('service1', {});
    registry.register('service2', {});

    const names = registry.getServiceNames();
    expect(names).toContain('service1');
    expect(names).toContain('service2');
    expect(names).toHaveLength(2);
  });

  it('should clear all services', () => {
    registry.register('service1', {});
    registry.register('service2', {});

    registry.clear();

    expect(registry.getServiceNames()).toHaveLength(0);
    expect(registry.allInitialized()).toBe(false);
  });
});

describe('Helper Functions', () => {
  describe('createServiceToken', () => {
    it('should create a service token with name', () => {
      const token = createServiceToken('TestService');
      expect(token.name).toBe('TestService');
    });

    it('should create a service token with type', () => {
      class TestClass {}
      const token = createServiceToken('TestService', TestClass);
      expect(token.name).toBe('TestService');
      expect(token.type).toBe(TestClass);
    });
  });

  describe('createServiceFactory', () => {
    it('should create a factory with default options', () => {
      const create = () => ({ value: 42 });
      const factory = createServiceFactory(create);

      expect(factory.create).toBe(create);
      expect(factory.dependencies).toEqual([]);
      expect(factory.singleton).toBe(true);
      expect(factory.phase).toBe(ServicePhase.BUSINESS);
    });

    it('should create a factory with custom options', () => {
      const create = () => ({ value: 42 });
      const dep = createServiceToken('Dependency');
      const factory = createServiceFactory(create, {
        dependencies: [dep],
        singleton: false,
        phase: ServicePhase.CORE,
      });

      expect(factory.dependencies).toEqual([dep]);
      expect(factory.singleton).toBe(false);
      expect(factory.phase).toBe(ServicePhase.CORE);
    });
  });

  describe('validateNoCycles', () => {
    it('should pass for acyclic dependencies', () => {
      const factories = new Map<string, ServiceFactory>();
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');

      factories.set(
        'Service1',
        createServiceFactory(() => ({}), { dependencies: [] })
      );
      factories.set(
        'Service2',
        createServiceFactory(() => ({}), { dependencies: [token1] })
      );

      expect(() => validateNoCycles(factories)).not.toThrow();
    });

    it('should throw for circular dependencies', () => {
      const factories = new Map<string, ServiceFactory>();
      const token1 = createServiceToken('Service1');
      const token2 = createServiceToken('Service2');

      factories.set(
        'Service1',
        createServiceFactory(() => ({}), { dependencies: [token2] })
      );
      factories.set(
        'Service2',
        createServiceFactory(() => ({}), { dependencies: [token1] })
      );

      expect(() => validateNoCycles(factories)).toThrow(CircularDependencyError);
    });
  });
});

describe('Three-Phase Initialization', () => {
  it('should initialize services in correct phase order', () => {
    const container = new DIContainer();
    const initOrder: string[] = [];

    const factories = new Map<string, PhasedServiceFactory>();

    // Core services
    factories.set(
      'EventBus',
      createServiceFactory(
        () => {
          initOrder.push('EventBus');
          return { type: 'EventBus' };
        },
        { phase: ServicePhase.CORE }
      )
    );

    factories.set(
      'Storage',
      createServiceFactory(
        () => {
          initOrder.push('Storage');
          return { type: 'Storage' };
        },
        { phase: ServicePhase.CORE }
      )
    );

    // Foundation services
    const eventBusToken = createServiceToken('EventBus');
    factories.set(
      'Logger',
      createServiceFactory(
        (c) => {
          initOrder.push('Logger');
          const eventBus = c.resolve(eventBusToken);
          return { type: 'Logger', eventBus };
        },
        { dependencies: [eventBusToken], phase: ServicePhase.FOUNDATION }
      )
    );

    // Business services
    const loggerToken = createServiceToken('Logger');
    factories.set(
      'APIClient',
      createServiceFactory(
        (c) => {
          initOrder.push('APIClient');
          const logger = c.resolve(loggerToken);
          return { type: 'APIClient', logger };
        },
        { dependencies: [loggerToken], phase: ServicePhase.BUSINESS }
      )
    );

    const registry = initializeInThreePhases(container, factories);

    // Verify initialization order
    expect(initOrder[0]).toBe('EventBus');
    expect(initOrder[1]).toBe('Storage');
    expect(initOrder[2]).toBe('Logger');
    expect(initOrder[3]).toBe('APIClient');

    // Verify all services are in registry
    expect(registry.get('EventBus')).toBeDefined();
    expect(registry.get('Storage')).toBeDefined();
    expect(registry.get('Logger')).toBeDefined();
    expect(registry.get('APIClient')).toBeDefined();
  });

  it('should handle dependencies within same phase', () => {
    const container = new DIContainer();
    const factories = new Map<string, PhasedServiceFactory>();

    const service1Token = createServiceToken('Service1');
    factories.set(
      'Service1',
      createServiceFactory(() => ({ value: 1 }), { phase: ServicePhase.CORE })
    );

    factories.set(
      'Service2',
      createServiceFactory(
        (c) => {
          const s1 = c.resolve(service1Token);
          return { value: s1.value + 1 };
        },
        { dependencies: [service1Token], phase: ServicePhase.CORE }
      )
    );

    const registry = initializeInThreePhases(container, factories);

    expect(registry.get('Service1')).toEqual({ value: 1 });
    expect(registry.get('Service2')).toEqual({ value: 2 });
  });

  it('should return registry with all initialized services', () => {
    const container = new DIContainer();
    const factories = new Map<string, PhasedServiceFactory>();

    factories.set(
      'Service1',
      createServiceFactory(() => ({ id: 1 }), { phase: ServicePhase.CORE })
    );
    factories.set(
      'Service2',
      createServiceFactory(() => ({ id: 2 }), { phase: ServicePhase.FOUNDATION })
    );
    factories.set(
      'Service3',
      createServiceFactory(() => ({ id: 3 }), { phase: ServicePhase.BUSINESS })
    );

    const registry = initializeInThreePhases(container, factories);

    expect(registry.allInitialized()).toBe(true);
    expect(registry.getServiceNames()).toHaveLength(3);
  });
});
