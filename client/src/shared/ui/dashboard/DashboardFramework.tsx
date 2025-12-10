/**
 * Dashboard Framework Component
 *
 * Main orchestrating component for the dashboard system.
 * Provides responsive layout, accessibility, and theming support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@client/shared/design-system';
import { ErrorBoundary } from 'react-error-boundary';
import {
  DashboardFrameworkProps,
  DashboardConfig,
  DashboardLayoutConfig,
  DashboardThemeConfig,
  DashboardAccessibilityConfig,
} from './types';
import { useDashboard } from './hooks/useDashboard';
import { useDashboardLayout } from './hooks/useDashboardLayout';
import { DashboardHeader } from './layout/DashboardHeader';
import { DashboardSidebar } from './layout/DashboardSidebar';
import { DashboardContent } from './layout/DashboardContent';
import { DashboardFooter } from './layout/DashboardFooter';
import { DashboardGrid } from './widgets/DashboardGrid';
import { DashboardStack } from './widgets/DashboardStack';
import { DashboardTabs } from './widgets/DashboardTabs';

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
    <h2 className="text-lg font-semibold text-gray-900 mb-2">
      Dashboard Error
    </h2>
    <p className="text-gray-600 mb-4 max-w-md">
      {error.message || 'An unexpected error occurred in the dashboard.'}
    </p>
    <button
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

/**
 * Dashboard Framework Component
 *
 * Main component that orchestrates the entire dashboard system.
 */
export const DashboardFramework: React.FC<DashboardFrameworkProps> = ({
  config,
  headerContent,
  sidebarContent,
  footerContent,
  loading = false,
  error = null,
  className,
  onWidgetUpdate,
  onLayoutChange,
  onThemeChange,
}) => {
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Custom hooks for dashboard state management
  const {
    config: dashboardConfig,
    updateConfig,
    addWidget,
    removeWidget,
    updateWidget,
  } = useDashboard(config);

  const {
    layout,
    updateLayout,
    sidebarOpen,
    toggleSidebar,
    isMobile,
    breakpoint,
  } = useDashboardLayout(dashboardConfig.layout);

  // Theme application
  useEffect(() => {
    if (!isClient) return;

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
    const { accessibility } = dashboardConfig;
    if (accessibility.highContrast) {
      root.classList.add('high-contrast');
    }
    if (accessibility.reduceMotion) {
      root.classList.add('reduce-motion');
    }
  }, [dashboardConfig.theme, dashboardConfig.accessibility, isClient]);

  // Event handlers
  const handleWidgetUpdate = useCallback(
    (widgetId: string, updates: any) => {
      updateWidget(widgetId, updates);
      onWidgetUpdate?.(widgetId, updates);
    },
    [updateWidget, onWidgetUpdate]
  );

  const handleLayoutChange = useCallback(
    (updates: Partial<DashboardLayoutConfig>) => {
      updateLayout(updates);
      onLayoutChange?.(updates);
    },
    [updateLayout, onLayoutChange]
  );

  const handleThemeChange = useCallback(
    (updates: Partial<DashboardThemeConfig>) => {
      updateConfig({ theme: { ...dashboardConfig.theme, ...updates } });
      onThemeChange?.(updates);
    },
    [updateConfig, dashboardConfig.theme, onThemeChange]
  );

  // Loading state
  if (loading || !isClient) {
    return <DashboardLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <DashboardErrorFallback
        error={error}
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
          className
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
          config={dashboardConfig}
          content={headerContent}
          onLayoutChange={handleLayoutChange}
          onThemeChange={handleThemeChange}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <DashboardSidebar
            config={dashboardConfig}
            content={sidebarContent}
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            isMobile={isMobile}
            position={layout.sidebarPosition}
          />

          {/* Main Content */}
          <DashboardContent
            id="main-content"
            config={dashboardConfig}
            className="flex-1"
          >
            {dashboardConfig.layout.layoutMode === 'grid' && dashboardConfig.widgets && (
              <DashboardGrid
                columns={breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3}
                rowHeight={120}
                gap={24}
                onLayoutChange={(newLayout) => {
                  // Handle grid layout changes
                  console.log('Grid layout changed:', newLayout);
                }}
              >
                {dashboardConfig.widgets.map((widget) => (
                  <div
                    key={widget.id}
                    data-grid={{
                      x: widget.position.x,
                      y: widget.position.y,
                      w: widget.position.width,
                      h: widget.position.height,
                    }}
                  >
                    {/* Widget will be rendered here */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
                      <h3 className="font-semibold mb-2">{widget.title}</h3>
                      <div className="text-sm text-gray-600">
                        {widget.type} widget content
                      </div>
                    </div>
                  </div>
                ))}
              </DashboardGrid>
            )}

            {dashboardConfig.layout.layoutMode === 'stack' && (
              <DashboardStack
                sections={dashboardConfig.sections}
                spacing="normal"
                onSectionUpdate={(sectionId, updates) => {
                  // Handle section updates
                  console.log('Section updated:', sectionId, updates);
                }}
              />
            )}

            {dashboardConfig.layout.layoutMode === 'tabs' && (
              <DashboardTabs
                sections={dashboardConfig.sections}
                onTabChange={(tabId) => {
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
        {layout.showFooter && (
          <DashboardFooter
            config={dashboardConfig}
            content={footerContent}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

DashboardFramework.displayName = 'DashboardFramework';

export default DashboardFramework;