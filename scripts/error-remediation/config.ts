/**
 * Configuration for the Error Remediation System
 */

import * as path from 'path';

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

// Get the workspace root (two levels up from scripts/error-remediation)
const workspaceRoot = path.resolve(__dirname, '../..');

export const defaultConfig: RemediationConfig = {
  clientRoot: path.join(workspaceRoot, 'client'),
  tsconfigPath: path.join(workspaceRoot, 'client/tsconfig.json'),
  
  fsdLayers: {
    app: path.join(workspaceRoot, 'client/src/app'),
    features: path.join(workspaceRoot, 'client/src/features'),
    core: path.join(workspaceRoot, 'client/src/core'),
    lib: path.join(workspaceRoot, 'client/src/lib'),
    shared: path.join(workspaceRoot, 'shared')
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
    reportDirectory: path.join(__dirname, 'reports'),
    generateDetailedReports: true
  }
};

/**
 * RemediationConfig class for easy instantiation
 */
export class RemediationConfig implements RemediationConfig {
  clientRoot: string;
  tsconfigPath: string;
  fsdLayers: {
    app: string;
    features: string;
    core: string;
    lib: string;
    shared: string;
  };
  moduleResolution: {
    fuzzyMatchThreshold: number;
    searchDepth: number;
  };
  batchProcessing: {
    maxBatchSize: number;
    validateAfterEachBatch: boolean;
    rollbackOnFailure: boolean;
  };
  typeStandardization: {
    canonicalIdType: 'string' | 'number' | 'auto';
    typeConsolidationPreference: ('shared' | 'lib' | 'core')[];
  };
  validation: {
    runFullCompilationAfterPhase: boolean;
    failOnNewErrors: boolean;
  };
  progressTracking: {
    reportDirectory: string;
    generateDetailedReports: boolean;
  };

  constructor(config?: Partial<RemediationConfig>) {
    const merged = { ...defaultConfig, ...config };
    this.clientRoot = merged.clientRoot;
    this.tsconfigPath = merged.tsconfigPath;
    this.fsdLayers = merged.fsdLayers;
    this.moduleResolution = merged.moduleResolution;
    this.batchProcessing = merged.batchProcessing;
    this.typeStandardization = merged.typeStandardization;
    this.validation = merged.validation;
    this.progressTracking = merged.progressTracking;
  }
}
