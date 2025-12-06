/**
 * Enhanced Register Form Hook
 * Manages registration form state, validation, and submission with integrated privacy settings
 */

import { validatePassword } from '@client/utils/password-validation';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useAuth } from '@client/features/users/hooks/useAuth';
import { PrivacySettings, PasswordRequirements } from '@client/types/auth';
import { validateEmail } from '@client/utils/input-validation';
import { logger } from '@client/utils/logger';
import { privacyCompliance } from '@client/utils/privacy-compliance';

import { usePrivacySettings } from './usePrivacySettings';

// Custom RegisterData interface for this hook that includes privacy settings
interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: string;
  privacy_settings: PrivacySettings;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

export interface RegisterFormConfig {
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  ui: {
    showPasswordRequirements: boolean;
    enablePrivacySettings: boolean;
  };
  validation: {
    realTime: boolean;
    debounceMs: number;
  };
}

export interface RegisterFormActions {
  updateField: (name: string, value: string) => void;
  validateField: (name: string, value: string) => void;
  submitForm: (mode?: string) => Promise<{ success: boolean; error?: string }>;
  resetForm: () => void;
  clearErrors: () => void;
}

export interface RegisterFormRecovery {
  canRetry: boolean;
  retry: () => void;
  lastAttempt?: RegisterFormData;
}

export interface UseRegisterFormOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  initialData?: Partial<RegisterFormData>;
  config?: Partial<RegisterFormConfig>;
}

export interface UseRegisterFormReturn {
  formData: RegisterFormData;
  errors: Partial<Record<keyof RegisterFormData, string>>;
  isLoading: boolean;
  apiResponse: { success?: string; error?: string } | null;
  actions: RegisterFormActions;
  recovery: RegisterFormRecovery;
  config: RegisterFormConfig;
  privacySettings: ReturnType<typeof usePrivacySettings>;
}

// Default configuration
const defaultConfig: RegisterFormConfig = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  ui: {
    showPasswordRequirements: true,
    enablePrivacySettings: true,
  },
  validation: {
    realTime: true,
    debounceMs: 300,
  },
};

// Initial form data
const initialFormData: RegisterFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
};

export function useRegisterForm(options: UseRegisterFormOptions = {}): UseRegisterFormReturn {
  const {
    onSuccess,
    onError,
    initialData = {},
    config: userConfig = {},
  } = options;

  const auth = useAuth();
  const config = { ...defaultConfig, ...userConfig };

  const [formData, setFormData] = useState<RegisterFormData>(() => ({
    ...initialFormData,
    ...initialData,
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ success?: string; error?: string } | null>(null);

  const lastSubmissionRef = useRef<RegisterFormData | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize privacy settings hook
  const privacySettings = usePrivacySettings({
    validateOnChange: config.validation.realTime,
  });

  // Validate individual field
  const validateField = useCallback((name: keyof RegisterFormData, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value.trim()) {
          return 'Email is required';
        }
        const emailValidation = validateEmail(value);
        return emailValidation.isValid ? undefined : emailValidation.errors[0];

      case 'password':
        if (!value) {
          return 'Password is required';
        }
        const passwordRequirements: PasswordRequirements = {
          min_length: config.password.minLength,
          require_uppercase: config.password.requireUppercase,
          require_lowercase: config.password.requireLowercase,
          require_numbers: config.password.requireNumbers,
          require_special_chars: config.password.requireSpecialChars,
          max_age_days: 90, // Default values for required fields
          prevent_reuse_count: 12,
        };

        const passwordValidation = validatePassword(value, passwordRequirements, {
          email: formData.email,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
        });
        return passwordValidation.isValid ? undefined : passwordValidation.errors[0];

      case 'confirmPassword':
        if (!value) {
          return 'Please confirm your password';
        }
        return value !== formData.password ? 'Passwords do not match' : undefined;

      case 'first_name':
      case 'last_name':
        if (!value.trim()) {
          return `${name === 'first_name' ? 'First' : 'Last'} name is required`;
        }
        return value.trim().length < 2
          ? `${name === 'first_name' ? 'First' : 'Last'} name must be at least 2 characters`
          : undefined;

      default:
        return undefined;
    }
  }, [formData.password, config.password]);

  // Handle field updates with real-time validation
  const updateField = useCallback((name: string, value: string) => {
    const fieldName = name as keyof RegisterFormData;

    // Sanitize input
    const sanitizedValue = value.replace(/[\x00-\x1F\x7F]/g, '');

    setFormData(prev => ({
      ...prev,
      [fieldName]: sanitizedValue,
    }));

    // Clear API response when user types
    if (apiResponse) {
      setApiResponse(null);
    }

    // Real-time validation
    if (config.validation.realTime) {
      // Clear existing timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      // Debounce validation
      validationTimeoutRef.current = setTimeout(() => {
        const error = validateField(fieldName, sanitizedValue);
        setErrors(prev => ({
          ...prev,
          [fieldName]: error,
        }));
      }, config.validation.debounceMs);
    }
  }, [apiResponse, config.validation, validateField]);

  // Manual field validation (for blur events)
  const validateFieldManual = useCallback((name: string, value: string) => {
    const fieldName = name as keyof RegisterFormData;
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
  }, [validateField]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    // Validate all fields
    Object.keys(formData).forEach(key => {
      const fieldName = key as keyof RegisterFormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    // Validate privacy settings if enabled
    if (config.ui.enablePrivacySettings && !privacySettings.isValid) {
      // Privacy settings errors are handled by the privacy settings hook
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && (!config.ui.enablePrivacySettings || privacySettings.isValid);
  }, [formData, validateField, config.ui.enablePrivacySettings, privacySettings.isValid]);

  // Submit form
  const submitForm = useCallback(async (mode?: string): Promise<{ success: boolean; error?: string }> => {
    if (!validateForm()) {
      return { success: false, error: 'Please correct the form errors' };
    }

    setIsLoading(true);
    setApiResponse(null);

    try {
      // Prepare registration data
      const registerData: RegisterData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: 'citizen',
        privacy_settings: privacySettings.settings,
      };

      // Validate privacy settings
      const privacyValidation = privacyCompliance.validatePrivacySettings(privacySettings.settings);
      if (!privacyValidation.isValid) {
        throw new Error('Invalid privacy settings');
      }

      const result = await auth.register(registerData);

      if (result.success) {
        const successMessage = result.requiresVerification
          ? 'Account created! Please check your email to verify your account.'
          : 'Account created successfully!';

        setApiResponse({ success: successMessage });
        lastSubmissionRef.current = formData;

        onSuccess?.(result.data);
        return { success: true };
      } else {
        const errorMessage = result.error || 'Registration failed';
        setApiResponse({ error: errorMessage });
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      logger.error('Registration form submission failed:', { component: 'useRegisterForm' }, error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setApiResponse({ error: errorMessage });
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, formData, privacySettings.settings, auth, onSuccess, onError]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setApiResponse(null);
    privacySettings.resetToDefaults();
  }, [privacySettings]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Retry functionality
  const retry = useCallback(() => {
    if (lastSubmissionRef.current) {
      setFormData(lastSubmissionRef.current);
      setApiResponse(null);
      setErrors({});
    }
  }, []);

  // Recovery object
  const recovery: RegisterFormRecovery = {
    canRetry: !!lastSubmissionRef.current,
    retry,
    lastAttempt: lastSubmissionRef.current || undefined,
  };

  // Actions object
  const actions: RegisterFormActions = {
    updateField,
    validateField: validateFieldManual,
    submitForm,
    resetForm,
    clearErrors,
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return {
    formData,
    errors,
    isLoading,
    apiResponse,
    actions,
    recovery,
    config,
    privacySettings,
  };
}