/**
 * Login form component with standardized props interface
 * Following navigation component patterns for form components
 */

import React from 'react';
import { Mail, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LoginFormProps } from '../types';
import { useLoginForm } from '../hooks/useAuthForm';
import { AuthInput } from './AuthInput';
import { SubmitButton } from './AuthButton';
import { AuthAlert } from './AuthAlert';

export const LoginForm: React.FC<LoginFormProps> = ({
  className,
  onSubmit,
  loading: externalLoading,
  error: externalError,
  onError,
}) => {
  const {
    formData,
    errors,
    isLoading,
    apiResponse,
    actions,
    recovery,
  } = useLoginForm({
    onError,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSubmit) {
      try {
        const result = await onSubmit({
          email: formData.email,
          password: formData.password,
        });
        
        if (!result.success && result.error) {
          onError?.(result.error);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    } else {
      await actions.submitForm('login');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    actions.updateField(name, value);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    actions.validateField(name, value);
  };

  const currentLoading = externalLoading ?? isLoading;
  const currentError = externalError ?? apiResponse?.error;
  const currentSuccess = apiResponse?.success;

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn('space-y-4', className)}
      noValidate
      data-testid="login-form"
    >
      {currentSuccess && (
        <AuthAlert
          type="success"
          message={currentSuccess}
          data-testid="login-success-alert"
        />
      )}

      {currentError && (
        <AuthAlert
          type="error"
          message={currentError}
          onRetry={recovery.canRetry ? recovery.retry : undefined}
          data-testid="login-error-alert"
        />
      )}

      <AuthInput
        name="email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        error={errors.email}
        disabled={currentLoading}
        required
        icon={Mail}
        className="w-full"
      />

      <AuthInput
        name="password"
        label="Password"
        type="password"
        placeholder="••••••••"
        value={formData.password}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        error={errors.password}
        disabled={currentLoading}
        required
        icon={Lock}
        showPasswordToggle
        className="w-full"
      />

      <SubmitButton
        mode="login"
        loading={currentLoading}
        disabled={currentLoading}
        data-testid="login-submit-button"
      >
        Sign In
      </SubmitButton>
    </form>
  );
};

