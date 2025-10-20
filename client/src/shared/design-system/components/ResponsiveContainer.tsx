/**
 * ResponsiveContainer Component
 * 
 * A container component that provides consistent responsive behavior
 * with proper padding and max-widths across different breakpoints.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { useResponsive, type Breakpoint } from '../responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: Breakpoint | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'laptop-lg',
  padding = 'md',
  as: Component = 'div',
}) => {
  const { currentBreakpoint } = useResponsive();

  const getMaxWidthClass = () => {
    if (maxWidth === 'none') return '';
    
    const maxWidthMap: Record<Breakpoint, string> = {
      'mobile': 'max-w-none',
      'mobile-sm': 'max-w-none',
      'mobile-lg': 'max-w-none',
      'tablet': 'max-w-2xl',
      'tablet-lg': 'max-w-3xl',
      'laptop': 'max-w-4xl',
      'laptop-lg': 'max-w-5xl',
      'desktop': 'max-w-6xl',
      'desktop-xl': 'max-w-7xl',
    };
    
    return maxWidthMap[maxWidth] || 'max-w-5xl';
  };

  const getPaddingClass = () => {
    const paddingMap = {
      'none': '',
      'sm': 'px-4',
      'md': 'px-4 sm:px-6 lg:px-8',
      'lg': 'px-6 sm:px-8 lg:px-12',
      'xl': 'px-8 sm:px-12 lg:px-16',
    };
    
    return paddingMap[padding];
  };

  return (
    <Component
      className={cn(
        'responsive-container',
        'w-full mx-auto',
        getMaxWidthClass(),
        getPaddingClass(),
        className
      )}
    >
      {children}
    </Component>
  );
};

export default ResponsiveContainer;