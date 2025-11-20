/**
 * ResponsiveGrid Component
 * 
 * A grid component that automatically adapts column count based on
 * screen size, providing consistent layouts across all devices.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '@client/lib/utils';
import { useResponsive, type ResponsiveValue } from '../responsive';

export interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: ResponsiveValue<number> | 'auto';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  minItemWidth?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  columns = 'auto',
  gap = 'md',
  minItemWidth,
  as: Component = 'div',
}) => {
  const { getResponsiveValue, currentBreakpoint } = useResponsive();

  const getGridColumns = () => {
    if (columns === 'auto') {
      // Default responsive column behavior
      const autoColumns: ResponsiveValue<number> = {
        mobile: 1,
        'mobile-lg': 2,
        tablet: 2,
        'tablet-lg': 3,
        laptop: 4,
        'laptop-lg': 6,
        desktop: 8,
        'desktop-xl': 12,
      };
      return getResponsiveValue(autoColumns) || 1;
    }
    
    if (typeof columns === 'object') {
      return getResponsiveValue(columns) || 1;
    }
    
    return columns;
  };

  const getGapClass = () => {
    const gapMap = {
      'xs': 'gap-2',
      'sm': 'gap-3',
      'md': 'gap-4 sm:gap-6',
      'lg': 'gap-6 sm:gap-8',
      'xl': 'gap-8 sm:gap-10',
      '2xl': 'gap-10 sm:gap-12',
    };
    
    return gapMap[gap];
  };

  const getGridTemplateColumns = () => {
    const columnCount = getGridColumns();
    
    if (minItemWidth) {
      return `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`;
    }
    
    return `repeat(${columnCount}, minmax(0, 1fr))`;
  };

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: getGridTemplateColumns(),
  };

  return (
    <Component
      className={cn(
        'responsive-grid',
        'grid w-full',
        getGapClass(),
        className
      )}
      style={gridStyle}
    >
      {children}
    </Component>
  );
};

export default ResponsiveGrid;

