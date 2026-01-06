/**
 * Error Message Component
 *
 * A component for displaying error messages with retry functionality
 */

import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/design-system/utils/cn';

// Note: Button and Card components not available in current design system structure
// This component is disabled and needs to be refactored to use available components

interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

// Placeholder component - disabled pending refactoring
const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ className, message, onRetry, showRetry = true, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-4 border border-red-300 rounded', className)} {...props}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Error</p>
            <p>{message}</p>
          </div>
        </div>
      </div>
    );
  }
);
ErrorMessage.displayName = 'ErrorMessage';

export { ErrorMessage };
