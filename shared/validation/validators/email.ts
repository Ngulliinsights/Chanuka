/**
 * Email Validation Utility
 * 
 * Validates and sanitizes email addresses.
 */

export interface EmailValidationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
}

/**
 * Validate email address format
 * 
 * @param email - The email address to validate
 * @returns Validation result with sanitized email if valid
 * 
 * @example
 * ```typescript
 * const result = validateEmail('user@example.com');
 * if (result.isValid) {
 *   console.log('Valid email:', result.sanitized);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Additional validation: check for common issues
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email too long (max 254 characters)' };
  }

  const [localPart, domain] = trimmed.split('@');
  
  if (localPart && localPart.length > 64) {
    return { isValid: false, error: 'Email local part too long (max 64 characters)' };
  }

  if (domain && domain.length > 253) {
    return { isValid: false, error: 'Email domain too long (max 253 characters)' };
  }

  // Check for consecutive dots
  if (trimmed.includes('..')) {
    return { isValid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Sanitize: lowercase for consistency
  return { isValid: true, sanitized: trimmed.toLowerCase() };
}

/**
 * Check if email is from a disposable email provider
 * 
 * @param email - The email address to check
 * @returns True if the email is from a known disposable provider
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    // Add more as needed
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? disposableDomains.includes(domain) : false;
}
