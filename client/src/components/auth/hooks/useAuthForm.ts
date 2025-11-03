import { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useAuth } from '../../../hooks/use-auth';
import { 
  AuthMode, 
  FormData, 
  ValidationErrors, 
  UseAuthFormResult,
  LoginFormData,
  RegisterFormData
} from '../types';
import { 
  validateLoginData, 
  validateRegisterData, 
  validateField as validateSingleField,
  LoginSchema,
  RegisterSchema
} from '../validation';
import { 
  AuthError, 
  AuthValidationError,
  getUserFriendlyMessage 
} from '../errors';
import {
  getRecoveryStrategy,
  createRecoveryContext,
  updateRecoveryContext,
  RecoveryContext
} from '../recovery';
import { AUTH_FIELD_NAMES } from '../constants';
import { DEFAULT_AUTH_CONFIG } from '../config';

interface UseAuthFormOptions {
  initialMode?: AuthMode;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onModeChange?: (mode: AuthMode) => void;
  autoFocus?: boolean;
  realTimeValidation?: boolean;
}

export function useAuthForm(options: UseAuthFormOptions = {}): UseAuthFormResult {
  const {
    initialMode = 'login',
    onSuccess,
    onError,
    onModeChange,
    autoFocus = true,
    realTimeValidation = true
  } = options;

  const { login, register, loading } = useAuth();
  const config = DEFAULT_AUTH_CONFIG;
  
  // State
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiResponse, setApiResponse] = useState<{ success?: string; error?: string } | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [recoveryContext, setRecoveryContext] = useState<RecoveryContext | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const initialFormData: FormData = {
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Memoized schema based on current mode
  const currentSchema = useMemo(() => {
    return mode === 'login' ? LoginSchema : RegisterSchema;
  }, [mode]);

  // Real-time field validation on blur
  const validateField = useCallback((fieldName: string, value: string) => {
    if (!realTimeValidation) return;

    // Unwrap ZodEffects (refine) to get at the underlying object schema when present
    const maybeEffects: any = currentSchema as any;
    const baseSchema: any = maybeEffects?._def?.schema ?? currentSchema;

    // Use partial + pick to validate a single field without requiring other fields
    const fieldSchema = (baseSchema && typeof baseSchema.partial === 'function')
      ? baseSchema.partial().pick({ [fieldName]: true })
      : z.object({ [fieldName]: (baseSchema?.shape?.[fieldName] ?? z.string()) });

    const result = fieldSchema.safeParse({ [fieldName]: value });

    setErrors(prev => {
      const newErrors = { ...prev };
      if (!result.success) {
        newErrors[fieldName] = result.error.errors[0]?.message;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  }, [currentSchema, realTimeValidation]);

  // Input change handler with sanitization
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Basic input sanitization to remove control characters
    const sanitizedValue = value.replace(/[\x00-\x1F\x7F]/g, '');

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    // Clear API response when user starts typing
    if (apiResponse) {
      setApiResponse(null);
    }

    // Clear recovery context when user makes changes
    if (recoveryContext) {
      setRecoveryContext(null);
    }
  }, [apiResponse, recoveryContext]);

  // Blur handler for field validation
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  }, [validateField]);

  // Form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setApiResponse(null);

    // Parse according to the active mode so TS knows which fields exist
    if (mode === 'login') {
      const loginResult = LoginSchema.safeParse(formData);
      if (!loginResult.success) {
        const formattedErrors: ValidationErrors = {};
        loginResult.error.errors.forEach(err => {
          if (err.path[0]) {
            formattedErrors[err.path[0] as keyof FormData] = err.message;
          }
        });
        setErrors(formattedErrors);
        return;
      }

      setErrors({});
      const authResult = await login(loginResult.data.email, loginResult.data.password);

      if (authResult.success) {
        setApiResponse({ success: 'Login successful!' });
        setAttemptCount(0);
        setRecoveryContext(null);
        onSuccess?.(authResult.data);
      } else {
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        const errorMessage = authResult.error || 'An unexpected error occurred.';
        setApiResponse({ error: errorMessage });
        
        // Create recovery context for error handling
        const authError = new AuthError(errorMessage);
        const context = createRecoveryContext(authError, newAttemptCount, formData, mode);
        setRecoveryContext(context);
        
        onError?.(errorMessage);
      }
      return;
    }

    // register mode
    const registerResult = RegisterSchema.safeParse(formData);
    if (!registerResult.success) {
      const formattedErrors: ValidationErrors = {};
      registerResult.error.errors.forEach(err => {
        if (err.path[0]) {
          formattedErrors[err.path[0] as keyof FormData] = err.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setErrors({});
    const { email, password, first_name, last_name } = registerResult.data;
    const authResult = await register({ email, password, first_name, last_name });

    if (authResult.success) {
      setApiResponse({ success: 'Account created!' });
      setAttemptCount(0);
      setRecoveryContext(null);
      // reset form after successful registration
      setFormData(initialFormData);
      onSuccess?.(authResult.data);
    } else {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      const errorMessage = authResult.error || 'An unexpected error occurred.';
      setApiResponse({ error: errorMessage });
      
      // Create recovery context for error handling
      const authError = new AuthError(errorMessage);
      const context = createRecoveryContext(authError, newAttemptCount, formData, mode);
      setRecoveryContext(context);
      
      onError?.(errorMessage);
    }
  }, [mode, formData, attemptCount, login, register, onSuccess, onError, initialFormData]);

  // Mode toggle handler
  const toggleMode = useCallback(() => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setErrors({});
    setApiResponse(null);
    setAttemptCount(0);
    setRecoveryContext(null);
    setFormData(initialFormData);
    onModeChange?.(newMode);
  }, [mode, onModeChange, initialFormData]);

  // Form reset handler
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setApiResponse(null);
    setRecoveryContext(null);
  }, [initialFormData]);

  // Check if form is valid
  const isValid = useMemo(() => {
    const hasErrors = Object.keys(errors).length > 0;
    const hasRequiredFields = mode === 'login' 
      ? formData.email && formData.password
      : formData.email && formData.password && 
        ('first_name' in formData ? formData.first_name : false) && 
        ('last_name' in formData ? formData.last_name : false) && 
        ('confirmPassword' in formData ? formData.confirmPassword : false);
    
    return !hasErrors && Boolean(hasRequiredFields);
  }, [errors, formData, mode]);

  // Recovery strategy
  const recoveryStrategy = useMemo(() => {
    if (!recoveryContext) return null;
    return getRecoveryStrategy(recoveryContext);
  }, [recoveryContext]);

  return {
    // State
    mode,
    formData,
    errors,
    loading,
    isLoading: loading, // Alias for loading
    apiResponse,
    isValid,
    attemptCount,
    recoveryStrategy,
    showPassword,
    
    // Actions
    handleInputChange,
    handleBlur,
    handleSubmit,
    toggleMode,
    resetForm,
    validateField,
    setShowPassword,
    
    // Recovery actions
    retry: () => {
      setApiResponse(null);
      setRecoveryContext(null);
    },
    
    // Utility getters
    getFieldError: (fieldName: string) => errors[fieldName],
    hasError: (fieldName: string) => Boolean(errors[fieldName]),
    canSubmit: isValid && !loading,
    
    // Mode-specific helpers
    isLoginMode: mode === 'login',
    isRegisterMode: mode === 'register',
    
    // Field helpers
    getFieldProps: (fieldName: string) => ({
      name: fieldName,
      value: formData[fieldName] || '',
      onChange: handleInputChange,
      onBlur: handleBlur,
      error: errors[fieldName],
      disabled: loading,
      required: true
    }),
    
    // Actions object for compatibility
    actions: {
      login: async (email: string, password: string) => {
        // Implementation would go here
        return Promise.resolve();
      },
      register: async (data: any) => {
        // Implementation would go here
        return Promise.resolve();
      }
    },
    
    // Recovery object for compatibility
    recovery: {
      sendResetEmail: async (email: string) => {
        // Implementation would go here
        return Promise.resolve();
      },
      resetPassword: async (token: string, password: string) => {
        // Implementation would go here
        return Promise.resolve();
      }
    },
    
    // Config for components
    config
  };
}


// Convenience hooks for specific modes
export function useLoginForm(options: Omit<UseAuthFormOptions, 'initialMode'> = {}) {
  return useAuthForm({ ...options, initialMode: 'login' });
}

export function useRegisterForm(options: Omit<UseAuthFormOptions, 'initialMode'> = {}) {
  return useAuthForm({ ...options, initialMode: 'register' });
}