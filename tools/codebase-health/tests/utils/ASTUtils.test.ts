import { describe, it, expect, beforeEach } from 'vitest';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { ASTUtils, ImportInfo, ExportInfo, TypeAnnotationInfo } from '../../src/utils/ASTUtils';

describe('ASTUtils', () => {
  const testFilesDir = path.join(__dirname, '../fixtures/ast');

  beforeEach(() => {
    // Ensure test fixtures directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  describe('createProgram', () => {
    it('should create a TypeScript program from file paths', () => {
      const testFile = path.join(testFilesDir, 'test.ts');
      fs.writeFileSync(testFile, 'const x: number = 42;');

      const program = ASTUtils.createProgram([testFile]);
      expect(program).toBeDefined();
      expect(program.getSourceFiles().length).toBeGreaterThan(0);
    });
  });

  describe('findTypeScriptFiles', () => {
    it('should find TypeScript files in directory', () => {
      const tsFile = path.join(testFilesDir, 'test.ts');
      const tsxFile = path.join(testFilesDir, 'test.tsx');
      const jsFile = path.join(testFilesDir, 'test.js');

      fs.writeFileSync(tsFile, 'const x = 1;');
      fs.writeFileSync(tsxFile, 'const y = 2;');
      fs.writeFileSync(jsFile, 'const z = 3;');

      const files = ASTUtils.findTypeScriptFiles(testFilesDir);
      expect(files).toContain(tsFile);
      expect(files).toContain(tsxFile);
      expect(files).not.toContain(jsFile);
    });
  });

  describe('parseImportInfo', () => {
    it('should parse import declarations', () => {
      const testFile = path.join(testFilesDir, 'import-test.ts');
      fs.writeFileSync(testFile, 'import { foo } from "bar";');

      const program = ASTUtils.createProgram([testFile]);
      const sourceFile = ASTUtils.getSourceFile(program, testFile);
      expect(sourceFile).toBeDefined();

      const imports = ASTUtils.findImportDeclarations(sourceFile!);
      expect(imports.length).toBe(1);

      const importInfo = ASTUtils.parseImportInfo(imports[0]);
      expect(importInfo.moduleSpecifier).toBe('bar');
      expect(importInfo.namedImports).toContain('foo');
    });
  });

  describe('findAllExports', () => {
    it('should find all export declarations', () => {
      const testFile = path.join(testFilesDir, 'export-test.ts');
      fs.writeFileSync(testFile, 'export const foo = 1;\nconst bar = 2;\nexport default bar;');

      const program = ASTUtils.createProgram([testFile]);
      const sourceFile = ASTUtils.getSourceFile(program, testFile);
      expect(sourceFile).toBeDefined();

      const exports = ASTUtils.findAllExports(sourceFile!);
      expect(exports.length).toBe(2);
      expect(exports.some(e => e.name === 'foo' && !e.isDefault)).toBe(true);
      expect(exports.some(e => e.name === 'default' && e.isDefault)).toBe(true);
    });
  });
});
