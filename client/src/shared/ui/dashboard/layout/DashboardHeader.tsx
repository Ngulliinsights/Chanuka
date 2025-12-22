/**
 * Dashboard Header Component
 *
 * Responsive header with navigation, breadcrumbs, and controls
 */

import React from 'react';

import { Button, cn } from '@client/shared/design-system';

import { DashboardConfig } from '../types';

interface DashboardHeaderProps {
  /** Dashboard configuration */
  config: DashboardConfig;
  /** Custom header content */
  content?: React.ReactNode;
  /** Theme change handler */
  onThemeChange?: (theme: 'light' | 'dark') => void;
  /** Sidebar open state */
  sidebarOpen: boolean;
  /** Sidebar toggle handler */
  onToggleSidebar: () => void;
  /** Mobile view flag */
  isMobile: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Dashboard Header Component with memo optimization
 */
const DashboardHeaderComponent = ({
  config,
  content,
  onThemeChange,
  sidebarOpen,
  onToggleSidebar,
  isMobile,
  className,
}: DashboardHeaderProps) => {
  const { title, description, navigation } = config;
  const currentTheme = config.theme?.colorScheme || 'light';

  const handleThemeToggle = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    onThemeChange?.(newTheme);
  };

  return (
    <header
      className={cn(
        // Base styles
        'sticky top-0 z-40 w-full',
        'bg-[hsl(var(--color-background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--color-background))]/60',
        'border-b border-[hsl(var(--color-border))]',
        'transition-all duration-200 ease-in-out',

        // Responsive padding
        'px-4 sm:px-6 lg:px-8',
        'py-3 sm:py-4',

        // Flex layout
        'flex items-center justify-between',
        'min-h-[3.5rem]',

        className
      )}
      role="banner"
      aria-label="Dashboard header"
    >
      {/* Left Section - Navigation & Title */}
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
            className="lg:hidden p-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </Button>
        )}

        {/* Breadcrumbs */}
        {navigation?.breadcrumbs?.enabled && (
          <nav aria-label="Breadcrumb" className="hidden sm:flex">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <a
                  href="#"
                  className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] transition-colors"
                  aria-label="Go to dashboard home"
                >
                  Dashboard
                </a>
              </li>
              <li aria-hidden="true">
                <span className="text-[hsl(var(--color-muted-foreground))]">
                  {navigation.breadcrumbs.separator || '/'}
                </span>
              </li>
              <li aria-current="page">
                <span className="text-[hsl(var(--color-foreground))] font-medium">
                  {title || config.name}
                </span>
              </li>
            </ol>
          </nav>
        )}

        {/* Title & Description */}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--color-foreground))] truncate">
            {title || config.name}
          </h1>
          {description && (
            <p className="text-sm text-[hsl(var(--color-muted-foreground))] truncate hidden sm:block">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Center Section - Custom Content */}
      {content && <div className="flex items-center space-x-4 flex-shrink-0">{content}</div>}

      {/* Right Section - Controls */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
          className="hidden sm:flex p-2"
        >
          {currentTheme === 'dark' ? (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </Button>

        {/* Accessibility Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Placeholder for accessibility toggle
            console.log('Toggle accessibility features');
          }}
          aria-label="Toggle accessibility features"
          className="hidden sm:flex p-2"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </Button>

        {/* Page Controls */}
        {navigation?.pageControls?.enabled && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous page"
              disabled
              className="hidden sm:flex p-2"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Next page"
              disabled
              className="hidden sm:flex p-2"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

/* eslint-disable react/prop-types */
export const DashboardHeader = React.memo(DashboardHeaderComponent);
