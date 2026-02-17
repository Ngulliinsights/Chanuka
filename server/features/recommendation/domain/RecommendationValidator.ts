export interface RecommendationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class RecommendationValidator { private static readonly MAX_USER_ID_LENGTH = 100;
  private static readonly MAX_BILL_ID = 999999999;
  private static readonly MAX_LIMIT = 50;
  private static readonly MAX_DAYS = 365;

  /**
   * Validate parameters for personalized recommendations
   */
  static validatePersonalizedRecommendations(
    user_id: string,
    limit?: number
  ): RecommendationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate user_id
    if (!user_id || typeof user_id !== 'string') {
      errors.push('User ID is required and must be a string');
     } else if (user_id.length > this.MAX_USER_ID_LENGTH) {
      errors.push(`User ID cannot exceed ${this.MAX_USER_ID_LENGTH} characters`);
    } else if (!this.isValidUserId(user_id)) {
      errors.push('Invalid user ID format');
    }

    // Validate limit
    if (limit !== undefined) {
      if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
        errors.push('Limit must be a positive integer');
      } else if (limit > this.MAX_LIMIT) {
        errors.push(`Limit cannot exceed ${this.MAX_LIMIT}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate parameters for similar bills
   */
  static validateSimilarBills(
    bill_id: number,
    limit?: number
  ): RecommendationValidationResult { const errors: string[] = [];
    const warnings: string[] = [];

    // Validate bill_id
    if (bill_id === undefined || bill_id === null) {
      errors.push('Bill ID is required');
     } else if (typeof bill_id !== 'number' || !Number.isInteger(bill_id) || bill_id < 1) {
      errors.push('Bill ID must be a positive integer');
    } else if (bill_id > this.MAX_BILL_ID) {
      errors.push(`Bill ID cannot exceed ${this.MAX_BILL_ID}`);
    }

    // Validate limit
    if (limit !== undefined) {
      if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
        errors.push('Limit must be a positive integer');
      } else if (limit > this.MAX_LIMIT) {
        errors.push(`Limit cannot exceed ${this.MAX_LIMIT}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate parameters for trending bills
   */
  static validateTrendingBills(
    days?: number,
    limit?: number
  ): RecommendationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate days
    if (days !== undefined) {
      if (typeof days !== 'number' || !Number.isInteger(days) || days < 1) {
        errors.push('Days must be a positive integer');
      } else if (days > this.MAX_DAYS) {
        errors.push(`Days cannot exceed ${this.MAX_DAYS}`);
      } else if (days > 90) {
        warnings.push('Large day range may impact performance');
      }
    }

    // Validate limit
    if (limit !== undefined) {
      if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
        errors.push('Limit must be a positive integer');
      } else if (limit > this.MAX_LIMIT) {
        errors.push(`Limit cannot exceed ${this.MAX_LIMIT}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate parameters for collaborative recommendations
   */
  static validateCollaborativeRecommendations(
    user_id: string,
    limit?: number
  ): RecommendationValidationResult { // Same validation as personalized recommendations
    return this.validatePersonalizedRecommendations(user_id, limit);
   }

  /**
   * Validate parameters for engagement tracking
   */
  static validateEngagementTracking(
    user_id: string,
    bill_id: number,
    engagement_type: string
  ): RecommendationValidationResult { const errors: string[] = [];
    const warnings: string[] = [];

    // Validate user_id
    if (!user_id || typeof user_id !== 'string') {
      errors.push('User ID is required and must be a string');
     } else if (user_id.length > this.MAX_USER_ID_LENGTH) {
      errors.push(`User ID cannot exceed ${this.MAX_USER_ID_LENGTH} characters`);
    } else if (!this.isValidUserId(user_id)) {
      errors.push('Invalid user ID format');
    }

    // Validate bill_id
    if (bill_id === undefined || bill_id === null) {
      errors.push('Bill ID is required');
    } else if (typeof bill_id !== 'number' || !Number.isInteger(bill_id) || bill_id < 1) {
      errors.push('Bill ID must be a positive integer');
    } else if (bill_id > this.MAX_BILL_ID) {
      errors.push(`Bill ID cannot exceed ${this.MAX_BILL_ID}`);
    }

    // Validate engagement_type
    const validTypes = ['view', 'comment', 'share'];
    if (!engagement_type || typeof engagement_type !== 'string') {
      errors.push('Engagement type is required and must be a string');
    } else if (!validTypes.includes(engagement_type)) {
      errors.push(`Engagement type must be one of: ${validTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize user ID
   */
  static sanitizeUserId(user_id: string): string { if (typeof user_id !== 'string') return '';

    return user_id
      .trim()
      .substring(0, this.MAX_USER_ID_LENGTH)
      // Remove potentially harmful characters
      .replace(/[<>\"'`;]/g, '');
   }

  /**
   * Sanitize bill ID
   */
  static sanitizeBillId(bill_id: unknown): number | null { if (typeof bill_id !== 'number' && typeof bill_id !== 'string') return null;

    const num = typeof bill_id === 'string' ? parseInt(bill_id, 10) : bill_id;

    if (!Number.isInteger(num) || num < 1 || num > this.MAX_BILL_ID) {
      return null;
     }

    return num;
  }

  /**
   * Sanitize limit parameter
   */
  static sanitizeLimit(limit: unknown, defaultValue: number = 10): number {
    if (typeof limit !== 'number' && typeof limit !== 'string') {
      return Math.min(defaultValue, this.MAX_LIMIT);
    }

    const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    if (!Number.isInteger(num) || num < 1) {
      return Math.min(defaultValue, this.MAX_LIMIT);
    }

    return Math.min(num, this.MAX_LIMIT);
  }

  /**
   * Sanitize days parameter
   */
  static sanitizeDays(days: unknown, defaultValue: number = 7): number {
    if (typeof days !== 'number' && typeof days !== 'string') {
      return Math.min(defaultValue, this.MAX_DAYS);
    }

    const num = typeof days === 'string' ? parseInt(days, 10) : days;

    if (!Number.isInteger(num) || num < 1) {
      return Math.min(defaultValue, this.MAX_DAYS);
    }

    return Math.min(num, this.MAX_DAYS);
  }

  /**
   * Sanitize engagement type
   */
  static sanitizeEngagementType(type: string): 'view' | 'comment' | 'share' | null {
    if (typeof type !== 'string') return null;

    const normalized = type.toLowerCase().trim();
    const validTypes = ['view', 'comment', 'share'];

    return validTypes.includes(normalized) ? normalized as 'view' | 'comment' | 'share' : null;
  }

  // Private helper methods

  private static isValidUserId(user_id: string): boolean { // Basic validation - should contain only alphanumeric characters, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(user_id);
   }
}








































