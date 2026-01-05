/**
 * Dashboard Framework Component
 *
 * Main orchestrating component for the dashboard system.
 * Provides responsive layout, accessibility, and theming support.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { cn } from '@/shared/design-system';

// Re-ordered imports to fix linting issues
import { useDashboard } from './hooks/useDashboard';
import { useDashboardLayout } from './hooks/useDashboardLayout';
import { DashboardContent } from './layout/DashboardContent';
import { DashboardFooter } from './layout/DashboardFooter';
import { DashboardHeader } from './layout/DashboardHeader';
import { DashboardSidebar } from './layout/DashboardSidebar';
import {
  DashboardFrameworkProps,
  DashboardConfig,
  DashboardLayoutConfig,
  DashboardThemeConfig,
} from './types';
import { DashboardGrid } from './widgets/DashboardGrid';
import { DashboardStack } from './widgets/DashboardStack';
import { DashboardTabs } from './widgets/DashboardTabs';

// Define helper types for widgets and sections to avoid indexing errors
interface DashboardWidget {
  id: string;
  title: string;
  type: string;
  position: { x: number; y: number; width: number; height: number };
  accessed?: boolean;
}

interface ExtendedDashboardSection {
  id: string;
  title: string;
  content: React.ReactNode;
  // Make widgets optional to satisfy DashboardSectionConfig if needed,
  // or casting will be used if structure is slightly different
  widgets?: DashboardWidget[];
}

// Extended type definitions to fix property access errors
interface ExtendedDashboardConfig extends Omit<DashboardConfig, 'theme'> {
  widgets?: DashboardWidget[];
  sections?: ExtendedDashboardSection[];
  accessibility?: {
    highContrast?: boolean;
    reduceMotion?: boolean;
  };
  // Explicitly define theme to match DashboardThemeConfig + extensions
  theme: DashboardThemeConfig & {
    customTokens?: Record<string, string>;
  };
}

interface ExtendedDashboardLayout extends DashboardLayoutConfig {
  sidebarPosition?: 'left' | 'right';
  showFooter?: boolean;
  layoutMode?: 'grid' | 'stack' | 'tabs';
}

// Simple ErrorBoundary implementation to replace missing react-error-boundary
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    FallbackComponent: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
    onReset?: () => void;
  },
  { hasError: boolean; error: Error | null }
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { FallbackComponent } = this.props;
      return (
        <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback Component for Dashboard Framework
 */
const DashboardErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center"
    aria-live="assertive"
  >
    <div className="text-red-600 mb-4">
      <svg
        className="w-12 h-12 mx-auto"
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
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Error</h2>
    <p className="text-gray-600 mb-4 max-w-md">
      {error.message || 'An unexpected error occurred in the dashboard.'}
    </p>
    <button
      type="button"
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Retry loading dashboard"
    >
      Try Again
    </button>
  </div>
);

/**
 * Loading Skeleton for Dashboard Framework
 */
const DashboardLoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50" role="status" aria-label="Loading dashboard">
    {/* Header Skeleton */}
    <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />

    <div className="flex">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Define a type for the useDashboard hook return value to fix TS errors
interface UseDashboardResult {
  config: ExtendedDashboardConfig;
  updateConfig: (updates: Partial<DashboardConfig>) => void;
  addWidget: (widget: DashboardWidget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
}

/**
 * Dashboard Framework Component
 *
 * Main component that orchestrates the entire dashboard system.
 */
export const DashboardFramework = React.memo<DashboardFrameworkProps>(
  ({
    config,
    headerContent,
    sidebarContent,
    footerContent,
    loading = false,
    error = null,
    className,
    onWidgetUpdate,
    onThemeChange,
  }) => {
    const [isClient, setIsClient] = useState(false);

    // Initialize client-side rendering
    useEffect(() => {
      setIsClient(true);
    }, []);

    // Custom hooks for dashboard state management
    const dashboardHook = useDashboard(
      config as Partial<DashboardConfig>
    ) as unknown as UseDashboardResult;
    const { config: dashboardConfig, updateConfig, updateWidget } = dashboardHook;

    // Cast layout to include potential missing properties from the type definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layoutHook = useDashboardLayout(dashboardConfig.layout as any);
    const { layout, sidebarOpen, toggleSidebar, isMobile, breakpoint } = layoutHook;

    // Safe access to potentially missing properties via casting
    const safeLayout = layout as unknown as ExtendedDashboardLayout;
    const sidebarPosition = safeLayout.sidebarPosition || 'left';
    const showFooter = safeLayout.showFooter !== false;
    const layoutMode = safeLayout.layoutMode || 'grid';

    // Theme application
    useEffect(() => {
      if (!isClient || !dashboardConfig.theme) return;

      const root = document.documentElement;
      const { theme } = dashboardConfig;

      // Apply color scheme
      if (theme.colorScheme === 'dark') {
        root.classList.add('dark');
      } else if (theme.colorScheme === 'light') {
        root.classList.remove('dark');
      } else {
        // Auto mode - respect system preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        root.classList.toggle('dark', mediaQuery.matches);
      }

      // Apply custom tokens
      if (theme.customTokens) {
        Object.entries(theme.customTokens).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
      }

      // Apply accessibility preferences
      const accessibility = dashboardConfig.accessibility;
      if (accessibility) {
        if (accessibility.highContrast) {
          root.classList.add('high-contrast');
        }
        if (accessibility.reduceMotion) {
          root.classList.add('reduce-motion');
        }
      }
    }, [dashboardConfig, dashboardConfig.theme, isClient]);

    // Event handlers
    const handleWidgetUpdate = useCallback(
      (widgetId: string, updates: Partial<DashboardWidget>) => {
        updateWidget?.(widgetId, updates);
        if (onWidgetUpdate && typeof onWidgetUpdate === 'function') {
          onWidgetUpdate(widgetId, updates);
        }
      },
      [updateWidget, onWidgetUpdate]
    );


    const handleThemeChange = useCallback(
      (updates: Partial<DashboardThemeConfig>) => {
        // Ensure we preserve the colorScheme if not provided in updates, to match required type
        const newTheme = { ...dashboardConfig.theme, ...updates };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateConfig?.({ theme: newTheme as any });
        if (onThemeChange && typeof onThemeChange === 'function') {
          onThemeChange(updates);
        }
      },
      [updateConfig, dashboardConfig.theme, onThemeChange]
    );

    const handleLayoutChange = useCallback(
      (updates: Partial<ExtendedDashboardLayout>) => {
        updateConfig?.({ layout: { ...dashboardConfig.layout, ...updates } });
      },
      [updateConfig, dashboardConfig.layout]
    );

    // Loading state
    if (loading || !isClient) {
      return <DashboardLoadingSkeleton />;
    }

    // Error state
    if (error) {
      return (
        <DashboardErrorFallback
          error={error as Error}
          resetErrorBoundary={() => window.location.reload()}
        />
      );
    }

    return (
      <ErrorBoundary
        FallbackComponent={DashboardErrorFallback}
        onReset={() => window.location.reload()}
      >
        <div
          className={cn(
            'min-h-screen bg-[hsl(var(--color-background))]',
            'text-[hsl(var(--color-foreground))]',
            // Responsive layout
            'flex flex-col',
            // Accessibility
            'focus:outline-none',
            className as string // Cast unknown classname to string
          )}
          role="application"
          aria-label={`${dashboardConfig.title} Dashboard`}
          data-breakpoint={breakpoint}
        >
          {/* Skip Links for Accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
          >
            Skip to main content
          </a>

          {/* Header */}
          <DashboardHeader
            config={dashboardConfig as DashboardConfig}
            content={headerContent as React.ReactNode}
            onThemeChange={(themeMode: 'light' | 'dark') =>
              handleThemeChange({ colorScheme: themeMode })
            }
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />

          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <DashboardSidebar
              config={dashboardConfig as DashboardConfig}
              content={sidebarContent as React.ReactNode}
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
              isMobile={isMobile}
              position={sidebarPosition}
            />

            {/* Main Content */}
            <DashboardContent
              id="main-content"
              // Cast to DashboardConfig to resolve compatibility issues with ExtendedDashboardConfig
              config={dashboardConfig as unknown as DashboardConfig}
              className="flex-1"
            >
              {layoutMode === 'grid' && dashboardConfig.widgets && (
                <DashboardGrid
                  columns={breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3}
                  rowHeight={120}
                  gap={24}
                  onLayoutChange={(newLayout) => {
                    // Handle grid layout changes
                    handleLayoutChange({ type: 'grid' });
                    console.log('Grid layout changed:', newLayout);
                  }}
                >
                  {dashboardConfig.widgets.map(widget => (
                    <div
                      key={widget.id}
                      data-grid={{
                        x: widget.position.x,
                        y: widget.position.y,
                        w: widget.position.width,
                        h: widget.position.height,
                      }}
                      onClick={() => handleWidgetUpdate(widget.id, { accessed: true })}
                    >
                      {/* Widget will be rendered here */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
                        <h3 className="font-semibold mb-2">{widget.title}</h3>
                        <div className="text-sm text-gray-600">{widget.type} widget content</div>
                      </div>
                    </div>
                  ))}
                </DashboardGrid>
              )}

              {layoutMode === 'stack' && dashboardConfig.sections && (
                <DashboardStack
                  // Cast extended sections to base sections type
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sections={dashboardConfig.sections as any}
                  spacing="normal"
                  onSectionUpdate={(sectionId, updates) => {
                    // Handle section updates
                    console.log('Section updated:', sectionId, updates);
                  }}
                />
              )}

              {layoutMode === 'tabs' && dashboardConfig.sections && (
                <DashboardTabs
                  // Cast extended sections to base sections type
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sections={dashboardConfig.sections as any}
                  onTabChange={tabId => {
                    // Handle tab changes
                    console.log('Tab changed:', tabId);
                  }}
                  onSectionUpdate={(sectionId, updates) => {
                    // Handle section updates
                    console.log('Section updated:', sectionId, updates);
                  }}
                />
              )}
            </DashboardContent>
          </div>

          {/* Footer */}
          {showFooter && (
            <DashboardFooter
              config={dashboardConfig as DashboardConfig}
              content={footerContent as React.ReactNode}
            />
          )}
        </div>
      </ErrorBoundary>
    );
  }
);

DashboardFramework.displayName = 'DashboardFramework';

export default DashboardFramework;
