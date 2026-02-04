/**
 * Login Form Hook
 * Manages login form state, validation, and submission
 */

import { validatePassword } from '@client/lib/utils/input-validation';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useAuth } from '@client/core/auth';
import { validateEmail } from '@client/lib/utils/input-validation';
import { logger } from '@client/lib/utils/logger';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormActions {
  updateField: (name: string, value: string) => void;
  validateField: (name: string, value: string) => void;
  submitForm: (mode?: string) => Promise<{ success: boolean; error?: string }>;
  resetForm: () => void;
  clearErrors: () => void;
}

export interface LoginFormRecovery {
  canRetry: boolean;
  retry: () => void;
  lastAttempt?: LoginFormData;
}

export interface UseLoginFormOptions {
  onError?: (error: string) => void;
}

export interface UseLoginFormReturn {
  formData: LoginFormData;
  errors: Partial<Record<keyof LoginFormData, string>>;
  isLoading: boolean;
  apiResponse: { success?: string; error?: string } | null;
  actions: LoginFormActions;
  recovery: LoginFormRecovery;
}

// Initial form data
const initialFormData: LoginFormData = {
  email: '',
  password: '',
};

export function useLoginForm(options: UseLoginFormOptions = {}): UseLoginFormReturn {
  const { onError } = options;

  const auth = useAuth();

  const [formData, setFormData] = useState<LoginFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ success?: string; error?: string } | null>(null);

  const lastSubmissionRef = useRef<LoginFormData | null>(null);

  // Validate individual field
  const validateField = useCallback(
    (name: keyof LoginFormData, value: string): string | undefined => {
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
          // Basic password validation - could be enhanced
          return value.length < 6 ? 'Password must be at least 6 characters' : undefined;

        default:
          return undefined;
      }
    },
    []
  );

  // Handle field updates
  const updateField = useCallback(
    (name: string, value: string) => {
      const fieldName = name as keyof LoginFormData;

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

      // Clear error for this field
      setErrors(prev => ({
        ...prev,
        [fieldName]: undefined,
      }));
    },
    [apiResponse]
  );

  // Manual field validation (for blur events)
  const validateFieldManual = useCallback(
    (name: string, value: string) => {
      const fieldName = name as keyof LoginFormData;
      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    [validateField]
  );

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof LoginFormData, string>> = {};

    Object.keys(formData).forEach(key => {
      const fieldName = key as keyof LoginFormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  // Submit form
  const submitForm = useCallback(
    async (mode?: string): Promise<{ success: boolean; error?: string }> => {
      if (!validateForm()) {
        return { success: false, error: 'Please correct the form errors' };
      }

      setIsLoading(true);
      setApiResponse(null);

      try {
        const result = await auth.login({
          email: formData.email,
          password: formData.password,
        });

        if (result.success) {
          setApiResponse({ success: 'Login successful!' });
          lastSubmissionRef.current = formData;
          return { success: true };
        } else {
          const errorMessage = result.error || 'Login failed';
          setApiResponse({ error: errorMessage });
          onError?.(errorMessage);
          return { success: false, error: errorMessage };
        }
      } catch (error) {
        logger.error('Login form submission failed:', { component: 'useLoginForm' }, error);
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        setApiResponse({ error: errorMessage });
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [validateForm, formData, auth, onError]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setApiResponse(null);
  }, []);

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
  const recovery: LoginFormRecovery = {
    canRetry: !!lastSubmissionRef.current,
    retry,
    lastAttempt: lastSubmissionRef.current || undefined,
  };

  // Actions object
  const actions: LoginFormActions = {
    updateField,
    validateField: validateFieldManual,
    submitForm,
    resetForm,
    clearErrors,
  };

  return {
    formData,
    errors,
    isLoading,
    apiResponse,
    actions,
    recovery,
  };
}
