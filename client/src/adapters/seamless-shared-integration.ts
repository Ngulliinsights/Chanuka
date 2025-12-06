/**
 * Seamless Shared Module Integration
 * 
 * This adapter provides a more seamless integration between client utilities
 * and shared module functionality, reducing friction and improving developer experience.
 */

// Import client utilities for seamless fallback
import { envConfig } from '../utils/env-config';

// Simple logger to avoid circular imports
const logger = {
  info: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, context);
    }
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context);
  },
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, context);
  }
};

// Type definitions for shared module compatibility
export interface User {
  id: string | number;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface Bill {
  id: string | number;
  title?: string;
  status?: string;
  introducedDate?: string;
  lastUpdated?: string;
  policyAreas?: string[];
  constitutionalFlags?: boolean;
}

export interface Committee {
  id: string | number;
  name?: string;
  description?: string;
}

export interface UserProfile {
  id: string | number;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  pseudonym?: string;
  anonymous_id?: string;
  anonymity_level?: AnonymityLevel;
  privacy_settings?: Record<string, any>;
}

export type AnonymityLevel = 'public' | 'pseudonymous' | 'anonymous' | 'private';
export type BillStatus = 'FIRST_READING' | 'SECOND_READING' | 'THIRD_READING' | 'COMMITTEE_REVIEW' | 'PASSED' | 'REJECTED';
export type UserRole = 'citizen' | 'expert' | 'moderator' | 'admin';
export type KenyanCounty = string;

export interface DisplayIdentity {
  name?: string;
  displayName?: string;
  avatar?: string | null;
  identifier?: string;
  showLocation?: boolean;
  showContactInfo?: boolean;
  canDirectMessage?: boolean;
  profileUrl?: string;
}

// Shared module imports with error handling
let sharedValidation: any = null;
let sharedFormatting: any = null;
let sharedCivic: any = null;
let sharedStrings: any = null;
let sharedArrays: any = null;
let sharedAnonymityHelpers: unknown = null;

// Attempt to load shared modules with graceful fallback
try {
  const commonUtils = require('@shared/core/utils/common-utils');
  sharedValidation = commonUtils.validation;
  sharedFormatting = commonUtils.formatting;
  sharedCivic = commonUtils.civic;
  sharedStrings = commonUtils.strings;
  sharedArrays = commonUtils.arrays;
} catch (error) {
  logger.warn('Shared common-utils not available, using client fallbacks', { error });
}

try {
  const anonymityHelpers = require('@shared/platform/kenya/anonymity/anonymity-helper');
  sharedAnonymityHelpers = {
    generateAnonymousId: anonymityHelpers.generateAnonymousId,
    getDisplayIdentity: anonymityHelpers.getDisplayIdentity,
    generatePseudonymSuggestions: anonymityHelpers.generatePseudonymSuggestions,
    canPerformAction: anonymityHelpers.canPerformAction,
    getAuditTrailIdentity: anonymityHelpers.getAuditTrailIdentity
  };
} catch (error) {
  logger.warn('Shared anonymity helpers not available, using client fallbacks', { error });
}

/**
 * Seamless Integration Layer
 * 
 * Provides a unified API that seamlessly integrates shared and client utilities
 * with intelligent fallbacks and environment-aware loading.
 */
export class SeamlessSharedIntegration {
  private static instance: SeamlessSharedIntegration;
  private initialized = false;
  private sharedModulesAvailable = false;

  private constructor() {}

  static getInstance(): SeamlessSharedIntegration {
    if (!SeamlessSharedIntegration.instance) {
      SeamlessSharedIntegration.instance = new SeamlessSharedIntegration();
    }
    return SeamlessSharedIntegration.instance;
  }

  /**
   * Initialize the integration layer with environment detection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test shared module availability
      await this.testSharedModuleAvailability();
      this.initialized = true;
      
      logger.info('Seamless shared integration initialized', {
        sharedModulesAvailable: this.sharedModulesAvailable,
        environment: envConfig.environment
      });
    } catch (error) {
      logger.warn('Shared modules not available, using client-only mode', { error });
      this.sharedModulesAvailable = false;
      this.initialized = true;
    }
  }

  /**
   * Test if shared modules are available and working
   */
  private async testSharedModuleAvailability(): Promise<void> {
    try {
      // Test basic shared utilities
      if (sharedValidation?.isValidEmail && sharedFormatting?.currency) {
        const testEmail = sharedValidation.isValidEmail('test@example.com');
        const testFormat = sharedFormatting.currency(100, 'KES');
        
        if (typeof testEmail === 'boolean' && typeof testFormat === 'string') {
          this.sharedModulesAvailable = true;
          return;
        }
      }
      
      this.sharedModulesAvailable = false;
    } catch (error) {
      this.sharedModulesAvailable = false;
      throw error;
    }
  }

  /**
   * Validation utilities with seamless fallback
   */
  get validation() {
    return {
      email: (email: string): boolean => {
        if (this.sharedModulesAvailable && sharedValidation?.isValidEmail) {
          return sharedValidation.isValidEmail(email);
        }
        // Client fallback
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },

      phone: (phone: string): boolean => {
        if (this.sharedModulesAvailable && sharedValidation?.isValidKenyaPhoneNumber) {
          return sharedValidation.isValidKenyaPhoneNumber(phone);
        }
        // Client fallback for Kenya phone numbers
        return /^(\+254|0)[17]\d{8}$/.test(phone.replace(/\s/g, ''));
      },

      billNumber: (billNumber: string): boolean => {
        if (this.sharedModulesAvailable && sharedValidation?.isValidBillNumber) {
          return sharedValidation.isValidBillNumber(billNumber);
        }
        // Client fallback
        return /^[A-Z]{1,3}\s?\d{1,4}\/\d{4}$/.test(billNumber);
      },

      url: (url: string): boolean => {
        if (this.sharedModulesAvailable && sharedValidation?.isValidUrl) {
          return sharedValidation.isValidUrl(url);
        }
        // Client fallback
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      }
    };
  }

  /**
   * Formatting utilities with seamless fallback
   */
  get formatting() {
    return {
      currency: (amount: number, currency = 'KES'): string => {
        if (this.sharedModulesAvailable && sharedFormatting?.currency) {
          return sharedFormatting.currency(amount, currency);
        }
        // Client fallback
        return new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: currency
        }).format(amount);
      },

      date: (date: Date | string, format?: string): string => {
        if (this.sharedModulesAvailable && sharedFormatting?.date) {
          return sharedFormatting.date(date, format);
        }
        // Client fallback
        const d = new Date(date);
        return d.toLocaleDateString('en-KE');
      },

      relativeTime: (date: Date | string): string => {
        if (this.sharedModulesAvailable && sharedFormatting?.relativeTime) {
          return sharedFormatting.relativeTime(date);
        }
        // Client fallback
        const now = new Date();
        const target = new Date(date);
        const diffMs = now.getTime() - target.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return target.toLocaleDateString('en-KE');
      },

      number: (num: number, options?: Intl.NumberFormatOptions): string => {
        if (this.sharedModulesAvailable && sharedFormatting?.number) {
          return sharedFormatting.number(num, options);
        }
        // Client fallback
        return new Intl.NumberFormat('en-KE', options).format(num);
      },

      percentage: (value: number, total: number): string => {
        if (this.sharedModulesAvailable && sharedFormatting?.percentage) {
          return sharedFormatting.percentage(value, total);
        }
        // Client fallback
        const percent = (value / total) * 100;
        return `${percent.toFixed(1)}%`;
      }
    };
  }

  /**
   * String utilities with seamless fallback
   */
  get strings() {
    return {
      slugify: (text: string): string => {
        if (this.sharedModulesAvailable && sharedStrings?.slugify) {
          return sharedStrings.slugify(text);
        }
        // Client fallback
        return text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      },

      truncate: (text: string, length: number): string => {
        if (this.sharedModulesAvailable && sharedStrings?.truncate) {
          return sharedStrings.truncate(text, length);
        }
        // Client fallback
        return text.length > length ? text.slice(0, length) + '...' : text;
      },

      capitalize: (text: string): string => {
        if (this.sharedModulesAvailable && sharedStrings?.capitalize) {
          return sharedStrings.capitalize(text);
        }
        // Client fallback
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      },

      titleCase: (text: string): string => {
        if (this.sharedModulesAvailable && sharedStrings?.titleCase) {
          return sharedStrings.titleCase(text);
        }
        // Client fallback
        return text.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
        );
      },

      camelCase: (text: string): string => {
        if (this.sharedModulesAvailable && sharedStrings?.camelCase) {
          return sharedStrings.camelCase(text);
        }
        // Client fallback
        return text
          .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
            index === 0 ? word.toLowerCase() : word.toUpperCase()
          )
          .replace(/\s+/g, '');
      },

      kebabCase: (text: string): string => {
        if (this.sharedModulesAvailable && sharedStrings?.kebabCase) {
          return sharedStrings.kebabCase(text);
        }
        // Client fallback
        return text
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/[\s_]+/g, '-')
          .toLowerCase();
      }
    };
  }

  /**
   * Array utilities with seamless fallback
   */
  get arrays() {
    return {
      unique: <T>(array: T[]): T[] => {
        if (this.sharedModulesAvailable && sharedArrays?.unique) {
          return sharedArrays.unique(array);
        }
        // Client fallback
        return Array.from(new Set(array));
      },

      groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
        if (this.sharedModulesAvailable && sharedArrays?.groupBy) {
          return sharedArrays.groupBy(array, key);
        }
        // Client fallback
        return array.reduce((groups, item) => {
          const groupKey = String(item[key]);
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(item);
          return groups;
        }, {} as Record<string, T[]>);
      },

      chunk: <T>(array: T[], size: number): T[][] => {
        if (this.sharedModulesAvailable && sharedArrays?.chunk) {
          return sharedArrays.chunk(array, size);
        }
        // Client fallback
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      },

      shuffle: <T>(array: T[]): T[] => {
        if (this.sharedModulesAvailable && sharedArrays?.shuffle) {
          return sharedArrays.shuffle(array);
        }
        // Client fallback
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
    };
  }

  /**
   * Civic utilities with seamless fallback
   */
  get civic() {
    return {
      calculateUrgencyScore: (bill: Partial<Bill>): number => {
        if (this.sharedModulesAvailable && sharedCivic?.calculateUrgencyScore) {
          return sharedCivic.calculateUrgencyScore(bill);
        }
        // Client fallback - basic urgency calculation
        let score = 0;
        
        if (bill.status === 'FIRST_READING') score += 30;
        if (bill.status === 'SECOND_READING') score += 60;
        if (bill.status === 'THIRD_READING') score += 90;
        
        // Add time-based urgency
        if (bill.lastUpdated) {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(bill.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceUpdate < 7) score += 20;
          if (daysSinceUpdate < 3) score += 40;
        }
        
        return Math.min(score, 100);
      },

      generateEngagementSummary: (bill: Partial<Bill>): string => {
        if (this.sharedModulesAvailable && sharedCivic?.generateEngagementSummary) {
          return sharedCivic.generateEngagementSummary(bill);
        }
        // Client fallback
        const urgency = this.civic.calculateUrgencyScore(bill);
        if (urgency > 70) return 'High priority - immediate action recommended';
        if (urgency > 40) return 'Medium priority - monitor closely';
        return 'Low priority - periodic review';
      }
    };
  }

  /**
   * Anonymity services with seamless fallback
   */
  get anonymity() {
    return {
      generateId: (): string => {
        if (this.sharedModulesAvailable && sharedAnonymityHelpers?.generateAnonymousId) {
          return sharedAnonymityHelpers.generateAnonymousId();
        }
        // Client fallback - simple UUID v4
        return 'anon_' + Math.random().toString(36).substring(2, 11);
      },

      getDisplayIdentity: (user: Partial<User>, level: AnonymityLevel): DisplayIdentity => {
        if (this.sharedModulesAvailable && sharedAnonymityHelpers?.getDisplayIdentity) {
          return sharedAnonymityHelpers.getDisplayIdentity(user, level);
        }
        // Client fallback
        switch (level) {
          case 'public':
            return {
              displayName: user.name || 'Anonymous User',
              showLocation: true,
              showContactInfo: false,
              canDirectMessage: true,
              profileUrl: `/profile/${user.id || 'unknown'}`
            };
          case 'pseudonymous':
            return {
              displayName: user.name ? user.name.charAt(0) + '***' : 'Anonymous',
              showLocation: false,
              showContactInfo: false,
              canDirectMessage: false,
              profileUrl: undefined
            };
          case 'anonymous':
          case 'private':
          default:
            return {
              displayName: 'Anonymous',
              showLocation: false,
              showContactInfo: false,
              canDirectMessage: false,
              profileUrl: undefined
            };
        }
      },

      generatePseudonymSuggestions: (count = 3): string[] => {
        if (this.sharedModulesAvailable && sharedAnonymityHelpers?.generatePseudonymSuggestions) {
          return sharedAnonymityHelpers.generatePseudonymSuggestions(count);
        }
        // Client fallback
        const adjectives = ['Concerned', 'Active', 'Engaged', 'Informed', 'Civic'];
        const nouns = ['Citizen', 'Voter', 'Resident', 'Advocate', 'Observer'];
        
        const suggestions: string[] = [];
        for (let i = 0; i < count; i++) {
          const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
          const noun = nouns[Math.floor(Math.random() * nouns.length)];
          const num = Math.floor(Math.random() * 1000);
          suggestions.push(`${adj}${noun}${num}`);
        }
        return suggestions;
      }
    };
  }

  /**
   * Check if shared modules are available
   */
  get isSharedAvailable(): boolean {
    return this.sharedModulesAvailable;
  }

  /**
   * Get logger instance
   */
  getLogger() {
    return {
      debug: (msg: string, meta?: any, error?: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[DEBUG] ${msg}`, meta, error);
        }
      },
      info: (msg: string, meta?: any, error?: any) => {
        console.info(`[INFO] ${msg}`, meta, error);
      },
      warn: (msg: string, meta?: any, error?: any) => {
        console.warn(`[WARN] ${msg}`, meta, error);
      },
      error: (msg: string, meta?: any, error?: unknown) => {
        console.error(`[ERROR] ${msg}`, meta, error);
      }
    };
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      sharedModulesAvailable: this.sharedModulesAvailable,
      environment: envConfig.environment,
      integrationMode: this.sharedModulesAvailable ? 'hybrid' : 'client-only'
    };
  }
}

// Create and export singleton instance
export const seamlessIntegration = SeamlessSharedIntegration.getInstance();

// Export convenience functions that auto-initialize
export const useSeamlessValidation = async () => {
  await seamlessIntegration.initialize();
  return seamlessIntegration.validation;
};

export const useSeamlessFormatting = async () => {
  await seamlessIntegration.initialize();
  return seamlessIntegration.formatting;
};

export const useSeamlessStrings = async () => {
  await seamlessIntegration.initialize();
  return seamlessIntegration.strings;
};

export const useSeamlessArrays = async () => {
  await seamlessIntegration.initialize();
  return seamlessIntegration.arrays;
};

export const useSeamlessCivic = async () => {
  await seamlessIntegration.initialize();
  return seamlessIntegration.civic;
};

export const useSeamlessAnonymity = async () => {
  await seamlessIntegration.initialize();
  return seamlessIntegration.anonymity;
};

// Types are already exported above as interfaces and types

export default seamlessIntegration;