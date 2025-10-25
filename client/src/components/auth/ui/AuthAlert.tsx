/**
 * Auth alert component for success and error messages
 * Following navigation component patterns for alert components
 */

import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';

export interface AuthAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onRetry?: () => void;
  retryLoading?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const AuthAlert: React.FC<AuthAlertProps> = ({
  type,
  message,
  onRetry,
  retryLoading = false,
  className,
  'data-testid': testId,
}) => {
  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300',
          iconClassName: 'text-green-600 dark:text-green-400',
        };
      case 'error':
        return {
          icon: AlertCircle,
          className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
          iconClassName: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
          iconClassName: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'info':
        return {
          icon: AlertCircle,
          className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
          iconClassName: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          icon: AlertCircle,
          className: '',
          iconClassName: '',
        };
    }
  };

  const { icon: Icon, className: alertClassName, iconClassName } = getAlertConfig();

  return (
    <Alert 
      className={cn(alertClassName, className)} 
      data-testid={testId}
      role="alert"
    >
      <Icon className={cn('h-4 w-4', iconClassName)} />
      <div className="flex items-center justify-between w-full">
        <AlertDescription className="flex-1">
          {message}
        </AlertDescription>
        
        {onRetry && type === 'error' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={retryLoading}
            className={cn(
              'ml-2 h-auto p-1 text-xs',
              'hover:bg-red-100 dark:hover:bg-red-900/30',
              'text-red-700 dark:text-red-300'
            )}
          >
            {retryLoading ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              'Retry'
            )}
          </Button>
        )}
      </div>
    </Alert>
  );
};

// Specialized alert components
export const SuccessAlert: React.FC<Omit<AuthAlertProps, 'type'>> = (props) => (
  <AuthAlert {...props} type="success" />
);

export const ErrorAlert: React.FC<Omit<AuthAlertProps, 'type'>> = (props) => (
  <AuthAlert {...props} type="error" />
);

export const WarningAlert: React.FC<Omit<AuthAlertProps, 'type'>> = (props) => (
  <AuthAlert {...props} type="warning" />
);

export const InfoAlert: React.FC<Omit<AuthAlertProps, 'type'>> = (props) => (
  <AuthAlert {...props} type="info" />
);