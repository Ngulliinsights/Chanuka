/**
 * Error Message Format Corrector
 * 
 * Standardizes error message formats for API response functions
 * to ensure consistency across the Chanuka project.
 */

import * as ts from 'typescript';

export interface ErrorMessageFormat {
  isValid: boolean;
  correctedMessage: string;
  issues: string[];
  suggestions: string[];
}

export class ErrorMessageFormatter {
  private readonly STANDARD_ERROR_CODES = {
    // Client errors (4xx)
    'VALIDATION_ERROR': { statusCode: 400, category: 'validation' },
    'UNAUTHORIZED': { statusCode: 401, category: 'auth' },
    'FORBIDDEN': { statusCode: 403, category: 'auth' },
    'NOT_FOUND': { statusCode: 404, category: 'resource' },
    'CONFLICT': { statusCode: 409, category: 'resource' },
    'TOO_MANY_REQUESTS': { statusCode: 429, category: 'rate_limit' },
    
    // Server errors (5xx)
    'INTERNAL_ERROR': { statusCode: 500, category: 'server' },
    'DATABASE_ERROR': { statusCode: 500, category: 'server' },
    'SERVICE_UNAVAILABLE': { statusCode: 503, category: 'server' }
  };

  private readonly MESSAGE_PATTERNS = {
    validation: {
      field_required: (field: string) => `${field} is required`,
      field_invalid: (field: string) => `Invalid ${field} format`,
      field_too_long: (field: string, max: number) => `${field} must be ${max} characters or less`,
      field_too_short: (field: string, min: number) => `${field} must be at least ${min} characters`,
      field_not_unique: (field: string) => `${field} already exists`
    },
    auth: {
      unauthorized: 'Authentication required',
      forbidden: 'Insufficient permissions',
      invalid_token: 'Invalid or expired authentication token',
      session_expired: 'Session has expired'
    },
    resource: {
      not_found: (resource: string) => `${resource} not found`,
      already_exists: (resource: string) => `${resource} already exists`,
      cannot_delete: (resource: string) => `Cannot delete ${resource}`,
      cannot_update: (resource: string) => `Cannot update ${resource}`
    },
    server: {
      internal: 'Internal server error',
      database: 'Database operation failed',
      service_unavailable: 'Service temporarily unavailable',
      timeout: 'Request timeout'
    }
  };

  /**
   * Formats error message for ApiError calls
   */
  formatApiErrorMessage(message: string, code?: string): ErrorMessageFormat {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let correctedMessage = message;
    let isValid = true;

    // Check if message is too generic
    if (this.isTooGeneric(message)) {
      issues.push('Error message is too generic');
      suggestions.push('Provide more specific error details');
      isValid = false;
    }

    // Check if message follows proper capitalization
    if (!this.hasProperCapitalization(message)) {
      correctedMessage = this.fixCapitalization(message);
      issues.push('Improper capitalization');
      suggestions.push('Use sentence case for error messages');
      isValid = false;
    }

    // Check if message ends with period (should not for API errors)
    if (message.endsWith('.')) {
      correctedMessage = correctedMessage.slice(0, -1);
      issues.push('Error message should not end with period');
      suggestions.push('Remove trailing period from error messages');
      isValid = false;
    }

    // Suggest standard message if code is provided
    if (code && this.STANDARD_ERROR_CODES[code as keyof typeof this.STANDARD_ERROR_CODES]) {
      const standardMessage = this.getStandardMessage(code, message);
      if (standardMessage && standardMessage !== message) {
        suggestions.push(`Consider using standard message: "${standardMessage}"`);
      }
    }

    return {
      isValid,
      correctedMessage,
      issues,
      suggestions
    };
  }

  /**
   * Formats validation error messages
   */
  formatValidationErrorMessage(errors: any): ErrorMessageFormat {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;
    let correctedMessage = '';

    if (typeof errors === 'string') {
      // Convert string to proper validation error format
      correctedMessage = errors;
      issues.push('Validation error should be an object or array');
      suggestions.push('Use { field: "fieldName", message: "error message" } format');
      isValid = false;
    } else if (Array.isArray(errors)) {
      // Validate array format
      const validationResult = this.validateErrorArray(errors);
      isValid = validationResult.isValid;
      issues.push(...validationResult.issues);
      suggestions.push(...validationResult.suggestions);
      correctedMessage = JSON.stringify(errors);
    } else if (typeof errors === 'object' && errors !== null) {
      // Validate single error object
      const validationResult = this.validateErrorObject(errors);
      isValid = validationResult.isValid;
      issues.push(...validationResult.issues);
      suggestions.push(...validationResult.suggestions);
      correctedMessage = JSON.stringify(errors);
    }

    return {
      isValid,
      correctedMessage,
      issues,
      suggestions
    };
  }

  /**
   * Formats error object for ApiError calls
   */
  formatErrorObject(errorObj: any): ErrorMessageFormat {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;
    let correctedMessage = '';

    if (typeof errorObj === 'string') {
      // Convert string to proper error object
      const code = this.inferErrorCode(errorObj);
      const formattedMessage = this.formatApiErrorMessage(errorObj);
      
      correctedMessage = JSON.stringify({
        code,
        message: formattedMessage.correctedMessage,
        ...(formattedMessage.issues.length > 0 && { details: {} })
      });
      
      issues.push('Error should be an object with code and message');
      suggestions.push('Use { code: "ERROR_CODE", message: "error message" } format');
      isValid = false;
    } else if (typeof errorObj === 'object' && errorObj !== null) {
      const validation = this.validateErrorObjectStructure(errorObj);
      isValid = validation.isValid;
      issues.push(...validation.issues);
      suggestions.push(...validation.suggestions);
      correctedMessage = JSON.stringify(validation.correctedObject);
    }

    return {
      isValid,
      correctedMessage,
      issues,
      suggestions
    };
  }

  private isTooGeneric(message: string): boolean {
    const genericMessages = [
      'error',
      'something went wrong',
      'an error occurred',
      'failed',
      'invalid',
      'bad request'
    ];
    
    return genericMessages.some(generic => 
      message.toLowerCase().trim() === generic
    );
  }

  private hasProperCapitalization(message: string): boolean {
    // Should start with capital letter and not be all caps
    return /^[A-Z][^A-Z]*/.test(message) && message !== message.toUpperCase();
  }

  private fixCapitalization(message: string): string {
    if (message.length === 0) return message;
    
    // Convert to sentence case
    return message.charAt(0).toUpperCase() + message.slice(1).toLowerCase();
  }

  private getStandardMessage(code: string, currentMessage: string): string | null {
    const errorInfo = this.STANDARD_ERROR_CODES[code as keyof typeof this.STANDARD_ERROR_CODES];
    if (!errorInfo) return null;

    const category = errorInfo.category;
    const patterns = this.MESSAGE_PATTERNS[category as keyof typeof this.MESSAGE_PATTERNS];
    
    if (!patterns) return null;

    // Try to match current message to a pattern and suggest improvement
    switch (category) {
      case 'auth':
        if (currentMessage.toLowerCase().includes('unauthorized')) {
          return (patterns as any).unauthorized;
        }
        if (currentMessage.toLowerCase().includes('forbidden')) {
          return (patterns as any).forbidden;
        }
        break;
      case 'server':
        if (currentMessage.toLowerCase().includes('internal')) {
          return (patterns as any).internal;
        }
        if (currentMessage.toLowerCase().includes('database')) {
          return (patterns as any).database;
        }
        break;
    }

    return null;
  }

  private inferErrorCode(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('auth')) {
      return 'UNAUTHORIZED';
    }
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
      return 'FORBIDDEN';
    }
    if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
      return 'NOT_FOUND';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('db')) {
      return 'DATABASE_ERROR';
    }
    
    return 'INTERNAL_ERROR';
  }

  private validateErrorArray(errors: any[]): { isValid: boolean, issues: string[], suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;

    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      const validation = this.validateErrorObject(error);
      
      if (!validation.isValid) {
        issues.push(`Error at index ${i}: ${validation.issues.join(', ')}`);
        suggestions.push(...validation.suggestions.map(s => `Index ${i}: ${s}`));
        isValid = false;
      }
    }

    return { isValid, issues, suggestions };
  }

  private validateErrorObject(error: any): { isValid: boolean, issues: string[], suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;

    if (!error.field) {
      issues.push('Missing field property');
      suggestions.push('Add field property to identify which field has the error');
      isValid = false;
    }

    if (!error.message) {
      issues.push('Missing message property');
      suggestions.push('Add message property with error description');
      isValid = false;
    } else {
      const messageValidation = this.formatApiErrorMessage(error.message);
      if (!messageValidation.isValid) {
        issues.push(...messageValidation.issues);
        suggestions.push(...messageValidation.suggestions);
        isValid = false;
      }
    }

    return { isValid, issues, suggestions };
  }

  private validateErrorObjectStructure(errorObj: any): { 
    isValid: boolean, 
    issues: string[], 
    suggestions: string[], 
    correctedObject: any 
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;
    const correctedObject = { ...errorObj };

    if (!errorObj.code) {
      issues.push('Missing code property');
      suggestions.push('Add code property to categorize the error');
      correctedObject.code = this.inferErrorCode(errorObj.message || 'INTERNAL_ERROR');
      isValid = false;
    }

    if (!errorObj.message) {
      issues.push('Missing message property');
      suggestions.push('Add message property with error description');
      correctedObject.message = 'An error occurred';
      isValid = false;
    } else {
      const messageValidation = this.formatApiErrorMessage(errorObj.message, errorObj.code);
      if (!messageValidation.isValid) {
        issues.push(...messageValidation.issues);
        suggestions.push(...messageValidation.suggestions);
        correctedObject.message = messageValidation.correctedMessage;
        isValid = false;
      }
    }

    return { isValid, issues, suggestions, correctedObject };
  }
}