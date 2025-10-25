/**
 * Enhanced form layout components with consistent visual hierarchy
 * Implements progressive disclosure patterns and accessibility features
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';

// Form section with progressive disclosure
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  required?: boolean;
  error?: boolean;
  completed?: boolean;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export const FormSection = forwardRef<HTMLDivElement, FormSectionProps>(
  ({ 
    title, 
    description, 
    children, 
    collapsible = false,
    defaultOpen = true,
    required = false,
    error = false,
    completed = false,
    className,
    onToggle,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const sectionRef = useRef<HTMLDivElement>(null);

    const handleToggle = useCallback(() => {
      const newState = !isOpen;
      setIsOpen(newState);
      onToggle?.(newState);
    }, [isOpen, onToggle]);

    // Auto-scroll to section when opened
    useEffect(() => {
      if (isOpen && collapsible && sectionRef.current) {
        sectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }, [isOpen, collapsible]);

    const sectionContent = (
      <div 
        ref={sectionRef}
        className={cn(
          'border rounded-lg transition-all duration-200',
          error && 'border-destructive bg-destructive/5',
          completed && 'border-green-500 bg-green-50',
          !error && !completed && 'border-border',
          className
        )}
        {...props}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <h3 className={cn(
                  'text-lg font-semibold',
                  error && 'text-destructive',
                  completed && 'text-green-700'
                )}>
                  {title}
                  {required && (
                    <span className="text-destructive ml-1" aria-label="required">*</span>
                  )}
                </h3>
                
                {/* Status indicators */}
                {error && (
                  <AlertCircle 
                    className="h-5 w-5 text-destructive" 
                    aria-label="Section has errors"
                  />
                )}
                {completed && !error && (
                  <CheckCircle 
                    className="h-5 w-5 text-green-600" 
                    aria-label="Section completed"
                  />
                )}
              </div>
            </div>
            
            {collapsible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                className="p-2"
                aria-expanded={isOpen}
                aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isOpen ? 'Collapse' : 'Expand'} {title} section
                </span>
              </Button>
            )}
          </div>
          
          {description && (
            <p className={cn(
              'text-sm text-muted-foreground mb-6',
              error && 'text-destructive/80'
            )}>
              {description}
            </p>
          )}
          
          <div 
            id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className={cn(
              'transition-all duration-200',
              collapsible && !isOpen && 'hidden'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );

    if (collapsible) {
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div ref={ref}>
            {sectionContent}
          </div>
        </Collapsible>
      );
    }

    return <div ref={ref}>{sectionContent}</div>;
  }
);
FormSection.displayName = 'FormSection';

// Form step indicator for multi-step forms
interface FormStepIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    completed?: boolean;
    error?: boolean;
  }>;
  currentStep: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export const FormStepIndicator: React.FC<FormStepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
  className
}) => {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <nav 
      aria-label="Form progress"
      className={cn('mb-8', className)}
    >
      <ol className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = step.completed || index < currentIndex;
          const isClickable = onStepClick && (isCompleted || isCurrent);
          
          return (
            <li key={step.id} className="flex items-center">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    isCompleted && !isCurrent && 'bg-green-600 text-white',
                    step.error && 'bg-destructive text-destructive-foreground',
                    !isCurrent && !isCompleted && !step.error && 'bg-muted text-muted-foreground',
                    isClickable && 'hover:bg-primary/80 cursor-pointer',
                    !isClickable && 'cursor-not-allowed'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${step.title}${step.completed ? ' (completed)' : ''}${step.error ? ' (has errors)' : ''}`}
                >
                  {step.error ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                
                <div className="ml-3 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-primary',
                    isCompleted && 'text-green-700',
                    step.error && 'text-destructive',
                    !isCurrent && !isCompleted && !step.error && 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="ml-4 w-8 h-px bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Form field group with consistent spacing
interface FormFieldGroupProps {
  children: React.ReactNode;
  orientation?: 'vertical' | 'horizontal';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  children,
  orientation = 'vertical',
  spacing = 'md',
  className
}) => {
  const spacingClasses = {
    sm: orientation === 'vertical' ? 'space-y-3' : 'space-x-3',
    md: orientation === 'vertical' ? 'space-y-4' : 'space-x-4',
    lg: orientation === 'vertical' ? 'space-y-6' : 'space-x-6'
  };

  return (
    <div 
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-end',
        spacingClasses[spacing],
        className
      )}
    >
      {children}
    </div>
  );
};

// Form validation summary
interface FormValidationSummaryProps {
  errors: Array<{
    field: string;
    message: string;
    section?: string;
  }>;
  onErrorClick?: (field: string) => void;
  className?: string;
}

export const FormValidationSummary: React.FC<FormValidationSummaryProps> = ({
  errors,
  onErrorClick,
  className
}) => {
  if (errors.length === 0) return null;

  return (
    <div 
      className={cn(
        'rounded-md bg-destructive/15 p-4 border border-destructive/20 mb-6',
        className
      )}
      role="alert"
      aria-labelledby="form-errors-heading"
    >
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 id="form-errors-heading" className="text-sm font-medium text-destructive mb-2">
            Please correct the following {errors.length === 1 ? 'error' : 'errors'}:
          </h3>
          <ul className="text-sm text-destructive space-y-1">
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`}>
                {onErrorClick ? (
                  <button
                    type="button"
                    className="underline hover:no-underline text-left"
                    onClick={() => onErrorClick(error.field)}
                  >
                    {error.section ? `${error.section}: ` : ''}{error.message}
                  </button>
                ) : (
                  <span>
                    {error.section ? `${error.section}: ` : ''}{error.message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Form success indicator
interface FormSuccessIndicatorProps {
  message: string;
  details?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  }>;
  className?: string;
}

export const FormSuccessIndicator: React.FC<FormSuccessIndicatorProps> = ({
  message,
  details,
  actions,
  className
}) => {
  return (
    <div 
      className={cn(
        'rounded-md bg-green-50 p-4 border border-green-200 mb-6',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-green-800 mb-1">
            {message}
          </h3>
          {details && (
            <p className="text-sm text-green-700 mb-3">
              {details}
            </p>
          )}
          {actions && actions.length > 0 && (
            <div className="flex space-x-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  type="button"
                  variant={action.variant || 'default'}
                  size="sm"
                  onClick={action.onClick}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Form help text with info icon
interface FormHelpTextProps {
  children: React.ReactNode;
  className?: string;
}

export const FormHelpText: React.FC<FormHelpTextProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('flex items-start space-x-2 text-sm text-muted-foreground', className)}>
      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
};