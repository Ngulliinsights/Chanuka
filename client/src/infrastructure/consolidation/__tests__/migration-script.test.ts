/**
 * Unit tests for migration script framework
 * 
 * Tests the automated import path migration functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Project, SourceFile } from 'ts-morph';
import {
  findFilesImportingFrom,
  extractImportInfo,
  replaceImportPath,
  createMigrationScript,
} from '../migration-script';

describe('migration-script', () => {
  let project: Project;
  let sourceFile: SourceFile;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('findFilesImportingFrom', () => {
    it('should find files importing from specific module', () => {
      // Create test files
      const file1 = project.createSourceFile(
        'file1.ts',
        `import { func1 } from '@/infrastructure/monitoring';`
      );
      
      const file2 = project.createSourceFile(
        'file2.ts',
        `import { func2 } from '@/infrastructure/performance';`
      );
      
      const file3 = project.createSourceFile(
        'file3.ts',
        `import { func3 } from '@/infrastructure/monitoring';`
      );
      
      const importingFiles = findFilesImportingFrom(project, '@/infrastructure/monitoring');
      
      expect(importingFiles).toHaveLength(2);
      expect(importingFiles.map(f => f.getBaseName())).toContain('file1.ts');
      expect(importingFiles.map(f => f.getBaseName())).toContain('file3.ts');
    });

    it('should find files importing from module with sub-paths', () => {
      const file1 = project.createSourceFile(
        'file1.ts',
        `import { func1 } from '@/infrastructure/monitoring/errors';`
      );
      
      const importingFiles = findFilesImportingFrom(project, '@/infrastructure/monitoring');
      
      expect(importingFiles).toHaveLength(1);
    });

    it('should return empty array when no files import from module', () => {
      project.createSourceFile(
        'file1.ts',
        `import { func1 } from '@/infrastructure/other';`
      );
      
      const importingFiles = findFilesImportingFrom(project, '@/infrastructure/monitoring');
      
      expect(importingFiles).toHaveLength(0);
    });
  });

  describe('extractImportInfo', () => {
    it('should extract named imports', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import { func1, func2 } from '@/module';`
      );
      
      const importDecl = file.getImportDeclarations()[0];
      const info = extractImportInfo(importDecl);
      
      expect(info.namedImports).toHaveLength(2);
      expect(info.namedImports[0].name).toBe('func1');
      expect(info.namedImports[1].name).toBe('func2');
      expect(info.defaultImport).toBeUndefined();
      expect(info.namespaceImport).toBeUndefined();
    });

    it('should extract named imports with aliases', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import { func1 as f1, func2 as f2 } from '@/module';`
      );
      
      const importDecl = file.getImportDeclarations()[0];
      const info = extractImportInfo(importDecl);
      
      expect(info.namedImports).toHaveLength(2);
      expect(info.namedImports[0].name).toBe('func1');
      expect(info.namedImports[0].alias).toBe('f1');
      expect(info.namedImports[1].name).toBe('func2');
      expect(info.namedImports[1].alias).toBe('f2');
    });

    it('should extract default import', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import MyDefault from '@/module';`
      );
      
      const importDecl = file.getImportDeclarations()[0];
      const info = extractImportInfo(importDecl);
      
      expect(info.defaultImport).toBe('MyDefault');
      expect(info.namedImports).toHaveLength(0);
      expect(info.namespaceImport).toBeUndefined();
    });

    it('should extract namespace import', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import * as MyModule from '@/module';`
      );
      
      const importDecl = file.getImportDeclarations()[0];
      const info = extractImportInfo(importDecl);
      
      expect(info.namespaceImport).toBe('MyModule');
      expect(info.namedImports).toHaveLength(0);
      expect(info.defaultImport).toBeUndefined();
    });

    it('should extract mixed imports', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import MyDefault, { func1, func2 } from '@/module';`
      );
      
      const importDecl = file.getImportDeclarations()[0];
      const info = extractImportInfo(importDecl);
      
      expect(info.defaultImport).toBe('MyDefault');
      expect(info.namedImports).toHaveLength(2);
    });
  });

  describe('replaceImportPath', () => {
    it('should replace exact import path', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import { func1 } from '@/infrastructure/monitoring';`
      );
      
      const count = replaceImportPath(
        file,
        '@/infrastructure/monitoring',
        '@/infrastructure/observability/error-monitoring'
      );
      
      expect(count).toBe(1);
      const importDecl = file.getImportDeclarations()[0];
      expect(importDecl.getModuleSpecifierValue()).toBe(
        '@/infrastructure/observability/error-monitoring'
      );
    });

    it('should replace import path with sub-path', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import { func1 } from '@/infrastructure/monitoring/errors';`
      );
      
      const count = replaceImportPath(
        file,
        '@/infrastructure/monitoring',
        '@/infrastructure/observability/error-monitoring'
      );
      
      expect(count).toBe(1);
      const importDecl = file.getImportDeclarations()[0];
      expect(importDecl.getModuleSpecifierValue()).toBe(
        '@/infrastructure/observability/error-monitoring/errors'
      );
    });

    it('should preserve named imports during path replacement', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import { func1, func2 as f2 } from '@/infrastructure/monitoring';`
      );
      
      replaceImportPath(
        file,
        '@/infrastructure/monitoring',
        '@/infrastructure/observability'
      );
      
      const importDecl = file.getImportDeclarations()[0];
      const namedImports = importDecl.getNamedImports();
      
      expect(namedImports).toHaveLength(2);
      expect(namedImports[0].getName()).toBe('func1');
      expect(namedImports[1].getName()).toBe('func2');
      expect(namedImports[1].getAliasNode()?.getText()).toBe('f2');
    });

    it('should not replace non-matching imports', () => {
      const file = project.createSourceFile(
        'test.ts',
        `import { func1 } from '@/infrastructure/other';`
      );
      
      const count = replaceImportPath(
        file,
        '@/infrastructure/monitoring',
        '@/infrastructure/observability'
      );
      
      expect(count).toBe(0);
      const importDecl = file.getImportDeclarations()[0];
      expect(importDecl.getModuleSpecifierValue()).toBe('@/infrastructure/other');
    });

    it('should handle multiple imports in same file', () => {
      const file = project.createSourceFile(
        'test.ts',
        `
        import { func1 } from '@/infrastructure/monitoring';
        import { func2 } from '@/infrastructure/monitoring/errors';
        import { func3 } from '@/infrastructure/other';
        `
      );
      
      const count = replaceImportPath(
        file,
        '@/infrastructure/monitoring',
        '@/infrastructure/observability'
      );
      
      expect(count).toBe(2);
      const imports = file.getImportDeclarations();
      expect(imports[0].getModuleSpecifierValue()).toBe('@/infrastructure/observability');
      expect(imports[1].getModuleSpecifierValue()).toBe('@/infrastructure/observability/errors');
      expect(imports[2].getModuleSpecifierValue()).toBe('@/infrastructure/other');
    });
  });

  describe('createMigrationScript', () => {
    it('should create migration script with correct methods', () => {
      const script = createMigrationScript({
        baseDir: '/test',
        includePatterns: ['**/*.ts'],
        excludePatterns: ['**/*.test.ts'],
        autoSave: false,
      });
      
      expect(script.migrate).toBeDefined();
      expect(script.findAffectedFiles).toBeDefined();
      expect(script.generateReport).toBeDefined();
    });
  });
});
