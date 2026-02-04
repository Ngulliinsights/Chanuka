import { Search, PanelLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@client/lib/design-system';
import { Input } from '@client/lib/design-system';

import { useNav } from '../hooks/useNav';

// Type definitions for navigation items
interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  section?: string;
  roles?: string[];
  requiresAuth?: boolean;
}

// Type for analytics event data to avoid 'any' type
interface AnalyticsEventData {
  itemId?: string;
  itemLabel?: string;
  source?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Navigation utility functions extracted for better testability and reusability.
 * These pure functions handle validation, filtering, and search logic without side effects.
 */
const navigationUtils = {
  /**
   * Validates that navigation items have all required properties.
   * Returns only items with valid id, label, and href to prevent runtime errors.
   */
  validateNavigationItems(items: NavigationItem[]): NavigationItem[] {
    return items.filter(
      item => item.id && item.label && item.href && typeof item.href === 'string'
    );
  },

  /**
   * Filters items based on authentication and role requirements.
   * This ensures users only see navigation items they have access to.
   */
  filterNavigationByAccess(
    items: NavigationItem[],
    userRole?: string,
    isAuthenticated?: boolean
  ): NavigationItem[] {
    return items.filter(item => {
      if (item.requiresAuth && !isAuthenticated) {
        return false;
      }

      if (item.roles && item.roles.length > 0 && userRole) {
        return item.roles.includes(userRole);
      }

      return true;
    });
  },

  /**
   * Performs case-insensitive search across label, href, and section.
   * Trimming the query prevents accidental whitespace from breaking searches.
   */
  searchNavigationItems(query: string, items: NavigationItem[]): NavigationItem[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return items;

    return items.filter(
      item =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.href.toLowerCase().includes(lowerQuery) ||
        (item.section && item.section.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Logs navigation events for analytics tracking.
   * Only logs in development to avoid console noise in production.
   */
  trackNavigationEvent(eventName: string, data: AnalyticsEventData): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Navigation Event:', eventName, data);
    }
    // In production, this would integrate with your analytics service
  },
};

export const DesktopSidebar = React.memo(() => {
  const { items, userRole, isAuthenticated } = useNav();
  const location = useLocation();
  const navigate = useNavigate();

  // Component state organized by purpose for clarity
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  /**
   * Validates and filters navigation items in a single pass.
   * Using useMemo prevents recalculating this on every render when dependencies haven't changed.
   */
  const validatedItems = useMemo(() => {
    const validated = navigationUtils.validateNavigationItems(items);
    return navigationUtils.filterNavigationByAccess(validated, userRole, isAuthenticated);
  }, [items, userRole, isAuthenticated]);

  /**
   * Applies search filter to validated items.
   * Separated from validation logic for better performance and clarity.
   */
  const filteredItems = useMemo(() => {
    return navigationUtils.searchNavigationItems(searchQuery, validatedItems);
  }, [validatedItems, searchQuery]);

  /**
   * Handles keyboard shortcut for command palette (Cmd/Ctrl + K).
   * Using useCallback ensures the same function reference across renders.
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setShowCommandPalette(prev => !prev);
    }
    // Cmd/Ctrl + B for toggling sidebar collapse
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setIsCollapsed(prev => !prev);
    }
  }, []);

  /**
   * Registers and cleans up keyboard event listener.
   * The cleanup function prevents memory leaks when component unmounts.
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /**
   * Handles navigation item clicks with tracking and routing.
   * useCallback prevents creating new function on every render.
   */
  const handleItemClick = useCallback(
    (item: NavigationItem) => {
      navigationUtils.trackNavigationEvent('navigation_click', {
        itemId: item.id,
        itemLabel: item.label,
        source: 'desktop_sidebar',
      });
      navigate(item.href);
    },
    [navigate]
  );

  /**
   * Toggles sidebar collapse state.
   * Extracted to useCallback for performance and reusability.
   */
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  /**
   * Clears search query and closes command palette.
   * Used by both clear button and command palette action.
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowCommandPalette(false);
  }, []);

  /**
   * Closes command palette and navigates to item.
   * Extracted for reuse in command palette items.
   */
  const navigateAndClose = useCallback(
    (href: string) => {
      navigate(href);
      setShowCommandPalette(false);
    },
    [navigate]
  );

  return (
    <>
      {/* Command Palette provides quick keyboard-driven navigation */}
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {validatedItems.map(item => (
              <CommandItem key={item.id} onSelect={() => navigateAndClose(item.href)}>
                {item.icon}
                <span className="ml-2">{item.label}</span>
                {item.badge && <CommandShortcut>{item.badge}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => {
                toggleCollapse();
                setShowCommandPalette(false);
              }}
            >
              <PanelLeft className="h-4 w-4" />
              <span className="ml-2">Toggle Sidebar</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={clearSearch}>
              <Search className="h-4 w-4" />
              <span className="ml-2">Clear Search</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Main sidebar container with smooth collapse animation */}
      <aside
        className={`flex flex-col h-full bg-background border-r border-border transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        aria-label="Main sidebar navigation"
      >
        {/* Header section with collapse toggle button */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            {!isCollapsed && <h2 className="text-lg font-semibold">Navigation</h2>}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search bar is hidden when sidebar is collapsed to save space */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 flex-1"
                  aria-label="Search navigation items"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCommandPalette(true)}
                  className="px-2"
                  aria-label="Open command palette"
                  title="Open command palette (⌘K)"
                >
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable navigation area that grows to fill available space */}
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">
          <div className="space-y-1">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No items match your search' : 'No navigation items available'}
              </div>
            ) : (
              filteredItems.map(item => {
                const isActive = location.pathname === item.href;

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'primary' : 'ghost'}
                    className={`w-full justify-start gap-3 h-10 ${
                      isCollapsed ? 'px-2 justify-center' : ''
                    }`}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    aria-current={isActive ? 'page' : undefined}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                );
              })
            )}
          </div>
        </nav>

        {/* User profile footer appears only when authenticated and expanded */}
        {!isCollapsed && isAuthenticated && (
          <div className="p-4 border-t border-border flex-shrink-0">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {userRole?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">User</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userRole || 'Member'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </aside>
    </>
  );
});

DesktopSidebar.displayName = 'DesktopSidebar';
