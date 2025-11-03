/**
 * Tests for API Response Utility Fixer
 */

import * as ts from 'typescript';
import { ApiResponseFixer } from '../../src/fixers/api-response-fixer';
import { TypeScriptError } from '../../src/types/core';

function createTestError(code: number, message: string, line?: number, column?: number): TypeScriptError {
  return {
    code,
    message,
    file: 'test.ts',
    line: line || 10,
    column: column || 5,
    category: ts.DiagnosticCategory.Error,
    start: 100,
    length: 10
  };
}

describe('ApiResponseFixer', () => {
  let fixer: ApiResponseFixer;

  beforeEach(() => {
    fixer = new ApiResponseFixer();
  });

  describe('canHandle', () => {
    it('should handle API function signature errors', () => {
      const error = createTestError(2345, 'Argument of type is not assignable to parameter of type in ApiSuccess');

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle ApiResponseWrapper errors', () => {
      const error = createTestError(2339, 'Property createMetadata does not exist on type ApiResponseWrapper');

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should not handle unrelated errors', () => {
      const error = createTestError(2304, 'Cannot find name someRandomVariable');

      expect(fixer.canHandle(error)).toBe(false);
    });
  });

  describe('fix ApiSuccess calls', () => {
    it('should add missing metadata parameter', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          const data = { id: 1 };
          return ApiSuccess(res, data);
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Expected 3 arguments but got 2 in ApiSuccess', 4, 18);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toBe(', undefined');
      expect(result.changes[0].description).toContain('metadata parameter');
    });

    it('should fix parameter order (metadata before statusCode)', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          const data = { id: 1 };
          const metadata = ApiResponseWrapper.createMetadata(Date.now(), 'database');
          return ApiSuccess(res, data, 201, metadata);
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Argument of type number is not assignable to parameter of type metadata', 5, 35);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].description).toContain('parameter order');
    });
  });

  describe('fix ApiError calls', () => {
    it('should convert string message to error object', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          return ApiError(res, 'Something went wrong');
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Argument of type string is not assignable to parameter of type error object', 3, 28);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(2); // Convert to object + add statusCode
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].newText).toContain('{ code: \'ERROR\', message:');
      expect(result.changes[1].newText).toBe(', 500');
    });

    it('should add missing statusCode parameter', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          return ApiError(res, { code: 'NOT_FOUND', message: 'User not found' });
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2554, 'Expected 3 arguments but got 2', 3, 18);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toBe(', 500');
    });
  });

  describe('fix ApiValidationError calls', () => {
    it('should convert string message to error object', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          return ApiValidationError(res, 'Validation failed');
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Argument of type string is not assignable to parameter of type error array', 3, 37);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].newText).toContain('{ field: \'general\', message:');
    });
  });

  describe('fix ApiNotFound calls', () => {
    it('should add missing message parameter when metadata is provided', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          const metadata = ApiResponseWrapper.createMetadata(Date.now(), 'database');
          return ApiNotFound(res, 'User', metadata);
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Argument of type metadata is not assignable to parameter of type string', 4, 40);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toBe('undefined, ');
    });
  });

  describe('fix ApiResponseWrapper.createMetadata calls', () => {
    it('should add missing source parameter', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          const metadata = ApiResponseWrapper.createMetadata(Date.now());
          return ApiSuccess(res, data, metadata);
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2554, 'Expected 2 arguments but got 1', 3, 27);

      const result = fixer.fix(error, sourceFile);
      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toBe(", 'database'");
    });

    it('should convert non-string source parameter to string', () => {
      const sourceCode = `
        export function handler(req: Request, res: Response) {
          const source = database;
          const metadata = ApiResponseWrapper.createMetadata(Date.now(), source);
          return ApiSuccess(res, data, metadata);
        }
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Argument of type identifier is not assignable to parameter of type string', 4, 70);

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].newText).toBe("'source'");
    });
  });

  describe('real Chanuka patterns', () => {
    it('should fix actual verification.ts pattern', () => {
      const sourceCode = `
        return ApiValidationError(res, { field: 'bill_id', message: 'Invalid bill ID'  }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Expected 2 arguments but got 3 in ApiValidationError', 2, 9);

      // This pattern is actually correct, so no fixes should be needed
      const result = fixer.fix(error, sourceFile);
      
      // The fixer should recognize this as a valid pattern
      expect(result.success).toBe(false);
    });

    it('should fix profile.ts pattern with missing parameters', () => {
      const sourceCode = `
        return ApiSuccess(
          res, 
          profile, 
          ApiResponseWrapper.createMetadata(startTime, 'getUserProfile')
        );
      `;

      const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
      const error = createTestError(2345, 'Argument of type metadata is not assignable to parameter of type number', 5, 11);

      // This suggests the parameters are in wrong order
      const result = fixer.fix(error, sourceFile);
      
      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('getDescription', () => {
    it('should return appropriate description', () => {
      expect(fixer.getDescription()).toBe('Fixes API response utility parameter and signature issues');
    });
  });
});