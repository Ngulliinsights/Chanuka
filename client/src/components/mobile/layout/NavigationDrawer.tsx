/**
 * NavigationDrawer - Consolidated slide-out navigation menu
 * Features swipe gestures, accessibility, and user profile section
 */

import { X, Settings } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { SwipeGestures } from '@client/components/mobile/interaction/SwipeGestures';
import { Avatar, AvatarFallback, AvatarImage } from '@client/components/ui/avatar';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import type { NavigationItem } from '@client/config/navigation';
import { useAuth } from '@client/hooks';
import { cn } from '@client/lib/utils';
import type { SwipeEvent } from '@client/types/mobile';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems?: NavigationItem[];
  onNavigationClick?: (itemId: string) => void;
  activeItemId?: string;
  side?: 'left' | 'right';
}

export function NavigationDrawer({
  isOpen,
  onClose,
  navigationItems = [],
  onNavigationClick,
  activeItemId,
  side = 'left',
}: NavigationDrawerProps): JSX.Element | null {
  const { user, isAuthenticated } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleItemClick = useCallback(
    (item: NavigationItem, e: React.MouseEvent) => {
      if (item.disabled) {
        e.preventDefault();
        return;
      }
      onNavigationClick?.(item.id);
      onClose();
    },
    [onNavigationClick, onClose]
  );

  const handleSwipe = useCallback(
    (event: SwipeEvent) => {
      if ((side === 'left' && event.direction === 'left') ||
          (side === 'right' && event.direction === 'right')) {
        onClose();
      }
    },
    [side, onClose]
  );

  if (!isOpen) return null;

  const drawerContent = (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <SwipeGestures
        onSwipe={handleSwipe}
        minDistance={50}
        className={cn(
          'fixed top-0 bottom-0 bg-background shadow-xl w-80',
          'transform transition-transform duration-300 ease-out',
          side === 'left' ? 'left-0' : 'right-0'
        )}
      >
        <div ref={drawerRef} className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold">C</span>
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
          </header>

          {isAuthenticated && user && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name || 'User'} />
                  <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto py-2" role="navigation" aria-label="Primary">
            <div className="space-y-1 px-2">
              {navigationItems.map((item) => {
                const isActive = activeItemId === item.id;

                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={(e) => handleItemClick(item, e)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium',
                      'transition-all duration-200 min-h-[44px]',
                      'focus:outline-none focus:ring-2 focus:ring-ring',
                      item.disabled && 'opacity-50 cursor-not-allowed',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={item.disabled ? -1 : 0}
                  >
                    {item.icon && (
                      <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
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
            </div>
          </nav>

          <footer className="border-t p-2">
            <Link to="/settings" onClick={onClose}>
              <Button variant="outline" className="w-full min-h-[44px]">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </footer>
        </div>
      </SwipeGestures>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
