/**
 * Runtime Configuration for WebSocket Service
 * 
 * Dynamic configuration that can be adjusted during runtime for progressive
 * degradation and performance optimization. These values can be modified
 * based on system load, memory pressure, and other runtime conditions.
 */

import type { DegradationLevel,RuntimeConfigType } from '../types';

/**
 * Default runtime configuration values.
 * These serve as the baseline configuration that can be adjusted during runtime.
 */
const DEFAULT_RUNTIME_CONFIG: RuntimeConfigType = {
  /**
   * Number of messages to batch together for efficient processing
   */
  MESSAGE_BATCH_SIZE: 10,

  /**
   * Delay between message batches (milliseconds)
   */
  MESSAGE_BATCH_DELAY: 50,

  /**
   * Minimum message size threshold for compression (bytes)
   */
  COMPRESSION_THRESHOLD: 1024,

  /**
   * Maximum size of the deduplication cache
   */
  DEDUPE_CACHE_SIZE: 5000,

  /**
   * Time window for message deduplication (milliseconds)
   */
  DEDUPE_WINDOW: 5000,

  /**
   * Maximum number of concurrent connections per user
   */
  MAX_CONNECTIONS_PER_USER: 5,

  /**
   * Interval for memory cleanup operations (milliseconds)
   */
  MEMORY_CLEANUP_INTERVAL: 180000, // 3 minutes
};

/**
 * Configuration adjustments for different degradation levels.
 * Used for progressive degradation under memory pressure or high load.
 */
const DEGRADATION_ADJUSTMENTS: Record<DegradationLevel, Partial<RuntimeConfigType>> = {
  normal: {},
  light: {
    MESSAGE_BATCH_SIZE: 15,
    MESSAGE_BATCH_DELAY: 75,
    DEDUPE_CACHE_SIZE: 4000,
  },
  moderate: {
    MESSAGE_BATCH_SIZE: 20,
    MESSAGE_BATCH_DELAY: 100,
    DEDUPE_CACHE_SIZE: 3000,
    MAX_CONNECTIONS_PER_USER: 3,
    MEMORY_CLEANUP_INTERVAL: 120000, // 2 minutes
  },
  severe: {
    MESSAGE_BATCH_SIZE: 30,
    MESSAGE_BATCH_DELAY: 150,
    COMPRESSION_THRESHOLD: 512,
    DEDUPE_CACHE_SIZE: 2000,
    DEDUPE_WINDOW: 3000,
    MAX_CONNECTIONS_PER_USER: 2,
    MEMORY_CLEANUP_INTERVAL: 60000, // 1 minute
  },
  critical: {
    MESSAGE_BATCH_SIZE: 50,
    MESSAGE_BATCH_DELAY: 200,
    COMPRESSION_THRESHOLD: 256,
    DEDUPE_CACHE_SIZE: 1000,
    DEDUPE_WINDOW: 2000,
    MAX_CONNECTIONS_PER_USER: 1,
    MEMORY_CLEANUP_INTERVAL: 30000, // 30 seconds
  },
};

/**
 * Runtime configuration manager that supports dynamic adjustment
 * for progressive degradation and performance optimization.
 */
export class RuntimeConfig {
  private config: RuntimeConfigType;
  private readonly originalConfig: RuntimeConfigType;
  private currentDegradationLevel: DegradationLevel = 'normal';
  private readonly changeListeners: Array<(config: RuntimeConfigType) => void> = [];

  constructor(initialConfig?: Partial<RuntimeConfigType>) {
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...initialConfig };
    this.originalConfig = { ...this.config };
  }

  /**
   * Get a configuration value by key
   */
  get<K extends keyof RuntimeConfigType>(key: K): RuntimeConfigType[K] {
    return this.config[key];
  }

  /**
   * Set a configuration value by key with validation
   */
  set<K extends keyof RuntimeConfigType>(key: K, value: RuntimeConfigType[K]): void {
    if (!this.isValidConfigValue(key, value)) {
      throw new Error(`Invalid configuration value for ${key}: ${value}`);
    }

    const oldValue = this.config[key];
    this.config[key] = value;

    // Notify listeners of the change
    if (oldValue !== value) {
      this.notifyListeners();
    }
  }

  /**
   * Update multiple configuration values at once
   */
  update(updates: Partial<RuntimeConfigType>): void {
    const validatedUpdates: Partial<RuntimeConfigType> = {};

    // Validate all updates first
    for (const [key, value] of Object.entries(updates)) {
      const configKey = key as keyof RuntimeConfigType;
      if (!this.isValidConfigValue(configKey, value as RuntimeConfigType[typeof configKey])) {
        throw new Error(`Invalid configuration value for ${key}: ${value}`);
      }
      validatedUpdates[configKey] = value as RuntimeConfigType[typeof configKey];
    }

    // Apply all updates
    let hasChanges = false;
    for (const [key, value] of Object.entries(validatedUpdates)) {
      const configKey = key as keyof RuntimeConfigType;
      if (this.config[configKey] !== value) {
        this.config[configKey] = value as RuntimeConfigType[typeof configKey];
        hasChanges = true;
      }
    }

    // Notify listeners if there were changes
    if (hasChanges) {
      this.notifyListeners();
    }
  }

  /**
   * Apply progressive degradation adjustments based on system conditions
   */
  applyDegradation(level: DegradationLevel): void {
    if (level === this.currentDegradationLevel) {
      return;
    }

    const adjustments = DEGRADATION_ADJUSTMENTS[level];
    const newConfig = { ...this.originalConfig, ...adjustments };

    this.config = newConfig;
    this.currentDegradationLevel = level;
    this.notifyListeners();
  }

  /**
   * Reset configuration to original values
   */
  reset(): void {
    this.config = { ...this.originalConfig };
    this.currentDegradationLevel = 'normal';
    this.notifyListeners();
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): DegradationLevel {
    return this.currentDegradationLevel;
  }

  /**
   * Get a copy of the current configuration
   */
  toObject(): RuntimeConfigType {
    return { ...this.config };
  }

  /**
   * Get a frozen copy of the configuration to prevent mutations
   */
  getImmutableConfig(): Readonly<RuntimeConfigType> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Add a listener for configuration changes
   */
  addChangeListener(listener: (config: RuntimeConfigType) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a configuration change listener
   */
  removeChangeListener(listener: (config: RuntimeConfigType) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Validate a configuration value
   */
  private isValidConfigValue<K extends keyof RuntimeConfigType>(
    key: K,
    value: RuntimeConfigType[K]
  ): boolean {
    if (typeof value !== 'number' || value <= 0) {
      return false;
    }

    // Additional validation rules for specific keys
    switch (key) {
      case 'MESSAGE_BATCH_SIZE':
        return value >= 1 && value <= 100;
      case 'MESSAGE_BATCH_DELAY':
        return value >= 10 && value <= 1000;
      case 'COMPRESSION_THRESHOLD':
        return value >= 100 && value <= 10240; // 100 bytes to 10KB
      case 'DEDUPE_CACHE_SIZE':
        return value >= 100 && value <= 50000;
      case 'DEDUPE_WINDOW':
        return value >= 1000 && value <= 30000; // 1-30 seconds
      case 'MAX_CONNECTIONS_PER_USER':
        return value >= 1 && value <= 20;
      case 'MEMORY_CLEANUP_INTERVAL':
        return value >= 10000 && value <= 600000; // 10 seconds to 10 minutes
      default:
        return true;
    }
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    const configCopy = this.toObject();
    this.changeListeners.forEach(listener => {
      try {
        listener(configCopy);
      } catch (error) {
        // Log error without using console directly
        // In production, this should use the application's logging system
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Error in configuration change listener:', error);
        }
      }
    });
  }
}

/**
 * Type guard to validate runtime configuration values
 */
export function isValidRuntimeConfig(config: unknown): config is RuntimeConfigType {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const requiredKeys: Array<keyof RuntimeConfigType> = [
    'MESSAGE_BATCH_SIZE',
    'MESSAGE_BATCH_DELAY',
    'COMPRESSION_THRESHOLD',
    'DEDUPE_CACHE_SIZE',
    'DEDUPE_WINDOW',
    'MAX_CONNECTIONS_PER_USER',
    'MEMORY_CLEANUP_INTERVAL',
  ];

  const configObj = config as Record<string, unknown>;

  return requiredKeys.every(key => {
    const value = configObj[key];
    return typeof value === 'number' && value > 0;
  });
}

/**
 * Create a new RuntimeConfig instance with optional initial values
 */
export function createRuntimeConfig(initialConfig?: Partial<RuntimeConfigType>): RuntimeConfig {
  return new RuntimeConfig(initialConfig);
}

/**
 * Get the default runtime configuration values
 */
export function getDefaultRuntimeConfig(): RuntimeConfigType {
  return { ...DEFAULT_RUNTIME_CONFIG };
}