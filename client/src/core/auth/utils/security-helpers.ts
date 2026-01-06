/**
 * Security Helpers for Auth
 */

export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input.trim().replace(/[<>"']/g, '');
}

export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    '1q2w3e4r',
    'master',
    'sunshine',
  ];
  return commonPasswords.includes(password.toLowerCase());
}

export function hasSequentialChars(password: string): boolean {
  // Check for sequences like 'abc' or '123'
  for (let i = 0; i < password.length - 2; i++) {
    const codes = [password.charCodeAt(i), password.charCodeAt(i + 1), password.charCodeAt(i + 2)];
    if (codes[1] === codes[0] + 1 && codes[2] === codes[1] + 1) {
      return true;
    }
  }
  return false;
}

export function hasRepeatedChars(password: string): boolean {
  // Check for repeated characters like 'aaa' or '111'
  return /(.)\1{2,}/.test(password);
}
