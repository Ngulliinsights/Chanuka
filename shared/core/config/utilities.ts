/**
 * Utilities Configuration Provider
 *
 * Centralized configuration access for all utility modules
 * with runtime updates and environment-specific overrides
 */

import { EventEmitter } from 'events';

import type { AppConfig } from './schema';

import { configManager, getConfig } from './index';

export type AssetsConfig = AppConfig['utilities']['assets'] & {
  getConfigForType: (type: 'critical' | 'script' | 'style' | 'image' | 'font') => any;
  isSlowConnection: (speedMbps: number) => boolean;
  isFastConnection: (speedMbps: number) => boolean;
  adjustForConnection: (baseConfig: any, speedMbps: number) => any;
};

export interface UtilityConfigUpdateEvent {
  utility: string;
  previous: any;
  current: any;
  timestamp: Date;
}

/**
 * Utilities Configuration Provider
 *
 * Provides typed, centralized access to utility configurations
 * with runtime update capabilities and event-driven notifications
 */
export class UtilitiesConfigProvider extends EventEmitter {
  private static instance: UtilitiesConfigProvider;
  private config: AppConfig;

  constructor() {
    super();
    this.config = getConfig();

    // Listen for configuration changes
    configManager.on('config:changed', (event) => {
      const previousUtilities = event.previous.utilities;
      const currentUtilities = event.current.utilities;

      if (JSON.stringify(previousUtilities) !== JSON.stringify(currentUtilities)) {
        this.config = event.current;
        this.emit('utilities:updated', {
          utility: 'all',
          previous: previousUtilities,
          current: currentUtilities,
          timestamp: event.timestamp,
        });
      }
    });
  }

  static getInstance(): UtilitiesConfigProvider {
    if (!UtilitiesConfigProvider.instance) {
      UtilitiesConfigProvider.instance = new UtilitiesConfigProvider();
    }
    return UtilitiesConfigProvider.instance;
  }

  // ============================================================================
  // API Configuration
  // ============================================================================

  get api() {
    return {
      timeout: this.config.utilities.api.timeout,
      retries: this.config.utilities.api.retries,
      retryDelay: this.config.utilities.api.retryDelay,
      circuitBreaker: this.config.utilities.api.circuitBreaker,
      batch: this.config.utilities.api.batch,
    };
  }

  // ============================================================================
  // Asset Loading Configuration
  // ============================================================================

  get assets(): AssetsConfig {
    const assets = {
      critical: this.config.utilities.assets.critical,
      script: this.config.utilities.assets.script,
      style: this.config.utilities.assets.style,
      image: this.config.utilities.assets.image,
      font: this.config.utilities.assets.font,
      connection: this.config.utilities.assets.connection,
      performance: this.config.utilities.assets.performance,

      // Helper methods
      getConfigForType: (type: 'critical' | 'script' | 'style' | 'image' | 'font') => {
        return this.config.utilities.assets[type];
      },

      isSlowConnection: (speedMbps: number): boolean => {
        return speedMbps < this.config.utilities.assets.connection.slowThreshold;
      },

      isFastConnection: (speedMbps: number): boolean => {
        return speedMbps >= this.config.utilities.assets.connection.fastThreshold;
      },

      adjustForConnection: (baseConfig: any, speedMbps: number) => {
        if (assets.isSlowConnection(speedMbps)) {
          return {
            ...baseConfig,
            maxRetries: Math.max(1, baseConfig.maxRetries - 1),
            retryDelay: baseConfig.retryDelay * this.config.utilities.assets.connection.slowRetryMultiplier,
            timeout: baseConfig.timeout * this.config.utilities.assets.connection.slowTimeoutMultiplier,
          };
        }
        return baseConfig;
      },
    };
    return assets;
  }

  // ============================================================================
  // Token Management Configuration
  // ============================================================================

  get tokens() {
    return {
      metadataKey: this.config.utilities.tokens.metadataKey,
      userDataKey: this.config.utilities.tokens.userDataKey,
      refreshBufferMinutes: this.config.utilities.tokens.refreshBufferMinutes,
      maxRefreshRetries: this.config.utilities.tokens.maxRefreshRetries,
      refreshRetryDelay: this.config.utilities.tokens.refreshRetryDelay,
      tokenValidationInterval: this.config.utilities.tokens.tokenValidationInterval,
      enableSilentRefresh: this.config.utilities.tokens.enableSilentRefresh,
      enableAutoCleanup: this.config.utilities.tokens.enableAutoCleanup,

      // Computed values
      refreshBufferMs: this.config.utilities.tokens.refreshBufferMinutes * 60 * 1000,
    };
  }

  // ============================================================================
  // Error Handling Configuration
  // ============================================================================

  get errors() {
    return {
      recovery: this.config.utilities.errors.recovery,
      strategies: this.config.utilities.errors.strategies,
      logging: this.config.utilities.errors.logging,

      // Helper methods
      isRecoveryEnabled: (errorType?: string): boolean => {
        if (!this.config.utilities.errors.recovery.enabled) return false;
        if (!errorType) return true;

        // Check if specific strategy is enabled
        switch (errorType) {
          case 'network':
            return this.config.utilities.errors.strategies.networkRetry.enabled;
          case 'auth':
            return this.config.utilities.errors.strategies.authRefresh.enabled;
          case 'cache':
            return this.config.utilities.errors.strategies.cacheClear.enabled;
          default:
            return true;
        }
      },

      getStrategyConfig: (strategy: 'networkRetry' | 'authRefresh' | 'cacheClear') => {
        return this.config.utilities.errors.strategies[strategy];
      },
    };
  }

  // ============================================================================
  // Performance Configuration
  // ============================================================================

  get performance() {
    return {
      renderTracker: this.config.utilities.performance.renderTracker,
      assetTracker: this.config.utilities.performance.assetTracker,

      // Helper methods
      shouldTrackRender: (componentName?: string): boolean => {
        if (!this.config.utilities.performance.renderTracker.enabled) return false;
        if (!componentName) return true;

        // Could implement component-specific sampling here
        return Math.random() < this.config.utilities.performance.renderTracker.sampleRate;
      },

      isSlowRender: (renderTime: number): boolean => {
        return renderTime > this.config.utilities.performance.renderTracker.slowRenderThreshold;
      },

      shouldTrackAsset: (): boolean => {
        return this.config.utilities.performance.assetTracker.enabled;
      },

      isSlowAsset: (loadTime: number): boolean => {
        return loadTime > this.config.utilities.performance.assetTracker.slowAssetThreshold;
      },
    };
  }

  // ============================================================================
  // Storage Configuration
  // ============================================================================

  get storage() {
    return {
      secureStorage: this.config.utilities.storage.secureStorage,
      cache: this.config.utilities.storage.cache,

      // Helper methods
      getSecureKey: (key: string): string => {
        return `${this.config.utilities.storage.secureStorage.prefix}${key}`;
      },

      shouldCompress: (size: number): boolean => {
        return this.config.utilities.storage.cache.enableCompression &&
               size > this.config.utilities.storage.cache.compressionThreshold;
      },
    };
  }

  // ============================================================================
  // Runtime Configuration Updates
  // ============================================================================

  /**
   * Update utility configuration at runtime
   */
  updateUtilityConfig(utility: keyof AppConfig['utilities'], updates: any): void {
    const currentConfig = { ...this.config.utilities[utility] };
    const newConfig = { ...currentConfig, ...updates };

    // Validate the update (basic validation)
    if (this.validateUtilityConfig(utility, newConfig)) {
      this.config.utilities[utility] = newConfig;

      this.emit('utilities:updated', {
        utility,
        previous: currentConfig,
        current: newConfig,
        timestamp: new Date(),
      });
    } else {
      throw new Error(`Invalid configuration update for utility: ${utility}`);
    }
  }

  /**
   * Subscribe to configuration updates for a specific utility
   */
  onUtilityUpdate(utility: string, callback: (event: UtilityConfigUpdateEvent) => void): () => void {
    const handler = (event: UtilityConfigUpdateEvent) => {
      if (event.utility === utility || event.utility === 'all') {
        callback(event);
      }
    };

    this.on('utilities:updated', handler);

    // Return unsubscribe function
    return () => {
      this.off('utilities:updated', handler);
    };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validateUtilityConfig(utility: keyof AppConfig['utilities'], config: any): boolean {
    // Basic validation - could be enhanced with Zod schemas
    try {
      switch (utility) {
        case 'api':
          return typeof config.timeout === 'number' && config.timeout > 0 &&
                 typeof config.retries === 'number' && config.retries >= 0;

        case 'assets':
          return config.critical && config.script && config.style && config.image && config.font;

        case 'tokens':
          return typeof config.refreshBufferMinutes === 'number' && config.refreshBufferMinutes > 0;

        case 'errors':
          return config.recovery && config.strategies;

        case 'performance':
          return config.renderTracker && config.assetTracker;

        case 'storage':
          return config.secureStorage && config.cache;

        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get all utilities configuration
   */
  getAll(): AppConfig['utilities'] {
    return { ...this.config.utilities };
  }

  /**
   * Reset utility configuration to defaults
   */
  resetUtility(utility: keyof AppConfig['utilities']): void {
    // This would need access to default values - could be enhanced
    this.emit('utilities:reset', { utility, timestamp: new Date() });
  }
}

// Export singleton instance
export const utilitiesConfig = UtilitiesConfigProvider.getInstance();

// Export convenience getters
export const getApiConfig = () => utilitiesConfig.api;
export const getAssetsConfig = () => utilitiesConfig.assets;
export const getTokensConfig = () => utilitiesConfig.tokens;
export const getErrorsConfig = () => utilitiesConfig.errors;
export const getPerformanceConfig = () => utilitiesConfig.performance;
export const getStorageConfig = () => utilitiesConfig.storage;