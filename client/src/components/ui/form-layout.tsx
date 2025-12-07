/**
 * Form Layout Components
 * Provides structured layout components for complex forms
 */

import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@client/lib/utils';

import { Button } from './button';
import { Card, CardContent } from './card';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
  completed?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  required = false,
  error = false,
  completed = false,
  collapsible = false,
  defaultOpen = true,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-[hsl(var(--color-destructive))]" />;
    if (completed) return <CheckCircle className="h-4 w-4 text-[hsl(var(--color-success))]" />;
    return <Clock className="h-4 w-4 text-[hsl(var(--color-muted-foreground))]" />;
  };

  const getBorderColor = () => {
    if (error) return 'border-[hsl(var(--color-destructive-border))]';
    if (completed) return 'border-[hsl(var(--color-success-border))]';
    return 'border-[hsl(var(--color-border))]';
  };

  return (
    <div className={cn('border rounded-lg', getBorderColor(), className)}>
      <div
        className={cn(
          'p-4 border-b',
          getBorderColor(),
          collapsible && cn('cursor-pointer hover:bg-[hsl(var(--color-muted))]', 'transition-colors duration-150')
        )}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-medium text-[hsl(var(--color-foreground))]">
                {title}
                {required && <span className="text-[hsl(var(--color-destructive))] ml-1">*</span>}
              </h3>
              {description && (
                <p className="text-sm text-[hsl(var(--color-muted-foreground))] mt-1">{description}</p>
              )}
            </div>
          </div>
          {collapsible && (
            <div className="text-[hsl(var(--color-muted-foreground))]">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
      </div>
      {(!collapsible || isOpen) && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

interface Step {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  error?: boolean;
}

interface FormStepIndicatorProps {
  steps: Step[];
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
    <div className={cn('mb-8', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  'flex flex-col items-center space-y-2',
                  onStepClick && 'cursor-pointer'
                )}
                onClick={() => onStepClick?.(step.id)}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    isCurrent && 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]',
                    isPast && step.completed && 'bg-[hsl(var(--color-success))] text-[hsl(var(--color-success-foreground))]',
                    isPast && step.error && 'bg-[hsl(var(--color-destructive))] text-[hsl(var(--color-destructive-foreground))]',
                    isPast && !step.completed && !step.error && 'bg-[hsl(var(--color-muted))] text-[hsl(var(--color-muted-foreground))]',
                    isFuture && 'bg-[hsl(var(--color-muted))] text-[hsl(var(--color-muted-foreground))]'
                  )}
                >
                  {isPast && step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isPast && step.error ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-[hsl(var(--color-primary))]',
                      isPast && 'text-[hsl(var(--color-foreground))]',
                      isFuture && 'text-[hsl(var(--color-muted-foreground))]'
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-[hsl(var(--color-muted-foreground))] mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-4',
                    index < currentIndex ? 'bg-[hsl(var(--color-success))]' : 'bg-[hsl(var(--color-border))]'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface FormFieldGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  children,
  orientation = 'vertical',
  spacing = 'md',
  className
}) => {
  const spacingClasses = {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6'
  };

  const horizontalSpacingClasses = {
    xs: 'space-x-2',
    sm: 'space-x-3',
    md: 'space-x-4',
    lg: 'space-x-6'
  };

  return (
    <div
      className={cn(
        orientation === 'vertical' ? spacingClasses[spacing] : `flex ${horizontalSpacingClasses[spacing]}`,
        className
      )}
    >
      {children}
    </div>
  );
};

interface ValidationError {
  field: string;
  message: string;
  section?: string;
}

interface FormValidationSummaryProps {
  errors: ValidationError[];
  title?: string;
  className?: string;
}

export const FormValidationSummary: React.FC<FormValidationSummaryProps> = ({
  errors,
  title = 'Please correct the following errors:',
  className
}) => {
  if (errors.length === 0) return null;

  return (
    <Card className={cn('border-[hsl(var(--color-destructive-border))] bg-[hsl(var(--color-destructive-bg))]', className)}>
      <CardContent className="pt-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-[hsl(var(--color-destructive))] mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-[hsl(var(--color-destructive-text))] mb-2">{title}</h4>
            <ul className="text-sm text-[hsl(var(--color-destructive-text))] space-y-1">
              {errors.map((error, index) => (
                <li key={index}>
                  {error.section && (
                    <span className="font-medium">{error.section}: </span>
                  )}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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
    <Card className={cn('border-[hsl(var(--color-success-border))] bg-[hsl(var(--color-success-bg))]', className)}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-[hsl(var(--color-success-light))] rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-[hsl(var(--color-success))]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[hsl(var(--color-success-text))]">{message}</h3>
            {details && (
              <p className="text-sm text-[hsl(var(--color-success-text))] mt-2">{details}</p>
            )}
          </div>
          {actions && actions.length > 0 && (
            <div className="flex justify-center space-x-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  onClick={action.onClick}
                  size="sm"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface FormHelpTextProps {
  children: React.ReactNode;
  className?: string;
}

export const FormHelpText: React.FC<FormHelpTextProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('text-sm text-[hsl(var(--color-muted-foreground))] bg-[hsl(var(--color-muted))] p-3 rounded-md', className)}>
      {children}
    </div>
  );
};