/**
 * Client-Safe Shared Module Adapter
 * 
 * Provides safe access to shared module functionality without server dependencies.
 * This adapter ensures that client code can safely use shared utilities while
 * maintaining browser compatibility.
 */

// Type-only imports to avoid runtime dependencies
import type { LogContext } from '../utils/logger';

/**
 * Client-Safe Shared Module Adapter
 * 
 * Provides safe access to shared module functionality
 * without server dependencies.
 */
export class ClientSharedAdapter {
  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================
  static readonly validation = {
    isValidEmail: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    
    isValidKenyaPhoneNumber: (phone: string): boolean => {
      // Kenya phone number format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
      const kenyaPhoneRegex = /^(\+254|0)[17]\d{8}$/;
      return kenyaPhoneRegex.test(phone.replace(/\s/g, ''));
    },
    
    isValidBillNumber: (billNumber: string): boolean => {
      // Basic bill number validation (can be enhanced based on Kenya's format)
      return /^[A-Z]{1,3}\d{1,4}\/\d{4}$/.test(billNumber);
    },
    
    isValidUrl: (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
  };

  // ============================================================================
  // FORMATTING UTILITIES
  // ============================================================================
  static readonly formatting = {
    currency: (amount: number, currency = 'KES'): string => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    },
    
    date: (date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      switch (format) {
        case 'long':
          return dateObj.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        case 'relative':
          return ClientSharedAdapter.formatting.relativeTime(dateObj);
        default:
          return dateObj.toLocaleDateString('en-KE');
      }
    },
    
    relativeTime: (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    },
    
    number: (num: number, decimals = 0): string => {
      return new Intl.NumberFormat('en-KE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
    },
    
    percentage: (value: number, total: number): string => {
      const percentage = (value / total) * 100;
      return `${percentage.toFixed(1)}%`;
    }
  };

  // ============================================================================
  // STRING UTILITIES
  // ============================================================================
  static readonly strings = {
    slugify: (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },
    
    truncate: (text: string, length: number, suffix = '...'): string => {
      if (text.length <= length) return text;
      return text.substring(0, length - suffix.length) + suffix;
    },
    
    capitalize: (text: string): string => {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },
    
    titleCase: (text: string): string => {
      return text.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    },
    
    camelCase: (text: string): string => {
      return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      }).replace(/\s+/g, '');
    },
    
    kebabCase: (text: string): string => {
      return text
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    }
  };

  // ============================================================================
  // ARRAY UTILITIES
  // ============================================================================
  static readonly arrays = {
    unique: <T>(array: T[]): T[] => {
      return [...new Set(array)];
    },
    
    groupBy: <T, K extends keyof any>(
      array: T[], 
      keyFn: (item: T) => K
    ): Record<K, T[]> => {
      return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      }, {} as Record<K, T[]>);
    },
    
    chunk: <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    },
    
    shuffle: <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
  };

  // ============================================================================
  // CIVIC UTILITIES
  // ============================================================================
  static readonly civic = {
    calculateUrgencyScore: (
      daysUntilDeadline: number,
      publicInterestLevel: 'low' | 'medium' | 'high' | 'critical'
    ): number => {
      const interestMultiplier = {
        low: 1,
        medium: 1.5,
        high: 2,
        critical: 3
      }[publicInterestLevel];
      
      const timeUrgency = Math.max(0, (30 - daysUntilDeadline) / 30);
      return Math.min(100, timeUrgency * 100 * interestMultiplier);
    },
    
    generateEngagementSummary: (
      views: number,
      comments: number,
      shares: number
    ): string => {
      const total = views + comments * 5 + shares * 10; // Weighted engagement
      
      if (total < 100) return 'Low engagement';
      if (total < 500) return 'Moderate engagement';
      if (total < 1000) return 'High engagement';
      return 'Very high engagement';
    }
  };

  // ============================================================================
  // ANONYMITY SERVICES (Client-Safe Subset)
  // ============================================================================
  static readonly anonymity = {
    generateId: (): string => {
      // Generate a client-safe anonymous ID
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2);
      return `anon_${timestamp}_${random}`;
    },
    
    getDisplayIdentity: (
      level: 'anonymous' | 'pseudonym' | 'verified',
      username?: string
    ): string => {
      switch (level) {
        case 'anonymous':
          return 'Anonymous Citizen';
        case 'pseudonym':
          return username || 'Civic Participant';
        case 'verified':
          return username || 'Verified Citizen';
        default:
          return 'Citizen';
      }
    }
  };

  // ============================================================================
  // LOGGER INTERFACE (Browser-Safe)
  // ============================================================================
  static readonly logger = {
    debug: (message: string, context?: LogContext): void => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[DEBUG] ${message}`, context);
      }
    },
    
    info: (message: string, context?: LogContext): void => {
      console.info(`[INFO] ${message}`, context);
    },
    
    warn: (message: string, context?: LogContext): void => {
      console.warn(`[WARN] ${message}`, context);
    },
    
    error: (message: string, context?: LogContext, error?: Error): void => {
      console.error(`[ERROR] ${message}`, context, error);
    },
    
    logUserAction: (action: string, context?: LogContext): void => {
      ClientSharedAdapter.logger.info(`User Action: ${action}`, context);
    },
    
    logPerformance: (operation: string, duration: number, metadata?: Record<string, unknown>): void => {
      ClientSharedAdapter.logger.debug(`Performance: ${operation} took ${duration}ms`, {
        operation,
        duration,
        ...metadata
      });
    },
    
    logError: (error: Error | string, context?: LogContext): void => {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorContext = error instanceof Error ? {
        ...context,
        stack: error.stack,
        name: error.name
      } : context;
      
      ClientSharedAdapter.logger.error(errorMessage, errorContext, error instanceof Error ? error : undefined);
    }
  };
}

export default ClientSharedAdapter;