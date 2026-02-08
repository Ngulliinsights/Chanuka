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
  trackSecurityEvent: (event: string, data?: any) => {
    console.log('Security event:', event, data);
  },
};

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export { securityMonitor as default };

export class CSPManager {
  private static instance: CSPManager;
  
  static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager();
    }
    return CSPManager.instance;
  }
  
  setPolicy(policy: string) {}
  getPolicy() { return ''; }
}

export class DOMSanitizer {
  private static instance: DOMSanitizer;
  
  static getInstance(): DOMSanitizer {
    if (!DOMSanitizer.instance) {
      DOMSanitizer.instance = new DOMSanitizer();
    }
    return DOMSanitizer.instance;
  }
  
  sanitize(html: string) { return html; }
}

export class InputValidator {
  private static instance: InputValidator;
  
  static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }
  
  validate(input: string) { return true; }
}

export class PasswordValidator {
  private static instance: PasswordValidator;
  
  static getInstance(): PasswordValidator {
    if (!PasswordValidator.instance) {
      PasswordValidator.instance = new PasswordValidator();
    }
    return PasswordValidator.instance;
  }
  
  validate(password: string) { return password.length >= 8; }
}
