/**
 * Auth validation utilities
 * Extended validation helpers beyond the core validation schemas
 */

import { 
  validateEmail, 
  validatePassword, 
  validateName,
  safeValidateEmail,
  safeValidatePassword 
} from '../validation';
import { AuthValidationError } from '../errors';
import { AUTH_VALIDATION_RULES, AUTH_ERROR_MESSAGES } from '../constants';

/**
 * Password strength checker
 */
export interface PasswordStrength {
  score: number; // 0-4 (weak to very strong)
  feedback: string[];
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= AUTH_VALIDATION_RULES.PASSWORD.STRONG_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    specialChars: /[@$!%*?&]/.test(password)
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  const feedback: string[] = [];

  // Generate feedback
  if (!requirements.length) {
    feedback.push(`Password must be at least ${AUTH_VALIDATION_RULES.PASSWORD.STRONG_MIN_LENGTH} characters long`);
  }
  if (!requirements.uppercase) {
    feedback.push('Add at least one uppercase letter');
  }
  if (!requirements.lowercase) {
    feedback.push('Add at least one lowercase letter');
  }
  if (!requirements.numbers) {
    feedback.push('Add at least one number');
  }
  if (!requirements.specialChars) {
    feedback.push('Add at least one special character (@$!%*?&)');
  }

  // Calculate score
  let score = 0;
  if (requirements.length) score++;
  if (metRequirements >= 2) score++;
  if (metRequirements >= 3) score++;
  if (metRequirements >= 4) score++;
  if (metRequirements === 5 && password.length >= 16) score++;

  const isValid = metRequirements === 5;

  return {
    score: Math.min(score, 4),
    feedback,
    isValid,
    requirements
  };
}

/**
 * Email domain validation
 */
export function validateEmailDomain(email: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true; // No domain restrictions
  }

  try {
    const validEmail = validateEmail(email);
    const domain = validEmail.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      return false;
    }

    return allowedDomains.some(allowedDomain => 
      domain === allowedDomain.toLowerCase() || 
      domain.endsWith(`.${allowedDomain.toLowerCase()}`)
    );
  } catch {
    return false;
  }
}

/**
 * Common password validation
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein', 'welcome',
    'monkey', '1234567890', 'dragon', 'master', 'login'
  ];

  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Sequential character detection
 */
export function hasSequentialChars(password: string, maxSequential: number = 3): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];

  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - maxSequential; i++) {
      const subseq = sequence.substring(i, i + maxSequential);
      const reverseSubseq = subseq.split('').reverse().join('');
      
      if (password.toLowerCase().includes(subseq) || 
          password.toLowerCase().includes(reverseSubseq)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Repeated character detection
 */
export function hasRepeatedChars(password: string, maxRepeated: number = 3): boolean {
  let count = 1;
  let prevChar = '';

  for (const char of password) {
    if (char === prevChar) {
      count++;
      if (count >= maxRepeated) {
        return true;
      }
    } else {
      count = 1;
      prevChar = char;
    }
  }

  return false;
}

/**
 * Comprehensive password validation
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: PasswordStrength;
}

export function validatePasswordComprehensive(
  password: string, 
  strict: boolean = true,
  options: {
    checkCommon?: boolean;
    checkSequential?: boolean;
    checkRepeated?: boolean;
    allowedDomains?: string[];
  } = {}
): PasswordValidationResult {
  const {
    checkCommon = true,
    checkSequential = true,
    checkRepeated = true
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  try {
    validatePassword(password, strict);
  } catch (error) {
    if (error instanceof AuthValidationError) {
      errors.push(error.message);
    }
  }

  // Strength check
  const strength = checkPasswordStrength(password);
  if (strict && !strength.isValid) {
    errors.push(...strength.feedback);
  }

  // Additional checks
  if (checkCommon && isCommonPassword(password)) {
    errors.push('Password is too common. Please choose a more unique password.');
  }

  if (checkSequential && hasSequentialChars(password)) {
    warnings.push('Avoid sequential characters (e.g., abc, 123)');
  }

  if (checkRepeated && hasRepeatedChars(password)) {
    warnings.push('Avoid repeated characters (e.g., aaa, 111)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength
  };
}

/**
 * Form field sanitization
 */
export function sanitizeInput(input: string, type: 'email' | 'name' | 'password' | 'general' = 'general'): string {
  if (!input) return '';

  let sanitized = input;

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Type-specific sanitization
  switch (type) {
    case 'email':
      // Remove spaces and convert to lowercase
      sanitized = sanitized.replace(/\s/g, '').toLowerCase();
      break;
    
    case 'name':
      // Trim and normalize spaces
      sanitized = sanitized.trim().replace(/\s+/g, ' ');
      break;
    
    case 'password':
      // No additional sanitization for passwords to preserve intentional characters
      break;
    
    case 'general':
    default:
      // Basic trimming
      sanitized = sanitized.trim();
      break;
  }

  return sanitized;
}

/**
 * Batch validation for form data
 */
export interface BatchValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  fieldResults: Record<string, any>;
}

export function validateFormBatch(
  formData: Record<string, string>,
  mode: 'login' | 'register',
  options: {
    strict?: boolean;
    allowedDomains?: string[];
  } = {}
): BatchValidationResult {
  const { strict = true, allowedDomains } = options;
  const errors: Record<string, string[]> = {};
  const fieldResults: Record<string, any> = {};

  // Email validation
  if (formData.email) {
    const emailResult = safeValidateEmail(formData.email);
    if (!emailResult.success) {
      errors.email = [emailResult.error?.message || 'Invalid email'];
    } else if (allowedDomains && !validateEmailDomain(formData.email, allowedDomains)) {
      errors.email = ['Email domain not allowed'];
    }
    fieldResults.email = emailResult;
  }

  // Password validation
  if (formData.password) {
    const passwordResult = validatePasswordComprehensive(formData.password, mode === 'register' && strict);
    if (!passwordResult.isValid) {
      errors.password = passwordResult.errors;
    }
    fieldResults.password = passwordResult;
  }

  // Name validation (register mode only)
  if (mode === 'register') {
    if (formData.first_name) {
      try {
        validateName(formData.first_name, 'first_name');
      } catch (error) {
        if (error instanceof AuthValidationError) {
          errors.first_name = [error.message];
        }
      }
    }

    if (formData.last_name) {
      try {
        validateName(formData.last_name, 'last_name');
      } catch (error) {
        if (error instanceof AuthValidationError) {
          errors.last_name = [error.message];
        }
      }
    }

    // Confirm password validation
    if (formData.confirmPassword) {
      if (formData.confirmPassword !== formData.password) {
        errors.confirmPassword = ["Passwords don't match"];
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    fieldResults
  };
}

/**
 * Real-time validation debouncer
 */
export function createDebouncedValidator(
  validationFn: (value: string) => Promise<boolean> | boolean,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (value: string): Promise<boolean> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await validationFn(value);
          resolve(result);
        } catch {
          resolve(false);
        }
      }, delay);
    });
  };
}

/**
 * Validation error formatter
 */
export function formatValidationErrors(
  errors: Record<string, string[]>
): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (fieldErrors.length > 0) {
      formatted[field] = fieldErrors[0] ?? ''; // Take first error for display
    }
  }
  
  return formatted;
}

