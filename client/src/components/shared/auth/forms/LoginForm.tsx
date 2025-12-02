/**
 * Unified Login Form Component
 * Base component that consolidates functionality from both existing LoginForm components
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Checkbox } from '../../../ui/checkbox';
import { Label } from '../../../ui/label';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { LoginCredentials } from '@client/types/auth';
import { rateLimiter } from '@client/utils/security-monitoring';
import { useLoginForm } from '../hooks/useLoginForm';
import { AuthInput, AuthAlert, SubmitButton } from '../ui';

interface BaseLoginFormProps {
  className?: string;
  onSubmit?: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

interface ExtendedLoginFormProps extends BaseLoginFormProps {
  variant?: 'standard' | 'security';
}

export function LoginForm({
  className,
  onSubmit,
  loading: externalLoading,
  error: externalError,
  onError,
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
  variant = 'standard'
}: ExtendedLoginFormProps) {
  const { login, loading } = useAuth();

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

  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  // Security features only for security variant
  useEffect(() => {
    if (variant === 'security') {
      const checkRateLimit = () => {
        const identifier = `login_${formData.email || 'anonymous'}`;
        const limited = rateLimiter.isRateLimited(identifier, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
        const remaining = rateLimiter.getRemainingRequests(identifier, 5, 15 * 60 * 1000);

        setIsRateLimited(limited);
        setRemainingAttempts(remaining);
      };

      checkRateLimit();
    }
  }, [formData.email, variant]);

  const validateForm = (): boolean => {
    if (!formData.email) {
      setError('Email is required');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (show2FA && !twoFactorToken) {
      setError('Two-factor authentication code is required');
      return false;
    }

    return true;
  };

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

    if (!validateForm()) return;

    if (variant === 'security' && isRateLimited) {
      setError('Too many login attempts. Please try again later.');
      return;
    }

    try {
      const loginData: LoginCredentials = {
        email: formData.email,
        password: formData.password,
        rememberMe,
        twoFactorToken: show2FA ? twoFactorToken : undefined,
      };

      const result = await login(loginData);

      if (result.success) {
        if (result.requires2FA && !show2FA) {
          setShow2FA(true);
          setSuccess('Please enter your two-factor authentication code');
          return;
        }

        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          onSuccess?.();
        }, 1000);
      } else {
        setError(result.error || 'Login failed');

        // Update rate limiting info for security variant
        if (variant === 'security') {
          const identifier = `login_${formData.email}`;
          const remaining = rateLimiter.getRemainingRequests(identifier, 5, 15 * 60 * 1000);
          setRemainingAttempts(remaining);

          if (remaining === 0) {
            setIsRateLimited(true);
          }
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    }
  };

  const handleSocialLogin = async (provider: string) => {
    // In production, this would redirect to OAuth provider
    window.location.href = `/api/auth/social/${provider}`;
  };

  const currentLoading = externalLoading ?? isLoading;
  const currentError = externalError ?? apiResponse?.error;
  const currentSuccess = apiResponse?.success;

  // Render different layouts based on variant
  if (variant === 'security') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Sign In
          </CardTitle>
          <CardDescription className="text-center">
            Access your Chanuka Platform account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className={`space-y-4 ${className || ''}`}
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

            {error && (
              <AuthAlert
                type="error"
                message={error}
              />
            )}

            {success && (
              <AuthAlert
                type="success"
                message={success}
              />
            )}

            {isRateLimited && (
              <AuthAlert
                type="error"
                message="Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes."
              />
            )}

            <AuthInput
              name="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => actions.updateField('email', e.target.value)}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => actions.validateField('email', e.target.value)}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => actions.updateField('password', e.target.value)}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => actions.validateField('password', e.target.value)}
              error={errors.password}
              disabled={currentLoading}
              required
              icon={Eye}
              showPasswordToggle
              className="w-full"
            />

            {show2FA && (
              <AuthInput
                name="twoFactorToken"
                label="Two-Factor Authentication Code"
                type="text"
                placeholder="Enter 6-digit code"
                value={twoFactorToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTwoFactorToken(e.target.value)}
                disabled={currentLoading}
                maxLength={6}
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                className="w-full"
              />
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                disabled={currentLoading || isRateLimited}
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me for 30 days
              </Label>
            </div>

            <SubmitButton
              mode="login"
              loading={currentLoading}
              disabled={currentLoading}
              data-testid="login-submit-button"
            >
              Sign In
            </SubmitButton>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={currentLoading || isRateLimited}
              className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('github')}
              disabled={currentLoading || isRateLimited}
              className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={currentLoading}
              className="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </button>

            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                disabled={currentLoading}
                className="font-medium text-primary hover:underline"
              >
                Create one here
              </button>
            </div>
          </div>

          {!isRateLimited && remainingAttempts < 5 && (
            <div className="text-center text-sm text-amber-600">
              {remainingAttempts} login attempt{remainingAttempts !== 1 ? 's' : ''} remaining
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Standard variant - simplified version
  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 ${className || ''}`}
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
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => actions.updateField('email', e.target.value)}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => actions.validateField('email', e.target.value)}
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
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => actions.updateField('password', e.target.value)}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => actions.validateField('password', e.target.value)}
        error={errors.password}
        disabled={currentLoading}
        required
        icon={Eye}
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
}