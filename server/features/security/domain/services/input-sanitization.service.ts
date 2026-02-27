/**
 * Input Sanitization Domain Service
 * Provides domain-level input sanitization logic
 */
export class InputSanitizationService {
  /**
   * Sanitize string inputs to prevent injection attacks
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, '');
    
    // Remove or escape potentially dangerous SQL keywords in user input
    // Note: This is defense in depth - parameterized queries are the primary protection
    const dangerousPatterns = [
      /--/g,           // SQL comments
      /\/\*/g,         // Block comment start
      /\*\//g,         // Block comment end
      /;[\s]*$/g,      // Trailing semicolons
    ];

    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize HTML output to prevent XSS
   */
  sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Basic HTML entity encoding for common XSS vectors
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Create a safe LIKE pattern for search queries
   */
  createSafeLikePattern(searchTerm: string): string {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return '%';
    }

    // Escape special LIKE characters
    const escaped = searchTerm
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape percent signs
      .replace(/_/g, '\\_');   // Escape underscores

    return `%${escaped}%`;
  }

  /**
   * Check if a field contains sensitive information
   */
  isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'secret',
      'key',
      'salt',
      'refreshToken',
      'refresh_token',
      'accessToken',
      'access_token',
      'sessionId',
      'session_id'
    ];

    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }
}

export const inputSanitizationService = new InputSanitizationService();
