/**
 * Security Utilities
 * Provides security helper functions
 */

export const securityUtils = {
  sanitizeInput: (input: string) => {
    return input.replace(/[<>]/g, '');
  },
  
  validateToken: (token: string) => {
    return token.length > 0;
  },
  
  hashPassword: (password: string) => {
    // Client-side hashing (for demo purposes)
    return btoa(password);
  },
  
  validatePassword: (password: string) => {
    return password.length >= 8;
  },
};

export const securityMonitor = {
  trackSecurityEvent: (event: string, data?: unknown) => {
    console.log('Security event:', event, data);
  },
};

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export { securityMonitor as default };


