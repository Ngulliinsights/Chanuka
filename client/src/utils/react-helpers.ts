/**
 * React Helpers
 * 
 * Provides React utilities and helpers for components that need
 * access to React APIs that might not be available in all environments.
 */

import React from 'react';

// Ensure cloneElement is available
export const cloneElement = React.cloneElement || ((element: React.ReactElement, props?: any) => {
  // Fallback implementation if cloneElement is not available
  return {
    ...element,
    props: {
      ...element.props,
      ...props
    }
  };
});

// Re-export other commonly used React utilities
export const {
  memo,
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
  Fragment,
  createElement
} = React;

export default React;