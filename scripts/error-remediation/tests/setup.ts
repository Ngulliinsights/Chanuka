/**
 * Test setup and utilities
 */

import { RemediationConfig } from '../config';
import * as path from 'path';

// Get the project root (2 levels up from scripts/error-remediation)
const projectRoot = path.resolve(__dirname, '../../..');

export const testConfig: RemediationConfig = {
  clientRoot: path.join(projectRoot, 'client'),
  tsconfigPath: path.join(projectRoot, 'client/tsconfig.json'),
  
  fsdLayers: {
    app: path.join(projectRoot, 'client/src/app'),
    features: path.join(projectRoot, 'client/src/features'),
    core: path.join(projectRoot, 'client/src/infrastructure'),
    lib: path.join(projectRoot, 'client/src/lib'),
    shared: path.join(projectRoot, 'shared')
  },
  
  moduleResolution: {
    fuzzyMatchThreshold: 0.8,
    searchDepth: 10
  },
  
  batchProcessing: {
    maxBatchSize: 5,
    validateAfterEachBatch: true,
    rollbackOnFailure: true
  },
  
  typeStandardization: {
    canonicalIdType: 'string',
    typeConsolidationPreference: ['shared', 'lib', 'core']
  },
  
  validation: {
    runFullCompilationAfterPhase: false,
    failOnNewErrors: true
  },
  
  progressTracking: {
    reportDirectory: path.join(__dirname, 'reports'),
    generateDetailedReports: false
  }
};
