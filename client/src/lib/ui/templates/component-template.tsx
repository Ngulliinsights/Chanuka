/**
 * Standard Component Template
 *
 * Use this template for creating new shared UI components.
 * Follow this pattern for consistency across the shared UI system.
 */

import React from 'react';

import { useUIErrorHandler } from '../utils/error-handling';

// ============================================================================
// Types
// ============================================================================

export interface ComponentNameProps {
  /** Component description */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
  /** Test identifier */
  testId?: string;
  /** Component-specific props */
  // Add your specific props here
}

// ============================================================================
// Component
// ============================================================================

export const ComponentName = React.memo<ComponentNameProps>(
  ({
    className = '',
    children,
    testId,
    // Add your specific props here
  }) => {
    // Error handling
    const { error, errorMessage, clearError } = useUIErrorHandler('ComponentName');

    // Component logic here

    // Error state
    if (error) {
      return (
        <div
          className={`p-4 border border-red-200 rounded-md bg-red-50 ${className}`}
          data-testid={testId}
        >
          <p className="text-red-600 text-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={clearError}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      );
    }

    // Main render
    return (
      <div className={className} data-testid={testId}>
        {children}
        {/* Component content here */}
      </div>
    );
  }
);

// ============================================================================
// Default Export
// ============================================================================

export default ComponentName;

// ============================================================================
// Usage Example
// ============================================================================

/*
import { ComponentName } from '@client/lib/ui/components';

function MyPage() {
  return (
    <ComponentName className="my-4" testId="my-component">
      Content here
    </ComponentName>
  );
}
*/
