/**
 * DashboardWidget Base Component
 *
 * Reusable widget system for dashboard components with consistent styling,
 * loading states, error handling, and customization options.
 */

import {
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  Maximize2,
  X as Minimize2, // Using X as Minimize2 replacement
  MoreHorizontal,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/shared/design-system';

export interface DashboardWidgetProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;

  // Widget state
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;

  // Customization options
  collapsible?: boolean;
  removable?: boolean;
  refreshable?: boolean;
  expandable?: boolean;

  // Initial state
  defaultCollapsed?: boolean;
  defaultExpanded?: boolean;

  // Event handlers
  onRefresh?: () => void;
  onRemove?: () => void;
  onToggleCollapse?: (collapsed: boolean) => void;
  onToggleExpand?: (expanded: boolean) => void;

  // Badge/status
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function DashboardWidget({
  id: _id,
  title,
  description,
  icon,
  children,
  className = '',
  loading = false,
  error = null,
  isEmpty = false,
  collapsible = false,
  removable = false,
  refreshable = false,
  expandable = false,
  defaultCollapsed = false,
  defaultExpanded = false,
  onRefresh,
  onRemove,
  onToggleCollapse,
  onToggleExpand,
  badge,
  badgeVariant = 'secondary',
}: DashboardWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
  };

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleExpand?.(newExpanded);
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  const showActions = collapsible || removable || refreshable || expandable;

  return (
    <Card className={`dashboard-widget ${isExpanded ? 'col-span-full' : ''} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="truncate">{title}</span>
                {badge && (
                  <Badge variant={badgeVariant} className="text-xs">
                    {badge}
                  </Badge>
                )}
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1">
              {/* Individual action buttons for common actions */}
              {refreshable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}

              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleCollapse}
                  className="h-8 w-8 p-0"
                >
                  {isCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              )}

              {/* Dropdown menu for additional actions */}
              {(expandable || removable) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {expandable && (
                      <DropdownMenuItem onClick={handleToggleExpand}>
                        {isExpanded ? (
                          <>
                            <Minimize2 className="h-4 w-4 mr-2" />
                            Minimize
                          </>
                        ) : (
                          <>
                            <Maximize2 className="h-4 w-4 mr-2" />
                            Expand
                          </>
                        )}
                      </DropdownMenuItem>
                    )}

                    {expandable && removable && <DropdownMenuSeparator />}

                    {removable && (
                      <DropdownMenuItem
                        onClick={handleRemove}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Widget
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-destructive mb-2">
                  <X className="h-6 w-6 mx-auto" />
                </div>
                <p className="text-sm text-destructive mb-2">Error loading widget</p>
                <p className="text-xs text-muted-foreground mb-4">{error}</p>
                {refreshable && (
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {isEmpty && !loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-muted-foreground mb-2">
                  <Settings className="h-6 w-6 mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground">No data available</p>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && !isEmpty && children}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Hook for managing widget state
 */
export function useWidgetState(_widgetId: string) {
  const [state, setState] = useState({
    loading: false,
    error: null as string | null,
    data: null as any,
    lastRefresh: null as Date | null,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  };

  const setData = (data: any) => {
    setState(prev => ({
      ...prev,
      data,
      error: null,
      loading: false,
      lastRefresh: new Date(),
    }));
  };

  const refresh = async (fetchFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const data = await fetchFn();
      setData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return {
    ...state,
    setLoading,
    setError,
    setData,
    refresh,
  };
}
