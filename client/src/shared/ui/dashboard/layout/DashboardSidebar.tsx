/**
 * Dashboard Sidebar Component
 *
 * Responsive sidebar with navigation and custom content
 */

import React from 'react';
import { Button } from '@client/shared/design-system';
import { cn } from '@client/shared/design-system';
import { DashboardConfig } from '../types';

interface DashboardSidebarProps {
  /** Dashboard configuration */
  config: DashboardConfig;
  /** Custom sidebar content */
  content?: React.ReactNode;
  /** Sidebar open state */
  isOpen: boolean;
  /** Sidebar toggle handler */
  onToggle: () => void;
  /** Mobile view flag */
  isMobile: boolean;
  /** Sidebar position */
  position: 'left' | 'right';
  /** Custom className */
  className?: string;
}

/**
 * Dashboard Sidebar Component
 */
export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  config,
  content,
  isOpen,
  onToggle,
  isMobile,
  position,
  className,
}) => {
  const baseClasses = [
    // Base layout
    'fixed top-0 bottom-0 z-30',
    'bg-[hsl(var(--color-background))]',
    'border-[hsl(var(--color-border))]',
    'transition-all duration-300 ease-in-out',
    'overflow-y-auto',

    // Responsive width
    'w-64',
  ];

  const positionClasses = position === 'left'
    ? [
        'left-0',
        'border-r',
        // Mobile positioning
        isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
      ]
    : [
        'right-0',
        'border-l',
        // Mobile positioning
        isMobile ? (isOpen ? 'translate-x-0' : 'translate-x-full') : 'translate-x-0',
      ];

  const responsiveClasses = isMobile
    ? [
        // Mobile overlay
        'shadow-2xl',
        // Backdrop for mobile
        isOpen && 'after:absolute after:inset-0 after:bg-black/50 after:-z-10',
      ]
    : [
        // Desktop positioning
        'relative z-auto',
        'shadow-sm',
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="dashboard-sidebar"
        className={cn(
          baseClasses,
          positionClasses,
          responsiveClasses,
          className
        )}
        aria-label="Dashboard sidebar"
        aria-hidden={!isOpen && isMobile}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--color-background))]/95 backdrop-blur border-b border-[hsl(var(--color-border))]">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-[hsl(var(--color-foreground))]">
              {config.title}
            </h2>

            {/* Close button for mobile */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                aria-label="Close sidebar"
                className="lg:hidden"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4" role="navigation" aria-label="Sidebar navigation">
          <ul className="space-y-2">
            {/* Default navigation items */}
            <li>
              <a
                href="#"
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                  'text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))]',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2'
                )}
                aria-current="page"
              >
                <svg
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                  />
                </svg>
                Dashboard
              </a>
            </li>

            <li>
              <a
                href="#"
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                  'text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))]',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2'
                )}
              >
                <svg
                  className="mr-3 h-5 w-5 flex-shrink-0"
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
                Analytics
              </a>
            </li>

            <li>
              <a
                href="#"
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                  'text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))]',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent))] focus:ring-offset-2'
                )}
              >
                <svg
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </a>
            </li>
          </ul>
        </nav>

        {/* Custom Content */}
        {content && (
          <div className="p-4 border-t border-[hsl(var(--color-border))]">
            {content}
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-[hsl(var(--color-background))]/95 backdrop-blur border-t border-[hsl(var(--color-border))] p-4">
          <div className="text-xs text-[hsl(var(--color-muted-foreground))]">
            © 2024 {config.title}
          </div>
        </div>
      </aside>
    </>
  );
};

DashboardSidebar.displayName = 'DashboardSidebar';