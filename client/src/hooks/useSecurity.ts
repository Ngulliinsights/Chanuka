/**
 * Security Hook
 * React hook for using security services in components
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { 
  clientRateLimiter, 
  RateLimitConfigs, 
  RateLimitResult 
} from '../security/rate-limiter';
import { 
  securityService, 
  SecurityStatus
} from '@client/security/security-service';
import { 
  SecurityThreat, 
  vulnerabilityScanner 
} from '../security/vulnerability-scanner';

export interface UseSecurityOptions {
  enableThreatMonitoring?: boolean;
  enablePeriodicScanning?: boolean;
  scanInterval?: number;
}

export interface SecurityHookResult {
  // Status
  status: SecurityStatus;
  isSecure: boolean;
  
  // Threat monitoring
  threats: SecurityThreat[];
  latestThreat: SecurityThreat | null;
  
  // Input validation
  validateInput: <T>(schema: any, input: unknown) => Promise<{ success: true; data: T } | { success: false; errors: string[] }>;
  sanitizeText: (input: string, maxLength?: number) => string;
  sanitizeHtml: (html: string, options?: any) => string;
  performSecurityCheck: (input: string) => { isSafe: boolean; threats: string[]; sanitized: string };
  
  // Rate limiting
  checkRateLimit: (key: string, configName: keyof typeof RateLimitConfigs) => RateLimitResult;
  attemptRateLimitedAction: <T>(key: string, configName: keyof typeof RateLimitConfigs, action: () => Promise<T>) => Promise<T>;
  
  // Security scanning
  performScan: () => void;
  scanInProgress: boolean;
  
  // Utilities
  refreshSecurity: () => void;
  clearThreats: () => void;
}

export function useSecurity(options: UseSecurityOptions = {}): SecurityHookResult {
  const {
    enableThreatMonitoring = true,
    enablePeriodicScanning = false,
    scanInterval = 300000 // 5 minutes
  } = options;

  // State
  const [status, setStatus] = useState<SecurityStatus>(() => securityService.getSecurityStatus());
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [latestThreat, setLatestThreat] = useState<SecurityThreat | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);

  // Refs
  const threatUnsubscribeRef = useRef<(() => void) | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update status
  const refreshSecurity = useCallback(() => {
    setStatus(securityService.getSecurityStatus());
  }, []);

  // Validate input
  const validateInput = useCallback(async <T>(schema: any, input: unknown) => {
    return securityService.validateInput<T>(schema, input);
  }, []);

  // Sanitize text
  const sanitizeText = useCallback((input: string, maxLength?: number) => {
    return securityService.sanitizeInput(input, { maxLength });
  }, []);

  // Sanitize HTML
  const sanitizeHtml = useCallback((html: string, options?: any) => {
    return securityService.sanitizeHtml(html, options);
  }, []);

  // Perform security check
  const performSecurityCheck = useCallback((input: string) => {
    return securityService.performSecurityCheck(input);
  }, []);

  // Check rate limit
  const checkRateLimit = useCallback((key: string, configName: keyof typeof RateLimitConfigs) => {
    return securityService.checkRateLimit(key, configName);
  }, []);

  // Attempt rate limited action
  const attemptRateLimitedAction = useCallback(async <T>(
    key: string, 
    configName: keyof typeof RateLimitConfigs, 
    action: () => Promise<T>
  ): Promise<T> => {
    const config = RateLimitConfigs[configName];
    return clientRateLimiter.attemptAction(key, config, action);
  }, []);

  // Perform security scan
  const performScan = useCallback(() => {
    if (scanInProgress) return;
    
    setScanInProgress(true);
    try {
      const result = securityService.performSecurityScan();
      if (result.threats.length > 0) {
        setThreats(prev => [...result.threats, ...prev].slice(0, 100)); // Keep last 100 threats
        setLatestThreat(result.threats[0]);
      }
    } catch (error) {
      console.error('Security scan failed:', error);
    } finally {
      setScanInProgress(false);
    }
  }, [scanInProgress]);

  // Clear threats
  const clearThreats = useCallback(() => {
    setThreats([]);
    setLatestThreat(null);
  }, []);

  // Setup threat monitoring
  useEffect(() => {
    if (!enableThreatMonitoring) return;

    threatUnsubscribeRef.current = securityService.onThreatDetected((threat) => {
      setThreats(prev => [threat, ...prev].slice(0, 100));
      setLatestThreat(threat);
    });

    return () => {
      if (threatUnsubscribeRef.current) {
        threatUnsubscribeRef.current();
      }
    };
  }, [enableThreatMonitoring]);

  // Setup periodic scanning
  useEffect(() => {
    if (!enablePeriodicScanning || scanInterval <= 0) return;

    scanIntervalRef.current = setInterval(() => {
      performScan();
    }, scanInterval);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [enablePeriodicScanning, scanInterval, performScan]);

  // Update status periodically
  useEffect(() => {
    const statusInterval = setInterval(refreshSecurity, 30000); // Every 30 seconds
    return () => clearInterval(statusInterval);
  }, [refreshSecurity]);

  // Calculate if system is secure
  const isSecure = status.csrf.hasValidToken && 
                  status.vulnerabilityScanning.lastScanScore > 80 &&
                  threats.filter(t => t.severity === 'critical' || t.severity === 'high').length === 0;

  return {
    status,
    isSecure,
    threats,
    latestThreat,
    validateInput,
    sanitizeText,
    sanitizeHtml,
    performSecurityCheck,
    checkRateLimit,
    attemptRateLimitedAction,
    performScan,
    scanInProgress,
    refreshSecurity,
    clearThreats
  };
}

/**
 * Hook for form input validation and sanitization
 */
export function useSecureForm<T extends Record<string, any>>(
  schema: any,
  initialValues: T
) {
  const { validateInput, sanitizeText } = useSecurity();
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  const setValue = useCallback((field: keyof T, value: any) => {
    // Sanitize string values
    const sanitizedValue = typeof value === 'string' ? sanitizeText(value) : value;
    
    setValues(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));

    // Clear field errors
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [sanitizeText, errors]);

  const validate = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    try {
      const result = await validateInput(schema, values);
      if (result.success) {
        setErrors({});
        return true;
      } else {
        const fieldErrors: Record<string, string[]> = {};
        result.errors.forEach(error => {
          const [field, message] = error.split(': ');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(message);
        });
        setErrors(fieldErrors);
        return false;
      }
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [validateInput, schema, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isValidating,
    setValue,
    validate,
    reset,
    hasErrors: Object.keys(errors).length > 0
  };
}

/**
 * Hook for rate-limited actions
 */
export function useRateLimit(key: string, configName: keyof typeof RateLimitConfigs) {
  const { checkRateLimit, attemptRateLimitedAction } = useSecurity();
  const [status, setStatus] = useState<RateLimitResult | null>(null);

  const updateStatus = useCallback(() => {
    const result = checkRateLimit(key, configName);
    setStatus(result);
  }, [key, configName, checkRateLimit]);

  const attemptAction = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    const result = await attemptRateLimitedAction(key, configName, action);
    updateStatus(); // Update status after action
    return result;
  }, [key, configName, attemptRateLimitedAction, updateStatus]);

  // Update status on mount and periodically
  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [updateStatus]);

  return {
    status,
    attemptAction,
    isAllowed: status?.allowed ?? true,
    remaining: status?.remaining ?? Infinity,
    retryAfter: status?.retryAfter ?? 0
  };
}