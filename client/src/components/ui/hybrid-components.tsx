/**
 * Hybrid Component Examples
 *
 * This file demonstrates how to create hybrid components that combine
 * shadcn/ui components with custom design system features.
 */

import React, { useState, useCallback } from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { Progress } from './progress';
import { Alert, AlertDescription } from './alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { cn } from '../../lib/utils';
import { logger } from '../../utils/browser-logger';

// Enhanced Button with Loading States
export const HybridButtonExample = ({
  children,
  onClick,
  loading = false,
  success = false,
  error = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = loading || internalLoading;

  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;

    setInternalLoading(true);
    try {
      await onClick?.(event);
    } catch (err) {
      logger.error('Button click error:', err);
    } finally {
      setInternalLoading(false);
    }
  }, [onClick, isLoading]);

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'btn-enhanced',
        isLoading && 'animate-pulse',
        success && 'bg-green-600 hover:bg-green-700',
        error && 'bg-red-600 hover:bg-red-700',
        className
      )}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </Button>
  );
};

// Enhanced Card with Status Indicators
export const StatusCardExample = ({
  title,
  children,
  status = 'default',
  className,
  ...props
}: {
  title?: string;
  children: React.ReactNode;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  [key: string]: any;
}) => {
  const statusColors = {
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
    default: ''
  };

  const badgeVariant = status === 'error' ? 'destructive' : status === 'warning' ? 'secondary' : 'default';

  return (
    <Card
      className={cn('card-enhanced', statusColors[status], className)}
      {...props}
    >
      {title && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            {status !== 'default' && (
              <Badge variant={badgeVariant} className="status-indicator">
                {status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

// Form Field with Validation
export const ValidatedInputExample = ({
  label,
  error,
  success,
  required,
  className,
  ...props
}: {
  label?: string;
  error?: string;
  success?: string;
  required?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className={cn(required && 'after:content-["*"] after:text-red-500 after:ml-1')}>
          {label}
        </Label>
      )}
      <Input
        className={cn(
          error && 'border-red-500 focus:border-red-500',
          success && 'border-green-500 focus:border-green-500'
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">{success}</p>
      )}
    </div>
  );
};

// Progress Card for Dashboard
export const ProgressCardExample = ({
  title,
  value,
  max = 100,
  status = 'default',
  description,
  className,
  ...props
}: {
  title: string;
  value: number;
  max?: number;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
  description?: string;
  className?: string;
  [key: string]: any;
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <StatusCardExample title={title} status={status} className={className} {...props}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">
            {percentage.toFixed(1)}%
          </span>
        </div>
        <Progress value={percentage} className="w-full" />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </StatusCardExample>
  );
};

// Alert with Auto-dismiss
export const AutoDismissAlertExample = ({
  children,
  duration = 5000,
  onDismiss,
  className,
  ...props
}: {
  children: React.ReactNode;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
  [key: string]: any;
}) => {
  const [visible, setVisible] = useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <Alert className={cn('animate-fade-in', className)} {...props}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
};

// Loading State Component
export const LoadingStateExample = ({
  message = 'Loading...',
  size = 'default',
  className,
  ...props
}: {
  message?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  [key: string]: any;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center space-x-2', className)} {...props}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
          sizeClasses[size]
        )}
      />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
};

// Data Table with Custom Features
export const EnhancedTableExample = ({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  className,
  ...props
}: {
  data?: any[];
  columns: Array<{ key: string; header: string; render?: (value: any, row: any, index: number) => React.ReactNode }>;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  [key: string]: any;
}) => {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)} {...props}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b hover:bg-muted/50 transition-colors"
            >
              {columns.map((column, colIndex) => (
                <td key={column.key || colIndex} className="p-4 align-middle">
                  {column.render
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Modal/Dialog with Enhanced Features
export const EnhancedDialogExample = ({
  children,
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  className,
  ...props
}: {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
  [key: string]: any;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <HybridButtonExample
            onClick={onConfirm}
            loading={loading}
            loadingText="Processing..."
            className=""
          >
            {confirmText}
          </HybridButtonExample>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Export all components
export {
  HybridButtonExample as HybridButton,
  StatusCardExample as StatusCard,
  ValidatedInputExample as ValidatedInput,
  ProgressCardExample as ProgressCard,
  AutoDismissAlertExample as AutoDismissAlert,
  LoadingStateExample as LoadingState,
  EnhancedTableExample as EnhancedTable,
  EnhancedDialogExample as EnhancedDialog
};