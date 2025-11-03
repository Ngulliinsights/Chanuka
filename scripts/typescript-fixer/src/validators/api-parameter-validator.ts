/**
 * API Parameter Validator
 * 
 * Validates parameters for API response utility functions and provides
 * detailed information about expected signatures and common mistakes.
 */

import * as ts from 'typescript';

export interface ApiParameterValidation {
  isValid: boolean;
  expectedSignature: string;
  actualParameters: string[];
  issues: ApiParameterIssue[];
  suggestions: string[];
}

export interface ApiParameterIssue {
  type: 'missing' | 'wrong_type' | 'wrong_order' | 'extra';
  parameterIndex: number;
  parameterName: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
}

export class ApiParameterValidator {
  private readonly API_SIGNATURES = {
    'ApiSuccess': {
      required: ['res: Response', 'data: T'],
      optional: ['metadata?: ResponseMetadata', 'statusCode?: number'],
      description: 'Sends successful API response with data'
    },
    'ApiError': {
      required: ['res: Response', 'error: {code: string, message: string, details?}'],
      optional: ['statusCode?: number', 'metadata?: ResponseMetadata'],
      description: 'Sends error API response'
    },
    'ApiValidationError': {
      required: ['res: Response', 'errors: Array<{field: string, message: string}> | {field: string, message: string}'],
      optional: ['metadata?: ResponseMetadata'],
      description: 'Sends validation error response'
    },
    'ApiNotFound': {
      required: ['res: Response'],
      optional: ['resource?: string', 'message?: string', 'metadata?: ResponseMetadata'],
      description: 'Sends not found error response'
    },
    'ApiForbidden': {
      required: ['res: Response'],
      optional: ['message?: string', 'metadata?: ResponseMetadata'],
      description: 'Sends forbidden error response'
    },
    'ApiUnauthorized': {
      required: ['res: Response'],
      optional: ['message?: string', 'metadata?: ResponseMetadata'],
      description: 'Sends unauthorized error response'
    }
  };

  private readonly WRAPPER_SIGNATURES = {
    'createMetadata': {
      required: ['startTime: number', 'source: string'],
      optional: ['additionalMetadata?: Partial<ResponseMetadata>'],
      description: 'Creates response metadata object'
    }
  };

  validateApiCall(functionName: string, args: ts.NodeArray<ts.Expression>, sourceFile: ts.SourceFile): ApiParameterValidation {
    const signature = this.API_SIGNATURES[functionName as keyof typeof this.API_SIGNATURES];
    if (!signature) {
      return {
        isValid: false,
        expectedSignature: 'Unknown function',
        actualParameters: [],
        issues: [{
          type: 'extra',
          parameterIndex: -1,
          parameterName: functionName,
          expected: 'Known API function',
          actual: functionName,
          severity: 'error'
        }],
        suggestions: [`Unknown API function: ${functionName}`]
      };
    }

    return this.validateParameters(functionName, signature, args, sourceFile);
  }

  validateWrapperCall(methodName: string, args: ts.NodeArray<ts.Expression>, sourceFile: ts.SourceFile): ApiParameterValidation {
    const signature = this.WRAPPER_SIGNATURES[methodName as keyof typeof this.WRAPPER_SIGNATURES];
    if (!signature) {
      return {
        isValid: false,
        expectedSignature: 'Unknown method',
        actualParameters: [],
        issues: [{
          type: 'extra',
          parameterIndex: -1,
          parameterName: methodName,
          expected: 'Known wrapper method',
          actual: methodName,
          severity: 'error'
        }],
        suggestions: [`Unknown wrapper method: ${methodName}`]
      };
    }

    return this.validateParameters(methodName, signature, args, sourceFile);
  }

  private validateParameters(
    functionName: string, 
    signature: { required: string[], optional: string[], description: string }, 
    args: ts.NodeArray<ts.Expression>, 
    sourceFile: ts.SourceFile
  ): ApiParameterValidation {
    const issues: ApiParameterIssue[] = [];
    const suggestions: string[] = [];
    const actualParameters: string[] = [];
    
    // Get actual parameter types/values
    args.forEach((arg, index) => {
      actualParameters.push(this.getParameterDescription(arg, sourceFile));
    });

    const minRequired = signature.required.length;
    const maxTotal = signature.required.length + signature.optional.length;

    // Check minimum required parameters
    if (args.length < minRequired) {
      for (let i = args.length; i < minRequired; i++) {
        issues.push({
          type: 'missing',
          parameterIndex: i,
          parameterName: this.extractParameterName(signature.required[i]),
          expected: signature.required[i],
          actual: 'missing',
          severity: 'error'
        });
      }
      suggestions.push(`Add missing required parameters. Expected at least ${minRequired}, got ${args.length}`);
    }

    // Check maximum parameters
    if (args.length > maxTotal) {
      for (let i = maxTotal; i < args.length; i++) {
        issues.push({
          type: 'extra',
          parameterIndex: i,
          parameterName: `param${i}`,
          expected: 'none',
          actual: actualParameters[i] || 'unknown',
          severity: 'warning'
        });
      }
      suggestions.push(`Too many parameters. Expected at most ${maxTotal}, got ${args.length}`);
    }

    // Validate parameter types for existing arguments
    for (let i = 0; i < Math.min(args.length, maxTotal); i++) {
      const arg = args[i];
      const expectedParam = i < signature.required.length 
        ? signature.required[i] 
        : signature.optional[i - signature.required.length];
      
      const typeIssue = this.validateParameterType(arg, expectedParam, i, sourceFile);
      if (typeIssue) {
        issues.push(typeIssue);
      }
    }

    // Function-specific validations
    const specificIssues = this.validateFunctionSpecificRules(functionName, args, sourceFile);
    issues.push(...specificIssues.issues);
    suggestions.push(...specificIssues.suggestions);

    const expectedSignature = `${functionName}(${signature.required.join(', ')}${signature.optional.length > 0 ? ', ' + signature.optional.join(', ') : ''})`;

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      expectedSignature,
      actualParameters,
      issues,
      suggestions
    };
  }

  private validateParameterType(
    arg: ts.Expression, 
    expectedParam: string, 
    index: number, 
    sourceFile: ts.SourceFile
  ): ApiParameterIssue | null {
    const paramName = this.extractParameterName(expectedParam);
    const expectedType = this.extractParameterType(expectedParam);
    const actualType = this.getParameterType(arg);

    // Basic type checking
    if (expectedType.includes('Response') && !this.isResponseLike(arg)) {
      return {
        type: 'wrong_type',
        parameterIndex: index,
        parameterName: paramName,
        expected: expectedType,
        actual: actualType,
        severity: 'error'
      };
    }

    if (expectedType.includes('number') && !this.isNumberLike(arg)) {
      return {
        type: 'wrong_type',
        parameterIndex: index,
        parameterName: paramName,
        expected: expectedType,
        actual: actualType,
        severity: 'error'
      };
    }

    if (expectedType.includes('string') && !this.isStringLike(arg)) {
      return {
        type: 'wrong_type',
        parameterIndex: index,
        parameterName: paramName,
        expected: expectedType,
        actual: actualType,
        severity: 'error'
      };
    }

    return null;
  }

  private validateFunctionSpecificRules(
    functionName: string, 
    args: ts.NodeArray<ts.Expression>, 
    sourceFile: ts.SourceFile
  ): { issues: ApiParameterIssue[], suggestions: string[] } {
    const issues: ApiParameterIssue[] = [];
    const suggestions: string[] = [];

    switch (functionName) {
      case 'ApiSuccess':
        return this.validateApiSuccessRules(args, sourceFile);
      case 'ApiError':
        return this.validateApiErrorRules(args, sourceFile);
      case 'ApiValidationError':
        return this.validateApiValidationErrorRules(args, sourceFile);
      case 'createMetadata':
        return this.validateCreateMetadataRules(args, sourceFile);
    }

    return { issues, suggestions };
  }

  private validateApiSuccessRules(
    args: ts.NodeArray<ts.Expression>, 
    sourceFile: ts.SourceFile
  ): { issues: ApiParameterIssue[], suggestions: string[] } {
    const issues: ApiParameterIssue[] = [];
    const suggestions: string[] = [];

    // Check for common parameter order mistake: statusCode before metadata
    if (args.length >= 4) {
      const thirdArg = args[2];  // Should be metadata
      const fourthArg = args[3]; // Should be statusCode

      if (this.isNumberLike(thirdArg) && this.isMetadataLike(fourthArg)) {
        issues.push({
          type: 'wrong_order',
          parameterIndex: 2,
          parameterName: 'metadata',
          expected: 'metadata before statusCode',
          actual: 'statusCode before metadata',
          severity: 'error'
        });
        suggestions.push('Swap parameters: metadata should come before statusCode');
      }
    }

    return { issues, suggestions };
  }

  private validateApiErrorRules(
    args: ts.NodeArray<ts.Expression>, 
    sourceFile: ts.SourceFile
  ): { issues: ApiParameterIssue[], suggestions: string[] } {
    const issues: ApiParameterIssue[] = [];
    const suggestions: string[] = [];

    // Check if second parameter is string instead of error object
    if (args.length >= 2) {
      const errorArg = args[1];
      if (this.isStringLike(errorArg) && !ts.isObjectLiteralExpression(errorArg)) {
        issues.push({
          type: 'wrong_type',
          parameterIndex: 1,
          parameterName: 'error',
          expected: 'error object {code, message, details?}',
          actual: 'string',
          severity: 'error'
        });
        suggestions.push('Convert string message to error object: { code: "ERROR", message: yourString }');
      }
    }

    return { issues, suggestions };
  }

  private validateApiValidationErrorRules(
    args: ts.NodeArray<ts.Expression>, 
    sourceFile: ts.SourceFile
  ): { issues: ApiParameterIssue[], suggestions: string[] } {
    const issues: ApiParameterIssue[] = [];
    const suggestions: string[] = [];

    // Check if second parameter is string instead of error array/object
    if (args.length >= 2) {
      const errorsArg = args[1];
      if (this.isStringLike(errorsArg)) {
        issues.push({
          type: 'wrong_type',
          parameterIndex: 1,
          parameterName: 'errors',
          expected: 'Array<{field, message}> or {field, message}',
          actual: 'string',
          severity: 'error'
        });
        suggestions.push('Convert string to error object: { field: "general", message: yourString }');
      }
    }

    return { issues, suggestions };
  }

  private validateCreateMetadataRules(
    args: ts.NodeArray<ts.Expression>, 
    sourceFile: ts.SourceFile
  ): { issues: ApiParameterIssue[], suggestions: string[] } {
    const issues: ApiParameterIssue[] = [];
    const suggestions: string[] = [];

    // Check if source parameter is not a string
    if (args.length >= 2) {
      const sourceArg = args[1];
      if (!this.isStringLike(sourceArg)) {
        issues.push({
          type: 'wrong_type',
          parameterIndex: 1,
          parameterName: 'source',
          expected: 'string',
          actual: this.getParameterType(sourceArg),
          severity: 'error'
        });
        suggestions.push('Source parameter should be a string literal like "database" or "cache"');
      }
    }

    return { issues, suggestions };
  }

  // Helper methods for type checking
  private isResponseLike(node: ts.Expression): boolean {
    return ts.isIdentifier(node) && (node.text === 'res' || node.text === 'response');
  }

  private isNumberLike(node: ts.Expression): boolean {
    return ts.isNumericLiteral(node) || 
           (ts.isIdentifier(node) && /^\d+$/.test(node.text));
  }

  private isStringLike(node: ts.Expression): boolean {
    return ts.isStringLiteral(node) || 
           ts.isTemplateExpression(node) ||
           ts.isNoSubstitutionTemplateLiteral(node);
  }

  private isMetadataLike(node: ts.Expression): boolean {
    if (ts.isObjectLiteralExpression(node)) {
      return true;
    }
    
    if (ts.isCallExpression(node)) {
      const funcName = this.getFunctionName(node);
      return funcName === 'createMetadata' || funcName?.includes('Metadata') || false;
    }
    
    if (ts.isIdentifier(node)) {
      return node.text.toLowerCase().includes('metadata');
    }
    
    return false;
  }

  private getFunctionName(node: ts.CallExpression): string | null {
    if (ts.isIdentifier(node.expression)) {
      return node.expression.text;
    }
    
    if (ts.isPropertyAccessExpression(node.expression)) {
      return node.expression.name.text;
    }
    
    return null;
  }

  private getParameterType(node: ts.Expression): string {
    if (ts.isStringLiteral(node)) return 'string';
    if (ts.isNumericLiteral(node)) return 'number';
    if (ts.isBooleanLiteral(node)) return 'boolean';
    if (ts.isObjectLiteralExpression(node)) return 'object';
    if (ts.isArrayLiteralExpression(node)) return 'array';
    if (ts.isCallExpression(node)) return 'function call';
    if (ts.isIdentifier(node)) return `identifier(${node.text})`;
    return 'unknown';
  }

  private getParameterDescription(node: ts.Expression, sourceFile: ts.SourceFile): string {
    const type = this.getParameterType(node);
    const text = node.getFullText(sourceFile).trim();
    return `${type}: ${text.length > 30 ? text.substring(0, 30) + '...' : text}`;
  }

  private extractParameterName(paramSignature: string): string {
    const match = paramSignature.match(/^(\w+):/);
    return match ? match[1] : 'unknown';
  }

  private extractParameterType(paramSignature: string): string {
    const match = paramSignature.match(/:\s*(.+)$/);
    return match ? match[1] : 'unknown';
  }
}