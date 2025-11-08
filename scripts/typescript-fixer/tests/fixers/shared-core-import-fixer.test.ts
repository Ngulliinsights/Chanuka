import { SharedCoreImportFixer } from '../../src/fixers/shared-core-import-fixer';
import { TypeScriptError, ProcessingContext } from '../../src/types/core';
import { createSourceFile, ScriptTarget, SyntaxKind } from 'typescript';

// Helper function to create test errors
function createTestError(
  code: number,
  message: string,
  errorText?: string,
  start: number = 0,
  length: number = 10
): TypeScriptError {
  return {
    code,
    message,
    file: 'test.ts',
    line: 1,
    column: 1,
    category: 1,
    start,
    length,
    context: {
      errorText: errorText || message
    }
  };
}

// Helper function to create test project structure
function createTestProjectStructure(): Partial<ProcessingContext> {
  return {
    filePath: '/project/server/test.ts',
    project: {
      rootPath: '/project',
      tsConfigPath: '/project/tsconfig.json',
      sourceFiles: [],
      excludePatterns: [],
      compilerOptions: {},
      schema: {
        tables: {},
        importPaths: {}
      },
      database: {
        connectionPatterns: [],
        servicePatterns: [],
        detectedUsages: [],
        commonImports: {}
      },
      sharedCore: {
        utilities: {
          'logging': ['logger']
        },
        importPaths: {
          'logging': '@shared/core/src/logging'
        }
      }
    }
  };
}

describe('SharedCoreImportFixer', () => {
  let fixer: SharedCoreImportFixer;
  
  beforeEach(() => {
    fixer = new SharedCoreImportFixer();
  });

  describe('canHandle', () => {
    it('should handle missing name errors for known utilities', () => {
      const error = createTestError(2304, "Cannot find name 'logger'", "Cannot find name 'logger'");
      
      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle missing module errors', () => {
      const error = createTestError(2307, "Cannot find module '@shared/core'", "Cannot find module '@shared/core'");
      
      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle property access errors for known utilities', () => {
      const error = createTestError(2339, "Property 'ApiSuccess' does not exist on type", "Property 'ApiSuccess' does not exist on type");
      
      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle unused import cleanup', () => {
      const error = createTestError(6133, "'logger' is declared but its value is never read", "'logger' is declared but its value is never read");
      
      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should not handle unrelated errors', () => {
      const error = createTestError(2304, "Cannot find name 'unknownVariable'", "Cannot find name 'unknownVariable'");
      
      expect(fixer.canHandle(error)).toBe(false);
    });
  });

  describe('fix', () => {
    it('should add new import for missing logger utility', () => {
      const code = `
        function test() {
          logger.info('test message');
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'logger'", "Cannot find name 'logger'", 10, 6);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toContain("import { logger } from '@shared/core'");
    });

    it('should add to existing import when import already exists', () => {
      const code = `
        import { ApiSuccess } from '@shared/core';
        
        function test() {
          logger.info('test');
          return new ApiSuccess(data);
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'logger'", "Cannot find name 'logger'", 60, 6);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toContain('logger');
    });

    it('should handle API response utilities', () => {
      const code = `
        function createUser() {
          return new ApiSuccess(userData);
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'ApiSuccess'", "Cannot find name 'ApiSuccess'", 30, 10);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes[0].newText).toContain("import { ApiSuccess } from '@shared/core'");
    });

    it('should handle validation utilities with specific import paths', () => {
      const code = `
        function validate() {
          throw new ValidationError('Invalid input');
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'ValidationError'", "Cannot find name 'ValidationError'", 30, 15);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes[0].newText).toContain("import { ValidationError } from '@shared/core/src/validation'");
    });

    it('should handle middleware utilities', () => {
      const code = `
        app.use(authMiddleware);
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'authMiddleware'", "Cannot find name 'authMiddleware'", 16, 14);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes[0].newText).toContain("import { authMiddleware } from '@shared/core/src/middleware/auth'");
    });

    it('should clean up unused imports', () => {
      const code = `
        import { logger, ApiSuccess, unusedUtility } from '@shared/core';
        
        function test() {
          logger.info('test');
          return new ApiSuccess(data);
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(6133, "'unusedUtility' is declared but its value is never read", "'unusedUtility' is declared but its value is never read", 40, 13);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
    });

    it('should remove entire import statement when only unused import', () => {
      const code = `
        import { unusedUtility } from '@shared/core';
        
        function test() {
          console.log('test');
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(6133, "'unusedUtility' is declared but its value is never read", "'unusedUtility' is declared but its value is never read", 17, 13);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
    });

    it('should fix relative path issues', () => {
      const code = `
        import { logger } from '../../../shared/core/src/logging';
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const context = createTestProjectStructure();
      
      const error = createTestError(2307, "Cannot find module '../../../shared/core/src/logging'", "Cannot find module '../../../shared/core/src/logging'", 30, 40);
      
      const result = fixer.fix(error, sourceFile, context as ProcessingContext);
      
      expect(result.success).toBe(true);
      // Should suggest fixing the relative path to use alias
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should handle errors when utility cannot be identified', () => {
      const code = `
        function test() {
          unknownFunction();
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'unknownFunction'", "Cannot find name 'unknownFunction'", 30, 15);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to determine which shared utility is missing');
    });

    it('should not add duplicate imports', () => {
      const code = `
        import { logger } from '@shared/core';
        
        function test() {
          logger.info('test');
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'logger'", "Cannot find name 'logger'", 60, 6);
      
      const result = fixer.fix(error, sourceFile);
      
      // Should not add duplicate import
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('getDescription', () => {
    it('should return appropriate description', () => {
      const description = fixer.getDescription();
      
      expect(description).toContain('shared/core');
      expect(description).toContain('import');
    });
  });

  describe('getPriority', () => {
    it('should return high priority', () => {
      const priority = fixer.getPriority();
      
      expect(priority).toBe(80);
    });
  });

  describe('utility identification', () => {
    it('should identify utility from "Cannot find name" pattern', () => {
      const error = createTestError(2304, "Cannot find name 'cacheKeys'", "Cannot find name 'cacheKeys'");
      
      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should identify utility from property access pattern', () => {
      const error = createTestError(2339, "Property 'Performance' does not exist on type", "Property 'Performance' does not exist on type");
      
      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should identify utility mentioned in error text', () => {
      const error = createTestError(2304, "Some error involving ErrorBoundary", "Some error involving ErrorBoundary");
      
      expect(fixer.canHandle(error)).toBe(true);
    });
  });

  describe('import path resolution', () => {
    it('should use project context when available', () => {
      const code = `
        function test() {
          logger.info('test');
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const context = createTestProjectStructure();
      
      const error = createTestError(2304, "Cannot find name 'logger'", "Cannot find name 'logger'", 30, 6);
      
      const result = fixer.fix(error, sourceFile, context as ProcessingContext);
      
      expect(result.success).toBe(true);
      expect(result.changes[0].newText).toContain('@shared/core/src/logging');
    });

    it('should fallback to known mappings when project context is unavailable', () => {
      const code = `
        function test() {
          logger.info('test');
        }
      `;
      
      const sourceFile = createSourceFile('test.ts', code, ScriptTarget.Latest, true);
      const error = createTestError(2304, "Cannot find name 'logger'", "Cannot find name 'logger'", 30, 6);
      
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes[0].newText).toContain('@shared/core');
    });
  });
});