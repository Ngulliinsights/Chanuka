/**
 * Dashboard Content Component
 *
 * Main content area with responsive layout and accessibility
 */

import PropTypes from 'prop-types';
import React from 'react';

import { cn } from '@/shared/design-system';

import { DashboardConfig } from '../types';

interface DashboardContentProps {
  /** Unique identifier for accessibility */
  id?: string;
  /** Dashboard configuration */
  config: DashboardConfig;
  /** Content children */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * Dashboard Content Component
 */
function DashboardContentComponent({
  id = 'main-content',
  config,
  children,
  className,
}: DashboardContentProps) {
  return (
    <main
      id={id}
      className={cn(
        // Base layout
        'flex-1',
        'min-h-0', // Allow shrinking
        'overflow-auto',

        // Responsive padding
        'p-4 sm:p-6 lg:p-8',

        // Background and spacing
        'bg-[hsl(var(--color-background))]',
        'transition-colors duration-200',

        // Focus management
        'focus:outline-none',

        className
      )}
      role="main"
      aria-label={`${config.title} content`}
      tabIndex={-1} // Allow programmatic focus
    >
      {/* Content wrapper for consistent spacing */}
      <div className="max-w-full">{children}</div>
    </main>
  );
}

DashboardContentComponent.propTypes = {
  id: PropTypes.string,
  config: PropTypes.shape({
    title: PropTypes.string,
  }),
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Dashboard Content Component with memo optimization
 */
export const DashboardContent = React.memo(DashboardContentComponent);
