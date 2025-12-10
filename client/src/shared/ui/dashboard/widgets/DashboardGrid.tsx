/**
 * Dashboard Grid Component
 *
 * Responsive grid layout system for dashboard widgets
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@client/shared/design-system';

interface DashboardGridProps {
  /** Number of columns */
  columns?: number;
  /** Row height in pixels */
  rowHeight?: number;
  /** Gap between grid items */
  gap?: number;
  /** Responsive breakpoints */
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  /** Grid items (widgets) */
  children: React.ReactNode;
  /** Layout change handler */
  onLayoutChange?: (layout: any[]) => void;
  /** Custom className */
  className?: string;
  /** Is grid editable */
  editable?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Dashboard Grid Component
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  columns = 3,
  rowHeight = 120,
  gap = 24,
  breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  },
  children,
  onLayoutChange,
  className,
  editable = false,
  compact = false,
}) => {
  const [currentColumns, setCurrentColumns] = useState(columns);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Responsive column calculation
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;

      if (width < breakpoints.mobile) {
        setCurrentColumns(1);
      } else if (width < breakpoints.tablet) {
        setCurrentColumns(2);
      } else {
        setCurrentColumns(columns);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [columns, breakpoints]);

  // Grid item positioning
  const getGridPosition = useCallback((element: HTMLElement) => {
    const gridData = element.getAttribute('data-grid');
    if (!gridData) return null;

    try {
      return JSON.parse(gridData);
    } catch {
      return null;
    }
  }, []);

  // Layout change handler
  const handleLayoutChange = useCallback(() => {
    if (!onLayoutChange) return;

    const gridItems = document.querySelectorAll('[data-grid]');
    const layout = Array.from(gridItems).map((item) => {
      const element = item as HTMLElement;
      const position = getGridPosition(element);
      return {
        i: element.getAttribute('data-widget-id') || '',
        ...position,
      };
    });

    onLayoutChange(layout);
  }, [onLayoutChange, getGridPosition]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    handleLayoutChange();
  }, [handleLayoutChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Handle drop logic here
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div
      className={cn(
        // Base grid styles
        'grid w-full',
        'transition-all duration-200 ease-in-out',

        // Responsive grid columns
        currentColumns === 1 && 'grid-cols-1',
        currentColumns === 2 && 'grid-cols-2',
        currentColumns === 3 && 'grid-cols-3',
        currentColumns === 4 && 'grid-cols-4',
        currentColumns === 5 && 'grid-cols-5',
        currentColumns === 6 && 'grid-cols-6',

        // Gap
        `gap-${Math.round(gap / 4)}`,

        // Compact mode
        compact && 'gap-2',

        // Drag states
        isDragging && 'opacity-50',
        isResizing && 'select-none',

        className
      )}
      style={{
        // Custom row height for grid items
        '--grid-row-height': `${rowHeight}px`,
      } as React.CSSProperties}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      role="grid"
      aria-label="Dashboard widget grid"
    >
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={cn(
            // Grid item styles
            'relative',
            'transition-all duration-200 ease-in-out',

            // Minimum height based on row height
            'min-h-[var(--grid-row-height)]',

            // Editable mode styles
            editable && [
              'hover:ring-2 hover:ring-blue-300 hover:ring-opacity-50',
              'cursor-move',
            ],

            // Drag states
            isDragging && 'z-50 scale-105 shadow-lg',
            isResizing && 'pointer-events-none',
          )}
          draggable={editable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          role="gridcell"
          aria-label={`Grid item ${index + 1}`}
        >
          {child}
        </div>
      ))}

      {/* Empty state when no children */}
      {React.Children.count(children) === 0 && (
        <div
          className={cn(
            'col-span-full',
            'flex items-center justify-center',
            'min-h-[200px]',
            'text-center text-muted-foreground',
            'border-2 border-dashed border-muted-foreground/25',
            'rounded-lg'
          )}
          role="region"
          aria-label="Empty dashboard grid"
        >
          <div>
            <svg
              className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
            <p className="text-sm">
              Add widgets to your dashboard to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

DashboardGrid.displayName = 'DashboardGrid';