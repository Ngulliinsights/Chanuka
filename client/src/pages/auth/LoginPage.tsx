/**
 * Login Page
 * Uses the consolidated LoginForm component from shared auth
 */

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@client/components/shared/auth/forms';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { Shield } from 'lucide-react';
import { logger } from '@client/utils/logger';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state
  const from = (location.state as any)?.from || '/dashboard';

  const handleLoginSuccess = () => {
    logger.info('Login successful, redirecting', {
      component: 'LoginPage',
      redirectTo: from
    });
    navigate(from, { replace: true });
  };

  const handleSwitchToRegister = () => {
    navigate('/auth/register');
  };

  const handleForgotPassword = () => {
    navigate('/auth/forgot-password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link
              to="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        {/* Consolidated Login Form */}
        <LoginForm
          variant="security"
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={handleSwitchToRegister}
          onForgotPassword={handleForgotPassword}
        />

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}