/**
 * Secure Form Component
 * Example component demonstrating security features usage
 */

import React, { useState } from 'react';
import { useSecureForm, useSecurity } from '@client/hooks/useSecurity';
import { ValidationSchemas } from '../../security';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SecureFormProps {
  onSubmit?: (data: any) => void;
  className?: string;
}

export function SecureForm({ onSubmit, className }: SecureFormProps) {
  const { 
    performSecurityCheck, 
    checkRateLimit,
    status 
  } = useSecurity();

  const {
    values,
    errors,
    isValidating,
    setValue,
    validate,
    reset,
    hasErrors
  } = useSecureForm(
    ValidationSchemas.User.registration,
    {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      acceptTerms: false
    }
  );

  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setValue(field, value);
    
    // Perform real-time security check for text inputs
    if (typeof value === 'string' && value.length > 0) {
      const securityResult = performSecurityCheck(value);
      if (!securityResult.isSafe) {
        setSecurityWarnings(prev => [
          ...prev.filter(w => !w.includes(field)),
          `${field}: ${securityResult.threats.join(', ')}`
        ]);
      } else {
        setSecurityWarnings(prev => prev.filter(w => !w.includes(field)));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    const rateLimitResult = checkRateLimit('form-submission', 'registration');
    if (!rateLimitResult.allowed) {
      alert(`Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Validate form
      const isValid = await validate();
      if (!isValid) {
        return;
      }

      // Check for security issues
      if (securityWarnings.length > 0) {
        const proceed = confirm('Security warnings detected. Continue anyway?');
        if (!proceed) {
          return;
        }
      }

      // Submit form
      if (onSubmit) {
        await onSubmit(values);
      }
      
      // Reset form on success
      reset();
      setSecurityWarnings([]);
      
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSecurityStatusIcon = () => {
    if (securityWarnings.length > 0) {
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    }
    if (status.csrf.hasValidToken && status.inputSanitization.enabled) {
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    }
    return <Shield className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getSecurityStatusIcon()}
          Secure Registration Form
        </CardTitle>
        <CardDescription>
          This form demonstrates security features including input validation, 
          sanitization, CSRF protection, and rate limiting.
        </CardDescription>
        
        {/* Security Status */}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant={status.csrf.hasValidToken ? "default" : "destructive"}>
            CSRF: {status.csrf.hasValidToken ? "Protected" : "Vulnerable"}
          </Badge>
          <Badge variant={status.inputSanitization.enabled ? "default" : "destructive"}>
            Input Sanitization: {status.inputSanitization.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant={status.rateLimit.enabled ? "default" : "destructive"}>
            Rate Limiting: {status.rateLimit.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Security Warnings */}
          {securityWarnings.length > 0 && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Security Warnings:</div>
                <ul className="list-disc list-inside text-sm">
                  {securityWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <div className="text-sm text-red-500">
                {errors.email.join(', ')}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={values.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <div className="text-sm text-red-500">
                {errors.password.join(', ')}
              </div>
            )}
          </div>

          {/* First Name Field */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={values.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && (
              <div className="text-sm text-red-500">
                {errors.firstName.join(', ')}
              </div>
            )}
          </div>

          {/* Last Name Field */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={values.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={errors.lastName ? 'border-red-500' : ''}
            />
            {errors.lastName && (
              <div className="text-sm text-red-500">
                {errors.lastName.join(', ')}
              </div>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={values.acceptTerms}
              onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="acceptTerms" className="text-sm">
              I accept the terms and conditions
            </Label>
            {errors.acceptTerms && (
              <div className="text-sm text-red-500">
                {errors.acceptTerms.join(', ')}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || isValidating || hasErrors}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Register'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default SecureForm;