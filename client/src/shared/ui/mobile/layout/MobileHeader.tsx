/**
 * Unified MobileHeader Component
 *
 * Consolidates mobile-header.tsx and MobileHeader.tsx into a single, flexible header component.
 * Supports simple and complex header configurations with navigation menu support.
 *
 * @component
 * @example
 * ```tsx
 * import { MobileHeader } from '@client/shared/ui/mobile/layout';
 *
 * // Simple header
 * <MobileHeader title="My Page" />
 *
 * // Complex header with navigation
 * <MobileHeader
 *   title="App"
 *   showMenu={true}
 *   showSearch={true}
 *   navigationItems={items}
 *   onMenuToggle={handleMenu}
 * />
 * ```
 */

import { BarChart3, X, Search } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Badge, Button } from '@/shared/design-system';
import { cn } from '@/shared/design-system/utils/cn';

// Navigation item interface
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number;
}

// Header action interface
export interface HeaderAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
  className?: string;
}

// Component props
export interface MobileHeaderProps {
  /** Header title */
  title?: string;
  /** Show logo */
  showLogo?: boolean;
  /** Logo component */
  logo?: React.ReactNode;
  /** Show search button */
  showSearch?: boolean;
  /** Search click handler */
  onSearchClick?: () => void;
  /** Show menu button */
  showMenu?: boolean;
  /** Menu toggle handler */
  onMenuToggle?: () => void;
  /** Left side actions */
  leftActions?: HeaderAction[];
  /** Right side actions */
  rightActions?: HeaderAction[];
  /** Navigation items for dropdown menu */
  navigationItems?: NavigationItem[];
  /** Custom className */
  className?: string;
  /** Header variant */
  variant?: 'default' | 'bordered';
}

/**
 * Unified MobileHeader Component
 *
 * Flexible header supporting both simple and complex configurations.
 */
export const MobileHeader = React.forwardRef<HTMLDivElement, MobileHeaderProps>(
  ({
    title = "Chanuka",
    showLogo = false,
    logo,
    showSearch = false,
    onSearchClick,
    showMenu = false,
    onMenuToggle,
    leftActions = [],
    rightActions = [],
    navigationItems = [],
    className,
    variant = 'bordered',
  }, ref) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    // Handle menu toggle
    const handleMenuToggle = useCallback(() => {
      setIsMenuOpen(prev => !prev);
      onMenuToggle?.();
    }, [onMenuToggle]);

    // Handle search click
    const handleSearchClick = useCallback(() => {
      onSearchClick?.();
    }, [onSearchClick]);

    // Check if path is active
    const isActivePath = useCallback(
      (path: string): boolean => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
      },
      [location.pathname]
    );

    const headerClassName = cn(
      "flex items-center justify-between px-4 py-3 bg-background",
      variant === 'bordered' && "border-b border-border",
      className
    );

    return (
      <>
        {/* Header */}
        <header ref={ref} className={headerClassName}>
          <div className="flex items-center gap-2">
            {/* Logo */}
            {showLogo && (
              <div className="flex items-center">
                {logo || (
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">C</span>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            {title && !showLogo && (
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            )}

            {/* Left actions */}
            {leftActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn("h-8 w-8 p-0", action.className)}
                aria-label={action.label}
              >
                {action.icon}
                {action.badge && action.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {action.badge > 99 ? '99+' : action.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Right actions */}
            {rightActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn("h-8 w-8 p-0 relative", action.className)}
                aria-label={action.label}
              >
                {action.icon}
                {action.badge && action.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {action.badge > 99 ? '99+' : action.badge}
                  </Badge>
                )}
              </Button>
            ))}

            {/* Search button */}
            {showSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchClick}
                className="h-8 w-8 p-0"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Menu button */}
            {showMenu && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenuToggle}
                className="h-8 w-8 p-0"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <BarChart3 className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {isMenuOpen && navigationItems.length > 0 && (
          <div className="bg-background border-b border-border">
            <nav className="px-4 py-2 space-y-1" role="navigation" aria-label="Mobile navigation">
              {navigationItems.map((item) => {
                const isActive = isActivePath(item.href);

                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] items-center',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon && (
                      <span className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </>
    );
  }
);

MobileHeader.displayName = 'MobileHeader';

export default MobileHeader;
