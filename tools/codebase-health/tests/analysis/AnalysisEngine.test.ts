// Unit tests for AnalysisEngine interface
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AnalysisEngine, 
  ScanOptions, 
  AnalysisResult,
  ImportValidationResult,
  TypeConsistencyResult,
  CircularDependencyResult
} from '../../src/analysis/AnalysisEngine';
import { CodeIssue, ImportExportIssue, TypeIssue } from '../../src/models/CodeIssue';

// Mock implementation for testing
class MockAnalysisEngine implements AnalysisEngine {
  async scanCodebase(options: ScanOptions): Promise<AnalysisResult> {
    // Mock implementation that simulates finding issues
    const mockImportIssue: ImportExportIssue = {
      id: 'import-1',
      filePath: '/test/file.ts',
      line: 1,
      column: 1,
      message: 'Missing export',
      severity: 'critical',
      category: 'import-export',
      createdAt: new Date(),
      type: 'missing_export',
      sourceFile: '/test/file.ts',
      targetFile: '/test/target.ts',
      importedName: 'MissingExport'
    };

    const mockTypeIssue: TypeIssue = {
      id: 'type-1',
      filePath: '/test/file.ts',
      line: 5,
      column: 10,
      message: 'Missing return type',
      severity: 'medium',
      category: 'type-safety',
      createdAt: new Date(),
      type: 'missing_return_type',
      functionName: 'testFunction',
      currentType: 'any',
      suggestedType: 'Promise<string>'
    };

    return {
      importExportMismatches: [mockImportIssue],
      typeInconsistencies: [mockTypeIssue],
      circularDependencies: [],
      summary: {
        totalFiles: 10,
        issuesFound: 2,
        criticalIssues: 1,
        automatedFixesAvailable: 1
      }
    };
  }

  validateImports(filePath: string): ImportValidationResult {
    return {
      isValid: false,
      issues: [{
        id: 'import-validation-1',
        filePath,
        line: 1,
        column: 1,
        message: 'Invalid import',
        severity: 'high',
        category: 'import-export',
        createdAt: new Date(),
        type: 'incorrect_import',
        sourceFile: filePath,
        targetFile: '/test/target.ts',
        importedName: 'InvalidImport'
      }]
    };
  }

  checkTypeConsistency(filePath: string): TypeConsistencyResult {
    return {
      isConsistent: false,
      issues: [{
        id: 'type-consistency-1',
        filePath,
        line: 10,
        column: 5,
        message: 'Type inconsistency',
        severity: 'medium',
        category: 'type-safety',
        createdAt: new Date(),
        type: 'any_type_usage',
        variableName: 'testVar',
        currentType: 'any',
        suggestedType: 'string'
      }]
    };
  }

  detectCircularDependencies(): CircularDependencyResult[] {
    return [{
      hasCycles: true,
      cycles: [{
        id: 'circular-1',
        filePath: '/test/file1.ts',
        line: 1,
        column: 1,
        message: 'Circular dependency',
        severity: 'high',
        category: 'architecture',
        createdAt: new Date(),
        cycle: ['/test/file1.ts', '/test/file2.ts', '/test/file1.ts'],
        depth: 2,
        breakingPoints: []
      }]
    }];
  }
}

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine;

  beforeEach(() => {
    engine = new MockAnalysisEngine();
  });

  describe('scanCodebase', () => {
    it('should scan codebase and return analysis results', async () => {
      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: ['node_modules/**'],
        strictMode: true,
        followSymlinks: false
      };

      const result = await engine.scanCodebase(options);

      expect(result.summary.totalFiles).toBe(10);
      expect(result.summary.issuesFound).toBe(2);
      expect(result.summary.criticalIssues).toBe(1);
      expect(result.importExportMismatches).toHaveLength(1);
      expect(result.typeInconsistencies).toHaveLength(1);
      expect(result.circularDependencies).toHaveLength(0);
    });

    it('should handle different scan options', async () => {
      const strictOptions: ScanOptions = {
        includePatterns: ['src/**/*.ts'],
        excludePatterns: ['**/*.test.ts'],
        strictMode: true,
        followSymlinks: true
      };

      const result = await engine.scanCodebase(strictOptions);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('validateImports', () => {
    it('should validate imports for a specific file', () => {
      const filePath = '/test/sample.ts';
      const result = engine.validateImports(filePath);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('incorrect_import');
    });
  });

  describe('checkTypeConsistency', () => {
    it('should check type consistency for a specific file', () => {
      const filePath = '/test/sample.ts';
      const result = engine.checkTypeConsistency(filePath);

      expect(result.isConsistent).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('any_type_usage');
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const results = engine.detectCircularDependencies();

      expect(results).toHaveLength(1);
      expect(results[0].hasCycles).toBe(true);
      expect(results[0].cycles).toHaveLength(1);
      expect(results[0].cycles[0].cycle).toContain('/test/file1.ts');
    });
  });
});