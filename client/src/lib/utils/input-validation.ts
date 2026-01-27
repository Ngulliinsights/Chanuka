/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive validation and sanitization for form inputs
 * Includes XSS protection and input normalization
 */

import DOMPurify from 'dompurify';

// Validation rules
export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  numeric: /^\d+$/,
  alpha: /^[a-zA-Z\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_.]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  sqlInjection:
    /('(''|[^'])*')|(;)|(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
};

// Sanitization options
export interface SanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeExtraSpaces?: boolean;
}

/**
 * Sanitize input value
 */
export function sanitizeInput(value: string, options: SanitizeOptions = {}): string {
  if (typeof value !== 'string') {
    return '';
  }

  let sanitized = value;

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Convert case
  if (options.lowercase) {
    sanitized = sanitized.toLowerCase();
  } else if (options.uppercase) {
    sanitized = sanitized.toUpperCase();
  }

  // Remove extra spaces
  if (options.removeExtraSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Limit length
  if (options.maxLength && options.maxLength > 0) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Sanitize HTML if not allowed
  if (!options.allowHtml) {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  return sanitized;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const sanitized = sanitizeInput(email, { lowercase: true, trim: true });
  const errors: string[] = [];

  if (!sanitized) {
    errors.push('Email is required');
  } else if (!VALIDATION_PATTERNS.email.test(sanitized)) {
    errors.push('Please enter a valid email address');
  } else if (sanitized.length > 254) {
    errors.push('Email address is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const sanitized = sanitizeInput(phone, { trim: true });
  const errors: string[] = [];

  if (!sanitized) {
    errors.push('Phone number is required');
  } else if (!VALIDATION_PATTERNS.phone.test(sanitized)) {
    errors.push('Please enter a valid phone number');
  } else if (sanitized.replace(/\D/g, '').length < 10) {
    errors.push('Phone number must be at least 10 digits');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  const sanitized = sanitizeInput(url, { trim: true });
  const errors: string[] = [];

  if (!sanitized) {
    errors.push('URL is required');
  } else if (!VALIDATION_PATTERNS.url.test(sanitized)) {
    errors.push('Please enter a valid URL');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Validate text input with custom rules
 */
export function validateText(
  value: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    allowHtml?: boolean;
  } = {}
): ValidationResult {
  const sanitized = sanitizeInput(value, {
    allowHtml: options.allowHtml,
    maxLength: options.maxLength,
  });
  const errors: string[] = [];

  if (options.required && !sanitized) {
    errors.push('This field is required');
  }

  if (sanitized) {
    if (options.minLength && sanitized.length < options.minLength) {
      errors.push(`Must be at least ${options.minLength} characters long`);
    }
    if (options.maxLength && sanitized.length > options.maxLength) {
      errors.push(`Must be no more than ${options.maxLength} characters long`);
    }
    if (options.pattern && !options.pattern.test(sanitized)) {
      errors.push(options.patternMessage || 'Invalid format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

/**
 * Check for potential security threats
 */
export function validateSecurity(value: string): ValidationResult {
  const errors: string[] = [];

  if (VALIDATION_PATTERNS.sqlInjection.test(value)) {
    errors.push('Input contains potentially harmful SQL patterns');
  }

  if (VALIDATION_PATTERNS.xss.test(value)) {
    errors.push('Input contains potentially harmful script content');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Combined validation function
 */
export function validateInput(
  value: string,
  rules: ValidationRule[],
  sanitizeOptions?: SanitizeOptions
): ValidationResult {
  const sanitized = sanitizeOptions ? sanitizeInput(value, sanitizeOptions) : value;
  const errors: string[] = [];

  // Security check first
  const securityResult = validateSecurity(sanitized);
  if (!securityResult.isValid) {
    errors.push(...securityResult.errors);
  }

  // Apply custom rules
  for (const rule of rules) {
    if (!rule.test(sanitized)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
}

// Predefined validation rules
export const COMMON_VALIDATION_RULES = {
  required: {
    test: (value: string) => value.trim().length > 0,
    message: 'This field is required',
  },
  noSpecialChars: {
    test: (value: string) => VALIDATION_PATTERNS.noSpecialChars.test(value),
    message: 'Special characters are not allowed',
  },
  alphanumeric: {
    test: (value: string) => VALIDATION_PATTERNS.alphanumeric.test(value),
    message: 'Only letters and numbers are allowed',
  },
  numeric: {
    test: (value: string) => VALIDATION_PATTERNS.numeric.test(value),
    message: 'Only numbers are allowed',
  },
};
