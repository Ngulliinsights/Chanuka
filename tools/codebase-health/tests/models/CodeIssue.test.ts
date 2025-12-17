// Unit tests for CodeIssue models
import { describe, it, expect } from 'vitest';
import { CodeIssue, ImportExportIssue, TypeIssue, CircularDependency } from '../../src/models/CodeIssue';

describe('CodeIssue Models', () => {
  describe('CodeIssue', () => {
    it('should create a basic code issue', () => {
      const issue: CodeIssue = {
        id: 'test-issue-1',
        filePath: '/test/file.ts',
        line: 10,
        column: 5,
        message: 'Test issue message',
        severity: 'high',
        category: 'import-export',
        createdAt: new Date()
      };

      expect(issue.id).toBe('test-issue-1');
      expect(issue.severity).toBe('high');
      expect(issue.filePath).toBe('/test/file.ts');
    });
  });

  describe('ImportExportIssue', () => {
    it('should create an import/export issue', () => {
      const issue: ImportExportIssue = {
        id: 'import-issue-1',
        filePath: '/test/source.ts',
        line: 1,
        column: 1,
        message: 'Missing export',
        severity: 'critical',
        category: 'import-export',
        createdAt: new Date(),
        type: 'missing_export',
        sourceFile: '/test/source.ts',
        targetFile: '/test/target.ts',
        importedName: 'MissingExport',
        expectedExport: 'CorrectExport',
        suggestedFix: 'Add export statement'
      };

      expect(issue.type).toBe('missing_export');
      expect(issue.importedName).toBe('MissingExport');
      expect(issue.expectedExport).toBe('CorrectExport');
    });
  });

  describe('TypeIssue', () => {
    it('should create a type consistency issue', () => {
      const issue: TypeIssue = {
        id: 'type-issue-1',
        filePath: '/test/file.ts',
        line: 5,
        column: 10,
        message: 'Missing return type',
        severity: 'medium',
        category: 'type-safety',
        createdAt: new Date(),
        type: 'missing_return_type',
        functionName: 'fetchData',
        currentType: 'any',
        suggestedType: 'Promise<any>'
      };

      expect(issue.type).toBe('missing_return_type');
      expect(issue.functionName).toBe('fetchData');
      expect(issue.suggestedType).toBe('Promise<any>');
    });
  });

  describe('CircularDependency', () => {
    it('should create a circular dependency issue', () => {
      const issue: CircularDependency = {
        id: 'circular-1',
        filePath: '/test/file1.ts',
        line: 1,
        column: 1,
        message: 'Circular dependency detected',
        severity: 'high',
        category: 'architecture',
        createdAt: new Date(),
        cycle: ['/test/file1.ts', '/test/file2.ts', '/test/file1.ts'],
        depth: 2,
        breakingPoints: [{
          filePath: '/test/file1.ts',
          suggestion: 'extract_types',
          effort: 'medium'
        }]
      };

      expect(issue.cycle).toHaveLength(3);
      expect(issue.depth).toBe(2);
      expect(issue.breakingPoints[0].suggestion).toBe('extract_types');
    });
  });
});