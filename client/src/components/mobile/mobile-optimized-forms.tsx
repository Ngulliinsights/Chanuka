/**
 * Mobile-Optimized Forms Component
 * Provides touch-friendly form components with mobile-specific optimizations
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Search, X, ChevronDown } from 'lucide-react';
import { useResponsiveLayoutContext } from './responsive-layout-manager';
import { MobileTouchUtils } from '@/utils/mobile-touch-handler';
import { logger } from '../utils/logger.js';

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export function MobileInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  className = '',
  value,
  onChange,
  ...props
}: MobileInputProps) {
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();
  const [isFocused, setIsFocused] = useState(false);

  const inputClasses = [
    'w-full',
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-blue-500',
    'focus:border-transparent',
    // Mobile-specific optimizations
    touchOptimized && 'min-h-[44px]',
    touchOptimized && 'text-base', // Prevent zoom on iOS
    isMobile && 'text-[16px]', // Prevent zoom on iOS
    // Padding adjustments for icons
    leftIcon ? 'pl-10' : 'pl-4',
    (rightIcon || clearable) ? 'pr-10' : 'pr-4',
    'py-3',
    // Error states
    error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white',
    error ? 'focus:ring-red-500' : 'focus:ring-blue-500',
    // Focus states
    isFocused && !error && 'border-blue-500 bg-blue-50',
    className
  ].filter(Boolean).join(' ');

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    }
    // If no custom clear handler, try to clear the input
    if (onChange && !onClear) {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onClear, onChange]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          className={inputClasses}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {(rightIcon || (clearable && value)) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {clearable && value ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              rightIcon && <div className="text-gray-400">{rightIcon}</div>
            )}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface MobilePasswordInputProps extends Omit<MobileInputProps, 'type' | 'rightIcon'> {
  showPasswordToggle?: boolean;
}

export function MobilePasswordInput({
  showPasswordToggle = true,
  ...props
}: MobilePasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <MobileInput
      {...props}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        showPasswordToggle ? (
          <button
            type="button"
            onClick={togglePassword}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : undefined
      }
    />
  );
}

interface MobileSearchInputProps extends Omit<MobileInputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

export function MobileSearchInput({
  onSearch,
  searchDelay = 300,
  ...props
}: MobileSearchInputProps) {
  const [searchValue, setSearchValue] = useState(props.value || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (onSearch && searchValue !== props.value) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(searchValue as string);
      }, searchDelay);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, onSearch, searchDelay, props.value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (props.onChange) {
      props.onChange(e);
    }
  }, [props.onChange]);

  const handleClear = useCallback(() => {
    setSearchValue('');
    if (onSearch) {
      onSearch('');
    }
    if (props.onClear) {
      props.onClear();
    }
  }, [onSearch, props.onClear]);

  return (
    <MobileInput
      {...props}
      type="search"
      value={searchValue}
      onChange={handleChange}
      onClear={handleClear}
      leftIcon={<Search className="h-4 w-4" />}
      clearable={true}
      placeholder={props.placeholder || 'Search...'}
    />
  );
}

interface MobileSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MobileSelect({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false
}: MobileSelectProps) {
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const selectClasses = [
    'w-full',
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-blue-500',
    'focus:border-transparent',
    'cursor-pointer',
    // Mobile-specific optimizations
    touchOptimized && 'min-h-[44px]',
    touchOptimized && 'text-base',
    isMobile && 'text-[16px]',
    'px-4 py-3',
    // Error states
    error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white',
    error ? 'focus:ring-red-500' : 'focus:ring-blue-500',
    // Focus states
    isFocused && !error && 'border-blue-500 bg-blue-50',
    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed',
    className
  ].filter(Boolean).join(' ');

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback((optionValue: string) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  }, [onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(prev => !prev);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          // Focus next option logic would go here
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          // Focus previous option logic would go here
        }
        break;
    }
  }, [disabled, isOpen]);

  return (
    <div className="w-full" ref={selectRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          className={selectClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            <ul role="listbox" className="py-1">
              {options.map((option) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    option.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-900 hover:bg-blue-50 hover:text-blue-900'
                  } ${
                    option.value === value ? 'bg-blue-100 text-blue-900' : ''
                  } ${
                    touchOptimized ? 'min-h-[44px] flex items-center' : ''
                  }`}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
  maxHeight?: number;
}

export function MobileTextarea({
  label,
  error,
  helperText,
  autoResize = false,
  maxHeight = 200,
  className = '',
  onChange,
  ...props
}: MobileTextareaProps) {
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textareaClasses = [
    'w-full',
    'border',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-blue-500',
    'focus:border-transparent',
    'resize-none',
    // Mobile-specific optimizations
    touchOptimized && 'text-base',
    isMobile && 'text-[16px]',
    'px-4 py-3',
    'min-h-[100px]',
    // Error states
    error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white',
    error ? 'focus:ring-red-500' : 'focus:ring-blue-500',
    // Focus states
    isFocused && !error && 'border-blue-500 bg-blue-50',
    className
  ].filter(Boolean).join(' ');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
    
    if (onChange) {
      onChange(e);
    }
  }, [autoResize, maxHeight, onChange]);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [autoResize, maxHeight, props.value]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <textarea
        ref={textareaRef}
        className={textareaClasses}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={autoResize ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' } : undefined}
        {...props}
      />
      
      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function MobileForm({ children, onSubmit, className = '' }: MobileFormProps) {
  const { touchOptimized } = useResponsiveLayoutContext();

  const formClasses = [
    'w-full',
    'space-y-6',
    touchOptimized && 'space-y-8', // More spacing on touch devices
    className
  ].filter(Boolean).join(' ');

  return (
    <form className={formClasses} onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}

export default {
  MobileInput,
  MobilePasswordInput,
  MobileSearchInput,
  MobileSelect,
  MobileTextarea,
  MobileForm
};