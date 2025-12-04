import { Building, BarChart3, FileText, Users, Search, Settings, HelpCircle, MessageSquare, Shield, TrendingUp, User } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '@client/lib/utils';

import { Logo } from '../ui/logo';

import { 
  SidebarProps, 
  NavigationItem, 
  LayoutError, 
  LayoutRenderError,
  validateNavigationItem,
  safeValidateNavigationItem
} from './index';

const DEFAULT_NAVIGATION: NavigationItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: <Building className="h-4 w-4" /> },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'bills', label: 'Bills', href: '/bills', icon: <FileText className="h-4 w-4" /> },
  { id: 'search', label: 'Search', href: '/search', icon: <Search className="h-4 w-4" /> },
  { id: 'community', label: 'Community', href: '/community', icon: <Users className="h-4 w-4" /> },
  { id: 'verification', label: 'Expert Verification', href: '/expert-verification', icon: <Shield className="h-4 w-4" /> },
  { id: 'sponsorship', label: 'Sponsorship Analysis', href: '/bill-sponsorship-analysis', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'user-dashboard', label: 'My Dashboard', href: '/account', icon: <User className="h-4 w-4" />, requiresAuth: true },
  { id: 'profile', label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" />, requiresAuth: true },
  { id: 'privacy-settings', label: 'Privacy Settings', href: '/privacy-settings', icon: <Settings className="h-4 w-4" />, requiresAuth: true },
  { id: 'admin', label: 'Admin', href: '/admin', icon: <Settings className="h-4 w-4" />, adminOnly: true },
];

export function Sidebar({ 
  isCollapsed = false, 
  onToggle, 
  navigationItems = DEFAULT_NAVIGATION, 
  user, 
  className,
  showSearch = true,
  onSearchChange
}: SidebarProps = {}) {
  const location = useLocation();
  const [sidebarError, setSidebarError] = useState<LayoutError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Validate navigation items
  useEffect(() => {
    for (const item of navigationItems) {
      const validation = safeValidateNavigationItem(item);
      if (!validation.success) {
        const error = new LayoutRenderError(
          `Invalid navigation item: ${validation.error?.message}`,
          'Sidebar',
          { item, validationError: validation.error }
        );
        setSidebarError(error);
        break;
      }
    }
  }, [navigationItems]);

  const handleSearchChange = useCallback((query: string) => {
    try {
      setSearchQuery(query);
      onSearchChange?.(query);
    } catch (error) {
      const layoutError = new LayoutRenderError(
        `Search change failed: ${(error as Error).message}`,
        'Sidebar'
      );
      setSidebarError(layoutError);
    }
  }, [onSearchChange]);

  const handleToggle = useCallback(() => {
    try {
      onToggle?.();
    } catch (error) {
      const layoutError = new LayoutRenderError(
        `Sidebar toggle failed: ${(error as Error).message}`,
        'Sidebar'
      );
      setSidebarError(layoutError);
    }
  }, [onToggle]);

  // Error recovery
  const recoverFromError = useCallback(() => {
    setSidebarError(null);
    setSearchQuery('');
  }, []);

  // Error boundary rendering
  if (sidebarError) {
    return (
      <div className="flex h-full w-64 flex-col bg-red-50 border-r border-red-200">
        <div className="p-4">
          <div className="text-red-600 text-sm mb-2">Sidebar Error:</div>
          <div className="text-red-500 text-xs mb-4">{sidebarError.message}</div>
          <button
            onClick={recoverFromError}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            type="button"
          >
            Recover
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className={cn(
        "flex h-full flex-col bg-card border-r border-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-border">
          {isCollapsed ? (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          ) : (
            <Logo 
              size="md" 
              showText={true}
              textClassName="text-xl font-bold text-primary"
            />
          )}
          {onToggle && (
            <button
              onClick={handleToggle}
              className="ml-auto p-1 rounded-md hover:bg-muted transition-colors"
              type="button"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Search */}
        {showSearch && !isCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Search bills"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4" role="navigation" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const is_active = location.pathname === item.href;
            
            // Skip items that require auth if user is not authenticated
            if (item.requiresAuth && !user) {
              return null;
            }
            
            // Skip admin-only items if user is not admin
            if (item.adminOnly && user?.role !== 'admin') {
              return null;
            }
            
            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  is_active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  isCollapsed && 'justify-center px-2'
                )}
                aria-current={is_active ? 'page' : undefined}
                title={isCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-border p-4">
            <div className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center"
            )}>
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-accent-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                    aria-label="User settings"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    const layoutError = new LayoutRenderError(
      `Sidebar render failed: ${(error as Error).message}`,
      'Sidebar'
    );
    setSidebarError(layoutError);
    return null;
  }
}

