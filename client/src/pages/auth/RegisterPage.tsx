/**
 * Register Page
 * User registration with privacy controls and OAuth integration
 */

import { Shield, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SocialLogin } from '@client/core/auth';
import { RegisterForm } from '@client/core/auth';
import { Alert, AlertDescription } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { useAuth } from '@client/core/auth';
import { logger } from '@client/utils/logger';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [error, setError] = useState<string | null>(null);

  const handleRegisterSubmit = async (data: { email: string; password: string; first_name: string; last_name: string }) => {
    try {
      // The register API expects the minimal RegisterData shape. Privacy settings
      // and other preferences should be updated via a separate API call after
      // registration. Provide name by combining first and last name.
      const result = await register({
        email: data.email,
        password: data.password,
        name: `${data.first_name} ${data.last_name}`,
        confirmPassword: data.password, // RegisterForm doesn't provide confirmPassword, but register expects it
        acceptTerms: true, // Terms are already accepted in RegisterForm
      });

      if (result.success) {
        logger.info('Registration successful', {
          component: 'RegisterPage',
          userId: result.data?.user?.id
        });

        if (result.requiresVerification) {
          navigate('/auth/verify-email', {
            state: { email: data.email },
            replace: true
          });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error('Registration error:', { component: 'RegisterPage' }, err);
      return { success: false, error: errorMessage };
    }
  };

  const handleRegisterError = (error: string) => {
    setError(error);
  };

  const handleSocialLoginSuccess = (data: any) => {
    logger.info('Social registration successful', {
      component: 'RegisterPage',
      provider: data.provider
    });
    navigate('/dashboard', { replace: true });
  };

  const handleSocialLoginError = (error: string) => {
    setError(`Social registration failed: ${error}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Social Login */}
        <SocialLogin
          onSuccess={handleSocialLoginSuccess}
          onError={handleSocialLoginError}
        />

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Fill in your information to create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <RegisterForm
              onSubmit={handleRegisterSubmit}
              onError={handleRegisterError}
              loading={loading}
              error={error || undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}