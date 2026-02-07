/**
 * Configuration for the Error Remediation System
 */

export interface RemediationConfig {
  // Project paths
  clientRoot: string;
  tsconfigPath: string;
  
  // FSD structure paths
  fsdLayers: {
    app: string;
    features: string;
    core: string;
    lib: string;
    shared: string;
  };
  
  // Module resolution
  moduleResolution: {
    fuzzyMatchThreshold: number; // 0-1, default 0.8
    searchDepth: number; // Max directory depth to search
  };
  
  // Batch processing
  batchProcessing: {
    maxBatchSize: number;
    validateAfterEachBatch: boolean;
    rollbackOnFailure: boolean;
  };
  
  // Type standardization
  typeStandardization: {
    canonicalIdType: 'string' | 'number' | 'auto';
    typeConsolidationPreference: ('shared' | 'lib' | 'core')[];
  };
  
  // Validation
  validation: {
    runFullCompilationAfterPhase: boolean;
    failOnNewErrors: boolean;
  };
  
  // Progress tracking
  progressTracking: {
    reportDirectory: string;
    generateDetailedReports: boolean;
  };
}

export const defaultConfig: RemediationConfig = {
  clientRoot: 'client',
  tsconfigPath: 'client/tsconfig.json',
  
  fsdLayers: {
    app: 'client/src/app',
    features: 'client/src/features',
    core: 'client/src/core',
    lib: 'client/src/lib',
    shared: 'shared'
  },
  
  moduleResolution: {
    fuzzyMatchThreshold: 0.8,
    searchDepth: 10
  },
  
  batchProcessing: {
    maxBatchSize: 10,
    validateAfterEachBatch: true,
    rollbackOnFailure: true
  },
  
  typeStandardization: {
    canonicalIdType: 'auto',
    typeConsolidationPreference: ['shared', 'lib', 'core']
  },
  
  validation: {
    runFullCompilationAfterPhase: true,
    failOnNewErrors: true
  },
  
  progressTracking: {
    reportDirectory: 'scripts/error-remediation/reports',
    generateDetailedReports: true
  }
};
