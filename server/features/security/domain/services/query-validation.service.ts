import { QueryValidationResult } from '../value-objects/query-validation-result';
import { inputSanitizationService } from './input-sanitization.service';

/**
 * Query Validation Domain Service
 * Validates and sanitizes query inputs
 */
export class QueryValidationService {
  /**
   * Validate and sanitize query inputs
   */
  validateInputs(inputs: unknown[]): QueryValidationResult {
    const errors: string[] = [];
    const sanitizedParams: Record<string, unknown> = {};

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const paramKey = `param_${i}`;

      try {
        // Basic type validation and sanitization
        if (input === null || input === undefined) {
          sanitizedParams[paramKey] = null;
          continue;
        }

        if (typeof input === 'string') {
          // Sanitize string inputs
          const sanitized = inputSanitizationService.sanitizeString(input);
          if (sanitized.length > 10000) {
            errors.push(`Parameter ${i}: String too long (max 10000 characters)`);
            continue;
          }
          sanitizedParams[paramKey] = sanitized;
        } else if (typeof input === 'number') {
          // Validate numeric inputs
          if (!Number.isFinite(input)) {
            errors.push(`Parameter ${i}: Invalid number`);
            continue;
          }
          sanitizedParams[paramKey] = input;
        } else if (typeof input === 'boolean') {
          sanitizedParams[paramKey] = input;
        } else if (input instanceof Date) {
          sanitizedParams[paramKey] = input;
        } else if (Array.isArray(input)) {
          // Validate array inputs
          if (input.length > 1000) {
            errors.push(`Parameter ${i}: Array too large (max 1000 items)`);
            continue;
          }
          const sanitizedArray = input.map(item => 
            typeof item === 'string' ? inputSanitizationService.sanitizeString(item) : item
          );
          sanitizedParams[paramKey] = sanitizedArray;
        } else {
          // For objects, stringify and validate
          try {
            const jsonString = JSON.stringify(input);
            if (jsonString.length > 50000) {
              errors.push(`Parameter ${i}: Object too large`);
              continue;
            }
            sanitizedParams[paramKey] = input;
          } catch {
            errors.push(`Parameter ${i}: Invalid object`);
          }
        }
      } catch (error) {
        errors.push(`Parameter ${i}: Validation error - ${error}`);
      }
    }

    return errors.length === 0
      ? QueryValidationResult.valid(sanitizedParams)
      : QueryValidationResult.invalid(errors);
  }

  /**
   * Sanitize output data to prevent data leakage
   */
  sanitizeOutput(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Remove sensitive fields that shouldn't be exposed
        if (inputSanitizationService.isSensitiveField(key)) {
          continue;
        }
        
        sanitized[key] = this.sanitizeOutput(value);
      }
      
      return sanitized;
    }

    if (typeof data === 'string') {
      // Remove any potential XSS vectors from output
      return inputSanitizationService.sanitizeHtml(data);
    }

    return data;
  }
}

export const queryValidationService = new QueryValidationService();
