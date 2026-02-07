/**
 * Unit tests for ErrorAnalyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorAnalyzer } from '../../core/error-analyzer';
import { testConfig } from '../setup';
import { FixPhase } from '../../types';

describe('ErrorAnalyzer', () => {
  let analyzer: ErrorAnalyzer;

  beforeEach(() => {
    analyzer = new ErrorAnalyzer(testConfig);
  });

  it('should initialize with config', () => {
    expect(analyzer).toBeDefined();
  });

  it('should determine dependency order correctly', () => {
    const phases = analyzer.determineDependencyOrder({
      totalErrors: 0,
      errorsByCategory: new Map(),
      errorsByFile: new Map(),
      errorsBySeverity: new Map()
    });

    expect(phases).toEqual([
      FixPhase.MODULE_LOCATION_DISCOVERY,
      FixPhase.IMPORT_PATH_UPDATES,
      FixPhase.TYPE_STANDARDIZATION,
      FixPhase.INTERFACE_COMPLETION,
      FixPhase.TYPE_SAFETY,
      FixPhase.IMPORT_CLEANUP_AND_VALIDATION
    ]);
  });

  it('should return empty relocations map initially', async () => {
    const relocations = await analyzer.discoverModuleRelocations([]);
    
    expect(relocations.relocations.size).toBe(0);
    expect(relocations.deletedModules).toEqual([]);
    expect(relocations.consolidations.size).toBe(0);
  });
});
