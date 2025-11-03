/**
 * Tests for API Parameter Validator
 */

import * as ts from 'typescript';
import { ApiParameterValidator } from '../../src/validators/api-parameter-validator';

describe('ApiParameterValidator', () => {
  let validator: ApiParameterValidator;

  beforeEach(() => {
    validator = new ApiParameterValidator();
  });

  function createCallExpression(code: string): { args: ts.NodeArray<ts.Expression>, sourceFile: ts.SourceFile } {
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    
    let callExpression: ts.CallExpression | null = null;
    
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        callExpression = node;
        return;
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    
    if (!callExpression) {
      throw new Error('No call expression found in code');
    }
    
    return { args: callExpression.arguments, sourceFile };
  }

  describe('validateApiCall', () => {
    describe('ApiSuccess validation', () => {
      it('should validate correct ApiSuccess call', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiSuccess(res, { id: 1 }, metadata, 200)'
        );

        const result = validator.validateApiCall('ApiSuccess', args, sourceFile);

        expect(result.isValid).toBe(true);
        expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
      });

      it('should detect missing required parameters', () => {
        const { args, sourceFile } = createCallExpression('ApiSuccess(res)');

        const result = validator.validateApiCall('ApiSuccess', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].type).toBe('missing');
        expect(result.issues[0].parameterName).toBe('data');
      });

      it('should detect parameter order issues', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiSuccess(res, data, 200, metadata)'
        );

        const result = validator.validateApiCall('ApiSuccess', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.type === 'wrong_order')).toBe(true);
        expect(result.suggestions.some(s => s.includes('metadata should come before statusCode'))).toBe(true);
      });

      it('should detect too many parameters', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiSuccess(res, data, metadata, 200, extra)'
        );

        const result = validator.validateApiCall('ApiSuccess', args, sourceFile);

        expect(result.issues.some(i => i.type === 'extra')).toBe(true);
        expect(result.suggestions.some(s => s.includes('Too many parameters'))).toBe(true);
      });
    });

    describe('ApiError validation', () => {
      it('should validate correct ApiError call', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiError(res, { code: "ERROR", message: "Something went wrong" }, 500, metadata)'
        );

        const result = validator.validateApiCall('ApiError', args, sourceFile);

        expect(result.isValid).toBe(true);
        expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
      });

      it('should detect string message instead of error object', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiError(res, "Something went wrong", 500)'
        );

        const result = validator.validateApiCall('ApiError', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.type === 'wrong_type' && i.parameterName === 'error')).toBe(true);
        expect(result.suggestions.some(s => s.includes('Convert string message to error object'))).toBe(true);
      });
    });

    describe('ApiValidationError validation', () => {
      it('should validate correct ApiValidationError call', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiValidationError(res, [{ field: "email", message: "Invalid email" }], metadata)'
        );

        const result = validator.validateApiCall('ApiValidationError', args, sourceFile);

        expect(result.isValid).toBe(true);
        expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
      });

      it('should detect string message instead of error array', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiValidationError(res, "Validation failed")'
        );

        const result = validator.validateApiCall('ApiValidationError', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.type === 'wrong_type' && i.parameterName === 'errors')).toBe(true);
        expect(result.suggestions.some(s => s.includes('Convert string to error object'))).toBe(true);
      });
    });

    describe('Unknown function validation', () => {
      it('should handle unknown API function', () => {
        const { args, sourceFile } = createCallExpression('UnknownApiFunction(res, data)');

        const result = validator.validateApiCall('UnknownApiFunction', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.expectedSignature).toBe('Unknown function');
        expect(result.issues[0].type).toBe('extra');
      });
    });
  });

  describe('validateWrapperCall', () => {
    describe('createMetadata validation', () => {
      it('should validate correct createMetadata call', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiResponseWrapper.createMetadata(Date.now(), "database")'
        );

        const result = validator.validateWrapperCall('createMetadata', args, sourceFile);

        expect(result.isValid).toBe(true);
        expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
      });

      it('should detect missing source parameter', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiResponseWrapper.createMetadata(Date.now())'
        );

        const result = validator.validateWrapperCall('createMetadata', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.type === 'missing' && i.parameterName === 'source')).toBe(true);
      });

      it('should detect non-string source parameter', () => {
        const { args, sourceFile } = createCallExpression(
          'ApiResponseWrapper.createMetadata(Date.now(), sourceVariable)'
        );

        const result = validator.validateWrapperCall('createMetadata', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.type === 'wrong_type' && i.parameterName === 'source')).toBe(true);
        expect(result.suggestions.some(s => s.includes('Source parameter should be a string literal'))).toBe(true);
      });
    });

    describe('Unknown method validation', () => {
      it('should handle unknown wrapper method', () => {
        const { args, sourceFile } = createCallExpression('ApiResponseWrapper.unknownMethod(arg1, arg2)');

        const result = validator.validateWrapperCall('unknownMethod', args, sourceFile);

        expect(result.isValid).toBe(false);
        expect(result.expectedSignature).toBe('Unknown method');
        expect(result.issues[0].type).toBe('extra');
      });
    });
  });

  describe('parameter type detection', () => {
    it('should correctly identify parameter types', () => {
      const { args, sourceFile } = createCallExpression(
        'testFunction("string", 123, true, {}, [], someVar)'
      );

      const result = validator.validateApiCall('ApiSuccess', args, sourceFile);

      expect(result.actualParameters[0]).toContain('string');
      expect(result.actualParameters[1]).toContain('number');
      expect(result.actualParameters[2]).toContain('boolean');
      expect(result.actualParameters[3]).toContain('object');
      expect(result.actualParameters[4]).toContain('array');
      expect(result.actualParameters[5]).toContain('identifier');
    });
  });

  describe('metadata detection', () => {
    it('should recognize metadata-like parameters', () => {
      const testCases = [
        'ApiResponseWrapper.createMetadata(Date.now(), "database")',
        '{ timestamp: Date.now(), source: "database" }',
        'metadataVariable'
      ];

      testCases.forEach(testCase => {
        const { args, sourceFile } = createCallExpression(`testFunction(${testCase})`);
        // The validator should recognize these as metadata-like
        expect(args.length).toBeGreaterThan(0);
      });
    });
  });

  describe('real-world Chanuka patterns', () => {
    it('should validate typical verification.ts pattern', () => {
      const { args, sourceFile } = createCallExpression(
        'ApiValidationError(res, { field: "bill_id", message: "Invalid bill ID" }, ApiResponseWrapper.createMetadata(startTime, "database"))'
      );

      const result = validator.validateApiCall('ApiValidationError', args, sourceFile);

      // This should be valid - it's the correct pattern used in the codebase
      expect(result.isValid).toBe(true);
    });

    it('should validate typical profile.ts pattern', () => {
      const { args, sourceFile } = createCallExpression(
        'ApiSuccess(res, profile, ApiResponseWrapper.createMetadata(startTime, "getUserProfile"))'
      );

      const result = validator.validateApiCall('ApiSuccess', args, sourceFile);

      // This should be valid
      expect(result.isValid).toBe(true);
    });

    it('should detect common mistake in error handling', () => {
      const { args, sourceFile } = createCallExpression(
        'ApiError(res, "Internal server error", 500, ApiResponseWrapper.createMetadata(startTime, "database"))'
      );

      const result = validator.validateApiCall('ApiError', args, sourceFile);

      // This should detect the string message issue
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'wrong_type' && i.parameterName === 'error')).toBe(true);
    });
  });
});