/**
 * Security Hook - Optimized Version
 * React hook for using security services in components
 */


import { clientRateLimiter, RateLimitConfigs } from '@client/infrastructure/security/rate-limiter';
import { securityService, type SecurityStatus } from '@client/infrastructure/security/security-service';
import { type SecurityThreat } from '@client/infrastructure/security/vulnerability-scanner';

export type { SecurityStatus };
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Constants extracted to module level for better performance
const DEFAULT_SCAN_INTERVAL = 300000; // 5 minutes
const STATUS_UPDATE_INTERVAL = 30000; // 30 seconds
const RATE_LIMIT_CHECK_INTERVAL = 5000; // 5 seconds
const MAX_THREATS_HISTORY = 100;
const SECURITY_SCORE_THRESHOLD = 80;

// Type for rate limit status - matching your actual implementation
interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Time in seconds until retry is allowed
}

export interface UseSecurityOptions {
  enableThreatMonitoring?: boolean;
  enablePeriodicScanning?: boolean;
  scanInterval?: number;
}

export interface SecurityHookResult {
  status: SecurityStatus;
  isSecure: boolean;
  threats: SecurityThreat[];
  latestThreat: SecurityThreat | null;
  validateInput: <T>(
    schema: unknown,
    input: unknown
  ) => Promise<{ success: true; data: T } | { success: false; errors: string[] }>;
  sanitizeText: (input: string, maxLength?: number) => string;
  sanitizeHtml: (html: string, options?: Record<string, unknown>) => string;
  performSecurityCheck: (input: string) => {
    isSafe: boolean;
    threats: string[];
    sanitized: string;
  };
  checkRateLimit: (key: string, configName: keyof typeof RateLimitConfigs) => RateLimitStatus;
  attemptRateLimitedAction: <T>(
    key: string,
    configName: keyof typeof RateLimitConfigs,
    action: () => Promise<T>
  ) => Promise<T>;
  performScan: () => Promise<void>;
  scanInProgress: boolean;
  refreshSecurity: () => void;
  clearThreats: () => void;
}

export function useSecurity(_options: UseSecurityOptions = {}): SecurityHookResult {
  const {
    enableThreatMonitoring = true,
    enablePeriodicScanning = false,
    scanInterval = DEFAULT_SCAN_INTERVAL,
  } = _options;

  // State management
  const [status, setStatus] = useState<SecurityStatus>(() => securityService.getSecurityStatus());
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [latestThreat, setLatestThreat] = useState<SecurityThreat | null>(null);
  const [scanInProgress, setScanInProgress] = useState(false);

  // Refs for cleanup management - prevents stale closures
  const threatUnsubscribeRef = useRef<(() => void) | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Memoized callbacks that don't depend on changing state
  // This prevents unnecessary re-renders in child components
  const refreshSecurity = useCallback(() => {
    if (!isMountedRef.current) return;
    setStatus(securityService.getSecurityStatus());
  }, []);

  const validateInput = useCallback(async <T>(schema: unknown, input: unknown) => {
    try {
      const result = await securityService.validateInput<T>(schema as Record<string, unknown>, input);
      return result;
    } catch (error) {
      console.error('Input validation failed:', error);
      return {
        success: false as const,
        errors: ['Validation service unavailable'],
      };
    }
  }, []);

  const sanitizeText = useCallback((input: string, maxLength?: number) => {
    try {
      const sanitized = securityService.sanitizeInput(input);
      return maxLength ? sanitized.substring(0, maxLength) : sanitized;
    } catch (error) {
      console.error('Text sanitization failed:', error);
      // Return empty string as safe fallback
      return '';
    }
  }, []);

  const sanitizeHtml = useCallback((html: string, _options?: Record<string, unknown>) => {
    try {
      return securityService.sanitizeHtml(html);
    } catch (error) {
      console.error('HTML sanitization failed:', error);
      // Return empty string as safe fallback
      return '';
    }
  }, []);

  const performSecurityCheck = useCallback(
    (input: string): { isSafe: boolean; threats: string[]; sanitized: string } => {
      try {
        const result = securityService.performSecurityCheck(input);
        // Ensure we always return the expected object shape
        if (typeof result === 'boolean') {
          return {
            isSafe: result,
            threats: result ? [] : ['Input validation failed'],
            sanitized: result ? input : '',
          };
        }
        return result;
      } catch (error) {
        console.error('Security check failed:', error);
        return {
          isSafe: false,
          threats: ['Security check unavailable'],
          sanitized: '',
        };
      }
    },
    []
  );

  const checkRateLimit = useCallback(
    (key: string, configName: keyof typeof RateLimitConfigs): RateLimitStatus => {
      try {
        const config = RateLimitConfigs[configName];
        if (!config) {
          console.error('Rate limit config not found:', configName);
          return { allowed: true, remaining: Infinity, resetTime: 0 };
        }
        const result = clientRateLimiter.checkLimit(key, config);
        return result;
      } catch (error) {
        console.error('Rate limit check failed:', error);
        return { allowed: true, remaining: Infinity, resetTime: 0 };
      }
    },
    []
  );

  const attemptRateLimitedAction = useCallback(
    async <T>(
      key: string,
      configName: keyof typeof RateLimitConfigs,
      action: () => Promise<T>
    ): Promise<T> => {
      const config = RateLimitConfigs[configName];
      if (!config) {
        throw new Error(`Rate limit config not found: ${configName}`);
      }
      
      const limitCheck = clientRateLimiter.checkLimit(key, config);

      if (!limitCheck.allowed) {
        const retryAfterMs = limitCheck.retryAfter ? limitCheck.retryAfter * 1000 : limitCheck.resetTime;
        throw new Error(`Rate limit exceeded. Retry after ${retryAfterMs}ms`);
      }

      // Execute the action
      return await action();
    },
    []
  );

  // Security scan with proper async handling and error management
  const performScan = useCallback(async () => {
    if (scanInProgress || !isMountedRef.current) return;

    setScanInProgress(true);

    try {
      // Await the async scan operation
      const result = await securityService.performSecurityScan();

      if (!isMountedRef.current) return;

      // Check if we have threats in the result
      if (result?.threats && Array.isArray(result.threats) && result.threats.length > 0) {
        setThreats(prev => [...result.threats, ...prev].slice(0, MAX_THREATS_HISTORY));
        setLatestThreat(result.threats[0]);
      }
    } catch (error) {
      console.error('Security scan failed:', error);
      // Don't set error threat here as the type structure doesn't match
      // Just log the error and continue
    } finally {
      if (isMountedRef.current) {
        setScanInProgress(false);
      }
    }
  }, [scanInProgress]);

  const clearThreats = useCallback(() => {
    setThreats([]);
    setLatestThreat(null);
  }, []);

  // Threat monitoring setup with proper cleanup
  useEffect(() => {
    if (!enableThreatMonitoring) return;

    threatUnsubscribeRef.current = securityService.onThreatDetected(threat => {
      if (!isMountedRef.current) return;

      setThreats(prev => [threat, ...prev].slice(0, MAX_THREATS_HISTORY));
      setLatestThreat(threat);
    });

    return () => {
      threatUnsubscribeRef.current?.();
      threatUnsubscribeRef.current = null;
    };
  }, [enableThreatMonitoring]);

  // Periodic scanning setup with validation
  useEffect(() => {
    if (!enablePeriodicScanning || scanInterval <= 0) return;

    // Initial scan
    performScan();

    scanIntervalRef.current = setInterval(() => {
      performScan();
    }, scanInterval);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [enablePeriodicScanning, scanInterval, performScan]);

  // Status update interval with proper cleanup
  useEffect(() => {
    statusIntervalRef.current = setInterval(refreshSecurity, STATUS_UPDATE_INTERVAL);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [refreshSecurity]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Memoized security status calculation
  // This prevents recalculation on every render
  const isSecure = useMemo(() => {
    return (
      status.csrf.hasValidToken &&
      status.vulnerabilityScanning.lastScanScore > SECURITY_SCORE_THRESHOLD &&
      threats.filter(t => t.severity === 'critical' || t.severity === 'high').length === 0
    );
  }, [status.csrf.hasValidToken, status.vulnerabilityScanning.lastScanScore, threats]);

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
    clearThreats,
  };
}

/**
 * Optimized hook for form input validation and sanitization
 */
// Re-export ValidationSchemas
export { ValidationSchemas } from '@client/infrastructure/security/security-service';

/**
 * Optimized hook for form input validation and sanitization
 */
export function useSecureForm<T extends Record<string, unknown>>(
  schema: unknown,
  initialValues: T
) {
  const { validateInput, sanitizeText } = useSecurity();
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Stable reference to initial values to prevent unnecessary resets
  const initialValuesRef = useRef(initialValues);

  // Optimized setValue - removed errors from dependency array
  // to prevent unnecessary callback recreation
  const setValue = useCallback(
    (field: keyof T, value: unknown) => {
      const sanitizedValue = typeof value === 'string' ? sanitizeText(value) : value;

      setValues(prev => ({
        ...prev,
        [field]: sanitizedValue,
      }));

      // Clear field-specific errors
      setErrors(prev => {
        if (!prev[field as string]) return prev;

        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    },
    [sanitizeText]
  );

  // Enhanced validation with better error parsing
  const validate = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);

    try {
      const result = await validateInput(schema, values);

      if (result.success) {
        setErrors({});
        return true;
      }

      // Improved error parsing with fallback
      const fieldErrors: Record<string, string[]> = {};

      if (Array.isArray(result.errors)) {
        result.errors.forEach(error => {
          // Handle both "field: message" and plain message formats
          const colonIndex = error.indexOf(': ');
          const field = colonIndex > 0 ? error.substring(0, colonIndex) : 'form';
          const message = colonIndex > 0 ? error.substring(colonIndex + 2) : error;

          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(message);
        });
      } else {
        fieldErrors.form = ['Validation failed with unknown error format'];
      }

      setErrors(fieldErrors);
      return false;
    } catch (error) {
      console.error('Validation error:', error);
      setErrors({ form: ['Validation failed. Please try again.'] });
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [validateInput, schema, values]);

  const reset = useCallback(() => {
    setValues(initialValuesRef.current);
    setErrors({});
  }, []);

  // Computed property for error state
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  return {
    values,
    errors,
    isValidating,
    setValue,
    validate,
    reset,
    hasErrors,
  };
}

/**
 * Optimized hook for rate-limited actions with automatic status updates
 */
export function useRateLimit(key: string, configName: keyof typeof RateLimitConfigs) {
  const { checkRateLimit, attemptRateLimitedAction } = useSecurity();
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Stable update function
  const updateStatus = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      const result = checkRateLimit(key, configName);
      setStatus(result);
    } catch (error) {
      console.error('Rate limit check failed:', error);
    }
  }, [key, configName, checkRateLimit]);

  const attemptAction = useCallback(
    async <T>(action: () => Promise<T>): Promise<T> => {
      const result = await attemptRateLimitedAction(key, configName, action);
      updateStatus();
      return result;
    },
    [key, configName, attemptRateLimitedAction, updateStatus]
  );

  // Setup status polling with cleanup
  useEffect(() => {
    updateStatus();

    intervalRef.current = setInterval(updateStatus, RATE_LIMIT_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [updateStatus]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    status,
    attemptAction,
    isAllowed: status?.allowed ?? true,
    remaining: status?.remaining ?? Infinity,
    retryAfter: status?.resetTime ?? 0,
  };
}
