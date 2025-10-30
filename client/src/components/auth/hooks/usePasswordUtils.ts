/**
 * Password utility hooks for auth components
 */

import React from 'react';
import { AuthConfig } from '../types';

// Simple password strength calculation
function calculatePasswordStrength(password: string) {
  if (!password) {
    return { score: 0, feedback: [], isStrong: false };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  else feedback.push('Add at least 8 characters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('Add numbers');

  if (/[@$!%*?&]/.test(password)) score++;
  else feedback.push('Add special characters');

  return {
    score,
    feedback,
    isStrong: score >= 4,
  };
}

export function usePasswordStrength(password: string, config?: AuthConfig) {
  const strength = React.useMemo(() => {
    return calculatePasswordStrength(password);
  }, [password]);

  const feedback = React.useMemo(() => {
    return strength.feedback;
  }, [strength.feedback]);

  return {
    strength,
    feedback,
    isStrong: strength.isStrong,
    score: strength.score,
  };
}

export function usePasswordVisibility(initialVisible: boolean = false) {
  const [isVisible, setIsVisible] = React.useState(initialVisible);

  const toggle = React.useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const show = React.useCallback(() => {
    setIsVisible(true);
  }, []);

  const hide = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    toggle,
    show,
    hide,
    type: isVisible ? 'text' : 'password',
  };
}

export function usePasswordValidation(password: string, confirmPassword?: string, config?: AuthConfig) {
  const strength = usePasswordStrength(password, config);
  
  const validation = React.useMemo(() => {
    const errors: string[] = [];
    
    if (!password) {
      return { isValid: false, errors: ['Password is required'] };
    }

    const minLength = config?.password?.minLength || 8;
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters`);
    }

    if (config?.password?.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (config?.password?.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (config?.password?.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (config?.password?.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      errors.push("Passwords don't match");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [password, confirmPassword, config]);

  return {
    ...validation,
    strength,
    isStrong: strength.isStrong,
  };
}

