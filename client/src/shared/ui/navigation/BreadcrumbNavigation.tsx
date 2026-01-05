/**
 * Breadcrumb Navigation Component
 *
 * Provides consistent breadcrumb navigation across all routes.
 * Uses the useBreadcrumbNavigation hook for state management and integration.
 */

import { ChevronRight, Home } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import type { BreadcrumbItem } from '@/shared/types/navigation';

import { useBreadcrumbNavigation } from './hooks/useBreadcrumbNavigation';

interface BreadcrumbNavigationProps {
  /** Custom separator between breadcrumb items */
  separator?: '/' | '>' | '→' | React.ReactNode;
  /** Whether to show the home icon for the first item */
  showHome?: boolean;
  /** Maximum number of items to display before truncating */
  maxItems?: number;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show breadcrumbs in compact mode */
  compact?: boolean;
}

/**
 * Truncates breadcrumbs when there are too many items.
 * Keeps the first and last items, and shows "..." in between.
 */
function truncateBreadcrumbs(breadcrumbs: BreadcrumbItem[], maxItems: number): BreadcrumbItem[] {
  if (breadcrumbs.length <= maxItems) {
    return breadcrumbs;
  }

  const first = breadcrumbs[0];
  const last = breadcrumbs[breadcrumbs.length - 1];
  const middle = breadcrumbs.slice(1, -1);

  if (maxItems <= 2) {
    return [first, last];
  }

  // Show first, some middle items, and last
  const middleCount = maxItems - 2;
  const truncatedMiddle = middle.slice(-middleCount);

  return [first, ...truncatedMiddle, last];
}

export function BreadcrumbNavigation({
  separator = <ChevronRight className="h-4 w-4" />,
  showHome = true,
  maxItems = 5,
  className = '',
  compact = false,
}: BreadcrumbNavigationProps) {
  // Use the hook for all breadcrumb logic and state management
  const { breadcrumbs, breadcrumbsEnabled } = useBreadcrumbNavigation({
    autoGenerate: true,
    updateOnRouteChange: true,
  });

  // Don't show breadcrumbs if user has disabled them
  if (!breadcrumbsEnabled) {
    return null;
  }

  // Don't show breadcrumbs if there are none or only home
  if (breadcrumbs.length <= 1) {
    return null;
  }

  // Truncate if necessary
  const displayBreadcrumbs = truncateBreadcrumbs(breadcrumbs, maxItems);

  const baseClasses = compact
    ? 'flex items-center space-x-1 text-sm text-muted-foreground'
    : 'flex items-center space-x-2 text-sm text-muted-foreground mb-4';

  return (
    <nav aria-label="Breadcrumb" className={`${baseClasses} ${className}`} role="navigation">
      <ol className="flex items-center space-x-2">
        {displayBreadcrumbs.map((item, index) => {
          const isLast = index === displayBreadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.path} className="flex items-center">
              {/* Separator (except for first item) */}
              {!isFirst && (
                <span className="mx-2 text-muted-foreground/50" aria-hidden="true">
                  {separator}
                </span>
              )}

              {/* Breadcrumb item */}
              {isLast ? (
                // Current page - not clickable
                <span className="font-medium text-foreground" aria-current="page">
                  {isFirst && showHome ? (
                    <span className="flex items-center">
                      <Home className="h-4 w-4 mr-1" />
                      {!compact && item.label}
                    </span>
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                // Clickable breadcrumb
                <Link
                  to={item.path}
                  className="hover:text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1 py-0.5"
                  aria-label={`Go to ${item.label}`}
                >
                  {isFirst && showHome ? (
                    <span className="flex items-center">
                      <Home className="h-4 w-4 mr-1" />
                      {!compact && item.label}
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default BreadcrumbNavigation;
