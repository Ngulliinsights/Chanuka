/**
 * Mobile-Optimized Forms Component
 * Provides touch-friendly form components with mobile-specific optimizations
 *
 * FIXES APPLIED:
 * ✓ Fixed all ARIA attribute values to be proper booleans (not expressions)
 * ✓ Added aria-controls to combobox (MobileSelect)
 * ✓ Removed unused imports (MobileTouchUtils, logger)
 * ✓ Added accessible names to all input fields via proper label association
 * ✓ Removed inline styles completely - using className approach
 * ✓ Added proper ARIA attributes and error/helper text associations
 */

import { Eye, EyeOff, Search, X, ChevronDown } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";

import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateText,
  sanitizeInput,
  ValidationResult
} from '@client/utils/input-validation';

import { useResponsiveLayoutContext } from "./responsive-layout-manager";


interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  validationType?: 'email' | 'phone' | 'text' | 'password';
  validationOptions?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    customPattern?: RegExp;
    customMessage?: string;
  };
  onValidationChange?: (result: ValidationResult) => void;
}

export function MobileInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  className = "",
  value,
  onChange,
  id,
  validationType,
  validationOptions,
  onValidationChange,
  ...props
}: MobileInputProps) {
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const inputClasses = [
    "w-full",
    "border",
    "rounded-lg",
    "transition-all",
    "duration-200",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-blue-500",
    "focus:border-transparent",
    // Mobile-specific optimizations
    touchOptimized && "min-h-[44px]",
    touchOptimized && "text-base", // Prevent zoom on iOS
    isMobile && "text-[16px]", // Prevent zoom on iOS
    // Padding adjustments for icons
    leftIcon ? "pl-10" : "pl-4",
    rightIcon || clearable ? "pr-10" : "pr-4",
    "py-3",
    // Error states
    error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white",
    error ? "focus:ring-red-500" : "focus:ring-blue-500",
    // Focus states
    isFocused && !error && "border-blue-500 bg-blue-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const validateInput = useCallback((inputValue: string) => {
    if (!validationType) return;

    let result: ValidationResult;

    switch (validationType) {
      case 'email':
        result = validateEmail(inputValue);
        break;
      case 'phone':
        result = validatePhone(inputValue);
        break;
      case 'password':
        result = validatePassword(inputValue);
        break;
      case 'text':
        result = validateText(inputValue, validationOptions || {});
        break;
      default:
        return;
    }

    const errorMessage = result.errors.length > 0 ? result.errors[0] : "";
    setValidationError(errorMessage || "");

    if (onValidationChange) {
      onValidationChange(result);
    }

    return result;
  }, [validationType, validationOptions, onValidationChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Sanitize input
    const sanitizedValue = sanitizeInput(inputValue, {
      maxLength: validationOptions?.maxLength,
      trim: true,
    });

    // Create sanitized event
    const sanitizedEvent = {
      ...e,
      target: {
        ...e.target,
        value: sanitizedValue,
      },
    };

    // Validate if validation is enabled
    if (validationType) {
      validateInput(sanitizedValue);
    }

    // Call original onChange with sanitized value
    if (onChange) {
      onChange(sanitizedEvent);
    }
  }, [onChange, validationType, validationOptions, validateInput]);

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    }
    // If no custom clear handler, try to clear the input
    if (onChange && !onClear) {
      const sanitizedEvent = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(sanitizedEvent);
    }

    // Clear validation error
    setValidationError("");
    if (onValidationChange) {
      onValidationChange({ isValid: true, errors: [] });
    }
  }, [onClear, onChange, onValidationChange]);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
            aria-hidden="true"
          >
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={inputClasses}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={(error || validationError) ? 'true' : 'false'}
          aria-describedby={
            error || validationError
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-helper`
              : undefined
          }
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
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              rightIcon && (
                <div
                  className="text-gray-400 pointer-events-none"
                  aria-hidden="true"
                >
                  {rightIcon}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {(error || validationError || helperText) && (
        <div className="mt-2">
          {(error || validationError) && (
            <p
              id={`${inputId}-error`}
              className="text-sm text-red-600"
              role="alert"
            >
              {error || validationError}
            </p>
          )}
          {helperText && !error && !validationError && (
            <p id={`${inputId}-helper`} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface MobilePasswordInputProps
  extends Omit<MobileInputProps, "type" | "rightIcon"> {
  showPasswordToggle?: boolean;
}

export function MobilePasswordInput({
  showPasswordToggle = true,
  ...props
}: MobilePasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <MobileInput
      {...props}
      type={showPassword ? "text" : "password"}
      rightIcon={
        showPasswordToggle ? (
          <button
            type="button"
            onClick={togglePassword}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : undefined
      }
    />
  );
}

interface MobileSearchInputProps
  extends Omit<MobileInputProps, "leftIcon" | "type"> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

export function MobileSearchInput({
  onSearch,
  searchDelay = 300,
  value: propValue,
  onChange: propOnChange,
  onClear: propOnClear,
  ...props
}: MobileSearchInputProps) {
  const [searchValue, setSearchValue] = useState(propValue || "");
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (onSearch && searchValue !== propValue) {
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
  }, [searchValue, onSearch, searchDelay, propValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
      if (propOnChange) {
        propOnChange(e);
      }
    },
    [propOnChange]
  );

  const handleClear = useCallback(() => {
    setSearchValue("");
    if (onSearch) {
      onSearch("");
    }
    if (propOnClear) {
      propOnClear();
    }
  }, [onSearch, propOnClear]);

  return (
    <MobileInput
      {...props}
      type="search"
      value={searchValue}
      onChange={handleChange}
      onClear={handleClear}
      leftIcon={<Search className="h-4 w-4" />}
      clearable={true}
      placeholder={props.placeholder || "Search..."}
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
  id?: string;
}

export function MobileSelect({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  id,
}: MobileSelectProps) {
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const listboxId = `listbox-${Math.random().toString(36).substr(2, 9)}`;
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const selectedOption = options.find((option) => option.value === value);

  const selectClasses = [
    "w-full",
    "border",
    "rounded-lg",
    "transition-all",
    "duration-200",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-blue-500",
    "focus:border-transparent",
    "cursor-pointer",
    // Mobile-specific optimizations
    touchOptimized && "min-h-[44px]",
    touchOptimized && "text-base",
    isMobile && "text-[16px]",
    "px-4 py-3",
    // Error states
    error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white",
    error ? "focus:ring-red-500" : "focus:ring-blue-500",
    // Focus states
    isFocused && !error && "border-blue-500 bg-blue-50",
    // Disabled state
    disabled && "opacity-50 cursor-not-allowed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (onChange) {
        onChange(optionValue);
      }
      setIsOpen(false);
    },
    [onChange]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          setIsOpen((prev) => !prev);
          break;
        case "Escape":
          setIsOpen(false);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            // Could add focus management here
          }
          break;
      }
    },
    [disabled, isOpen]
  );

  return (
    <div className="w-full" ref={selectRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <div
          id={selectId}
          className={selectClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen ? 'true' : 'false'}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={label || placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${selectId}-error`
              : helperText
              ? `${selectId}-helper`
              : undefined
          }
        >
          <div className="flex items-center justify-between">
            <span
              className={selectedOption ? "text-gray-900" : "text-gray-500"}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? "transform rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            <ul
              id={listboxId}
              role="listbox"
              className="py-1"
              aria-label={label || placeholder}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                const isDisabled = option.disabled || false;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected ? 'true' : 'false'}
                    aria-disabled={isDisabled ? 'true' : 'false'}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isDisabled
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-900 hover:bg-blue-50 hover:text-blue-900"
                    } ${isSelected ? "bg-blue-100 text-blue-900" : ""} ${
                      touchOptimized ? "min-h-[44px] flex items-center" : ""
                    }`}
                    onClick={() => !isDisabled && handleSelect(option.value)}
                  >
                    {option.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p
              id={`${selectId}-error`}
              className="text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
          {helperText && !error && (
            <p id={`${selectId}-helper`} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface MobileTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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
  className = "",
  onChange,
  id,
  ...props
}: MobileTextareaProps) {
  const { touchOptimized, isMobile } = useResponsiveLayoutContext();
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId =
    id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const textareaClasses = [
    "w-full",
    "border",
    "rounded-lg",
    "transition-all",
    "duration-200",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-blue-500",
    "focus:border-transparent",
    "resize-none",
    // Mobile-specific optimizations
    touchOptimized && "text-base",
    isMobile && "text-[16px]",
    "px-4 py-3",
    "min-h-[100px]",
    // Error states
    error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white",
    error ? "focus:ring-red-500" : "focus:ring-blue-500",
    // Focus states
    isFocused && !error && "border-blue-500 bg-blue-50",
    // Auto-resize specific classes
    autoResize && "overflow-auto",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
      }

      if (onChange) {
        onChange(e);
      }
    },
    [autoResize, maxHeight, onChange]
  );

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [autoResize, maxHeight, props.value]);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        ref={textareaRef}
        className={textareaClasses}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error
            ? `${textareaId}-error`
            : helperText
            ? `${textareaId}-helper`
            : undefined
        }
        {...props}
      />

      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p
              id={`${textareaId}-error`}
              className="text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
          {helperText && !error && (
            <p id={`${textareaId}-helper`} className="text-sm text-gray-500">
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

export function MobileForm({
  children,
  onSubmit,
  className = "",
}: MobileFormProps) {
  const { touchOptimized } = useResponsiveLayoutContext();

  const formClasses = [
    "w-full",
    "space-y-6",
    touchOptimized && "space-y-8", // More spacing on touch devices
    className,
  ]
    .filter(Boolean)
    .join(" ");

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
  MobileForm,
};
