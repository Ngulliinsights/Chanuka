/**
 * ML Service Migration Configuration
 * 
 * Configuration settings for the ML service migration from mock to real implementation.
 */

export interface MLMigrationConfig {
  // Feature flag settings
  featureFlag: {
    name: string;
    initialRolloutPercentage: number;
    maxRolloutPercentage: number;
    rolloutSteps: number[];
  };
  
  // Performance thresholds
  performance: {
    maxResponseTime: number; // milliseconds
    maxMemoryUsage: number; // bytes
    maxErrorRate: number; // percentage (0-1)
    fallbackThreshold: number; // error rate threshold for automatic fallback
  };
  
  // A/B testing configuration
  abTesting: {
    enabled: boolean;
    minimumSampleSize: number;
    confidenceLevel: number; // 0-1 (e.g., 0.95 for 95% confidence)
    testDuration: number; // milliseconds
  };
  
  // Real ML service settings
  realMLService: {
    initializationTimeout: number; // milliseconds
    modelCacheSize: number;
    enableGPUAcceleration: boolean;
    batchSize: number;
  };
  
  // Monitoring and alerting
  monitoring: {
    metricsRetentionPeriod: number; // milliseconds
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
    };
    enableDetailedLogging: boolean;
  };
}

export const defaultMLMigrationConfig: MLMigrationConfig = {
  featureFlag: {
    name: 'utilities-ml-service-migration',
    initialRolloutPercentage: 1,
    maxRolloutPercentage: 100,
    rolloutSteps: [1, 5, 10, 25, 50, 75, 100]
  },
  
  performance: {
    maxResponseTime: 2000, // 2 seconds
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    maxErrorRate: 0.05, // 5%
    fallbackThreshold: 0.1 // 10% error rate triggers fallback
  },
  
  abTesting: {
    enabled: true,
    minimumSampleSize: 100,
    confidenceLevel: 0.95,
    testDuration: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  realMLService: {
    initializationTimeout: 30000, // 30 seconds
    modelCacheSize: 10,
    enableGPUAcceleration: false, // Disabled by default for compatibility
    batchSize: 32
  },
  
  monitoring: {
    metricsRetentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    alertThresholds: {
      responseTime: 1000, // 1 second
      errorRate: 0.02, // 2%
      memoryUsage: 300 * 1024 * 1024 // 300MB
    },
    enableDetailedLogging: process.env.NODE_ENV === 'development'
  }
};

/**
 * Get ML migration configuration with environment overrides
 */
export function getMLMigrationConfig(): MLMigrationConfig {
  const config = { ...defaultMLMigrationConfig };
  
  // Environment-based overrides
  if (process.env.ML_MIGRATION_ROLLOUT_PERCENTAGE) {
    config.featureFlag.initialRolloutPercentage = parseInt(
      process.env.ML_MIGRATION_ROLLOUT_PERCENTAGE, 10
    );
  }
  
  if (process.env.ML_MIGRATION_MAX_RESPONSE_TIME) {
    config.performance.maxResponseTime = parseInt(
      process.env.ML_MIGRATION_MAX_RESPONSE_TIME, 10
    );
  }
  
  if (process.env.ML_MIGRATION_ENABLE_GPU === 'true') {
    config.realMLService.enableGPUAcceleration = true;
  }
  
  if (process.env.ML_MIGRATION_DETAILED_LOGGING === 'true') {
    config.monitoring.enableDetailedLogging = true;
  }
  
  return config;
}

/**
 * Validate ML migration configuration
 */
export function validateMLMigrationConfig(config: MLMigrationConfig): string[] {
  const errors: string[] = [];
  
  if (config.featureFlag.initialRolloutPercentage < 0 || config.featureFlag.initialRolloutPercentage > 100) {
    errors.push('Initial rollout percentage must be between 0 and 100');
  }
  
  if (config.performance.maxResponseTime <= 0) {
    errors.push('Max response time must be positive');
  }
  
  if (config.performance.maxErrorRate < 0 || config.performance.maxErrorRate > 1) {
    errors.push('Max error rate must be between 0 and 1');
  }
  
  if (config.abTesting.confidenceLevel < 0 || config.abTesting.confidenceLevel > 1) {
    errors.push('Confidence level must be between 0 and 1');
  }
  
  if (config.realMLService.initializationTimeout <= 0) {
    errors.push('Initialization timeout must be positive');
  }
  
  return errors;
}

/**
 * Migration rollout controller
 */
export class MLMigrationController {
  private config: MLMigrationConfig;
  private currentStepIndex = 0;
  
  constructor(config?: MLMigrationConfig) {
    this.config = config || getMLMigrationConfig();
    
    const validationErrors = validateMLMigrationConfig(this.config);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid ML migration configuration: ${validationErrors.join(', ')}`);
    }
  }
  
  /**
   * Get current rollout percentage
   */
  getCurrentRolloutPercentage(): number {
    if (this.currentStepIndex >= this.config.featureFlag.rolloutSteps.length) {
      return this.config.featureFlag.maxRolloutPercentage;
    }
    
    return this.config.featureFlag.rolloutSteps[this.currentStepIndex];
  }
  
  /**
   * Advance to next rollout step
   */
  advanceRollout(): boolean {
    if (this.currentStepIndex < this.config.featureFlag.rolloutSteps.length - 1) {
      this.currentStepIndex++;
      return true;
    }
    return false;
  }
  
  /**
   * Rollback to previous step
   */
  rollbackRollout(): boolean {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      return true;
    }
    return false;
  }
  
  /**
   * Check if metrics meet advancement criteria
   */
  shouldAdvanceRollout(metrics: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    sampleSize: number;
  }): boolean {
    return (
      metrics.responseTime <= this.config.performance.maxResponseTime &&
      metrics.errorRate <= this.config.performance.maxErrorRate &&
      metrics.memoryUsage <= this.config.performance.maxMemoryUsage &&
      metrics.sampleSize >= this.config.abTesting.minimumSampleSize
    );
  }
  
  /**
   * Check if rollback is needed
   */
  shouldRollback(metrics: {
    errorRate: number;
    responseTime: number;
  }): boolean {
    return (
      metrics.errorRate >= this.config.performance.fallbackThreshold ||
      metrics.responseTime >= this.config.performance.maxResponseTime * 2
    );
  }
  
  /**
   * Get configuration
   */
  getConfig(): MLMigrationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const mlMigrationController = new MLMigrationController();
