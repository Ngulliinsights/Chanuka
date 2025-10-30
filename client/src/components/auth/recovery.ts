/**
 * Auth error recovery strategies
 * Following navigation component recovery pattern
 */

import {
  AuthError,
  AuthErrorType,
  isRetryableError,
  isValidationError,
  isCredentialsError,
  isNetworkError,
  isRateLimitError,
  getUserFriendlyMessage
} from './errors';

export interface RecoveryStrategy {
  canRecover: boolean;
  suggestions: string[];
  autoRecovery?: () => Promise<boolean>;
  userActions?: RecoveryAction[];
}

export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  type: 'primary' | 'secondary';
  icon?: string;
}

export interface RecoveryContext {
  error: AuthError;
  attemptCount: number;
  lastAttempt: Date;
  formData?: Record<string, any>;
  mode?: 'login' | 'register';
}

/**
 * Main recovery strategy function
 */
export function getRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { error } = context;

  switch (error.type) {
    case AuthErrorType.AUTH_VALIDATION_ERROR:
      return getValidationRecovery(error, context);
    
    case AuthErrorType.AUTH_CREDENTIALS_ERROR:
      return getCredentialsRecovery(error, context);
    
    case AuthErrorType.AUTH_REGISTRATION_ERROR:
      return getRegistrationRecovery(error, context);
    
    case AuthErrorType.AUTH_NETWORK_ERROR:
      return getNetworkRecovery(error, context);
    
    case AuthErrorType.AUTH_RATE_LIMIT_ERROR:
      return getRateLimitRecovery(error, context);
    
    case AuthErrorType.AUTH_SESSION_ERROR:
      return getSessionRecovery(error, context);
    
    default:
      return getDefaultRecovery(error, context);
  }
}

/**
 * Validation error recovery
 */
function getValidationRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  const field = error.details?.field;
  const suggestions: string[] = [];

  if (field === 'email') {
    suggestions.push('Check that your email address is correctly formatted');
    suggestions.push('Make sure there are no extra spaces');
  } else if (field === 'password') {
    if (context.mode === 'register') {
      suggestions.push('Password must be at least 12 characters long');
      suggestions.push('Include uppercase, lowercase, number, and special character');
    } else {
      suggestions.push('Check that your password is correct');
    }
  } else if (field === 'firstName' || field === 'lastName') {
    suggestions.push('Names can only contain letters, hyphens, and apostrophes');
    suggestions.push('Must be between 2-50 characters');
  } else if (field === 'confirmPassword') {
    suggestions.push('Make sure both password fields match exactly');
  }

  return {
    canRecover: true,
    suggestions,
    userActions: [
      {
        label: 'Fix and retry',
        action: () => {}, // Handled by form component
        type: 'primary'
      }
    ]
  };
}

/**
 * Credentials error recovery
 */
function getCredentialsRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  const suggestions = [
    'Double-check your email address and password',
    'Make sure Caps Lock is not enabled',
    'Try copying and pasting your password to avoid typos'
  ];

  const userActions: RecoveryAction[] = [
    {
      label: 'Try again',
      action: () => {}, // Handled by form component
      type: 'primary'
    }
  ];

  // Add forgot password option after multiple attempts
  if (context.attemptCount >= 2) {
    suggestions.push('If you forgot your password, use the reset option');
    userActions.push({
      label: 'Reset password',
      action: () => {
        window.location.href = '/auth/reset-password';
      },
      type: 'secondary'
    });
  }

  return {
    canRecover: true,
    suggestions,
    userActions
  };
}

/**
 * Registration error recovery
 */
function getRegistrationRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  const suggestions: string[] = [];
  const userActions: RecoveryAction[] = [];

  if (error.message.includes('email')) {
    suggestions.push('This email is already registered');
    suggestions.push('Try logging in instead');
    
    userActions.push({
      label: 'Switch to login',
      action: () => {}, // Handled by form component
      type: 'primary'
    });
    
    userActions.push({
      label: 'Reset password',
      action: () => {
        window.location.href = '/auth/reset-password';
      },
      type: 'secondary'
    });
  } else {
    suggestions.push('Check all required fields are filled correctly');
    suggestions.push('Make sure your password meets the requirements');
    
    userActions.push({
      label: 'Try again',
      action: () => {},
      type: 'primary'
    });
  }

  return {
    canRecover: true,
    suggestions,
    userActions
  };
}

/**
 * Network error recovery
 */
function getNetworkRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  return {
    canRecover: true,
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'The server might be temporarily unavailable'
    ],
    autoRecovery: async () => {
      // Wait a moment and try to ping the server
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const response = await fetch('/api/health', { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },
    userActions: [
      {
        label: 'Retry',
        action: () => {}, // Handled by form component
        type: 'primary'
      },
      {
        label: 'Refresh page',
        action: () => window.location.reload(),
        type: 'secondary'
      }
    ]
  };
}

/**
 * Rate limit error recovery
 */
function getRateLimitRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  const retryAfter = error.details?.retryAfter || 300; // 5 minutes default
  const retryTime = new Date(Date.now() + retryAfter * 1000);

  return {
    canRecover: true,
    suggestions: [
      `Too many attempts. Please wait until ${retryTime.toLocaleTimeString()}`,
      'This helps protect your account from unauthorized access',
      'Make sure you have the correct credentials before trying again'
    ],
    userActions: [
      {
        label: 'Reset password',
        action: () => {
          window.location.href = '/auth/reset-password';
        },
        type: 'secondary'
      }
    ]
  };
}

/**
 * Session error recovery
 */
function getSessionRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  return {
    canRecover: true,
    suggestions: [
      'Your session has expired for security reasons',
      'Please log in again to continue'
    ],
    autoRecovery: async () => {
      // Clear any stored session data
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      return true;
    },
    userActions: [
      {
        label: 'Log in again',
        action: () => {}, // Handled by form component
        type: 'primary'
      }
    ]
  };
}

/**
 * Default recovery for unknown errors
 */
function getDefaultRecovery(error: AuthError, context: RecoveryContext): RecoveryStrategy {
  return {
    canRecover: isRetryableError(error),
    suggestions: [
      'An unexpected error occurred',
      'Please try again in a moment',
      'If the problem persists, contact support'
    ],
    userActions: [
      {
        label: 'Try again',
        action: () => {},
        type: 'primary'
      },
      {
        label: 'Contact support',
        action: () => {
          window.open('/support', '_blank');
        },
        type: 'secondary'
      }
    ]
  };
}

/**
 * Recovery utilities
 */

/**
 * Determines if an error can be automatically recovered from.
 * 
 * The key fix here is that we check the error type property directly first,
 * which tells TypeScript that error definitely has a type property.
 * Then we use the type guard functions as secondary checks.
 */
export function canAutoRecover(error: AuthError): boolean {
  // First check: use the type property directly to help TypeScript understand
  // that this is definitely an AuthError with a type property
  if (error.type === AuthErrorType.AUTH_NETWORK_ERROR) {
    return true;
  }
  
  if (error.type === AuthErrorType.AUTH_SESSION_ERROR) {
    return true;
  }
  
  // Alternatively, we can use the type guard functions, but TypeScript
  // is now confident that error has the expected shape
  return false;
}

export function shouldShowRecovery(error: AuthError, attemptCount: number): boolean {
  // Always show recovery for validation errors
  if (isValidationError(error)) {
    return true;
  }
  
  // Show recovery for credentials errors after first attempt
  if (isCredentialsError(error) && attemptCount >= 1) {
    return true;
  }
  
  // Always show for network and rate limit errors
  if (isNetworkError(error) || isRateLimitError(error)) {
    return true;
  }
  
  return false;
}

export function getRecoveryDelay(error: AuthError, attemptCount: number): number {
  if (isRateLimitError(error)) {
    return error.details?.retryAfter || 300;
  }
  
  if (isNetworkError(error)) {
    // Exponential backoff for network errors
    return Math.min(1000 * Math.pow(2, attemptCount - 1), 30000);
  }
  
  return 0;
}

/**
 * Recovery context helpers
 */

export function createRecoveryContext(
  error: AuthError,
  attemptCount: number = 1,
  formData?: Record<string, any>,
  mode?: 'login' | 'register'
): RecoveryContext {
  return {
    error,
    attemptCount,
    lastAttempt: new Date(),
    formData,
    mode
  };
}

export function updateRecoveryContext(
  context: RecoveryContext,
  newError?: AuthError
): RecoveryContext {
  return {
    ...context,
    error: newError || context.error,
    attemptCount: context.attemptCount + 1,
    lastAttempt: new Date()
  };
}