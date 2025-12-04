/**
 * Unified auth input component with error handling
 * Following navigation component patterns for UI components
 */

import { AuthInputProps } from '@client/types';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';
import { usePasswordVisibility } from '@client/hooks/usePasswordUtils';

import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export const AuthInput: React.FC<AuthInputProps> = ({
  name,
  label,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
  className,
  icon: Icon,
  showPasswordToggle = false,
}) => {
  const { isVisible, toggle, type: inputType } = usePasswordVisibility(false);
  const isPasswordField = type === 'password';
  const finalType = isPasswordField && showPasswordToggle ? inputType : type;

  return (
    <div className={cn('space-y-2', className)} data-testid={`auth-${name}-field`}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
        
        <Input
          id={name}
          name={name}
          type={finalType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={cn(
            Icon ? 'pl-10' : '',
            isPasswordField && showPasswordToggle ? 'pr-10' : '',
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
            'transition-colors'
          )}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          data-testid={`auth-${name}-input`}
        />
        
        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={toggle}
            disabled={disabled}
            data-testid={`auth-${name}-toggle`}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      
      {error && (
        <p 
          id={`${name}-error`} 
          className="text-sm text-red-600 flex items-center gap-1" 
          data-testid={`auth-${name}-error`}
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

// Specialized input components
export const EmailInput: React.FC<Omit<AuthInputProps, 'name' | 'type'> & { icon?: React.ComponentType<{ className?: string }> }> = (props) => (
  <AuthInput
    {...props}
    name="email"
    type="email"
  />
);

export const PasswordInput: React.FC<Omit<AuthInputProps, 'name' | 'type' | 'showPasswordToggle'>> = (props) => (
  <AuthInput
    {...props}
    name="password"
    type="password"
    showPasswordToggle={true}
  />
);

export const ConfirmPasswordInput: React.FC<Omit<AuthInputProps, 'name' | 'type' | 'showPasswordToggle'>> = (props) => (
  <AuthInput
    {...props}
    name="confirmPassword"
    type="password"
    showPasswordToggle={true}
  />
);

export const NameInput: React.FC<Omit<AuthInputProps, 'type'> & { fieldType: 'first_name' | 'last_name' }> = ({ 
  fieldType, 
  ...props 
}) => (
  <AuthInput
    {...props}
    name={fieldType}
    type="text"
  />
);

