/**
 * ResponsiveStack Component
 * 
 * A flexible layout component that can switch between vertical (stack)
 * and horizontal (inline) layouts based on screen size.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '../lib/utils';
import { useResponsive, type Breakpoint } from '../responsive';

export interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  breakpoint?: Breakpoint;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className,
  direction = 'responsive',
  breakpoint = 'tablet',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  as: Component = 'div',
}) => {
  const { matchesBreakpoint } = useResponsive();

  const getDirectionClasses = () => {
    if (direction === 'vertical') {
      return 'flex-col';
    }
    
    if (direction === 'horizontal') {
      return 'flex-row';
    }
    
    // Responsive direction
    const isHorizontal = matchesBreakpoint(breakpoint);
    return isHorizontal ? 'flex-col sm:flex-row' : 'flex-col';
  };

  const getGapClass = () => {
    const gapMap = {
      'xs': 'gap-1',
      'sm': 'gap-2',
      'md': 'gap-3 sm:gap-4',
      'lg': 'gap-4 sm:gap-6',
      'xl': 'gap-6 sm:gap-8',
      '2xl': 'gap-8 sm:gap-10',
    };
    
    return gapMap[gap];
  };

  const getAlignClass = () => {
    const alignMap = {
      'start': 'items-start',
      'center': 'items-center',
      'end': 'items-end',
      'stretch': 'items-stretch',
    };
    
    return alignMap[align];
  };

  const getJustifyClass = () => {
    const justifyMap = {
      'start': 'justify-start',
      'center': 'justify-center',
      'end': 'justify-end',
      'between': 'justify-between',
      'around': 'justify-around',
      'evenly': 'justify-evenly',
    };
    
    return justifyMap[justify];
  };

  return (
    <Component
      className={cn(
        'responsive-stack',
        'flex',
        getDirectionClasses(),
        getGapClass(),
        getAlignClass(),
        getJustifyClass(),
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </Component>
  );
};

export default ResponsiveStack;

