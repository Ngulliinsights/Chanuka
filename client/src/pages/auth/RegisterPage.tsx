/**
 * Register Page
 * User registration with privacy controls and OAuth integration
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { SocialLogin } from '../../components/auth/SocialLogin';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { validatePassword } from '../../utils/password-validation';
import { logger } from '../../utils/logger';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  allowMarketing: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  
  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    allowMarketing: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!form.agreeToTerms || !form.agreeToPrivacy) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      const result = await register({
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        privacy_settings: {
          marketing_consent: form.allowMarketing,
          analytics_consent: true, // Required for basic functionality
          profile_visibility: 'registered' as const,
          email_visibility: 'private' as const,
          activity_tracking: true,
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
            privacy_updates: true
          }
        }
      });

      if (result.success) {
        logger.info('Registration successful', {
          component: 'RegisterPage',
          userId: result.data?.user?.id
        });
        
        if (result.requiresVerification) {
          navigate('/auth/verify-email', { 
            state: { email: form.email },
            replace: true 
          });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      logger.error('Registration error:', { component: 'RegisterPage' }, err);
    }
  };

  const handleInputChange = (field: keyof RegisterForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field.includes('agree') || field === 'allowMarketing' 
      ? e.target.checked 
      : e.target.value;
      
    setForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate password on change
    if (field === 'password' && typeof value === 'string') {
      const validation = validatePassword(value, undefined, {
        email: form.email,
        name: `${form.firstName} ${form.lastName}`
      });
      setPasswordValidation(validation);
    }
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

  const getPasswordStrengthColor = () => {
    if (!passwordValidation) return 'bg-gray-200';
    
    switch (passwordValidation.strength) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-yellow-500';
      case 'good': return 'bg-blue-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-200';
    }
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleInputChange('firstName')}
                    required
                    autoComplete="given-name"
                    placeholder="First name"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleInputChange('lastName')}
                    required
                    autoComplete="family-name"
                    placeholder="Last name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange('email')}
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleInputChange('password')}
                    required
                    autoComplete="new-password"
                    placeholder="Create a password"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Password strength indicator */}
                {passwordValidation && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Password strength:</span>
                      <span className="capitalize">{passwordValidation.strength}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordValidation.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    required
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Consent checkboxes */}
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    id="agreeToTerms"
                    type="checkbox"
                    checked={form.agreeToTerms}
                    onChange={handleInputChange('agreeToTerms')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    disabled={loading}
                    required
                  />
                  <Label htmlFor="agreeToTerms" className="ml-2 block text-sm">
                    I agree to the{' '}
                    <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                      Terms of Service
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start">
                  <input
                    id="agreeToPrivacy"
                    type="checkbox"
                    checked={form.agreeToPrivacy}
                    onChange={handleInputChange('agreeToPrivacy')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    disabled={loading}
                    required
                  />
                  <Label htmlFor="agreeToPrivacy" className="ml-2 block text-sm">
                    I agree to the{' '}
                    <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start">
                  <input
                    id="allowMarketing"
                    type="checkbox"
                    checked={form.allowMarketing}
                    onChange={handleInputChange('allowMarketing')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    disabled={loading}
                  />
                  <Label htmlFor="allowMarketing" className="ml-2 block text-sm text-gray-600">
                    I would like to receive updates and marketing communications (optional)
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading || 
                  !form.firstName || 
                  !form.lastName || 
                  !form.email || 
                  !form.password || 
                  !form.confirmPassword ||
                  !form.agreeToTerms ||
                  !form.agreeToPrivacy ||
                  form.password !== form.confirmPassword ||
                  (passwordValidation && !passwordValidation.isValid)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}