import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, Bell, User } from 'lucide-react';

import { Button } from '@client/shared/design-system/interactive/Button.tsx';
import { Badge } from '@client/shared/design-system/feedback/Badge.tsx';
import { cn } from '../../design-system/utils/cn';

interface HeaderProps {
  className?: string;
  onMenuToggle?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  notificationCount?: number;
}

/**
 * Application header component
 * Provides navigation, search, and user actions
 */
export default function Header({ 
  className,
  onMenuToggle,
  showSearch = true,
  showNotifications = true,
  showUserMenu = true,
  notificationCount = 0
}: HeaderProps) {
  return (
    <header className={cn(
      "flex items-center justify-between px-4 py-3 bg-background border-b",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">ST</span>
          </div>
          <span className="font-semibold text-lg hidden sm:block">SimpleTool</span>
        </Link>
      </div>

      {/* Center Section - Search */}
      {showSearch && (
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bills, topics, or representatives..."
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        {showSearch && (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>
        )}

        {/* Notifications */}
        {showNotifications && (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>
        )}

        {/* User Menu */}
        {showUserMenu && (
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}