/**
 * Password Validation Utilities
 * Comprehensive password strength validation and security requirements
 */

import { PasswordRequirements, PasswordValidationResult } from '../types/auth';

// Default password requirements based on security best practices
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  min_length: 12,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_special_chars: true,
  max_age_days: 90,
  prevent_reuse_count: 12,
};

// Common weak passwords and patterns to reject
const COMMON_WEAK_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'chanuka', 'civic', 'government', 'politics', 'democracy'
];

const WEAK_PATTERNS = [
  /^(.)\1+$/, // All same character
  /^(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/, // Sequential numbers
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential letters
  /^(qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)/i, // Keyboard patterns
];

/**
 * Validates password against security requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
  userInfo?: { email?: string; name?: string; username?: string }
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < requirements.min_length) {
    errors.push(`Password must be at least ${requirements.min_length} characters long`);
  } else {
    score += Math.min(password.length * 2, 20); // Up to 20 points for length
  }

  // Character requirements
  if (requirements.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 5;
  }

  if (requirements.require_lowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 5;
  }

  if (requirements.require_numbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 5;
  }

  if (requirements.require_special_chars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 10;
  }

  // Check for common weak passwords
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common and easily guessed');
    score = Math.max(0, score - 20);
  }

  // Check for weak patterns
  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(password)) {
      errors.push('Password contains predictable patterns');
      score = Math.max(0, score - 15);
      break;
    }
  }

  // Check for personal information
  if (userInfo) {
    const personalInfo = [
      userInfo.email?.split('@')[0],
      userInfo.name,
      userInfo.username,
    ].filter(Boolean);

    for (const info of personalInfo) {
      if (info && password.toLowerCase().includes(info.toLowerCase())) {
        errors.push('Password should not contain personal information');
        score = Math.max(0, score - 10);
        break;
      }
    }
  }

  // Bonus points for complexity
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 20); // Up to 20 points for character diversity

  // Bonus for mixed case and numbers together
  if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) {
    score += 10;
  }

  // Bonus for length beyond minimum
  if (password.length > requirements.min_length) {
    score += (password.length - requirements.min_length) * 3;
  }

  // Determine strength based on score and errors
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (errors.length > 0 || score < 30) {
    strength = 'weak';
  } else if (score < 50) {
    strength = 'fair';
  } else if (score < 70) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score),
  };
}

/**
 * Generates a secure password suggestion
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one character from each required set
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Checks if password has been compromised in known breaches
 * This would typically call an API like HaveIBeenPwned
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
  try {
    // In a real implementation, you would hash the password and check against
    // a service like HaveIBeenPwned API using k-anonymity
    // For now, we'll simulate this check
    
    // Hash the password (SHA-1 for HaveIBeenPwned compatibility)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // In production, you would:
    // 1. Take first 5 characters of hash
    // 2. Send to HaveIBeenPwned API
    // 3. Check if full hash appears in response
    
    // For demo purposes, return false (not breached)
    return false;
  } catch (error) {
    console.warn('Password breach check failed:', error);
    return false; // Fail open for user experience
  }
}

/**
 * Estimates time to crack password using brute force
 */
export function estimateCrackTime(password: string): string {
  const charsetSize = getCharsetSize(password);
  const combinations = Math.pow(charsetSize, password.length);
  
  // Assume 1 billion guesses per second (modern GPU)
  const guessesPerSecond = 1e9;
  const secondsToCrack = combinations / (2 * guessesPerSecond); // Average case
  
  if (secondsToCrack < 60) {
    return 'Less than 1 minute';
  } else if (secondsToCrack < 3600) {
    return `${Math.ceil(secondsToCrack / 60)} minutes`;
  } else if (secondsToCrack < 86400) {
    return `${Math.ceil(secondsToCrack / 3600)} hours`;
  } else if (secondsToCrack < 31536000) {
    return `${Math.ceil(secondsToCrack / 86400)} days`;
  } else if (secondsToCrack < 31536000000) {
    return `${Math.ceil(secondsToCrack / 31536000)} years`;
  } else {
    return 'Centuries';
  }
}

function getCharsetSize(password: string): number {
  let size = 0;
  
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/\d/.test(password)) size += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) size += 32;
  
  return size;
}

/**
 * Password strength indicator colors and messages
 */
export const PASSWORD_STRENGTH_CONFIG = {
  weak: {
    color: '#ef4444',
    bgColor: '#fef2f2',
    message: 'Weak - easily guessed',
    progress: 25,
  },
  fair: {
    color: '#f59e0b',
    bgColor: '#fffbeb',
    message: 'Fair - could be stronger',
    progress: 50,
  },
  good: {
    color: '#10b981',
    bgColor: '#f0fdf4',
    message: 'Good - reasonably secure',
    progress: 75,
  },
  strong: {
    color: '#059669',
    bgColor: '#ecfdf5',
    message: 'Strong - very secure',
    progress: 100,
  },
};