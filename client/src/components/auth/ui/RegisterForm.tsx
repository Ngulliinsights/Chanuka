/**
 * Register form component with validation patterns
 * Following navigation component patterns for form components
 */

import { RegisterFormProps, RegisterFormData } from '@client/types';
import { Mail, Eye, User, Shield, FileText } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@/lib/utils';


import { useRegisterForm } from '../hooks/useRegisterForm';

import { AuthAlert } from './AuthAlert';
import { SubmitButton } from './AuthButton';
import { AuthInput } from './AuthInput';
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
    privacySettings,
  } = useRegisterForm({
    onError,
  });

  // Cast formData to RegisterFormData for type safety
  const registerFormData = formData as RegisterFormData;

  // Terms and privacy consent state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate terms and privacy consent
    if (!termsAccepted) {
      onError?.('Please accept the Terms of Service');
      return;
    }

    if (!privacyPolicyAccepted) {
      onError?.('Please accept the Privacy Policy');
      return;
    }

    if (onSubmit) {
      try {
        const result = await onSubmit({
          email: registerFormData.email,
          password: registerFormData.password,
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
          icon={Eye}
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
        icon={Eye}
        showPasswordToggle
      />

      {/* Privacy Settings Section */}
      {config.ui.enablePrivacySettings && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg" data-testid="privacy-settings-section">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="profile-visibility" className="text-sm text-gray-700">Profile Visibility</label>
              <select
                id="profile-visibility"
                value={privacySettings.settings.profile_visibility}
                onChange={(e) => privacySettings.updateSetting('profile_visibility', e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
                data-testid="profile-visibility-select"
              >
                <option value="public">Public</option>
                <option value="registered">Registered Users</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="email-visibility" className="text-sm text-gray-700">Email Visibility</label>
              <select
                id="email-visibility"
                value={privacySettings.settings.email_visibility}
                onChange={(e) => privacySettings.updateSetting('email_visibility', e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
                data-testid="email-visibility-select"
              >
                <option value="public">Public</option>
                <option value="registered">Registered Users</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="activity-tracking" className="text-sm text-gray-700">Activity Tracking</label>
              <input
                id="activity-tracking"
                type="checkbox"
                checked={privacySettings.settings.activity_tracking}
                onChange={(e) => privacySettings.updateSetting('activity_tracking', e.target.checked)}
                data-testid="activity-tracking-checkbox"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="analytics-consent" className="text-sm text-gray-700">Analytics Consent</label>
              <input
                id="analytics-consent"
                type="checkbox"
                checked={privacySettings.settings.analytics_consent}
                onChange={(e) => privacySettings.updateSetting('analytics_consent', e.target.checked)}
                data-testid="analytics-consent-checkbox"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="marketing-consent" className="text-sm text-gray-700">Marketing Consent</label>
              <input
                id="marketing-consent"
                type="checkbox"
                checked={privacySettings.settings.marketing_consent}
                onChange={(e) => privacySettings.updateSetting('marketing_consent', e.target.checked)}
                data-testid="marketing-consent-checkbox"
              />
            </div>
          </div>

          {Object.keys(privacySettings.errors).length > 0 && (
            <div className="text-sm text-red-600" data-testid="privacy-settings-errors">
              {Object.values(privacySettings.errors).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Terms and Conditions Section */}
      <div className="space-y-3" data-testid="terms-section">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms-acceptance"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1"
            data-testid="terms-checkbox"
          />
          <label htmlFor="terms-acceptance" className="text-sm text-gray-700">
            I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="privacy-acceptance"
            checked={privacyPolicyAccepted}
            onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)}
            className="mt-1"
            data-testid="privacy-policy-checkbox"
          />
          <label htmlFor="privacy-acceptance" className="text-sm text-gray-700">
            I agree to the{' '}
            <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </label>
        </div>
      </div>

      <SubmitButton
        mode="register"
        loading={currentLoading}
        disabled={currentLoading || !termsAccepted || !privacyPolicyAccepted}
        data-testid="register-submit-button"
      >
        Create Account
      </SubmitButton>
    </form>
  );
};

