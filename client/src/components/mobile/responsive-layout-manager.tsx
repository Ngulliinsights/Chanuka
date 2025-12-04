/**
 * Responsive Layout Manager Component
 * A comprehensive responsive layout system with mobile-first design principles
 * Optimized for performance and accessibility across all device types
 */

import React, { createContext, useContext, useEffect, useState, useMemo, forwardRef, useCallback } from 'react';

// Type definitions for better type safety and developer experience
interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ResponsiveLayoutContextType {
  state: ResponsiveState;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  touchOptimized: boolean;
  safeAreaInsets: SafeAreaInsets;
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  containerClasses: string;
  gridClasses: (cols: number) => string;
  spacingClasses: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => string;
}

const ResponsiveLayoutContext = createContext<ResponsiveLayoutContextType | null>(null);

// Custom hook for responsive layout detection with debounced resize handling
function useResponsiveState(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initialize with current window dimensions to prevent hydration mismatches
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    return {
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      width,
      height,
      orientation: width > height ? 'landscape' : 'portrait'
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Debounced resize handler improves performance during window resizing
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setState({
          isMobile: width < 640,
          isTablet: width >= 640 && width < 1024,
          isDesktop: width >= 1024,
          width,
          height,
          orientation: width > height ? 'landscape' : 'portrait'
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return state;
}

// Utility functions for mobile touch detection
const MobileTouchUtils = {
  isTouchDevice: (): boolean => {
    // Check multiple indicators for touch capability to ensure accuracy
    return (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      // @ts-expect-error - Legacy IE support
      (navigator.msMaxTouchPoints > 0)
    );
  },

  getSafeAreaInsets: (): SafeAreaInsets => {
    // Parse CSS environment variables for safe area insets on devices with notches
    const getInset = (prop: string): number => {
      if (typeof window === 'undefined') return 0;
      const value = getComputedStyle(document.documentElement).getPropertyValue(prop);
      return parseFloat(value) || 0;
    };

    return {
      top: getInset('--safe-area-inset-top') || getInset('env(safe-area-inset-top)'),
      right: getInset('--safe-area-inset-right') || getInset('env(safe-area-inset-right)'),
      bottom: getInset('--safe-area-inset-bottom') || getInset('env(safe-area-inset-bottom)'),
      left: getInset('--safe-area-inset-left') || getInset('env(safe-area-inset-left)')
    };
  }
};

interface ResponsiveLayoutProviderProps {
  children: React.ReactNode;
}

export function ResponsiveLayoutProvider({ children }: ResponsiveLayoutProviderProps) {
  const state = useResponsiveState();
  const [touchOptimized, setTouchOptimized] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  // Initialize touch detection and safe area measurements on mount
  useEffect(() => {
    const isTouchDevice = MobileTouchUtils.isTouchDevice();
    setTouchOptimized(isTouchDevice);

    const insets = MobileTouchUtils.getSafeAreaInsets();
    setSafeAreaInsets(insets);
  }, []);

  // Memoized helper functions prevent unnecessary recalculations and re-renders
  const gridClasses = useCallback((cols: number): string => {
    const { isMobile, isTablet } = state;
    const baseClasses = ['grid', 'gap-4', 'sm:gap-6', 'lg:gap-8'];
    
    if (isMobile) {
      // Simplify to single column for complex layouts on mobile for better readability
      const mobileCols = cols > 2 ? 1 : Math.min(cols, 2);
      return [...baseClasses, `grid-cols-${mobileCols}`].join(' ');
    }
    
    if (isTablet) {
      // Limit to three columns maximum on tablets for optimal balance
      const tabletCols = Math.min(cols, 3);
      return [...baseClasses, `grid-cols-1 sm:grid-cols-${tabletCols}`].join(' ');
    }
    
    // Full progressive enhancement for desktop with all breakpoints
    return [...baseClasses, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`].join(' ');
  }, [state]);

  const spacingClasses = useCallback((size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string => {
    const { isMobile } = state;
    
    // Spacing map with mobile-optimized values for better touch targets
    const spacingMap = {
      xs: isMobile ? 'p-2' : 'p-1',
      sm: isMobile ? 'p-3' : 'p-2',
      md: isMobile ? 'p-4' : 'p-4',
      lg: isMobile ? 'p-6' : 'p-6',
      xl: isMobile ? 'p-8' : 'p-8'
    };
    return spacingMap[size];
  }, [state]);

  // Compute derived values with proper memoization for performance
  const computedValues = useMemo(() => {
    const { isMobile, isTablet } = state;
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    // Generate container classes with consistent mobile-first responsive padding
    const containerClasses = [
      'w-full',
      'mx-auto',
      'px-4 sm:px-6 lg:px-8',
      'max-w-7xl'
    ].join(' ');

    return {
      deviceType,
      containerClasses
    };
  }, [state]);

  const contextValue: ResponsiveLayoutContextType = useMemo(() => ({
    state,
    isMobile: state.isMobile,
    isTablet: state.isTablet,
    isDesktop: state.isDesktop,
    touchOptimized,
    safeAreaInsets,
    orientation: state.orientation,
    gridClasses,
    spacingClasses,
    ...computedValues
  }), [state, touchOptimized, safeAreaInsets, gridClasses, spacingClasses, computedValues]);

  return (
    <ResponsiveLayoutContext.Provider value={contextValue}>
      {children}
    </ResponsiveLayoutContext.Provider>
  );
}

// Custom hook to access responsive layout context with error handling
export function useResponsiveLayoutContext() {
  const context = useContext(ResponsiveLayoutContext);
  if (!context) {
    throw new Error('useResponsiveLayoutContext must be used within ResponsiveLayoutProvider');
  }
  return context;
}

/**
 * Responsive Container Component
 * Provides a centered container with configurable max width and responsive padding
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
  const containerClasses = useMemo(() => {
    const classes = ['w-full', 'mx-auto'];
    
    // Apply maximum width constraint for better readability on large screens
    if (maxWidth !== 'full') {
      classes.push(`max-w-${maxWidth}`);
    }
    
    // Mobile-first responsive padding scales appropriately across breakpoints
    if (padding !== 'none') {
      const paddingMap = {
        sm: 'px-2 sm:px-4 lg:px-6',
        md: 'px-4 sm:px-6 lg:px-8',
        lg: 'px-6 sm:px-8 lg:px-12'
      };
      classes.push(paddingMap[padding]);
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
 * Creates flexible grid layouts that adapt intelligently across device sizes
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
  const gridClasses = useMemo(() => {
    const classes = ['grid'];
    
    // Progressive gap scaling ensures proper spacing at all viewport sizes
    const gapMap = {
      sm: 'gap-2 sm:gap-4 lg:gap-6',
      md: 'gap-4 sm:gap-6 lg:gap-8',
      lg: 'gap-6 sm:gap-8 lg:gap-12'
    };
    classes.push(gapMap[gap]);
    
    // Build column configuration with sensible fallbacks for unspecified breakpoints
    const mobileCols = columns.mobile || 1;
    const tabletCols = columns.tablet || Math.min(columns.desktop, 2);
    const desktopCols = columns.desktop;
    
    // Apply progressive column classes only when values change between breakpoints
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
 * Implements WCAG 2.1 accessibility standards with 44px minimum touch targets
 */
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  function TouchButton({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled,
    ...props
  }, ref) {
    const { touchOptimized } = useResponsiveLayoutContext();

    const buttonClasses = useMemo(() => {
      const classes = [
        'inline-flex items-center justify-center',
        'font-medium rounded-lg',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      ];

      // Touch-optimized sizing ensures accessibility compliance
      if (touchOptimized) {
        classes.push('touch-manipulation select-none');

        // WCAG 2.1 Level AAA requires minimum 44x44px touch targets
        const touchSizeMap = {
          sm: 'min-h-[40px] min-w-[40px] px-3 py-2 text-sm',
          md: 'min-h-[44px] min-w-[44px] px-4 py-2.5 text-base',
          lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-lg'
        };
        classes.push(touchSizeMap[size]);
      } else {
        // Compact desktop sizing for better space efficiency
        const desktopSizeMap = {
          sm: 'px-3 py-1.5 text-sm',
          md: 'px-4 py-2 text-base',
          lg: 'px-6 py-3 text-lg'
        };
        classes.push(desktopSizeMap[size]);
      }

      // Variant-specific color schemes with hover and active states
      const variantMap = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 active:bg-gray-800',
        outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 active:bg-gray-100',
        ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-500 active:bg-gray-200'
      };
      classes.push(variantMap[variant]);

      return classes.join(' ');
    }, [variant, size, touchOptimized]);

    return (
      <button 
        ref={ref} 
        className={`${buttonClasses} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

/**
 * Safe Area Wrapper Component
 * Handles safe area insets for devices with notches and rounded corners
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

    // CSS max() ensures minimum padding even on devices without safe areas
    const edgeMap = {
      top: 'pt-[max(12px,env(safe-area-inset-top))]',
      right: 'pr-[max(16px,env(safe-area-inset-right))]',
      bottom: 'pb-[max(12px,env(safe-area-inset-bottom))]',
      left: 'pl-[max(16px,env(safe-area-inset-left))]'
    };

    edges.forEach(edge => {
      classes.push(edgeMap[edge]);
    });

    return classes.join(' ');
  }, [edges]);

  return (
    <div className={`${safeAreaClasses} ${className}`}>
      {children}
    </div>
  );
}

// Demo component to showcase the responsive layout system
export default function ResponsiveLayoutDemo() {
  const [count, setCount] = useState(0);

  return (
    <ResponsiveLayoutProvider>
      <SafeAreaWrapper>
        <ResponsiveContainer className="py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Responsive Layout Manager</h1>
            <p className="text-gray-600 mb-6">
              This comprehensive responsive layout system adapts seamlessly across mobile, tablet, and desktop devices. 
              It provides touch-optimized components, safe area handling, and intelligent grid layouts.
            </p>
          </div>

          <ResponsiveGrid 
            columns={{ mobile: 1, tablet: 2, desktop: 3 }}
            gap="md"
            className="mb-8"
          >
            <div className="bg-blue-100 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Touch Optimized</h3>
              <p className="text-sm text-gray-700">
                Automatically adjusts button sizes and spacing for touch devices, ensuring accessibility compliance.
              </p>
            </div>
            <div className="bg-green-100 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Safe Area Support</h3>
              <p className="text-sm text-gray-700">
                Respects device notches and rounded corners with proper padding adjustments.
              </p>
            </div>
            <div className="bg-purple-100 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Flexible Grids</h3>
              <p className="text-sm text-gray-700">
                Responsive grid system that adapts column counts based on available screen space.
              </p>
            </div>
          </ResponsiveGrid>

          <div className="flex flex-wrap gap-4">
            <TouchButton 
              variant="primary" 
              size="md"
              onClick={() => setCount(count + 1)}
            >
              Count: {count}
            </TouchButton>
            <TouchButton variant="secondary" size="md">
              Secondary
            </TouchButton>
            <TouchButton variant="outline" size="md">
              Outline
            </TouchButton>
            <TouchButton variant="ghost" size="md">
              Ghost
            </TouchButton>
          </div>
        </ResponsiveContainer>
      </SafeAreaWrapper>
    </ResponsiveLayoutProvider>
  );
}