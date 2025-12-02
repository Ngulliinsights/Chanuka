/**
 * Standard Login Form
 * Simplified version for general use without advanced security features
 */

import React from 'react';
import { LoginForm } from './LoginForm';

interface StandardLoginFormProps {
  className?: string;
  onSubmit?: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  error?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export const StandardLoginForm: React.FC<StandardLoginFormProps> = (props) => {
  return <LoginForm {...props} variant="standard" />;
};