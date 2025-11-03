/**
 * Tests for UnusedVariableCleaner
 * 
 * Tests the unused variable and import cleaner with Chanuka project patterns
 */

import * as ts from 'typescript';
import { UnusedVariableCleaner } from '../../src/fixers/unused-variable-cleaner';
import { TypeScriptError, ProcessingContext, ProjectStructure } from '../../src/types/core';

describe('UnusedVariableCleaner', () => {
  let fixer: UnusedVariableCleaner;

  beforeEach(() => {
    fixer = new UnusedVariableCleaner();
  });

  describe('canHandle', () => {
    it('should handle error code 6133 (unused variables)', () => {
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: ts.DiagnosticCategory.Warning,
        start: 0,
        length: 6
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should not handle other error codes', () => {
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'logger'",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: ts.DiagnosticCategory.Error,
        start: 0,
        length: 6
      };

      expect(fixer.canHandle(error)).toBe(false);
    });
  });

  describe('unused import cleanup', () => {
    it('should remove entire import statement when only one import is unused', () => {
      const sourceCode = `import { logger } from '@shared/core';
console.log('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.changes[0].description).toContain('Remove unused import statement for logger');
    });

    it('should remove only the unused import from multiple imports', () => {
      const sourceCode = `import { logger, ApiSuccess } from '@shared/core';
ApiSuccess(res, data);`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.changes[0].description).toContain('Remove unused import logger');
    });

    it('should handle shared/core imports with warnings', () => {
      const sourceCode = `import { logger } from '@shared/core/src/observability/logging';
console.log('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Removed shared/core import: logger');
    });

    it('should handle unused imports from non-shared modules', () => {
      const sourceCode = `import { someUtil } from './utils';
console.log('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'someUtil' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 8
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('unused variable cleanup', () => {
    it('should remove entire variable statement when only one variable is unused', () => {
      const sourceCode = `const unusedVar = 'test';
console.log('other code');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'unusedVar' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 6,
        category: ts.DiagnosticCategory.Warning,
        start: 6,
        length: 9
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.changes[0].description).toContain('Remove unused variable declaration: unusedVar');
    });

    it('should remove only the unused variable from multiple declarations', () => {
      const sourceCode = `const unusedVar = 'test', usedVar = 'used';
console.log(usedVar);`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'unusedVar' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 6,
        category: ts.DiagnosticCategory.Warning,
        start: 6,
        length: 9
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.changes[0].description).toContain('Remove unused variable unusedVar');
    });
  });

  describe('unused parameter handling', () => {
    it('should prefix unused Express.js parameters with underscore', () => {
      const sourceCode = `function handler(req, res, next) {
  res.send('ok');
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'req' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 16,
        category: ts.DiagnosticCategory.Warning,
        start: 16,
        length: 3
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].newText).toBe('_req');
      expect(result.changes[0].description).toContain('Prefix unused parameter req with underscore');
    });

    it('should prefix unused callback parameters with underscore', () => {
      const sourceCode = `function processData(data, callback) {
  return data.map(x => x * 2);
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'callback' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 23,
        category: ts.DiagnosticCategory.Warning,
        start: 23,
        length: 8
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe('_callback');
    });

    it('should prefix unused non-essential parameters with underscore and warning', () => {
      const sourceCode = `function customFunction(data, unusedParam) {
  return data.length;
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'unusedParam' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 30,
        category: ts.DiagnosticCategory.Warning,
        start: 30,
        length: 11
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe('_unusedParam');
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Consider if it can be removed entirely');
    });

    it('should not modify parameters already prefixed with underscore', () => {
      const sourceCode = `function handler(_req, res) {
  res.send('ok');
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'_req' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 16,
        category: ts.DiagnosticCategory.Warning,
        start: 16,
        length: 4
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed error messages gracefully', () => {
      const sourceCode = `const test = 'value';`;
      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "Invalid error message format",
        file: 'test.ts',
        line: 1,
        column: 6,
        category: ts.DiagnosticCategory.Warning,
        start: 6,
        length: 4
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse error message');
    });

    it('should handle cases where unused item cannot be found', () => {
      const sourceCode = `const test = 'value';`;
      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'nonexistent' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 6,
        category: ts.DiagnosticCategory.Warning,
        start: 6,
        length: 11
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Item not found in source file');
    });
  });

  describe('Chanuka project patterns', () => {
    it('should handle common Chanuka shared/core utilities', () => {
      const sourceCode = `import { logger, cacheKeys, ApiSuccess } from '@shared/core';
ApiSuccess(res, data);
console.log(cacheKeys.USER_PROFILE);`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('shared/core import');
    });

    it('should handle nested shared/core import paths', () => {
      const sourceCode = `import { ValidationError } from '@shared/core/src/validation';
console.log('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'ValidationError' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('shared/core import');
    });

    it('should preserve common Express.js middleware parameters', () => {
      const testCases = [
        { param: 'req', expected: '_req' },
        { param: 'res', expected: '_res' },
        { param: 'next', expected: '_next' },
        { param: 'request', expected: '_request' },
        { param: 'response', expected: '_response' },
        { param: 'ctx', expected: '_ctx' },
        { param: 'context', expected: '_context' },
        { param: 'err', expected: '_err' },
        { param: 'error', expected: '_error' }
      ];

      testCases.forEach(({ param, expected }) => {
        const sourceCode = `function handler(${param}) {
  console.log('handler');
}`;

        const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
        
        const error: TypeScriptError = {
          code: 6133,
          message: `'${param}' is declared but its value is never read`,
          file: 'test.ts',
          line: 1,
          column: 16,
          category: ts.DiagnosticCategory.Warning,
          start: 16,
          length: param.length
        };

        const result = fixer.fix(error, sourceFile);

        expect(result.success).toBe(true);
        expect(result.changes[0].newText).toBe(expected);
      });
    });
  });

  describe('integration with project context', () => {
    it('should use project context for better import path resolution', () => {
      const mockProjectStructure: ProjectStructure = {
        rootPath: '/project',
        tsConfigPath: '/project/tsconfig.json',
        sourceFiles: [],
        excludePatterns: [],
        compilerOptions: {},
        schema: { tables: {}, importPaths: {} },
        sharedCore: {
          utilities: {
            'observability-logging': ['logger', 'Logger'],
            'utils-api': ['ApiSuccess', 'ApiError']
          },
          importPaths: {
            'observability-logging': '@shared/core/src/observability/logging',
            'utils-api': '@shared/core/src/utils/api'
          }
        },
        database: {
          connectionPatterns: [],
          servicePatterns: [],
          detectedUsages: [],
          commonImports: {}
        }
      };

      const mockContext: ProcessingContext = {
        project: mockProjectStructure,
        config: {
          enabledErrorTypes: [6133],
          excludePatterns: [],
          includePatterns: [],
          backupFiles: false,
          previewMode: false,
          outputFormat: 'console',
          maxConcurrency: 1,
          continueOnError: true,
          chanukaSettings: {
            projectRoot: '/project',
            tsConfigPath: '/project/tsconfig.json',
            schemaTableNames: [],
            sharedCoreUtilities: [],
            databasePatterns: []
          }
        },
        sourceFile: {} as ts.SourceFile,
        program: {},
        typeChecker: {},
        filePath: '/project/src/test.ts'
      };

      const sourceCode = `import { logger } from '@shared/core/src/observability/logging';
console.log('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 6
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('shared/core import');
    });
  });

  describe('fixer metadata', () => {
    it('should return correct description', () => {
      expect(fixer.getDescription()).toContain('Cleans up unused variables and imports');
      expect(fixer.getDescription()).toContain('Chanuka project patterns');
    });

    it('should return appropriate priority', () => {
      expect(fixer.getPriority()).toBe(30);
    });
  });

  describe('edge cases and complex patterns', () => {
    it('should handle unused parameters in arrow functions', () => {
      const sourceCode = `const handler = (req, res, next) => {
  res.send('ok');
};`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'req' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 17,
        category: ts.DiagnosticCategory.Warning,
        start: 17,
        length: 3
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe('_req');
    });

    it('should handle unused variables in try-catch blocks', () => {
      const sourceCode = `try {
  const result = performOperation();
  const timestamp = Date.now();
  return result;
} catch (error) {
  throw error;
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'timestamp' is declared but its value is never read",
        file: 'test.ts',
        line: 3,
        column: 8,
        category: ts.DiagnosticCategory.Warning,
        start: 50,
        length: 9
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
    });

    it('should handle unused namespace imports', () => {
      const sourceCode = `import * as CoreUtils from '@shared/core';
import { logger } from '@shared/core';

logger.info('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'CoreUtils' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 12,
        category: ts.DiagnosticCategory.Warning,
        start: 12,
        length: 9
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.changes[0].description).toContain('Remove unused import statement for CoreUtils');
    });

    it('should handle unused parameters with default values', () => {
      const sourceCode = `function processRequest(data, customParam = {}, timeout = 5000) {
  return data;
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'customParam' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 27,
        category: ts.DiagnosticCategory.Warning,
        start: 27,
        length: 11
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe('_customParam');
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Consider if it can be removed entirely');
    });

    it('should handle unused variables in loop contexts', () => {
      const sourceCode = `for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const itemId = item.id;
  console.log(item);
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'itemId' is declared but its value is never read",
        file: 'test.ts',
        line: 3,
        column: 8,
        category: ts.DiagnosticCategory.Warning,
        start: 60,
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
    });

    it('should handle unused class method parameters', () => {
      const sourceCode = `class UserService {
  getUser(id, options, context) {
    return { id };
  }
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'options' is declared but its value is never read",
        file: 'test.ts',
        line: 2,
        column: 14,
        category: ts.DiagnosticCategory.Warning,
        start: 35,
        length: 7
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe('_options');
    });

    it('should handle unused imports from deeply nested shared/core paths', () => {
      const sourceCode = `import { ErrorBoundary } from '@shared/core/src/observability/error-management/handlers';
import { logger } from '@shared/core';

logger.info('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'ErrorBoundary' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 12
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('shared/core import');
    });

    it('should handle unused variables in conditional blocks', () => {
      const sourceCode = `if (condition) {
  const processedData = processData(data);
  const metadata = { processed: true };
  console.log('processed');
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'processedData' is declared but its value is never read",
        file: 'test.ts',
        line: 2,
        column: 8,
        category: ts.DiagnosticCategory.Warning,
        start: 23,
        length: 13
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
    });

    it('should handle multiple unused imports from the same module', () => {
      const sourceCode = `import { 
  logger, 
  ApiSuccess, 
  ApiError, 
  ValidationError,
  cacheKeys 
} from '@shared/core';

export function simpleFunction() {
  logger.info('test');
  return ApiSuccess(null, {});
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      // Test removing ApiError
      const error: TypeScriptError = {
        code: 6133,
        message: "'ApiError' is declared but its value is never read",
        file: 'test.ts',
        line: 4,
        column: 2,
        category: ts.DiagnosticCategory.Warning,
        start: 40,
        length: 8
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('shared/core import');
    });

    it('should preserve parameters that match common async patterns', () => {
      const testCases = [
        { param: 'data', expected: '_data' },
        { param: 'result', expected: '_result' },
        { param: 'options', expected: '_options' },
        { param: 'config', expected: '_config' },
        { param: 'params', expected: '_params' },
        { param: 'args', expected: '_args' }
      ];

      testCases.forEach(({ param, expected }) => {
        const sourceCode = `async function handler(${param}) {
  return 'success';
}`;

        const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
        
        const error: TypeScriptError = {
          code: 6133,
          message: `'${param}' is declared but its value is never read`,
          file: 'test.ts',
          line: 1,
          column: 23,
          category: ts.DiagnosticCategory.Warning,
          start: 23,
          length: param.length
        };

        const result = fixer.fix(error, sourceFile);

        expect(result.success).toBe(true);
        expect(result.changes[0].newText).toBe(expected);
      });
    });
  });

  describe('performance and reliability', () => {
    it('should handle large files with many unused imports efficiently', () => {
      const imports = Array.from({ length: 50 }, (_, i) => `import${i}`).join(', ');
      const sourceCode = `import { ${imports} } from '@shared/core';
import { logger } from '@shared/core';

logger.info('test');`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'import0' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 7
      };

      const startTime = Date.now();
      const result = fixer.fix(error, sourceFile);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle deeply nested source file structures', () => {
      const sourceCode = `
function outer() {
  function inner() {
    function deeplyNested() {
      const unusedVar = 'test';
      return 'result';
    }
    return deeplyNested();
  }
  return inner();
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'unusedVar' is declared but its value is never read",
        file: 'test.ts',
        line: 5,
        column: 12,
        category: ts.DiagnosticCategory.Warning,
        start: 85,
        length: 9
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
    });

    it('should handle malformed TypeScript gracefully', () => {
      const sourceCode = `import { logger } from '@shared/core';
// Intentionally malformed syntax
function test( {
  logger.info('test');
}`;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'logger' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 9,
        category: ts.DiagnosticCategory.Warning,
        start: 9,
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      // Should not crash, even with malformed syntax
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });});
