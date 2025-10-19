/**
 * Enhanced Form Validation Utilities - Optimized Version
 */

import { ValidationRule } from './base-form-testing';
import { ValidationType } from '../../types/validation-types';
import { StringUtils } from '../../utils/string-utils';
import { NumberUtils } from '../../utils/number-utils';
import { RegexPatterns } from '../../utils/regex-patterns';
import { TypeGuards } from '../../utils/type-guards';
import { Logger } from '../../logging';
import { logger } from '../../observability/logging';

export interface ValidationError {
  field: string;
  message: string;
  type: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationContext {
  formData?: Record<string, any>;
  fieldName?: string;
  metadata?: Record<string, any>;
}

export class FormValidationHelpers {
  private static readonly regexCache = new Map<string, RegExp>();
  private static readonly logger = new Logger({ name: 'FormValidationHelpers' });

  /**
   * Enhanced email validation with comprehensive domain support
   * Optimized for performance and internationalization
   */
  static emailValidation(options: {
    allowSubdomains?: boolean;
    allowInternational?: boolean;
    customDomains?: string[];
    strictMode?: boolean;
    maxLength?: number;
  } = {}): ValidationRule {
    const {
      allowSubdomains = true,
      allowInternational = true,
      customDomains = [],
      strictMode = false,
      maxLength = 254 // RFC 5321 limit
    } = options;

    return {
      type: 'email',
      validate: (value: string): boolean => {
        // Early validation using type guards
        if (!TypeGuards.isNonEmptyString(value)) return false;
        if (value.length > maxLength) return false;
        
        // Use string utilities for sanitization
        const normalizedValue = StringUtils.normalize(value);
        if (StringUtils.hasConsecutiveChars(normalizedValue, '.')) return false;
        if (StringUtils.startsOrEndsWith(normalizedValue, '.')) return false;

        const emailParts = normalizedValue.split('@');
        if (emailParts.length !== 2) return false;
        
        const [localPart, domainPart] = emailParts;
        
        // Local part validation using utilities
        if (!localPart || localPart.length > 64) return false;
        if (strictMode && !RegexPatterns.EMAIL_LOCAL_STRICT.test(localPart)) return false;
        
        // Domain part validation
        if (!domainPart || domainPart.length > 253) return false;
        
        // Custom domains check (most restrictive)
        if (customDomains.length > 0) {
          return customDomains.includes(domainPart.toLowerCase());
        }
        
        // Subdomain validation using string utilities
        if (!allowSubdomains && StringUtils.countOccurrences(domainPart, '.') > 1) {
          return false;
        }
        
        // TLD validation using cached patterns
        const tldPattern = allowInternational 
          ? RegexPatterns.EMAIL_DOMAIN_INTERNATIONAL
          : RegexPatterns.EMAIL_DOMAIN_BASIC;
        
        const cacheKey = `email_tld_${allowInternational}`;
        let regex = this.regexCache.get(cacheKey);
        if (!regex) {
          regex = tldPattern;
          this.regexCache.set(cacheKey, regex);
        }
        return regex.test(domainPart);
      },
      message: customDomains.length > 0 
        ? `Email must be from allowed domains: ${StringUtils.joinWithOxfordComma(customDomains)}`
        : 'Please enter a valid email address'
    };
  }

  /**
   * Comprehensive password validation with strength analysis
   */
  static passwordValidation(options: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    disallowedChars?: string[];
    disallowCommonPasswords?: boolean;
    allowRepeatingChars?: boolean;
    strengthAnalysis?: boolean;
  } = {}): ValidationRule[] {
    const {
      minLength = 8,
      maxLength = 128,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      disallowedChars = [],
      disallowCommonPasswords = true,
      allowRepeatingChars = false,
      strengthAnalysis = false
    } = options;

    const rules: ValidationRule[] = [];

    // Length validation
    rules.push(
      this.createLengthRule('minLength', minLength, `Password must be at least ${minLength} characters long`),
      this.createLengthRule('maxLength', maxLength, `Password cannot exceed ${maxLength} characters`)
    );

    // Character type requirements using cached patterns
    if (requireUppercase) {
      rules.push(this.createPatternRule('uppercase', RegexPatterns.UPPERCASE, 
        'Password must contain at least one uppercase letter (A-Z)'));
    }

    if (requireLowercase) {
      rules.push(this.createPatternRule('lowercase', RegexPatterns.LOWERCASE,
        'Password must contain at least one lowercase letter (a-z)'));
    }

    if (requireNumbers) {
      rules.push(this.createPatternRule('numbers', RegexPatterns.DIGITS,
        'Password must contain at least one number (0-9)'));
    }

    if (requireSpecialChars) {
      rules.push(this.createPatternRule('specialChars', RegexPatterns.SPECIAL_CHARS,
        'Password must contain at least one special character (!@#$%^&* etc.)'));
    }

    // Advanced security checks
    if (disallowedChars.length > 0) {
      rules.push({
        type: 'disallowedChars',
        validate: (value: string) => !StringUtils.containsAnyChar(value, disallowedChars),
        message: `Password cannot contain these characters: ${StringUtils.joinWithOxfordComma(disallowedChars)}`
      });
    }

    if (!allowRepeatingChars) {
      rules.push(this.createPatternRule('noRepeating', RegexPatterns.NO_REPEATING_CHARS,
        'Password cannot contain more than 2 consecutive identical characters', true));
    }

    if (disallowCommonPasswords) {
      rules.push({
        type: 'commonPassword',
        validate: (value: string) => !this.isCommonPassword(value),
        message: 'This password is too common. Please choose a more unique password'
      });
    }

    // Optional strength analysis
    if (strengthAnalysis) {
      rules.push({
        type: 'strength',
        validate: (value: string) => this.calculatePasswordStrength(value) >= 3,
        message: 'Password strength is insufficient. Consider adding more character variety.'
      });
    }

    return rules;
  }

  /**
   * Enhanced phone validation with comprehensive international support
   */
  static phoneValidation(options: {
    country?: 'KE' | 'US' | 'UK' | 'CA' | 'AU' | 'INT';
    allowExtensions?: boolean;
    requireCountryCode?: boolean;
    formatOutput?: boolean;
    customPatterns?: Record<string, RegExp>;
  } = {}): ValidationRule {
    const { 
      country = 'KE', 
      allowExtensions = false, 
      requireCountryCode = false,
      customPatterns = {}
    } = options;

    // Enhanced patterns with better coverage
    const patterns = {
      ...RegexPatterns.PHONE_PATTERNS,
      ...customPatterns
    };

    const countryConfig = patterns[country];
    if (!countryConfig) {
      throw new Error(`Unsupported country code: ${country}`);
    }

    return {
      type: 'phone',
      validate: (value: string): boolean => {
        if (!TypeGuards.isNonEmptyString(value)) return false;
        
        // Normalize phone number using string utilities
        let cleanPhone = StringUtils.removeChars(value, /[-.\s()]/g);
        
        // Handle extensions
        if (allowExtensions) {
          cleanPhone = StringUtils.extractBeforePattern(cleanPhone, /(?:x|ext|extension)\d+$/i) || cleanPhone;
        }
        
        // Country code requirement check
        if (requireCountryCode && !cleanPhone.startsWith('+')) {
          return false;
        }
        
        let validationRegex = this.regexCache.get(`phone_${country}`);
        if (!validationRegex) {
          if ('regex' in countryConfig) {
            validationRegex = countryConfig.regex;
          } else {
            validationRegex = countryConfig;
          }
          this.regexCache.set(`phone_${country}`, validationRegex);
        }
        return validationRegex.test(cleanPhone);
      },
      message: 'regex' in countryConfig && countryConfig.description
        ? `Please enter a valid ${countryConfig.description}`
        : 'Please enter a valid phone number'
    };
  }

  /**
   * Enhanced required field validation with comprehensive type handling
   */
  static requiredFieldValidation(fieldName: string, options: {
    allowWhitespace?: boolean;
    customMessage?: string;
    trimValue?: boolean;
    checkArrayLength?: boolean;
    customValidator?: (value: any) => boolean;
  } = {}): ValidationRule {
    const { 
      allowWhitespace = false, 
      customMessage, 
      trimValue = true,
      checkArrayLength = true,
      customValidator
    } = options;

    return {
      type: 'required',
      validate: (value: any): boolean => {
        // Custom validator takes precedence
        if (customValidator) return customValidator(value);
        
        // Type-specific validation using type guards
        if (TypeGuards.isNullOrUndefined(value)) return false;
        
        if (TypeGuards.isString(value)) {
          const processedValue = trimValue ? StringUtils.trim(value) : value;
          return allowWhitespace ? processedValue.length > 0 : StringUtils.hasContent(processedValue);
        }
        
        if (TypeGuards.isArray(value)) {
          return checkArrayLength ? value.length > 0 : true;
        }
        
        if (TypeGuards.isObject(value)) {
          return Object.keys(value).length > 0;
        }
        
        if (TypeGuards.isNumber(value)) {
          return NumberUtils.isValidNumber(value);
        }
        
        if (TypeGuards.isBoolean(value)) {
          return true; // false is valid for required boolean fields
        }
        
        return true;
      },
      message: customMessage || `${fieldName} is required`
    };
  }

  /**
   * Enhanced number validation with comprehensive range and format handling
   */
  static numberRangeValidation(options: {
    min?: number;
    max?: number;
    integer?: boolean;
    allowNegative?: boolean;
    decimalPlaces?: number;
    step?: number;
    customValidation?: (num: number) => boolean;
  } = {}): ValidationRule[] {
    const rules: ValidationRule[] = [];
    const { 
      min, 
      max, 
      integer = false, 
      allowNegative = true,
      decimalPlaces,
      step,
      customValidation
    } = options;

    // Type validation
    rules.push({
      type: 'numberType',
      validate: (value: any): boolean => {
        const num = NumberUtils.parseNumber(value);
        return NumberUtils.isValidNumber(num);
      },
      message: 'Value must be a valid number'
    });

    // Range validations using number utilities
    if (NumberUtils.isValidNumber(min)) {
      rules.push({
        type: 'min',
        value: min,
        validate: (value: any): boolean => NumberUtils.isGreaterOrEqual(NumberUtils.parseNumber(value), min!),
        message: `Value must be ${min} or greater`
      });
    }

    if (NumberUtils.isValidNumber(max)) {
      rules.push({
        type: 'max',
        value: max,
        validate: (value: any): boolean => NumberUtils.isLessOrEqual(NumberUtils.parseNumber(value), max!),
        message: `Value must be ${max} or less`
      });
    }

    // Integer validation
    if (integer) {
      rules.push({
        type: 'integer',
        validate: (value: any): boolean => NumberUtils.isInteger(NumberUtils.parseNumber(value)),
        message: 'Value must be a whole number'
      });
    }

    // Negative validation
    if (!allowNegative) {
      rules.push({
        type: 'positive',
        validate: (value: any): boolean => NumberUtils.isPositive(NumberUtils.parseNumber(value)),
        message: 'Value must be positive'
      });
    }

    // Decimal places validation
    if (NumberUtils.isValidNumber(decimalPlaces)) {
      rules.push({
        type: 'decimalPlaces',
        validate: (value: any): boolean => NumberUtils.hasMaxDecimalPlaces(NumberUtils.parseNumber(value), decimalPlaces!),
        message: `Value can have at most ${decimalPlaces} decimal places`
      });
    }

    // Step validation
    if (NumberUtils.isValidNumber(step) && NumberUtils.isValidNumber(min)) {
      rules.push({
        type: 'step',
        validate: (value: any): boolean => NumberUtils.isMultipleOfStep(NumberUtils.parseNumber(value), min!, step!),
        message: `Value must be in increments of ${step}`
      });
    }

    // Custom validation
    if (customValidation) {
      rules.push({
        type: 'custom',
        validate: (value: any): boolean => customValidation(NumberUtils.parseNumber(value)),
        message: 'Value does not meet custom requirements'
      });
    }

    return rules;
  }

  /**
   * Enhanced field matching with flexible comparison options
   */
  static matchFieldValidation(
    fieldToMatch: string | string[], 
    message?: string
  ): ValidationRule {
    return {
      type: 'match',
      value: fieldToMatch,
      validate: (value: any, formData?: Record<string, any>): boolean => {
        if (!formData) return false;
        
        const fieldsToMatch = Array.isArray(fieldToMatch) ? fieldToMatch : [fieldToMatch];
        const stringValue = String(value || '');
        
        return fieldsToMatch.every(field => {
          const otherValue = formData[field];
          return StringUtils.equalsIgnoreCase(stringValue, String(otherValue || ''));
        });
      },
      message: message || `Must match ${StringUtils.joinWithOxfordComma(
        Array.isArray(fieldToMatch) ? fieldToMatch : [fieldToMatch]
      )}`
    };
  }

  /**
   * Comprehensive form validation with error aggregation and context
   */
  static async validateForm(
    formData: Record<string, any>,
    validationRules: Record<string, ValidationRule[]>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    try {
      const validationPromises = Object.entries(validationRules).map(async ([fieldName, rules]) => {
        const fieldValue = formData[fieldName];
        const fieldErrors: ValidationError[] = [];
        
        for (const rule of rules) {
          try {
            let isValid = false;
            
            if (rule.validate) {
              const result = rule.validate(fieldValue, formData);
              isValid = result instanceof Promise ? await result : result;
            } else {
              // Fallback validation using utilities
              isValid = this.performFallbackValidation(rule, fieldValue);
            }
            
            if (!isValid) {
              fieldErrors.push({
                field: fieldName,
                type: rule.type,
                message: rule.message || `${fieldName} validation failed`,
                value: fieldValue
              });
            }
          } catch (err) {
            const error = err as Error;
            fieldErrors.push({
              field: fieldName,
              type: rule.type,
              message: error.message,
              value: fieldValue
            });
          }
        }
        
        return fieldErrors;
      });

      const fieldErrorsArrays = await Promise.all(validationPromises);
      fieldErrorsArrays.forEach(fieldErrors => errors.push(...fieldErrors));
      
    } catch (error) {
      // Handle unexpected validation errors
      const err = error as Error;
      this.logger.error({
        message: 'Form validation error',
        error: err.message,
        stack: err.stack
      });
      errors.push({
        field: 'form',
        type: 'system',
        message: 'An unexpected validation error occurred',
        value: formData
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper methods for rule creation
  private static createLengthRule(type: 'minLength' | 'maxLength', length: number, message: string): ValidationRule {
    return {
      type,
      value: length,
      validate: (value: string) => StringUtils.hasValidLength(value, type === 'minLength' ? length : 0, type === 'maxLength' ? length : Infinity),
      message
    };
  }

  private static createPatternRule(type: ValidationType, pattern: RegExp, message: string, negate: boolean = false): ValidationRule {
    return {
      type,
      validate: (value: string) => {
        let validationRegex = this.regexCache.get(`${type}_pattern`);
        if (!validationRegex) {
          validationRegex = pattern;
          this.regexCache.set(`${type}_pattern`, validationRegex);
        }
        const result = validationRegex.test(value);
        return negate ? !result : result;
      },
      message
    };
  }

  private static performFallbackValidation(rule: ValidationRule, fieldValue: any): boolean {
    if (rule.type === 'pattern' && rule.value instanceof RegExp) {
      return rule.value.test(String(fieldValue || ''));
    }
    if (rule.type === 'minLength' && TypeGuards.isNumber(rule.value)) {
      return String(fieldValue || '').length >= rule.value;
    }
    if (rule.type === 'maxLength' && TypeGuards.isNumber(rule.value)) {
      return String(fieldValue || '').length <= rule.value;
    }
    return false;
  }

  private static isCommonPassword(password: string): boolean {
    // This would integrate with @/core/security-utils in production
    return RegexPatterns.COMMON_PASSWORDS.test(password.toLowerCase());
  }

  private static calculatePasswordStrength(password: string): number {
    // This would use @/core/security-utils for comprehensive strength analysis
    let strength = 0;
    if (password.length >= 8) strength++;
    if (RegexPatterns.UPPERCASE.test(password)) strength++;
    if (RegexPatterns.LOWERCASE.test(password)) strength++;
    if (RegexPatterns.DIGITS.test(password)) strength++;
    if (RegexPatterns.SPECIAL_CHARS.test(password)) strength++;
    return strength;
  }
}











































