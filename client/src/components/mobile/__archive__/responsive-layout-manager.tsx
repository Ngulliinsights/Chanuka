/**
 * Responsive Layout Manager Component
 * Provides comprehensive responsive layout management with mobile-first approach
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useResponsiveLayout, ResponsiveState } from '@client/utils/responsive-layout';
import { MobileTouchUtils } from '@client/utils/mobile-touch-handler';
import { logger } from '@client/utils/logger';

interface ResponsiveLayoutContextType {
  state: ResponsiveState;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  touchOptimized: boolean;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  containerClasses: string;
  gridClasses: (cols: number) => string;
  spacingClasses: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => string;
}

const ResponsiveLayoutContext = createContext<ResponsiveLayoutContextType | null>(null);

interface ResponsiveLayoutProviderProps {
  children: React.ReactNode;
}

export function ResponsiveLayoutProvider({ children }: ResponsiveLayoutProviderProps) {
  const state = useResponsiveLayout();
  const [touchOptimized, setTouchOptimized] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  // Initialize touch optimization and safe area detection
  useEffect(() => {
    const isTouchDevice = MobileTouchUtils.isTouchDevice();
    setTouchOptimized(isTouchDevice);

    // Get safe area insets
    const insets = MobileTouchUtils.getSafeAreaInsets();
    setSafeAreaInsets(insets);
  }, []);

  // Memoized computed values for performance
  const computedValues = useMemo(() => {
    const { isMobile, isTablet, isDesktop, orientation } = state;
    
    // Determine device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    // Generate responsive container classes
    const containerClasses = [
      'w-full',
      'mx-auto',
      'px-4', // Base mobile padding
      'sm:px-6', // Small screens
      'lg:px-8', // Large screens
      'max-w-7xl', // Maximum width
      isMobile && 'px-4',
      isTablet && 'px-6',
      isDesktop && 'px-8'
    ].filter(Boolean).join(' ');

    // Grid classes generator
    const gridClasses = (cols: number) => {
      const baseClasses = ['grid', 'gap-4', 'sm:gap-6', 'lg:gap-8'];
      
      if (isMobile) {
        // Mobile: always single column for complex layouts
        if (cols > 2) return [...baseClasses, 'grid-cols-1'].join(' ');
        return [...baseClasses, `grid-cols-${Math.min(cols, 2)}`].join(' ');
      }
      
      if (isTablet) {
        // Tablet: max 3 columns
        const tabletCols = Math.min(cols, 3);
        return [...baseClasses, `grid-cols-1 sm:grid-cols-${tabletCols}`].join(' ');
      }
      
      // Desktop: full column support
      return [...baseClasses, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`].join(' ');
    };

    // Spacing classes generator
    const spacingClasses = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
      const spacingMap = {
        xs: isMobile ? 'p-2' : 'p-1',
        sm: isMobile ? 'p-3' : 'p-2',
        md: isMobile ? 'p-4' : 'p-4',
        lg: isMobile ? 'p-6' : 'p-6',
        xl: isMobile ? 'p-8' : 'p-8'
      };
      return spacingMap[size];
    };

    return {
      deviceType,
      containerClasses,
      gridClasses,
      spacingClasses
    };
  }, [state]);

  const contextValue: ResponsiveLayoutContextType = {
    state,
    isMobile: state.isMobile,
    isTablet: state.isTablet,
    isDesktop: state.isDesktop,
    touchOptimized,
    safeAreaInsets,
    orientation: state.orientation,
    ...computedValues
  };

  return (
    <ResponsiveLayoutContext.Provider value={contextValue}>
      {children}
    </ResponsiveLayoutContext.Provider>
  );
}

export function useResponsiveLayoutContext() {
  const context = useContext(ResponsiveLayoutContext);
  if (!context) {
    throw new Error('useResponsiveLayoutContext must be used within ResponsiveLayoutProvider');
  }
  return context;
}

/**
 * Responsive Container Component
 * Automatically applies responsive container classes
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ResponsiveContainer({ 
  children, 
  className = '', 
  maxWidth = '7xl',
  padding = 'md'
}: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useResponsiveLayoutContext();

  const containerClasses = useMemo(() => {
    const classes = ['w-full', 'mx-auto'];
    
    // Max width classes
    if (maxWidth !== 'full') {
      classes.push(`max-w-${maxWidth}`);
    }
    
    // Responsive padding
    if (padding !== 'none') {
      switch (padding) {
        case 'sm':
          classes.push('px-2 sm:px-4 lg:px-6');
          break;
        case 'md':
          classes.push('px-4 sm:px-6 lg:px-8');
          break;
        case 'lg':
          classes.push('px-6 sm:px-8 lg:px-12');
          break;
      }
    }
    
    return classes.join(' ');
  }, [maxWidth, padding]);

  return (
    <div className={`${containerClasses} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Responsive Grid Component
 * Automatically adjusts grid columns based on screen size
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns: {
    mobile?: number;
    tablet?: number;
    desktop: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  columns, 
  gap = 'md',
  className = ''
}: ResponsiveGridProps) {
  const { isMobile, isTablet } = useResponsiveLayoutContext();

  const gridClasses = useMemo(() => {
    const classes = ['grid'];
    
    // Gap classes
    switch (gap) {
      case 'sm':
        classes.push('gap-2 sm:gap-4 lg:gap-6');
        break;
      case 'md':
        classes.push('gap-4 sm:gap-6 lg:gap-8');
        break;
      case 'lg':
        classes.push('gap-6 sm:gap-8 lg:gap-12');
        break;
    }
    
    // Column classes
    const mobileCols = columns.mobile || 1;
    const tabletCols = columns.tablet || columns.desktop;
    const desktopCols = columns.desktop;
    
    classes.push(`grid-cols-${mobileCols}`);
    if (tabletCols !== mobileCols) {
      classes.push(`sm:grid-cols-${tabletCols}`);
    }
    if (desktopCols !== tabletCols) {
      classes.push(`lg:grid-cols-${desktopCols}`);
    }
    
    return classes.join(' ');
  }, [columns, gap]);

  return (
    <div className={`${gridClasses} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Touch-Optimized Button Component
 * Automatically adjusts for touch devices
 */
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function TouchButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}: TouchButtonProps) {
  const { touchOptimized } = useResponsiveLayoutContext();

  const buttonClasses = useMemo(() => {
    const classes = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'rounded-lg',
      'transition-all',
      'duration-200',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2'
    ];

    // Touch optimization
    if (touchOptimized) {
      classes.push('touch-manipulation', 'select-none');
      
      // Minimum touch target size
      switch (size) {
        case 'sm':
          classes.push('min-h-[40px]', 'min-w-[40px]', 'px-3', 'py-2', 'text-sm');
          break;
        case 'md':
          classes.push('min-h-[44px]', 'min-w-[44px]', 'px-4', 'py-2', 'text-base');
          break;
        case 'lg':
          classes.push('min-h-[48px]', 'min-w-[48px]', 'px-6', 'py-3', 'text-lg');
          break;
      }
    } else {
      // Regular desktop sizing
      switch (size) {
        case 'sm':
          classes.push('px-3', 'py-1.5', 'text-sm');
          break;
        case 'md':
          classes.push('px-4', 'py-2', 'text-base');
          break;
        case 'lg':
          classes.push('px-6', 'py-3', 'text-lg');
          break;
      }
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        classes.push(
          'bg-blue-600',
          'text-white',
          'hover:bg-blue-700',
          'focus:ring-blue-500',
          'active:bg-blue-800'
        );
        break;
      case 'secondary':
        classes.push(
          'bg-gray-600',
          'text-white',
          'hover:bg-gray-700',
          'focus:ring-gray-500',
          'active:bg-gray-800'
        );
        break;
      case 'outline':
        classes.push(
          'border',
          'border-gray-300',
          'text-gray-700',
          'bg-white',
          'hover:bg-gray-50',
          'focus:ring-blue-500',
          'active:bg-gray-100'
        );
        break;
      case 'ghost':
        classes.push(
          'text-gray-700',
          'hover:bg-gray-100',
          'focus:ring-blue-500',
          'active:bg-gray-200'
        );
        break;
    }

    return classes.join(' ');
  }, [variant, size, touchOptimized]);

  return (
    <button className={`${buttonClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}

/**
 * Safe Area Wrapper Component
 * Handles safe area insets for devices with notches
 */
interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function SafeAreaWrapper({ 
  children, 
  className = '',
  edges = ['top', 'right', 'bottom', 'left']
}: SafeAreaWrapperProps) {
  const safeAreaClasses = useMemo(() => {
    const classes: string[] = [];

    if (edges.includes('top')) {
      classes.push('pt-[max(12px,env(safe-area-inset-top))]');
    }
    if (edges.includes('right')) {
      classes.push('pr-[max(16px,env(safe-area-inset-right))]');
    }
    if (edges.includes('bottom')) {
      classes.push('pb-[max(12px,env(safe-area-inset-bottom))]');
    }
    if (edges.includes('left')) {
      classes.push('pl-[max(16px,env(safe-area-inset-left))]');
    }

    return classes.join(' ');
  }, [edges]);

  return (
    <div className={`${safeAreaClasses} ${className}`}>
      {children}
    </div>
  );
}

export default ResponsiveLayoutProvider;

