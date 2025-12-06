/**
 * React Hook for Seamless Shared Integration
 * 
 * Provides React hooks for seamless integration with shared modules,
 * including loading states, error handling, and automatic fallbacks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import { seamlessIntegration } from '../adapters/seamless-shared-integration';
import { logger } from '../utils/logger';

interface IntegrationState {
  initialized: boolean;
  loading: boolean;
  error: Error | null;
  sharedAvailable: boolean;
  integrationMode: 'hybrid' | 'client-only' | 'loading';
}

/**
 * Main hook for seamless integration
 */
export function useSeamlessIntegration() {
  const [state, setState] = useState<IntegrationState>({
    initialized: false,
    loading: true,
    error: null,
    sharedAvailable: false,
    integrationMode: 'loading'
  });

  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await seamlessIntegration.initialize();
      const status = seamlessIntegration.getStatus();
      
      setState({
        initialized: status.initialized,
        loading: false,
        error: null,
        sharedAvailable: status.sharedModulesAvailable,
        integrationMode: status.integrationMode as 'hybrid' | 'client-only'
      });
      
      logger.info('Seamless integration hook initialized', status);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Integration failed');
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        integrationMode: 'client-only'
      }));
      
      logger.error('Seamless integration initialization failed', { error: err });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const retry = useCallback(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    retry,
    utils: seamlessIntegration
  };
}

/**
 * Hook for validation utilities
 */
export function useValidation() {
  const { initialized, sharedAvailable } = useSeamlessIntegration();
  
  return useMemo(() => {
    if (!initialized) {
      // Return basic validation while loading
      return {
        email: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        phone: (phone: string) => /^(\+254|0)[17]\d{8}$/.test(phone.replace(/\s/g, '')),
        billNumber: (billNumber: string) => /^[A-Z]{1,3}\s?\d{1,4}\/\d{4}$/.test(billNumber),
        url: (url: string) => {
          try { new URL(url); return true; } catch { return false; }
        }
      };
    }
    
    return seamlessIntegration.validation;
  }, [initialized, sharedAvailable]);
}

/**
 * Hook for formatting utilities
 */
export function useFormatting() {
  const { initialized } = useSeamlessIntegration();
  
  return useMemo(() => {
    if (!initialized) {
      // Return basic formatting while loading
      return {
        currency: (amount: number, currency = 'KES') => 
          new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(amount),
        date: (date: Date | string) => new Date(date).toLocaleDateString('en-KE'),
        relativeTime: (date: Date | string) => {
          const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) return 'Today';
          if (diffDays === 1) return 'Yesterday';
          return `${diffDays} days ago`;
        },
        number: (num: number, options?: Intl.NumberFormatOptions) => 
          new Intl.NumberFormat('en-KE', options).format(num),
        percentage: (value: number, total: number) => `${((value / total) * 100).toFixed(1)}%`
      };
    }
    
    return seamlessIntegration.formatting;
  }, [initialized]);
}

/**
 * Hook for string utilities
 */
export function useStrings() {
  const { initialized } = useSeamlessIntegration();
  
  return useMemo(() => {
    if (!initialized) {
      // Return basic string utilities while loading
      return {
        slugify: (text: string) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
        truncate: (text: string, length: number) => text.length > length ? text.slice(0, length) + '...' : text,
        capitalize: (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
        titleCase: (text: string) => text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()),
        camelCase: (text: string) => text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, ''),
        kebabCase: (text: string) => text.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase()
      };
    }
    
    return seamlessIntegration.strings;
  }, [initialized]);
}

/**
 * Hook for array utilities
 */
export function useArrays() {
  const { initialized } = useSeamlessIntegration();
  
  return useMemo(() => {
    if (!initialized) {
      // Return basic array utilities while loading
      return {
        unique: <T>(array: T[]) => [...new Set(array)],
        groupBy: <T, K extends keyof T>(array: T[], key: K) => 
          array.reduce((groups, item) => {
            const groupKey = String(item[key]);
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
            return groups;
          }, {} as Record<string, T[]>),
        chunk: <T>(array: T[], size: number) => {
          const chunks: T[][] = [];
          for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
          }
          return chunks;
        },
        shuffle: <T>(array: T[]) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        }
      };
    }
    
    return seamlessIntegration.arrays;
  }, [initialized]);
}

/**
 * Hook for civic utilities
 */
export function useCivic() {
  const { initialized } = useSeamlessIntegration();
  
  return useMemo(() => {
    if (!initialized) {
      // Return basic civic utilities while loading
      return {
        calculateUrgencyScore: () => 50, // Default medium urgency
        generateEngagementSummary: () => 'Loading engagement data...'
      };
    }
    
    return seamlessIntegration.civic;
  }, [initialized]);
}

/**
 * Hook for anonymity utilities
 */
export function useAnonymity() {
  const { initialized } = useSeamlessIntegration();
  
  return useMemo(() => {
    if (!initialized) {
      // Return basic anonymity utilities while loading
      return {
        generateId: () => 'anon_' + Math.random().toString(36).substring(2, 11),
        getDisplayIdentity: () => ({
          name: 'Anonymous',
          avatar: null,
          identifier: 'loading'
        }),
        generatePseudonymSuggestions: (count = 3) => 
          Array(count).fill(0).map((_, i) => `Anonymous${i + 1}`)
      };
    }
    
    return seamlessIntegration.anonymity;
  }, [initialized]);
}

/**
 * Hook for integration status and diagnostics
 */
export function useIntegrationStatus() {
  const integration = useSeamlessIntegration();
  
  const diagnostics = useMemo(() => ({
    canUseSharedModules: integration.sharedAvailable,
    integrationHealth: integration.error ? 'unhealthy' : 'healthy',
    fallbackMode: !integration.sharedAvailable,
    recommendations: [
      ...(integration.error ? ['Check shared module configuration'] : []),
      ...(integration.integrationMode === 'client-only' ? ['Consider enabling shared modules for enhanced features'] : []),
      ...(integration.loading ? ['Integration still initializing'] : [])
    ]
  }), [integration]);

  return {
    ...integration,
    diagnostics
  };
}

/**
 * Hook for progressive enhancement based on integration status
 */
export function useProgressiveEnhancement() {
  const { sharedAvailable, initialized } = useSeamlessIntegration();
  
  const enhancementLevel = useMemo(() => {
    if (!initialized) return 'loading';
    if (sharedAvailable) return 'enhanced';
    return 'basic';
  }, [initialized, sharedAvailable]);
  
  const shouldEnableFeature = useCallback((feature: string) => {
    const featureRequirements: Record<string, 'basic' | 'enhanced'> = {
      'advanced-validation': 'enhanced',
      'civic-scoring': 'enhanced',
      'anonymity-management': 'enhanced',
      'basic-formatting': 'basic',
      'basic-validation': 'basic'
    };
    
    const required = featureRequirements[feature] || 'basic';
    
    if (required === 'enhanced') {
      return enhancementLevel === 'enhanced';
    }
    
    return enhancementLevel !== 'loading';
  }, [enhancementLevel]);
  
  return {
    enhancementLevel,
    shouldEnableFeature,
    isEnhanced: enhancementLevel === 'enhanced',
    isBasic: enhancementLevel === 'basic',
    isLoading: enhancementLevel === 'loading'
  };
}

/**
 * Hook for automatic retry with exponential backoff
 */
export function useIntegrationRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { error, retry } = useSeamlessIntegration();
  
  const retryWithBackoff = useCallback(async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
    
    setTimeout(async () => {
      try {
        await retry();
        setRetryCount(0); // Reset on success
      } catch (error) {
        setRetryCount(prev => prev + 1);
        logger.warn('Integration retry failed', { retryCount: retryCount + 1, error });
      } finally {
        setIsRetrying(false);
      }
    }, delay);
  }, [retry, retryCount, isRetrying]);
  
  const shouldShowRetry = error && !isRetrying && retryCount < 5;
  
  return {
    retryCount,
    isRetrying,
    shouldShowRetry,
    retryWithBackoff,
    maxRetriesReached: retryCount >= 5
  };
}