import { ExactOptionalPropertyFixer } from '../../src/fixers/exact-optional-property-fixer';
import { TypeScriptError } from '../../src/types/core';
import { createSourceFile, ScriptTarget, DiagnosticCategory } from 'typescript';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ExactOptionalPropertyFixer Integration Tests', () => {
  let fixer: ExactOptionalPropertyFixer;

  beforeEach(() => {
    fixer = new ExactOptionalPropertyFixer();
  });

  describe('Real Chanuka Validation Patterns', () => {
    it('should fix all optional properties in Chanuka validation patterns', () => {
      // Load the test fixture
      const fixturePath = join(__dirname, '../fixtures/chanuka-validation-patterns.ts');
      const sourceCode = readFileSync(fixturePath, 'utf-8');
      const sourceFile = createSourceFile('chanuka-validation-patterns.ts', sourceCode, ScriptTarget.Latest);

      // Simulate multiple TS2375 errors for different interfaces
      const errors: TypeScriptError[] = [
        {
          code: 2375,
          message: 'Type is missing the following properties from type UserProfileData',
          file: 'chanuka-validation-patterns.ts',
          line: 4,
          column: 3,
          category: DiagnosticCategory.Error,
          start: sourceCode.indexOf('bio?: string'),
          length: 12
        },
        {
          code: 2375,
          message: 'Type is missing the following properties from type RequestValidationConfig',
          file: 'chanuka-validation-patterns.ts',
          line: 25,
          column: 3,
          category: DiagnosticCategory.Error,
          start: sourceCode.indexOf('body?: ZodSchema'),
          length: 16
        },
        {
          code: 2375,
          message: 'Type is missing the following properties from type ValidationOptions',
          file: 'chanuka-validation-patterns.ts',
          line: 35,
          column: 3,
          category: DiagnosticCategory.Error,
          start: sourceCode.indexOf('strict?: boolean'),
          length: 16
        }
      ];

      let totalChanges = 0;
      let successfulFixes = 0;

      // Apply fixes for each error
      for (const error of errors) {
        const result = fixer.fix(error, sourceFile);
        
        if (result.success) {
          successfulFixes++;
          totalChanges += result.changes.length;
          
          // Verify that changes include | undefined
          result.changes.forEach(change => {
            expect(change.newText).toContain('| undefined');
            expect(change.description).toContain('Add | undefined');
          });
        }
      }

      expect(successfulFixes).toBeGreaterThan(0);
      expect(totalChanges).toBeGreaterThan(0);
    });

    it('should handle complex nested optional configurations', () => {
      const sourceCode = `
interface NestedOptionalConfig {
  database?: {
    primary?: DatabaseConfig;
    replica?: DatabaseConfig;
    migrations?: {
      enabled?: boolean;
      directory?: string;
      table?: string;
    };
  };
  cache?: {
    redis?: CacheConfig;
    memory?: CacheConfig;
  };
}`;

      const sourceFile = createSourceFile('nested-config.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'nested-config.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: sourceCode.indexOf('database?:'),
        length: 10
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should preserve existing union types with undefined', () => {
      const sourceCode = `
interface AlreadyFixed {
  prop1?: string | undefined;
  prop2?: number | null | undefined;
  prop3?: boolean;
}`;

      const sourceFile = createSourceFile('already-fixed.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'already-fixed.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: sourceCode.indexOf('prop1?:'),
        length: 7
      };

      const result = fixer.fix(error, sourceFile);

      // Should not modify already correct types
      if (result.success) {
        const prop1Changes = result.changes.filter(c => c.originalText?.includes('string | undefined'));
        expect(prop1Changes).toHaveLength(0);
      }
    });
  });

  describe('Middleware Function Patterns', () => {
    it('should fix optional parameters in middleware functions', () => {
      const sourceCode = `
function validateRequest(config: RequestValidationConfig) {
  return async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    // Implementation
  };
}

type CustomMiddleware = (
  req: Request,
  res: Response,
  next?: NextFunction,
  options?: ValidationOptions
) => void;`;

      const sourceFile = createSourceFile('middleware.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'middleware.ts',
        line: 3,
        column: 45,
        category: DiagnosticCategory.Error,
        start: sourceCode.indexOf('next?: NextFunction'),
        length: 19
      };

      const result = fixer.fix(error, sourceFile);

      if (result.success) {
        expect(result.message).toContain('middleware');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed TypeScript gracefully', () => {
      const sourceCode = `
interface Broken {
  prop?: 
}`;

      const sourceFile = createSourceFile('broken.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'broken.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: sourceCode.indexOf('prop?:'),
        length: 6
      };

      const result = fixer.fix(error, sourceFile);

      // Should handle gracefully without throwing
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle empty interfaces', () => {
      const sourceCode = `interface Empty {}`;
      const sourceFile = createSourceFile('empty.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'empty.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 5
      };

      const result = fixer.fix(error, sourceFile);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large interfaces efficiently', () => {
      // Generate a large interface with many optional properties
      const properties = Array.from({ length: 100 }, (_, i) => 
        `  prop${i}?: string;`
      ).join('\n');
      
      const sourceCode = `
interface LargeInterface {
${properties}
}`;

      const sourceFile = createSourceFile('large.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'large.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: sourceCode.indexOf('prop0?:'),
        length: 7
      };

      const startTime = Date.now();
      const result = fixer.fix(error, sourceFile);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      if (result.success) {
        expect(result.changes.length).toBeGreaterThan(0);
        expect(result.changes.length).toBeLessThanOrEqual(100);
      }
    });
  });
});