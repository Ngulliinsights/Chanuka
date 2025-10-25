/**
 * Legacy Validation Service Adapter
 * 
 * Provides backward compatibility for the old ValidationService interface
 * while using the new core validation system underneath
 */

import { z } from 'zod';
import { validationService as coreValidationService } from '../validation-service';
import { ValidationError } from '../types';
import { logger } from '../../observability/logging';

export interface LegacyValidationRule {
  type: 'required' | 'email' | 'phone' | 'url' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean | string;
}

export interface LegacyValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
}

export interface LegacyValidationSchema {
  [field: string]: LegacyValidationRule[];
}

/**
 * Legacy ValidationService implementation that wraps the new core validation system
 */
export class LegacyValidationService {
  private static instance: LegacyValidationService;

  static getInstance(): LegacyValidationService {
    if (!LegacyValidationService.instance) {
      LegacyValidationService.instance = new LegacyValidationService();
    }
    return LegacyValidationService.instance;
  }

  /**
   * Validate data against schema
   */
  validate(data: Record<string, any>, schema: LegacyValidationSchema): LegacyValidationResult {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, any> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      let sanitizedValue = value;

      for (const rule of rules) {
        const validationResult = this.validateField(field, value, rule);
        
        if (validationResult.error) {
          errors[field] = validationResult.error;
          break; // Stop at first error for this field
        }
        
        if (validationResult.sanitizedValue !== undefined) {
          sanitizedValue = validationResult.sanitizedValue;
        }
      }

      // Only include sanitized value if no errors
      if (!errors[field]) {
        sanitizedData[field] = sanitizedValue;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Validate individual field
   */
  private validateField(
    field: string, 
    value: any, 
    rule: LegacyValidationRule
  ): { error?: string; sanitizedValue?: any } {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return { error: rule.message || `${field} is required` };
        }
        break;

      case 'email':
        if (value && !this.isValidEmail(value)) {
          return { error: rule.message || `${field} must be a valid email address` };
        }
        return { sanitizedValue: value ? value.toLowerCase().trim() : value };

      case 'phone':
        if (value && !this.isValidPhone(value)) {
          return { error: rule.message || `${field} must be a valid phone number` };
        }
        return { sanitizedValue: value ? this.sanitizePhone(value) : value };

      case 'url':
        if (value && !this.isValidUrl(value)) {
          return { error: rule.message || `${field} must be a valid URL` };
        }
        break;

      case 'min':
        if (typeof value === 'string' && value.length < rule.value) {
          return { error: rule.message || `${field} must be at least ${rule.value} characters` };
        }
        if (typeof value === 'number' && value < rule.value) {
          return { error: rule.message || `${field} must be at least ${rule.value}` };
        }
        break;

      case 'max':
        if (typeof value === 'string' && value.length > rule.value) {
          return { error: rule.message || `${field} must be no more than ${rule.value} characters` };
        }
        if (typeof value === 'number' && value > rule.value) {
          return { error: rule.message || `${field} must be no more than ${rule.value}` };
        }
        break;

      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          return { error: rule.message || `${field} format is invalid` };
        }
        break;

      case 'custom':
        if (rule.validator) {
          const result = rule.validator(value);
          if (result !== true) {
            return { error: typeof result === 'string' ? result : rule.message || `${field} is invalid` };
          }
        }
        break;
    }

    return {};
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHtml(html: string): string {
    // Use core validation service if available (method doesn't exist yet)
    // if (coreValidationService && typeof coreValidationService.sanitizeHtml === 'function') {
    //   return coreValidationService.sanitizeHtml(html);
    // }

    // Fallback implementation
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  sanitizeSql(input: string): string {
    // Basic SQL sanitization - escape single quotes
    return input.replace(/'/g, "''");
  }

  /**
   * Validate and sanitize user input
   */
  sanitizeUserInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Sanitize phone number
   */
  private sanitizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Common validation schemas
   */
  static schemas = {
    user: {
      email: [
        { type: 'required' as const },
        { type: 'email' as const }
      ],
      password: [
        { type: 'required' as const },
        { type: 'min' as const, value: 8, message: 'Password must be at least 8 characters' },
        { 
          type: 'pattern' as const, 
          value: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
          message: 'Password must contain uppercase, lowercase, number, and special character'
        }
      ],
      firstName: [
        { type: 'required' as const },
        { type: 'min' as const, value: 2 },
        { type: 'max' as const, value: 50 }
      ],
      lastName: [
        { type: 'required' as const },
        { type: 'min' as const, value: 2 },
        { type: 'max' as const, value: 50 }
      ],
      phone: [
        { type: 'phone' as const }
      ]
    },
    property: {
      title: [
        { type: 'required' as const },
        { type: 'min' as const, value: 5 },
        { type: 'max' as const, value: 100 }
      ],
      description: [
        { type: 'required' as const },
        { type: 'min' as const, value: 20 },
        { type: 'max' as const, value: 2000 }
      ],
      price: [
        { type: 'required' as const },
        { type: 'min' as const, value: 0 }
      ],
      address: [
        { type: 'required' as const },
        { type: 'min' as const, value: 10 },
        { type: 'max' as const, value: 200 }
      ]
    },
    contact: {
      name: [
        { type: 'required' as const },
        { type: 'min' as const, value: 2 },
        { type: 'max' as const, value: 100 }
      ],
      email: [
        { type: 'required' as const },
        { type: 'email' as const }
      ],
      message: [
        { type: 'required' as const },
        { type: 'min' as const, value: 10 },
        { type: 'max' as const, value: 1000 }
      ]
    }
  };
}

// Export singleton instance for backward compatibility
export const validationService = LegacyValidationService.getInstance();
export default validationService;











































