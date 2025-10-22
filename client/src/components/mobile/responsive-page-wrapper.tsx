/**
 * Responsive Page Wrapper
 * Provides consistent responsive layout and mobile optimizations for all pages
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  useResponsiveLayoutContext,
  SafeAreaWrapper
} from './responsive-layout-manager';
import { LazyLoadWrapper, usePerformanceMonitoring } from './mobile-performance-optimizations';
import { PullToRefresh } from './mobile-navigation-enhancements';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { logger } from '..\..\utils\browser-logger';

interface ResponsivePageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  enablePullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  showOfflineIndicator?: boolean;
  loading?: boolean;
  error?: string | null;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function ResponsivePageWrapper({
  children,
  title,
  subtitle,
  className = '',
  maxWidth = '7xl',
  padding = 'md',
  enablePullToRefresh = false,
  onRefresh,
  showOfflineIndicator = true,
  loading = false,
  error = null,
  breadcrumbs
}: ResponsivePageWrapperProps) {
  const { isMobile, isTablet, deviceType } = useResponsiveLayoutContext();
  const { metrics, startRender, endRender } = usePerformanceMonitoring('ResponsivePageWrapper');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    startRender();
    return () => endRender();
  }, [startRender, endRender]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      // Default refresh behavior
      window.location.reload();
    }
  }, [onRefresh]);

  const pageContent = (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Offline Indicator */}
      {showOfflineIndicator && !isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span>You're offline. Some features may not work.</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      {(title || breadcrumbs) && (
        <div className="bg-white border-b border-gray-200">
          <ResponsiveContainer maxWidth={maxWidth} padding={padding}>
            <div className="py-4">
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="mb-2" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <span className="text-gray-400 mx-2">/</span>
                        )}
                        {crumb.href ? (
                          <a
                            href={crumb.href}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span className="text-gray-900 font-medium">
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Title and Subtitle */}
              {title && (
                <div>
                  <h1 className={`font-bold text-gray-900 ${
                    isMobile ? 'text-2xl' : 'text-3xl'
                  }`}>
                    {title}
                  </h1>
                  {subtitle && (
                    <p className={`text-gray-600 mt-2 ${
                      isMobile ? 'text-base' : 'text-lg'
                    }`}>
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          </ResponsiveContainer>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <ResponsiveContainer maxWidth={maxWidth} padding={padding}>
          <div className={`py-6 ${isMobile ? 'py-4' : 'py-6'}`}>
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Content */}
            {!loading && !error && children}
          </div>
        </ResponsiveContainer>
      </main>

      {/* Performance Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
          <div>Device: {deviceType}</div>
          <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
          <div>FPS: {metrics.fps}</div>
          {metrics.memoryUsage && (
            <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
          )}
        </div>
      )}
    </div>
  );

  // Wrap with pull-to-refresh if enabled
  if (enablePullToRefresh && isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        {pageContent}
      </PullToRefresh>
    );
  }

  return pageContent;
}

/**
 * Responsive Card Grid Component
 * Automatically adjusts card layout based on screen size
 */
interface ResponsiveCardGridProps {
  children: React.ReactNode;
  minCardWidth?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveCardGrid({
  children,
  minCardWidth = 300,
  gap = 'md',
  className = ''
}: ResponsiveCardGridProps) {
  const { isMobile, isTablet } = useResponsiveLayoutContext();

  // Calculate columns based on screen size and minimum card width
  const columns = React.useMemo(() => {
    if (isMobile) return { mobile: 1, tablet: 1, desktop: 1 };
    if (isTablet) return { mobile: 1, tablet: 2, desktop: 2 };
    
    // Desktop: calculate based on container width and min card width
    // This is a simplified calculation - in a real app you'd measure actual container width
    const containerWidth = 1200; // Approximate max container width
    const maxCols = Math.floor(containerWidth / minCardWidth);
    
    return {
      mobile: 1,
      tablet: Math.min(2, maxCols),
      desktop: Math.min(4, maxCols)
    };
  }, [isMobile, isTablet, minCardWidth]);

  return (
    <ResponsiveGrid
      columns={columns}
      gap={gap}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  );
}

/**
 * Responsive Section Component
 * Provides consistent section spacing and layout
 */
interface ResponsiveSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
  background?: 'white' | 'gray' | 'transparent';
}

export function ResponsiveSection({
  children,
  title,
  subtitle,
  className = '',
  spacing = 'md',
  background = 'transparent'
}: ResponsiveSectionProps) {
  const { isMobile } = useResponsiveLayoutContext();

  const spacingClasses = {
    sm: isMobile ? 'py-4' : 'py-6',
    md: isMobile ? 'py-6' : 'py-8',
    lg: isMobile ? 'py-8' : 'py-12'
  };

  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: 'bg-transparent'
  };

  return (
    <section className={`${spacingClasses[spacing]} ${backgroundClasses[background]} ${className}`}>
      {(title || subtitle) && (
        <div className={`mb-6 ${isMobile ? 'mb-4' : 'mb-6'}`}>
          {title && (
            <h2 className={`font-bold text-gray-900 ${
              isMobile ? 'text-xl' : 'text-2xl'
            }`}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className={`text-gray-600 mt-2 ${
              isMobile ? 'text-sm' : 'text-base'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Responsive Stats Grid Component
 * Displays statistics in a responsive grid layout
 */
interface StatItem {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ReactNode;
}

interface ResponsiveStatsGridProps {
  stats: StatItem[];
  className?: string;
}

export function ResponsiveStatsGrid({ stats, className = '' }: ResponsiveStatsGridProps) {
  const { isMobile } = useResponsiveLayoutContext();

  const columns = {
    mobile: stats.length > 2 ? 2 : stats.length,
    tablet: Math.min(4, stats.length),
    desktop: Math.min(4, stats.length)
  };

  return (
    <ResponsiveGrid columns={columns} gap="md" className={className}>
      {stats.map((stat, index) => (
        <LazyLoadWrapper key={index} height={100}>
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {stat.label}
                </p>
                <p className={`font-bold text-gray-900 ${
                  isMobile ? 'text-lg' : 'text-2xl'
                } mt-1`}>
                  {stat.value}
                </p>
                {stat.change && (
                  <p className={`text-xs mt-1 ${
                    stat.change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change.type === 'increase' ? '↗' : '↘'} {Math.abs(stat.change.value)}%
                  </p>
                )}
              </div>
              {stat.icon && (
                <div className="text-gray-400">
                  {stat.icon}
                </div>
              )}
            </div>
          </div>
        </LazyLoadWrapper>
      ))}
    </ResponsiveGrid>
  );
}

export default ResponsivePageWrapper;