/**
 * Auth component barrel exports
 * Following navigation component pattern
 */

// Types
export type { 
  AuthMode, 
  LoginFormData, 
  RegisterFormData, 
  FormData,
  ValidationErrors,
  AuthFormProps,
  AuthInputProps,
  AuthButtonProps,
  AuthResponse,
  UseAuthFormResult,
  AuthConfig
} from './types';

// Validation
export { 
  validateEmail,
  validatePassword,
  validateName,
  validateLoginData,
  validateRegisterData,
  validateAuthMode,
  validateAuthConfig,
  safeValidateEmail,
  safeValidatePassword,
  safeValidateLoginData,
  safeValidateRegisterData,
  validateField,
  LoginSchema,
  RegisterSchema,
  EmailSchema,
  PasswordSchema,
  StrongPasswordSchema,
  NameSchema
} from './validation';

// Errors
export {
  AuthError,
  AuthValidationError,
  AuthCredentialsError,
  AuthRegistrationError,
  AuthNetworkError,
  AuthRateLimitError,
  AuthConfigurationError,
  AuthSessionError,
  AuthErrorType,
  isAuthError,
  isRetryableError,
  isValidationError,
  isCredentialsError,
  isNetworkError,
  isRateLimitError,
  getErrorMessage,
  getErrorDetails,
  getUserFriendlyMessage
} from './errors';

// Recovery
export {
  getRecoveryStrategy,
  canAutoRecover,
  shouldShowRecovery,
  getRecoveryDelay,
  createRecoveryContext,
  updateRecoveryContext
} from './recovery';

export type {
  RecoveryStrategy,
  RecoveryAction,
  RecoveryContext
} from './recovery';

// Constants
export {
  AUTH_MODES,
  AUTH_FIELD_NAMES,
  AUTH_VALIDATION_RULES,
  AUTH_ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES,
  AUTH_CONFIG_DEFAULTS,
  AUTH_RATE_LIMITS,
  AUTH_STORAGE_KEYS,
  AUTH_API_ENDPOINTS,
  AUTH_REDIRECT_PATHS,
  AUTH_TEST_IDS,
  AUTH_FIELD_TEST_IDS,
  AUTH_ACCESSIBILITY
} from './constants';

// UI Components (will be available after task 4.2 is complete)
export { LoginForm, RegisterForm, AuthInput, AuthButton } from './ui';

// Hooks (will be available after task 4.3)
export { useAuthForm } from './hooks';

// Utils (will be available after task 4.3)
export * from './utils';