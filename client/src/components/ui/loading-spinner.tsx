/**
 * Loading Spinner Component
 * Reusable loading spinner with different sizes and variants
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'muted';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  default: 'text-gray-600',
  primary: 'text-blue-600',
  secondary: 'text-gray-400',
  muted: 'text-gray-300',
};

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 
          className={cn(
            'animate-spin',
            sizeClasses[size],
            variantClasses[variant]
          )} 
        />
        {text && (
          <p className={cn(
            'text-sm',
            variantClasses[variant]
          )}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}