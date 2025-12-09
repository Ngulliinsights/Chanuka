/**
 * Development Wrapper Component
 * Provides development-specific error handling and optimizations
 */

import React, { useEffect } from 'react';

interface DevWrapperProps {
  children: React.ReactNode;
}

export function DevWrapper({ children }: DevWrapperProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Apply development optimizations
      console.log('🔧 Development wrapper initialized');

      // Reduce React strict mode issues
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('Warning: ReactDOM.render is no longer supported') ||
          message.includes('Warning: componentWillMount has been renamed') ||
          message.includes('Warning: componentWillReceiveProps has been renamed')
        ) {
          return; // Suppress React development warnings
        }
        originalWarn.apply(console, args);
      };
    }
  }, []);

  if (process.env.NODE_ENV === 'development') {
    return <div data-dev-wrapper="true">{children}</div>;
  }

  return <>{children}</>;
}

export default DevWrapper;
