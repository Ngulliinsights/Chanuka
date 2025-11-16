/**
 * Mobile Navigation Drawer Component
 * 
 * A slide-out navigation drawer optimized for mobile devices.
 * Provides touch-friendly navigation with swipe gestures and proper accessibility.
 * 
 * Features:
 * - Touch-optimized with 44px minimum touch targets
 * - Swipe gestures for open/close
 * - Backdrop blur and overlay
 * - Keyboard navigation support
 * - Accessibility compliance with focus management
 * - Smooth animations and transitions
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Menu, Home, FileText, Users, Search, User, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../hooks/useAuth';
import { SwipeGestures } from './SwipeGestures';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  requiresAuth?: boolean;
}

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  side?: 'left' | 'right';
  width?: string;
  showUserSection?: boolean;
  navigationItems?: NavigationItem[];
}

const defaultNavigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: <Home className="h-5 w-5" />,
  },
  {
    id: 'bills',
    label: 'Bills',
    path: '/bills',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'community',
    label: 'Community',
    path: '/community',
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: <Search className="h-5 w-5" />,
  },
];

export function MobileNavigationDrawer({
  isOpen,
  onClose,
  className,
  side = 'left',
  width = '280px',
  showUserSection = true,
  navigationItems = defaultNavigationItems,
}: MobileNavigationDrawerProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [currentTranslateX, setCurrentTranslateX] = useState(0);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  // Handle swipe to close
  const handleSwipeLeft = useCallback(() => {
    if (side === 'left') {
      onClose();
    }
  }, [side, onClose]);

  const handleSwipeRight = useCallback(() => {
    if (side === 'right') {
      onClose();
    }
  }, [side, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      // Focus the first focusable element
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isOpen]);

  // Handle navigation item click
  const handleNavigationClick = useCallback((item: NavigationItem) => {
    if (item.disabled) return;
    if (item.requiresAuth && !isAuthenticated) return;
    
    onClose();
  }, [isAuthenticated, onClose]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      onClose();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, onClose]);

  // Filter navigation items based on auth state
  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  if (!isOpen) return null;

  const drawerContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <SwipeGestures
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        minDistance={50}
        className={cn(
          'fixed top-0 bottom-0 bg-background shadow-xl',
          'transform transition-transform duration-300 ease-out',
          side === 'left' ? 'left-0' : 'right-0'
        )}
        style={{ width }}
      >
        <div
          ref={drawerRef}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Section */}
          {showUserSection && isAuthenticated && user && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name || 'User'} />
                  <AvatarFallback>
                    {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-2">
            <div className="space-y-1 px-2">
              {filteredNavigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => handleNavigationClick(item)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                      'transition-all duration-200 min-h-[44px]', // Touch target minimum
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={item.disabled ? -1 : 0}
                  >
                    <span className="flex-shrink-0">
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer Actions */}
          {isAuthenticated && (
            <div className="border-t p-2 space-y-1">
              <Link
                to="/profile"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'transition-all duration-200 min-h-[44px]',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">Profile</span>
              </Link>
              
              <Link
                to="/settings"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'transition-all duration-200 min-h-[44px]',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">Settings</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'transition-all duration-200 min-h-[44px]',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">Sign Out</span>
              </button>
            </div>
          )}

          {/* Auth Actions for non-authenticated users */}
          {!isAuthenticated && (
            <div className="border-t p-4 space-y-2">
              <Link
                to="/auth?mode=login"
                onClick={onClose}
                className="w-full"
              >
                <Button variant="outline" className="w-full min-h-[44px]">
                  Sign In
                </Button>
              </Link>
              <Link
                to="/auth?mode=register"
                onClick={onClose}
                className="w-full"
              >
                <Button className="w-full min-h-[44px]">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </SwipeGestures>
    </div>
  );

  return createPortal(drawerContent, document.body);
}

/**
 * Hook for managing mobile navigation drawer state
 */
export function useMobileNavigationDrawer(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}