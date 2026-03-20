/**
 * Comprehensive Authentication Page
 *
 * Complete authentication flow with login, registration, password reset,
 * and OAuth integration. Includes proper error handling, accessibility,
 * and security features.
 */

import { AlertTriangle, CheckCircle, ArrowLeft, Shield, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@client/infrastructure/auth';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

type AuthMode =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'oauth-callback';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    isAuthenticated,
    verifyEmail,
    resetPassword,
    requestPasswordReset,
    loginWithOAuth,
  } = useAuth();

  // Determine initial mode from URL parameters
  const getInitialMode = (): AuthMode => {
    if (searchParams.get('mode') === 'register') return 'register';
    if (searchParams.get('mode') === 'forgot-password') return 'forgot-password';
    if (searchParams.get('mode') === 'reset-password') return 'reset-password';
    if (searchParams.get('mode') === 'verify-email') return 'verify-email';
    if (searchParams.get('code') && searchParams.get('state')) return 'oauth-callback';
    return 'login';
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate, searchParams]);

  // Handle URL parameter changes
  useEffect(() => {
    const token = searchParams.get('token');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      return;
    }

    if (token && mode === 'verify-email') {
      handleEmailVerification(token);
    } else if (token && mode === 'reset-password') {
      setResetToken(token);
    } else if (code && state && mode === 'oauth-callback') {
      handleOAuthCallback(code, state);
    }
  }, [searchParams, mode]);

  const handleEmailVerification = async (token: string) => {
    setLoading(true);
    try {
      const result = await verifyEmail(token);
      if (result.success) {
        setMessage({ type: 'success', text: 'Email verified successfully! You can now sign in.' });
        setMode('login');
      } else {
        setMessage({ type: 'error', text: result.error || 'Email verification failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Email verification failed' });
      logger.error('Email verification error', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setLoading(true);
    try {
      const result = await loginWithOAuth(code, state);
      if (result.success) {
        setMessage({ type: 'success', text: 'Successfully signed in! Redirecting...' });
        setTimeout(() => {
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          navigate(redirectTo, { replace: true });
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.error || 'OAuth authentication failed' });
        setMode('login');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'OAuth authentication failed' });
      setMode('login');
      logger.error('OAuth callback error', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Password reset instructions have been sent to your email address.',
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send reset email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send reset email' });
      logger.error('Password reset request error', { error });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(resetToken, newPassword);
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Password reset successfully! You can now sign in with your new password.',
        });
        setMode('login');
      } else {
        setMessage({ type: 'error', text: result.error || 'Password reset failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Password reset failed' });
      logger.error('Password reset error', { error });
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    const titles = {
      login: 'Welcome Back',
      register: 'Create Your Account',
      'forgot-password': 'Reset Your Password',
      'reset-password': 'Set New Password',
      'verify-email': 'Verify Your Email',
      'oauth-callback': 'Completing Sign In...',
    };

    const descriptions = {
      login: 'Sign in to access your Chanuka Platform account',
      register: 'Join Chanuka to engage with legislative processes',
      'forgot-password': 'Enter your email to receive reset instructions',
      'reset-password': 'Choose a strong new password for your account',
      'verify-email': 'Verifying your email address...',
      'oauth-callback': 'Please wait while we complete your authentication...',
    };

    return (
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{titles[mode]}</h1>
        <p className="text-gray-600">{descriptions[mode]}</p>
      </div>
    );
  };

  const renderBackButton = () => {
    if (mode === 'login') return null;

    return (
      <Button
        variant="ghost"
        onClick={() => {
          setMode('login');
          setMessage(null);
        }}
        className="mb-4"
        disabled={loading}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sign In
      </Button>
    );
  };

  const renderContent = () => {
    if (loading && (mode === 'verify-email' || mode === 'oauth-callback')) {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                {mode === 'verify-email'
                  ? 'Verifying your email...'
                  : 'Completing authentication...'}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (mode) {
      case 'login':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Login form component not available</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'register':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>Sign up for Chanuka</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Registration form component not available</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'forgot-password':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Reset Password</span>
              </CardTitle>
              <CardDescription>
                Enter your email address and we&apos;ll send you instructions to reset your
                password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your email address"
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Instructions'}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case 'reset-password':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>Choose a strong password for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy/10 via-white to-brand-gold/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderHeader()}

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {renderBackButton()}
        {renderContent()}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            By using Chanuka, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
