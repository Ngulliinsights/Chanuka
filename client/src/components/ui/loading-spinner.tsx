/**
 * Loading Spinner Component
 * Unified loading spinner with consistent styling using Lucide icon
 */

import { cn } from '@client/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <Loader2 
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}

// Export as Spinner for backward compatibility
export const Spinner = LoadingSpinner;
export default LoadingSpinner;