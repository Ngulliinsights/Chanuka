/**
 * Dashboard Widget Component
 *
 * Individual widget component with drag, resize, and interaction capabilities
 */

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { cn } from '@client/shared/design-system';
import { WidgetConfig, WidgetData, WidgetEvent } from './widget-types';

interface DashboardWidgetProps {
  /** Widget configuration */
  config: WidgetConfig;
  /** Widget data */
  data?: WidgetData;
  /** Custom content */
  children?: React.ReactNode;
  /** Event handlers */
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (x: number, y: number) => void;
  onEvent?: (event: WidgetEvent) => void;
  /** Custom className */
  className?: string;
  /** Is widget being dragged */
  isDragging?: boolean;
  /** Is widget being resized */
  isResizing?: boolean;
}

/**
 * Dashboard Widget Component
 */
export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  config,
  data,
  children,
  onUpdate,
  onRemove,
  onResize,
  onMove,
  onEvent,
  className,
  isDragging = false,
  isResizing = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Event handlers
  const handleRefresh = useCallback(() => {
    onEvent?.({
      type: 'refresh',
      widgetId: config.id,
      timestamp: new Date(),
    });
  }, [config.id, onEvent]);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
    onEvent?.({
      type: 'interact',
      widgetId: config.id,
      payload: { action: 'collapse', collapsed: !isCollapsed },
      timestamp: new Date(),
    });
  }, [config.id, isCollapsed, onEvent]);

  const handleEdit = useCallback(() => {
    setIsEditing(prev => !prev);
    onEvent?.({
      type: 'interact',
      widgetId: config.id,
      payload: { action: 'edit', editing: !isEditing },
      timestamp: new Date(),
    });
  }, [config.id, isEditing, onEvent]);

  const handleRemove = useCallback(() => {
    onRemove?.();
    onEvent?.({
      type: 'remove',
      widgetId: config.id,
      timestamp: new Date(),
    });
  }, [config.id, onRemove, onEvent]);

  // Loading state
  if (data?.loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (data?.error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-red-600 flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm mb-4">{data.error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        // Base styles
        'transition-all duration-200 ease-in-out',
        'hover:shadow-md',

        // Drag and resize states
        isDragging && 'opacity-50 shadow-lg scale-105',
        isResizing && 'ring-2 ring-blue-400',

        // Collapsed state
        isCollapsed && 'h-auto',

        className
      )}
      role="region"
      aria-label={`${config.title} widget`}
      aria-expanded={!isCollapsed}
    >
      {/* Widget Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium truncate">
            {config.title}
          </CardTitle>

          {/* Widget Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {/* Refresh Button */}
            {config.behavior?.refreshable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                aria-label={`Refresh ${config.title}`}
                className="h-8 w-8"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
            )}

            {/* Edit Button */}
            {config.behavior?.removable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                aria-label={`Edit ${config.title}`}
                className="h-8 w-8"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Button>
            )}

            {/* Collapse Button */}
            {config.behavior?.collapsible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCollapse}
                aria-label={isCollapsed ? `Expand ${config.title}` : `Collapse ${config.title}`}
                aria-expanded={!isCollapsed}
                className="h-8 w-8"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>
            )}

            {/* Remove Button */}
            {config.behavior?.removable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                aria-label={`Remove ${config.title}`}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {config.description && !isCollapsed && (
          <p className="text-sm text-muted-foreground mt-1">
            {config.description}
          </p>
        )}
      </CardHeader>

      {/* Widget Content */}
      {!isCollapsed && (
        <CardContent className="pt-0">
          {children || (
            <div className="text-sm text-muted-foreground">
              Widget content for {config.type}
            </div>
          )}
        </CardContent>
      )}

      {/* Resize Handle */}
      {config.behavior?.resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Resize widget"
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            // Handle resize start
            e.preventDefault();
            onEvent?.({
              type: 'resize',
              widgetId: config.id,
              payload: { action: 'start' },
              timestamp: new Date(),
            });
          }}
        >
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18Z" />
          </svg>
        </div>
      )}
    </Card>
  );
};

DashboardWidget.displayName = 'DashboardWidget';