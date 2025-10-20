/**
 * TouchTarget Component
 * 
 * A component that ensures touch-friendly interactions with proper
 * minimum sizes and spacing for mobile devices.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { useResponsive } from '../responsive';

interface TouchTargetProps {
  children: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  as?: keyof JSX.IntrinsicElements;
  onClick?: (event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  disabled?: boolean;
  'aria-label'?: string;
  role?: string;
  tabIndex?: number;
}

export const TouchTarget: React.FC<TouchTargetProps> = ({
  children,
  className,
  size = 'medium',
  as: Component = 'div',
  onClick,
  onKeyDown,
  disabled = false,
  'aria-label': ariaLabel,
  role,
  tabIndex,
  ...props
}) => {
  const { isTouchDevice } = useResponsive();

  const getSizeClasses = () => {
    const sizeMap = {
      small: isTouchDevice 
        ? 'min-h-[36px] min-w-[36px] p-2' 
        : 'min-h-[32px] min-w-[32px] p-1.5',
      medium: isTouchDevice 
        ? 'min-h-[44px] min-w-[44px] p-2.5' 
        : 'min-h-[36px] min-w-[36px] p-2',
      large: isTouchDevice 
        ? 'min-h-[48px] min-w-[48px] p-3' 
        : 'min-h-[40px] min-w-[40px] p-2.5',
    };
    
    return sizeMap[size];
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    // Handle Enter and Space key presses for accessibility
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault();
      onClick(event as any);
    }
    
    onKeyDown?.(event);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;
    onClick?.(event);
  };

  const isInteractive = onClick || onKeyDown;

  return (
    <Component
      className={cn(
        'touch-target',
        'inline-flex items-center justify-center',
        'rounded-md transition-all duration-200',
        getSizeClasses(),
        isInteractive && [
          'cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'hover:bg-gray-100 active:bg-gray-200',
          'dark:hover:bg-gray-800 dark:active:bg-gray-700',
          isTouchDevice && [
            'touch-manipulation',
            'select-none',
            '-webkit-tap-highlight-color: rgba(0, 0, 0, 0.1)',
          ],
        ],
        disabled && [
          'opacity-50 cursor-not-allowed pointer-events-none',
        ],
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      role={role || (isInteractive ? 'button' : undefined)}
      tabIndex={isInteractive ? (tabIndex ?? 0) : tabIndex}
      {...props}
    >
      {children}
    </Component>
  );
};

export default TouchTarget;