/**
 * Password Validation Utility
 * 
 * Validates password strength and provides feedback.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  strength?: 'weak' | 'medium' | 'strong';
  score?: number;
  errors?: string[];
  suggestions?: string[];
}

export interface PasswordRequirements {
  minLength?: number;
  requireLowercase?: boolean;
  requireUppercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLength?: number;
}

const DEFAULT_REQUIREMENTS: Required<PasswordRequirements> = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

/**
 * Validate password strength
 * 
 * @param password - The password to validate
 * @param requirements - Custom password requirements (optional)
 * @returns Validation result with strength score and feedback
 * 
 * @example
 * ```typescript
 * const result = validatePassword('MyP@ssw0rd');
 * if (result.isValid) {
 *   console.log('Password strength:', result.strength);
 * } else {
 *   console.error('Errors:', result.errors);
 * }
 * ```
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = {}
): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { 
      isValid: false, 
      errors: ['Password is required'],
      score: 0,
      strength: 'weak',
    };
  }

  const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length check
  if (password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters`);
    suggestions.push(`Add ${reqs.minLength - password.length} more characters`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1; // Bonus for longer passwords
  }

  if (password.length > reqs.maxLength) {
    errors.push(`Password must not exceed ${reqs.maxLength} characters`);
  }

  // Lowercase check
  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
    suggestions.push('Add a lowercase letter (a-z)');
  } else if (reqs.requireLowercase) {
    score += 1;
  }

  // Uppercase check
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  } else if (reqs.requireUppercase) {
    score += 1;
  }

  // Number check
  if (reqs.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  } else if (reqs.requireNumbers) {
    score += 1;
  }

  // Special character check
  if (reqs.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add a special character (!@#$%^&*...)');
  } else if (reqs.requireSpecialChars) {
    score += 1;
  }

  // Additional strength checks
  if (password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) {
    score += 1; // Bonus for meeting all criteria with good length
  }

  // Check for common patterns (weak passwords)
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /^111111/,
    /^letmein/i,
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password is too common');
    suggestions.push('Avoid common passwords like "password123"');
    score = Math.max(0, score - 2);
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Avoid repeating characters (e.g., "aaa")');
    score = Math.max(0, score - 1);
  }

  // Determine strength
  // const maxScore = 7; // Reserved for future use
  const strength: 'weak' | 'medium' | 'strong' = 
    score >= 5 ? 'strong' : 
    score >= 3 ? 'medium' : 
    'weak';

  return {
    isValid: errors.length === 0,
    strength,
    score,
    errors: errors.length > 0 ? errors : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Check if password has been compromised (basic check)
 * 
 * Note: For production, integrate with Have I Been Pwned API
 * 
 * @param password - The password to check
 * @returns True if password appears to be compromised
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'monkey',
    '1234567',
    'letmein',
    'trustno1',
    'dragon',
    'baseball',
    'iloveyou',
    'master',
    'sunshine',
    'ashley',
    'bailey',
    'passw0rd',
    'shadow',
    '123123',
    '654321',
  ];

  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Generate password strength meter data
 * 
 * @param password - The password to analyze
 * @returns Strength meter data for UI display
 */
export function getPasswordStrengthMeter(password: string): {
  percentage: number;
  color: 'red' | 'orange' | 'yellow' | 'green';
  label: string;
} {
  const result = validatePassword(password);
  const percentage = ((result.score || 0) / 7) * 100;

  let color: 'red' | 'orange' | 'yellow' | 'green';
  let label: string;

  if (percentage < 30) {
    color = 'red';
    label = 'Weak';
  } else if (percentage < 60) {
    color = 'orange';
    label = 'Fair';
  } else if (percentage < 80) {
    color = 'yellow';
    label = 'Good';
  } else {
    color = 'green';
    label = 'Strong';
  }

  return { percentage, color, label };
}
