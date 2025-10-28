/**
 * Consolidated Validation Type System
 * Cross-cutting utility types optimized for maintainability and type inference
 */

// Comprehensive validation type union - single source of truth
export type ValidationType = 
  // Core validation types
  | 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom' 
  | 'minLength' | 'maxLength' | 'match'
  // Password validation types  
  | 'uppercase' | 'lowercase' | 'numbers' | 'specialChars'
  | 'disallowedChars' | 'noRepeating' | 'commonPassword' | 'strength'
  // Specialized validation types
  | 'phone' | 'numberType' | 'integer' | 'positive' 
  | 'decimalPlaces' | 'step';

// Core validation rule interface - flexible and extensible
export interface ValidationRule<T = any> {
  type: ValidationType;
  value?: T;
  message: string;
  validate?: (value: any, formData?: Record<string, any>) => boolean | Promise<boolean>;
  options?: Record<string, any>;
}

// Enhanced validation error with better debugging context
export interface ValidationErrorDetail {
  field: string;
  message: string;
  type: ValidationType;
  value?: any;
  ruleName?: string;
  timestamp?: Date;
}

// Type alias for backward compatibility
export type ValidationError = ValidationErrorDetail;

// Comprehensive validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validatedFields: string[];
  skippedFields: string[];
}

// Field-level validation configuration for form libraries
export interface FormFieldValidation {
  rules: ValidationRule[];
  messages?: Record<string, string>;
  async?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

// Form-wide validation rules mapping
export type FormValidationRules = Record<string, ValidationRule[]>;

// Advanced validation context for complex scenarios
export interface ValidationContext {
  formData: Record<string, any>;
  fieldName: string;
  previousValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Type-safe validator factory pattern
export type ValidatorFactory<TOptions = Record<string, any>, TValue = any> = 
  (options?: TOptions) => ValidationRule<TValue>;

// Utility types for better type inference in implementations

// Extract validation types by category for conditional logic
export type BasicValidationType = Extract<ValidationType, 
  'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom' | 'minLength' | 'maxLength' | 'match'>;

export type PasswordValidationType = Extract<ValidationType,
  'uppercase' | 'lowercase' | 'numbers' | 'specialChars' | 'disallowedChars' | 'noRepeating' | 'commonPassword'>;

export type NumberValidationType = Extract<ValidationType,
  'min' | 'max' | 'numberType' | 'integer' | 'positive' | 'decimalPlaces' | 'step'>;

// Conditional validation rule types for specific implementations
export type ConditionalValidationRule<T extends ValidationType> = ValidationRule & {
  type: T;
} & (
  T extends NumberValidationType ? { value?: number } :
  T extends 'pattern' ? { value?: RegExp | string } :
  T extends 'match' ? { value?: string | string[] } :
  {}
);

// Helper type for async validation rules
export type AsyncValidationRule = ValidationRule & {
  validate: (value: any, formData?: Record<string, any>) => Promise<boolean>;
};

// Type guard utilities for runtime type checking
export const isAsyncValidationRule = (rule: ValidationRule): rule is AsyncValidationRule => {
  return rule.validate != null && rule.validate.constructor.name === 'AsyncFunction';
};

export const isPasswordValidationType = (type: ValidationType): type is PasswordValidationType => {
  return ['uppercase', 'lowercase', 'numbers', 'specialChars', 'disallowedChars', 'noRepeating', 'commonPassword'].includes(type);
};

export const isNumberValidationType = (type: ValidationType): type is NumberValidationType => {
  return ['min', 'max', 'numberType', 'integer', 'positive', 'decimalPlaces', 'step'].includes(type);
};












































