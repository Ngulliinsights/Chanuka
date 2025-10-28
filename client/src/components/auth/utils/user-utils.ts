/**
 * User-related utility functions for auth components
 */

import { AuthConfig } from '../types';

export function formatDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  
  if (!first && !last) return 'Anonymous User';
  if (!first) return last;
  if (!last) return first;
  
  return `${first} ${last}`;
}

export function generateUserInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  
  if (!first && !last) return 'AU';
  if (!first) return last + last;
  if (!last) return first + first;
  
  return first + last;
}

export function createUserSlug(firstName: string, lastName: string): string {
  const name = formatDisplayName(firstName, lastName)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
    
  return name || 'user';
}

export function sanitizeUserInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

export function validateEmailDomain(email: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return allowedDomains.some(allowed => 
    domain === allowed.toLowerCase() || domain.endsWith(`.${allowed.toLowerCase()}`)
  );
}

export function isValidPhoneNumber(phone: string): boolean {
  // Basic phone number validation (US format)
  const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if can't format
}

export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function checkPasswordStrength(password: string, config?: AuthConfig): {
  score: number;
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
  isAcceptable: boolean;
} {
  let score = 0;
  const feedback: string[] = [];
  const minLength = config?.security?.passwordMinLength || 8;
  
  // Length scoring
  if (password.length >= minLength) {
    score += 1;
  } else {
    feedback.push(`Use at least ${minLength} characters`);
  }
  
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }
  
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }
  
  if (/[@$!%*?&]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }
  
  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) {
    score += 1;
  } else {
    feedback.push('Avoid repeating characters');
  }
  
  if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    score += 1;
  } else {
    feedback.push('Avoid sequential characters');
  }
  
  // Common password check (basic)
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (!commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score += 1;
  } else {
    feedback.push('Avoid common passwords');
  }
  
  // Determine level
  let level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  if (score <= 2) level = 'very-weak';
  else if (score <= 4) level = 'weak';
  else if (score <= 6) level = 'fair';
  else if (score <= 7) level = 'good';
  else if (score <= 8) level = 'strong';
  else level = 'very-strong';
  
  const isAcceptable = score >= 5; // Minimum acceptable score
  
  return { score, level, feedback, isAcceptable };
}

export function isStrongPassword(password: string, config?: AuthConfig): boolean {
  const result = checkPasswordStrength(password, config);
  return result.isAcceptable && result.score >= 6;
}

export function generateUsername(firstName: string, lastName: string, suffix?: string): string {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
  
  if (suffix) {
    return `${base}${suffix}`;
  }
  
  return base;
}

export function validateUsername(username: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (username.length > 30) {
    errors.push('Username must be less than 30 characters');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores');
  }
  
  if (/^[0-9]/.test(username)) {
    errors.push('Username cannot start with a number');
  }
  
  if (/[-_]{2,}/.test(username)) {
    errors.push('Username cannot contain consecutive hyphens or underscores');
  }
  
  const reservedWords = ['admin', 'root', 'user', 'test', 'api', 'www', 'mail', 'support'];
  if (reservedWords.includes(username.toLowerCase())) {
    errors.push('This username is reserved');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  
  if (!localPart || !domain) return email;
  
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  
  const maskedLocal = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

export function getAvatarUrl(email: string, size: number = 80): string {
  // Simple hash function for consistent avatar generation
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const colors = ['red', 'blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'teal'];
  const colorIndex = Math.abs(hash) % colors.length;
  const color = colors[colorIndex];
  
  // Return a placeholder avatar URL (you can replace with actual service)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&size=${size}&background=${color}&color=fff`;
}

