/**
 * Register form component with validation patterns
 * Following navigation component patterns for form components
 */

import React from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { RegisterFormProps, RegisterFormData } from '../types';
import { useRegisterForm } from '../hooks/useAuthForm';
import { AuthInput } from './AuthInput';
import { SubmitButton } from './AuthButton';
import { AuthAlert } from './AuthAlert';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

export const RegisterForm: React.FC<RegisterFormProps> = ({
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
    config,
  } = useRegisterForm({
    onError,
  });

  // Cast formData to RegisterFormData for type safety
  const registerFormData = formData as RegisterFormData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSubmit) {
      try {
        const result = await onSubmit({
          email: registerFormData.email,
          password: registerFormData.password,
          confirmPassword: registerFormData.confirmPassword,
          first_name: registerFormData.first_name,
          last_name: registerFormData.last_name,
        });
        
        if (!result.success && result.error) {
          onError?.(result.error);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    } else {
      await actions.submitForm('register');
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
      data-testid="register-form"
    >
      {currentSuccess && (
        <AuthAlert
          type="success"
          message={currentSuccess}
          data-testid="register-success-alert"
        />
      )}

      {currentError && (
        <AuthAlert
          type="error"
          message={currentError}
          onRetry={recovery.canRetry ? recovery.retry : undefined}
          data-testid="register-error-alert"
        />
      )}

      {/* Name fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="auth-name-fields">
        <AuthInput
          name="first_name"
          label="First Name"
          type="text"
          placeholder="John"
          value={registerFormData.first_name || ''}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          error={errors.first_name}
          disabled={currentLoading}
          required
          icon={User}
        />

        <AuthInput
          name="last_name"
          label="Last Name"
          type="text"
          placeholder="Doe"
          value={registerFormData.last_name || ''}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          error={errors.last_name}
          disabled={currentLoading}
          required
          icon={User}
        />
      </div>

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
      />

      <div className="space-y-2">
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
        />

        {config.ui.showPasswordRequirements && formData.password && !errors.password && (
          <PasswordStrengthIndicator 
            password={formData.password}
            config={config}
          />
        )}

        {!errors.password && !formData.password && (
          <p className="text-xs text-gray-600" data-testid="auth-password-requirements">
            {config.password.minLength}+ characters, with uppercase, lowercase, number, and special character.
          </p>
        )}
      </div>

      <AuthInput
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        value={registerFormData.confirmPassword || ''}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        error={errors.confirmPassword}
        disabled={currentLoading}
        required
        icon={Lock}
        showPasswordToggle
      />

      <SubmitButton
        mode="register"
        loading={currentLoading}
        disabled={currentLoading}
        data-testid="register-submit-button"
      >
        Create Account
      </SubmitButton>
    </form>
  );
};

