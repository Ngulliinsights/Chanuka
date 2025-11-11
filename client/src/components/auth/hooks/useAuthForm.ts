/**
 * Enhanced Authentication Form Hook
 * Handles form state, validation, and submission for login/register forms
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { validatePassword } from '../../../utils/password-validation';
import { validateEmail } from '../../../utils/input-validation';
import { logger } from '../../../utils/logger';
import { LoginCredentials, RegisterData } from '../../../types/auth';

export interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  remember_me: boolean;
  two_factor_code: string;
}

export type FormFieldName = keyof FormData;

export interface UseAuthFormOptions {
  initialMode?: 'login' | 'register';
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onModeChange?: (mode: 'login' | 'register') => void;
  realTimeValidation?: boolean;
}

export interface UseAuthFormReturn {
  mode: 'login' | 'register';
  formData: FormData;
  errors: Partial<Record<FormFieldName, string>>;
  loading: boolean;
  apiResponse: { success?: string; error?: string } | null;
  showPassword: boolean;
  isRegisterMode: boolean;
  isValid: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  toggleMode: () => void;
  setShowPassword: (show: boolean) => void;
  clearErrors: () => void;
  resetForm: () => void;
  getFieldError: (field: FormFieldName) => string | undefined;
  getFieldProps: (field: FormFieldName) => {
    value: string | boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    error: string | undefined;
  };
  retry: () => void;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
  remember_me: false,
  two_factor_code: '',
};

export function useAuthForm(options: UseAuthFormOptions = {}): UseAuthFormReturn {
  const {
    initialMode = 'login',
    onSuccess,
    onError,
    onModeChange,
    realTimeValidation = true,
  } = options;

  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<FormFieldName, string>>>({});
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ success?: string; error?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const lastSubmissionRef = useRef<{ mode: string; data: FormData } | null>(null);

  const isRegisterMode = mode === 'register';

  // Clear API response when user starts typing
  const clearApiResponse = useCallback(() => {
    if (apiResponse) {
      setApiResponse(null);
    }
  }, [apiResponse]);

  // Validate individual field
  const validateField = useCallback((name: FormFieldName, value: string | boolean): string | undefined => {
    switch (name) {
      case 'email':
        if (typeof value === 'string') {
          const emailValidation = validateEmail(value);
          return emailValidation.isValid ? undefined : emailValidation.errors[0];
        }
        break;
      
      case 'password':
        if (typeof value === 'string' && value) {
          const passwordValidation = validatePassword(value, undefined, {
            email: formData.email,
            name: `${formData.first_name} ${formData.last_name}`.trim(),
          });
          return passwordValidation.isValid ? undefined : passwordValidation.errors[0];
        }
        break;
      
      case 'confirmPassword':
        if (typeof value === 'string' && isRegisterMode) {
          return value !== formData.password ? 'Passwords do not match' : undefined;
        }
        break;
      
      case 'first_name':
      case 'last_name':
        if (typeof value === 'string' && isRegisterMode) {
          return value.trim().length < 2 ? `${name === 'first_name' ? 'First' : 'Last'} name must be at least 2 characters` : undefined;
        }
        break;
      
      case 'two_factor_code':
        if (typeof value === 'string' && value) {
          return !/^\d{6}$/.test(value) ? 'Two-factor code must be 6 digits' : undefined;
        }
        break;
    }
    return undefined;
  }, [formData, isRegisterMode]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldName = name as FormFieldName;
    const fieldValue = type === 'checkbox' ? checked : value;

    // Sanitize input (remove control characters)
    const sanitizedValue = typeof fieldValue === 'string' 
      ? fieldValue.replace(/[\x00-\x1F\x7F]/g, '') 
      : fieldValue;

    setFormData(prev => ({
      ...prev,
      [fieldName]: sanitizedValue,
    }));

    // Clear API response when user starts typing
    clearApiResponse();

    // Real-time validation
    if (realTimeValidation && typeof sanitizedValue === 'string') {
      const error = validateField(fieldName, sanitizedValue);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error,
      }));
    }
  }, [validateField, realTimeValidation, clearApiResponse]);

  // Handle field blur for validation
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldName = name as FormFieldName;
    const fieldValue = type === 'checkbox' ? checked : value;

    const error = validateField(fieldName, fieldValue);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
  }, [validateField]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<FormFieldName, string>> = {};

    // Required fields validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailError = validateField('email', formData.email);
      if (emailError) newErrors.email = emailError;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordError = validateField('password', formData.password);
      if (passwordError) newErrors.password = passwordError;
    }

    if (isRegisterMode) {
      if (!formData.first_name.trim()) {
        newErrors.first_name = 'First name is required';
      } else {
        const firstNameError = validateField('first_name', formData.first_name);
        if (firstNameError) newErrors.first_name = firstNameError;
      }

      if (!formData.last_name.trim()) {
        newErrors.last_name = 'Last name is required';
      } else {
        const lastNameError = validateField('last_name', formData.last_name);
        if (lastNameError) newErrors.last_name = lastNameError;
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else {
        const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
        if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isRegisterMode, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setApiResponse(null);

    try {
      if (mode === 'login') {
        const credentials: LoginCredentials = {
          email: formData.email,
          password: formData.password,
          remember_me: formData.remember_me,
          two_factor_code: formData.two_factor_code || undefined,
        };

        const result = await auth.login(credentials);
        
        if (result.success) {
          setApiResponse({ success: 'Login successful!' });
          onSuccess?.(result.data);
          
          // Store for retry functionality
          lastSubmissionRef.current = { mode, data: formData };
        } else {
          setApiResponse({ error: result.error || 'Login failed' });
          onError?.(result.error || 'Login failed');
        }
      } else {
        const registerData: RegisterData = {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          privacy_settings: {
            profile_visibility: 'registered',
            email_visibility: 'private',
            activity_tracking: true,
            analytics_consent: false, // Will be asked separately
            marketing_consent: false,
            data_sharing_consent: false,
            location_tracking: false,
            personalized_content: true,
            third_party_integrations: false,
            notification_preferences: {
              email_notifications: true,
              push_notifications: false,
              sms_notifications: false,
              bill_updates: true,
              comment_replies: true,
              expert_insights: true,
              security_alerts: true,
              privacy_updates: true,
            },
          },
        };

        const result = await auth.register(registerData);
        
        if (result.success) {
          if (result.requiresVerification) {
            setApiResponse({ success: 'Account created! Please check your email to verify your account.' });
          } else {
            setApiResponse({ success: 'Account created successfully!' });
            onSuccess?.(result.data);
          }
          
          // Store for retry functionality
          lastSubmissionRef.current = { mode, data: formData };
        } else {
          setApiResponse({ error: result.error || 'Registration failed' });
          onError?.(result.error || 'Registration failed');
        }
      }
    } catch (error) {
      logger.error('Auth form submission failed:', { component: 'useAuthForm' }, error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setApiResponse({ error: errorMessage });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [mode, formData, validateForm, auth, onSuccess, onError]);

  // Toggle between login and register modes
  const toggleMode = useCallback(() => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setFormData(initialFormData);
    setErrors({});
    setApiResponse(null);
    onModeChange?.(newMode);
  }, [mode, onModeChange]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setApiResponse(null);
    setShowPassword(false);
  }, []);

  // Get error for specific field
  const getFieldError = useCallback((field: FormFieldName): string | undefined => {
    return errors[field];
  }, [errors]);

  // Get props for field (useful for form libraries)
  const getFieldProps = useCallback((field: FormFieldName) => {
    return {
      value: formData[field],
      onChange: handleInputChange,
      onBlur: handleBlur,
      error: errors[field],
    };
  }, [formData, errors, handleInputChange, handleBlur]);

  // Retry last submission
  const retry = useCallback(() => {
    if (lastSubmissionRef.current) {
      setFormData(lastSubmissionRef.current.data);
      setMode(lastSubmissionRef.current.mode as 'login' | 'register');
      setApiResponse(null);
      setErrors({});
    }
  }, []);

  // Check if form is valid
  const isValid = useCallback(() => {
    const requiredFields = mode === 'login' 
      ? ['email', 'password'] 
      : ['email', 'password', 'confirmPassword', 'first_name', 'last_name'];
    
    const hasRequiredFields = requiredFields.every(field => {
      const value = formData[field as FormFieldName];
      return typeof value === 'string' ? value.trim() : Boolean(value);
    });

    const hasNoErrors = Object.keys(errors).length === 0;
    
    return hasRequiredFields && hasNoErrors;
  }, [mode, formData, errors]);

  // Update loading state from auth context
  useEffect(() => {
    setLoading(auth.loading);
  }, [auth.loading]);

  return {
    mode,
    formData,
    errors,
    loading,
    apiResponse,
    showPassword,
    isRegisterMode,
    isValid: isValid(),
    handleInputChange,
    handleBlur,
    handleSubmit,
    toggleMode,
    setShowPassword,
    clearErrors,
    resetForm,
    getFieldError,
    getFieldProps,
    retry,
  };
}