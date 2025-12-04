/**
 * Security Login Form
 * Full-featured version with security monitoring, rate limiting, 2FA, and social login
 */

import React from 'react';

import { LoginForm } from './LoginForm';

interface SecurityLoginFormProps {
  className?: string;
  onSubmit?: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export const SecurityLoginForm: React.FC<SecurityLoginFormProps> = (props) => {
  return <LoginForm {...props} variant="security" />;
};