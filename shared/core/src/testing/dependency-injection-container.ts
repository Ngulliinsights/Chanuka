/**
 * Dependency Injection Container Interface for Test Management
 *
 * Provides a schema-agnostic container for managing service dependencies in tests,
 * enabling clean test isolation and mocking capabilities.
 */

import type { Result } from '../primitives';

/**
 * Service registration configuration
 */
export interface ServiceRegistration<T = unknown> {
  /** Service identifier */
  key: string;
  /** Factory function to create the service */
  factory: (container: IServiceContainer) => T;
  /** Whether this service is a singleton */
  singleton?: boolean;
  /** Service tags for grouping and filtering */
  tags?: string[];
  /** Dependencies this service requires */
  dependencies?: string[];
}

/**
 * Service resolution options
 */
export interface ServiceResolutionOptions {
  /** Whether to create a new instance even if singleton */
  forceNew?: boolean;
  /** Additional context for service creation */
  context?: Record<string, unknown>;
  /** Timeout for service resolution */
  timeout?: number;
}

/**
 * Service metadata
 */
export interface ServiceMetadata {
  /** Service key */
  key: string;
  /** Whether it's a singleton */
  singleton: boolean;
  /** Service tags */
  tags: string[];
  /** Dependencies */
  dependencies: string[];
  /** Number of times resolved */
  resolutionCount: number;
  /** Last resolution timestamp */
  lastResolved?: number;
  /** Whether currently instantiated */
  instantiated: boolean;
}

/**
 * Container configuration
 */
export interface ContainerConfig {
  /** Whether to enable auto-resolution of unregistered services */
  autoResolve?: boolean;
  /** Whether to validate dependencies on registration */
  validateDependencies?: boolean;
  /** Whether to enable circular dependency detection */
  detectCircularDeps?: boolean;
  /** Maximum resolution depth to prevent infinite loops */
  maxResolutionDepth?: number;
  /** Default resolution timeout */
  defaultTimeout?: number;
}

/**
 * Mock configuration for service replacement
 */
export interface MockConfig<T = unknown> {
  /** Service key to mock */
  key: string;
  /** Mock implementation */
  mock: T;
  /** Whether to restore original after test */
  restoreAfterTest?: boolean;
  /** Mock behavior configuration */
  behavior?: Record<string, unknown>;
}

/**
 * Service lifecycle hook
 */
export interface ServiceLifecycleHook {
  /** Hook name */
  name: string;
  /** Function to execute */
  hook: (service: unknown, container: IServiceContainer) => void | Promise<void>;
  /** When to execute the hook */
  timing: 'beforeResolution' | 'afterResolution' | 'beforeDestruction';
}

/**
 * IServiceContainer - Interface for dependency injection container in tests
 *
 * Provides a clean abstraction for managing service dependencies during testing,
 * enabling easy mocking, isolation, and lifecycle management.
 */
export interface IServiceContainer {
  /**
   * Register a service with the container
   * @param registration Service registration configuration
   * @returns Promise resolving when registration is complete
   */
  register<T>(registration: ServiceRegistration<T>): Promise<Result<void, Error>>;

  /**
   * Register multiple services at once
   * @param registrations Array of service registrations
   * @returns Promise resolving when all registrations are complete
   */
  registerMultiple(registrations: ServiceRegistration[]): Promise<Result<void, Error>>;

  /**
   * Resolve a service by key
   * @param key Service identifier
   * @param options Resolution options
   * @returns Promise resolving to the service instance
   */
  resolve<T>(key: string, options?: ServiceResolutionOptions): Promise<Result<T, Error>>;

  /**
   * Try to resolve a service without throwing if not found
   * @param key Service identifier
   * @param options Resolution options
   * @returns Promise resolving to service or undefined if not found
   */
  tryResolve<T>(key: string, options?: ServiceResolutionOptions): Promise<Result<T | undefined, Error>>;

  /**
   * Check if a service is registered
   * @param key Service identifier
   * @returns Whether the service is registered
   */
  isRegistered(key: string): boolean;

  /**
   * Unregister a service
   * @param key Service identifier
   * @returns Promise resolving when unregistered
   */
  unregister(key: string): Promise<Result<void, Error>>;

  /**
   * Get metadata for a registered service
   * @param key Service identifier
   * @returns Service metadata or undefined if not registered
   */
  getServiceMetadata(key: string): ServiceMetadata | undefined;

  /**
   * Get all registered service keys
   * @param tag Optional tag to filter by
   * @returns Array of service keys
   */
  getRegisteredServices(tag?: string): string[];

  /**
   * Replace a service with a mock implementation
   * @param config Mock configuration
   * @returns Promise resolving when mock is applied
   */
  mock<T>(config: MockConfig<T>): Promise<Result<void, Error>>;

  /**
   * Restore original service implementation
   * @param key Service identifier
   * @returns Promise resolving when restored
   */
  restore(key: string): Promise<Result<void, Error>>;

  /**
   * Check if a service is currently mocked
   * @param key Service identifier
   * @returns Whether the service is mocked
   */
  isMocked(key: string): boolean;

  /**
   * Create a child container that inherits services but allows overrides
   * @param name Child container name
   * @returns New child container
   */
  createChildContainer(name: string): IServiceContainer;

  /**
   * Clear all services and reset container state
   * @returns Promise resolving when cleared
   */
  clear(): Promise<Result<void, Error>>;

  /**
   * Dispose of the container and clean up resources
   * @returns Promise resolving when disposed
   */
  dispose(): Promise<Result<void, Error>>;

  /**
   * Add a lifecycle hook for services
   * @param hook Lifecycle hook configuration
   */
  addLifecycleHook(hook: ServiceLifecycleHook): void;

  /**
   * Remove a lifecycle hook
   * @param hookName Hook name to remove
   */
  removeLifecycleHook(hookName: string): void;

  /**
   * Get container statistics
   * @returns Container usage statistics
   */
  getStatistics(): ContainerStatistics;

  /**
   * Validate container configuration and dependencies
   * @returns Promise resolving to validation results
   */
  validate(): Promise<Result<ValidationResult, Error>>;
}

/**
 * Container usage statistics
 */
export interface ContainerStatistics {
  /** Total number of registered services */
  totalServices: number;
  /** Number of singleton services */
  singletonServices: number;
  /** Number of mocked services */
  mockedServices: number;
  /** Total service resolutions */
  totalResolutions: number;
  /** Average resolution time */
  averageResolutionTime: number;
  /** Number of child containers */
  childContainers: number;
  /** Memory usage estimate */
  memoryUsage?: number;
}

/**
 * Container validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Dependency graph analysis */
  dependencyGraph: DependencyGraph;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: 'missing_dependency' | 'circular_dependency' | 'invalid_registration' | 'resolution_timeout';
  /** Service key related to the error */
  serviceKey: string;
  /** Error message */
  message: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'unused_service' | 'deep_dependency_chain' | 'performance_concern';
  /** Service key related to the warning */
  serviceKey: string;
  /** Warning message */
  message: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Dependency graph analysis
 */
export interface DependencyGraph {
  /** Services with no dependencies */
  leafServices: string[];
  /** Services that other services depend on */
  rootServices: string[];
  /** Maximum dependency depth */
  maxDepth: number;
  /** Services involved in cycles */
  cycles: string[][];
  /** Dependency relationships */
  relationships: Array<{
    from: string;
    to: string;
    type: 'direct' | 'indirect';
  }>;
}

/**
 * Test-specific container utilities
 */
export interface ITestContainer extends IServiceContainer {
  /**
   * Setup container for a test suite
   * @param config Test container configuration
   * @returns Promise resolving when setup is complete
   */
  setupTestSuite(config: TestSuiteConfig): Promise<Result<void, Error>>;

  /**
   * Setup container for a single test
   * @param config Test configuration
   * @returns Promise resolving when setup is complete
   */
  setupTest(config: TestConfig): Promise<Result<void, Error>>;

  /**
   * Cleanup after a test
   * @returns Promise resolving when cleanup is complete
   */
  cleanupTest(): Promise<Result<void, Error>>;

  /**
   * Cleanup after a test suite
   * @returns Promise resolving when cleanup is complete
   */
  cleanupTestSuite(): Promise<Result<void, Error>>;

  /**
   * Get test execution context
   * @returns Current test context
   */
  getTestContext(): TestExecutionContext;
}

/**
 * Test suite configuration
 */
export interface TestSuiteConfig {
  /** Services to register for the entire suite */
  suiteServices?: ServiceRegistration[];
  /** Global mocks to apply */
  globalMocks?: MockConfig[];
  /** Suite-level lifecycle hooks */
  hooks?: ServiceLifecycleHook[];
  /** Container configuration */
  containerConfig?: ContainerConfig;
}

/**
 * Individual test configuration
 */
export interface TestConfig {
  /** Test-specific services */
  services?: ServiceRegistration[];
  /** Test-specific mocks */
  mocks?: MockConfig[];
  /** Test isolation level */
  isolation: 'full' | 'container' | 'none';
  /** Test timeout */
  timeout?: number;
}

/**
 * Test execution context
 */
export interface TestExecutionContext {
  /** Test suite name */
  suiteName?: string;
  /** Test name */
  testName?: string;
  /** Test start time */
  startTime: number;
  /** Services resolved during test */
  resolvedServices: string[];
  /** Mocks applied during test */
  appliedMocks: string[];
  /** Test metadata */
  metadata: Record<string, unknown>;
}