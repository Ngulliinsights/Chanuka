/**
 * Password utility hook for authentication components
 * Provides password validation and strength checking
 */

import { useState, useCallback } from 'react';

export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  suggestions: string[];
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

export function usePasswordUtils() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const validatePassword = useCallback((password: string): PasswordValidation => {
    const errors: string[] = [];
    let score = 0;
    const suggestions: string[] = [];

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
      suggestions.push('Use at least 8 characters');
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
      suggestions.push('Add uppercase letters');
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
      suggestions.push('Add lowercase letters');
    } else {
      score += 1;
    }

    // Number check
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
      suggestions.push('Add numbers');
    } else {
      score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('Add special characters for extra security');
    } else {
      score += 1;
    }

    // Length bonus
    if (password.length >= 12) {
      score += 1;
    }

    // Determine strength
    let label: PasswordStrength['label'];
    let color: string;

    if (score <= 1) {
      label = 'Very Weak';
      color = '#ef4444'; // red-500
    } else if (score === 2) {
      label = 'Weak';
      color = '#f97316'; // orange-500
    } else if (score === 3) {
      label = 'Fair';
      color = '#eab308'; // yellow-500
    } else if (score === 4) {
      label = 'Good';
      color = '#22c55e'; // green-500
    } else {
      label = 'Strong';
      color = '#16a34a'; // green-600
    }

    const strength: PasswordStrength = {
      score: Math.min(score, 4),
      label,
      color,
      suggestions: suggestions.slice(0, 3), // Limit to 3 suggestions
    };

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }, []);

  const generatePassword = useCallback((length: number = 12): string => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';

    const allChars = lowercase + uppercase + numbers + symbols;

    // Ensure at least one character from each category
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }, []);

  const checkPasswordMatch = useCallback((password: string, confirmPassword: string) => {
    return {
      matches: password === confirmPassword,
      error: password !== confirmPassword ? 'Passwords do not match' : null,
    };
  }, []);

  return {
    showPassword,
    togglePasswordVisibility,
    validatePassword,
    generatePassword,
    checkPasswordMatch,
  };
}

// Aliases for backward compatibility
export const usePasswordVisibility = usePasswordUtils;
export const usePasswordStrength = usePasswordUtils;

export default usePasswordUtils;
