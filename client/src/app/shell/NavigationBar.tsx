import * as LucideIcons from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../core/auth';
import { CommandPalette } from '../../core/command-palette/CommandPalette';
import { useCommandPalette } from '../../core/command-palette/useCommandPalette';
import { useNavigation } from '../../core/navigation/context';
import type { UnifiedSearchQuery, UnifiedSearchResult } from '../../core/search/types';
import { UnifiedSearchInterface } from '../../core/search/UnifiedSearchInterface';
import { useDeviceInfo } from '@client/shared/hooks/mobile/useDeviceInfo';
import { cn } from '@client/shared/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shared/design-system';
import { useMobileMenu } from '../../shared/hooks/useNavigationSlice';
import { LanguageSwitcher } from '../../shared/ui/i18n/LanguageSwitcher';
import { logger } from '@client/shared/utils/logger';

// Type Definitions
interface NavigationBarProps {
  className?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  onMobileMenuToggle?: () => void;
  searchPlaceholder?: string;
}

interface UserProfile {
  id?: string;
  avatar?: string;
  name?: string;
  email?: string;
}

interface Notification {
  id: string;
  title: string;
  unread: boolean;
  timestamp?: Date;
}

// Type guard for user profile
function isUserProfile(user: unknown): user is UserProfile {
  return (
    typeof user === 'object' &&
    user !== null &&
    ('name' in user || 'email' in user || 'avatar' in user)
  );
}

// Helper function to get user display data
function getUserDisplayData(user: unknown) {
  if (!user || !isUserProfile(user)) {
    return { avatar: undefined, initial: 'U', name: 'User', email: '' };
  }

  const initial = user.name?.charAt(0) || user.email?.charAt(0) || 'U';
  return {
    avatar: user.avatar,
    initial: initial.toUpperCase(),
    name: user.name || 'User',
    email: user.email || '',
  };
}

/**
 * NotificationMenu Component - Extracted for better maintainability
 */
const NotificationMenu = memo(
  ({ notifications, unreadCount }: { notifications: Notification[]; unreadCount: number }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <LucideIcons.Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
              aria-hidden="true"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <DropdownMenuItem key={notification.id} className="flex items-start space-x-2 p-3">
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm', notification.unread ? 'font-medium' : 'font-normal')}>
                  {notification.title}
                </div>
              </div>
              {notification.unread && (
                <div
                  className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"
                  aria-label="Unread"
                />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
          <Link to="/notifications" className="w-full text-center text-blue-600">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
);
NotificationMenu.displayName = 'NotificationMenu';

/**
 * UserMenu Component - Extracted for better maintainability
 */
const UserMenu = memo(
  ({
    userDisplay,
    onLogout,
  }: {
    userDisplay: ReturnType<typeof getUserDisplayData>;
    onLogout: () => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userDisplay.avatar} alt={userDisplay.name} />
            <AvatarFallback>{userDisplay.initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userDisplay.name}</p>
            {userDisplay.email && (
              <p className="text-xs leading-none text-muted-foreground">{userDisplay.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account" className="flex items-center cursor-pointer">
            <LucideIcons.User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/settings" className="flex items-center cursor-pointer">
            <LucideIcons.Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="flex items-center cursor-pointer">
          <LucideIcons.X className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
);
UserMenu.displayName = 'UserMenu';

/**
 * NavigationBar - Main navigation component with optimized performance
 *
 * Features:
 * - Integrated unified search with smart filtering
 * - Command palette (⌘K) for power users
 * - Real-time notifications with unread count
 * - Responsive mobile-first design
 * - Full keyboard navigation support
 * - WCAG 2.1 AA compliant accessibility
 */
export const NavigationBar = memo<NavigationBarProps>(
  ({
    className,
    showSearch = true,
    showNotifications = true,
    showUserMenu = true,
    onMobileMenuToggle,
    searchPlaceholder = 'Search bills, topics, or representatives...',
  }) => {
    const { user, isAuthenticated, logout } = useAuth();
    const { navigateTo } = useNavigation();
    const navigate = useNavigate();
    const { isMobile } = useDeviceInfo();

    // Get mobile menu state from navigation slice
    const { mobileMenuOpen, toggleMobileMenu } = useMobileMenu();

    // Command palette setup
    const commandPalette = useCommandPalette({
      config: {
        placeholder: 'Type a command or search...',
        enableKeyboardShortcuts: true,
        enableSearchHistory: true,
      },
      onCommandExecute: command => {
        logger.info('Command executed', { component: 'NavigationBar', commandId: command.id });
      },
    });

    // Mock notifications - replace with useNotifications hook in production
    const notifications = useMemo<Notification[]>(
      () => [
        { id: '1', title: 'New bill requires attention', unread: true },
        { id: '2', title: 'Comment on HB-123 received reply', unread: true },
        { id: '3', title: 'Weekly digest available', unread: false },
      ],
      []
    );

    // Computed values
    const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);
    const userDisplay = useMemo(() => getUserDisplayData(user), [user]);

    // Event handlers
    const handleMobileMenuToggle = useCallback(() => {
      if (onMobileMenuToggle) {
        onMobileMenuToggle();
      } else {
        toggleMobileMenu();
      }
    }, [onMobileMenuToggle, toggleMobileMenu]);

    const handleSearch = useCallback(
      (query: UnifiedSearchQuery) => {
        logger.info('Search executed', { component: 'NavigationBar', query: query.q });
        navigate(`/search?q=${encodeURIComponent(query.q)}`);
      },
      [navigate]
    );

    const handleSearchResults = useCallback((results: UnifiedSearchResult) => {
      logger.info('Search results', {
        component: 'NavigationBar',
        count: results.results.length,
        strategy: results.metadata.strategy,
      });
    }, []);

    const handleSearchError = useCallback((error: Error) => {
      logger.error('Search error', { component: 'NavigationBar' }, error);
    }, []);

    const handleLogout = useCallback(async () => {
      try {
        await logout();
        navigateTo('/');
      } catch (error) {
        logger.error('Logout failed', { component: 'NavigationBar' }, error);
      }
    }, [logout, navigateTo]);

    return (
      <nav
        className={cn('bg-white border-b border-gray-200 sticky top-0 z-50', className)}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo and mobile menu */}
            <div className="flex items-center">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMobileMenuToggle}
                  className="mr-2 p-2"
                  aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
                >
                  {mobileMenuOpen ? (
                    <LucideIcons.X className="h-5 w-5" />
                  ) : (
                    <LucideIcons.Menu className="h-5 w-5" />
                  )}
                </Button>
              )}

              <Link
                to="/"
                className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
                aria-label="Chanuka home"
              >
                <LucideIcons.Home className="h-6 w-6" />
                <span className="hidden sm:block">Chanuka</span>
              </Link>
            </div>

            {/* Center: Search (desktop only) */}
            {showSearch && !isMobile && (
              <div className="flex-1 max-w-lg mx-8">
                <UnifiedSearchInterface
                  variant="header"
                  placeholder={searchPlaceholder}
                  showSuggestions={true}
                  showFilters={false}
                  onSearch={handleSearch}
                  onResults={handleSearchResults}
                  onError={handleSearchError}
                  className="w-full"
                />
              </div>
            )}

            {/* Right: Actions and user menu */}
            <div className="flex items-center space-x-4">
              <LanguageSwitcher variant="compact" showFlag={true} />

              {/* Command Palette (desktop only) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={commandPalette.toggle}
                className="p-2 hidden sm:flex items-center gap-2"
                aria-label="Open command palette"
                title="Press ⌘K to open"
              >
                <LucideIcons.Settings className="h-4 w-4" />
                <span className="text-xs text-muted-foreground hidden lg:inline">⌘K</span>
              </Button>

              {/* Search (mobile only) */}
              {showSearch && isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/search')}
                  className="p-2"
                  aria-label="Search"
                >
                  <LucideIcons.Search className="h-5 w-5" />
                </Button>
              )}

              {/* Notifications */}
              {showNotifications && isAuthenticated && (
                <NotificationMenu notifications={notifications} unreadCount={unreadCount} />
              )}

              {/* User menu or auth buttons */}
              {showUserMenu && (
                <>
                  {isAuthenticated ? (
                    <UserMenu userDisplay={userDisplay} onLogout={handleLogout} />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Link to="/auth?mode=login">
                        <Button variant="ghost" size="sm">
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/auth?mode=register">
                        <Button size="sm">Sign Up</Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPalette.isOpen}
          onOpenChange={commandPalette.setIsOpen}
          config={commandPalette.config}
          customCommands={commandPalette.customCommands}
          onCommandExecute={commandPalette.onCommandExecute}
        />
      </nav>
    );
  }
);

NavigationBar.displayName = 'NavigationBar';

export default NavigationBar;
