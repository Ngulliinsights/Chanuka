/**
 * Common Utility Functions
 * 
 * Platform-agnostic utility functions that can be used across
 * client and server applications through service layers
 */

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const validation = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidKenyaPhoneNumber: (phone: string): boolean => {
    // Kenya phone number validation: +254 or 0, followed by 7/1 and 8 digits
    const kenyaPhoneRegex = /^(\+254|0)[17]\d{8}$/;
    return kenyaPhoneRegex.test(phone.replace(/\s/g, ''));
  },
  
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidBillNumber: (billNumber: string): boolean => {
    // Kenya bill number format: e.g., "Bill No. 2024/001"
    const billRegex = /^Bill No\. \d{4}\/\d{3,4}$/i;
    return billRegex.test(billNumber);
  }
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export const formatting = {
  currency: (amount: number, currency: string = 'KES'): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },
  
  date: (date: Date | string, locale: string = 'en-KE'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  },
  
  relativeTime: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return dateObj.toLocaleDateString('en-KE');
  },
  
  number: (num: number, locale: string = 'en-KE'): string => {
    return new Intl.NumberFormat(locale).format(num);
  },
  
  percentage: (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }
};

// ============================================================================
// STRING UTILITIES
// ============================================================================

export const strings = {
  slugify: (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
  
  truncate: (text: string, maxLength: number, suffix: string = '...'): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
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
    return text
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  },
  
  kebabCase: (text: string): string => {
    return text
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
};

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

export const arrays = {
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },
  
  groupBy: <T, K extends keyof any>(
    array: T[], 
    key: (item: T) => K
  ): Record<K, T[]> => {
    return array.reduce((groups, item) => {
      const groupKey = key(item);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
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
// FUNCTION UTILITIES
// ============================================================================

export const functions = {
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },
  
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
  
  memoize: <T extends (...args: any[]) => any>(func: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
  
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError!;
  }
};

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

export const objects = {
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },
  
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },
  
  deepMerge: <T>(target: T, source: Partial<T>): T => {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = objects.deepMerge(result[key], source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
    
    return result;
  },
  
  isEmpty: (obj: any): boolean => {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
    return Object.keys(obj).length === 0;
  }
};

// ============================================================================
// CIVIC ENGAGEMENT UTILITIES
// ============================================================================

export const civic = {
  calculateUrgencyScore: (bill: {
    introducedDate: string;
    status: string;
    policyAreas: string[];
    constitutionalFlags: boolean;
  }): number => {
    let score = 0;
    
    // Time-based urgency
    const daysSinceIntroduced = Math.floor(
      (Date.now() - new Date(bill.introducedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceIntroduced > 90) score += 3;
    else if (daysSinceIntroduced > 60) score += 2;
    else if (daysSinceIntroduced > 30) score += 1;
    
    // Status-based urgency
    if (bill.status === 'second_reading') score += 3;
    else if (bill.status === 'committee_review') score += 2;
    else if (bill.status === 'first_reading') score += 1;
    
    // Constitutional flags add urgency
    if (bill.constitutionalFlags) score += 2;
    
    // High-impact policy areas
    const highImpactAreas = ['taxation', 'healthcare', 'education', 'security'];
    if (bill.policyAreas.some(area => highImpactAreas.includes(area))) {
      score += 1;
    }
    
    return Math.min(score, 5); // Cap at 5
  },
  
  generateEngagementSummary: (engagement: {
    views: number;
    comments: number;
    votes: number;
    shares: number;
  }): string => {
    const total = engagement.views + engagement.comments + engagement.votes + engagement.shares;
    
    if (total === 0) return 'No engagement yet';
    if (total < 10) return 'Low engagement';
    if (total < 100) return 'Moderate engagement';
    if (total < 1000) return 'High engagement';
    return 'Very high engagement';
  }
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const utils = {
  validation,
  formatting,
  strings,
  arrays,
  functions,
  objects,
  civic
};

export default utils;