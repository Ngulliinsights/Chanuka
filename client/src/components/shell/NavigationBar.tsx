import { Search, Bell, User, Settings } from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useNavigation } from '@client/core/navigation/context';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { useMediaQuery } from '@client/hooks/use-mobile';
import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';

import { Menu as MenuIcon, LogOut as LogOutIcon, Home as HomeIcon } from '../icons/SimpleIcons';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';


interface NavigationBarProps {
  className?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  onMobileMenuToggle?: () => void;
  searchPlaceholder?: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'bill' | 'page' | 'user';
  path: string;
  description?: string;
}

/**
 * NavigationBar component provides the main navigation interface
 * 
 * Features:
 * - Responsive design (desktop/mobile)
 * - Integrated search with autocomplete
 * - User authentication menu
 * - Notifications center
 * - Mobile menu toggle
 * - Keyboard navigation support
 * - ARIA accessibility
 */
export function NavigationBar({
  className,
  showSearch = true,
  showNotifications = true,
  showUserMenu = true,
  onMobileMenuToggle,
  searchPlaceholder = "Search bills, topics, or representatives..."
}: NavigationBarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { navigateTo, toggleMobileMenu } = useNavigation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Notifications state (mock data for now)
  const [notifications] = useState([
    { id: '1', title: 'New bill requires attention', unread: true },
    { id: '2', title: 'Comment on HB-123 received reply', unread: true },
    { id: '3', title: 'Weekly digest available', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  /**
   * Handles mobile menu toggle action
   * Uses provided callback or falls back to navigation context method
   */
  const handleMobileMenuToggle = useCallback(() => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle();
    } else {
      toggleMobileMenu();
    }
  }, [onMobileMenuToggle, toggleMobileMenu]);

  /**
   * Performs search operation with mock data
   * In production, this would call a real search API
   * 
   * @param query - The search query string
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Mock search results - properly typed to match SearchResult interface
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: `Bill HB-${Math.floor(Math.random() * 1000)}`,
          type: 'bill' as const, // Use 'as const' to ensure literal type
          path: '/bills/1',
          description: 'Healthcare reform legislation'
        },
        {
          id: '2',
          title: 'Bills Dashboard',
          type: 'page' as const,
          path: '/bills',
          description: 'View all active legislation'
        },
        {
          id: '3',
          title: 'Community Discussion',
          type: 'page' as const,
          path: '/community',
          description: 'Join the conversation'
        }
      ].filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(mockResults);
    } catch (error) {
      logger.error('Search failed:', { component: 'NavigationBar' }, error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Debounced search effect
   * Delays search execution until user stops typing (300ms delay)
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  /**
   * Handles search input changes
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.length > 0);
  }, []);

  /**
   * Handles selection of a search result
   * Clears search state and navigates to selected result
   */
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigateTo(result.path);
    searchInputRef.current?.blur();
  }, [navigateTo]);

  /**
   * Handles search form submission
   * Redirects to full search results page
   */
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  }, [searchQuery, navigate]);

  /**
   * Handles keyboard navigation in search input
   * Supports: Escape (close), ArrowDown (focus first result)
   */
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && showSearchResults && searchResults.length > 0) {
      e.preventDefault();
      // focus the first option (use role selector to match listbox options)
      const firstResult = searchResultsRef.current?.querySelector('[role="option"]');
      (firstResult as HTMLElement | null)?.focus();
    }
  }, [showSearchResults, searchResults.length]);

  /**
   * Handles keyboard navigation within search results
   * Supports: ArrowUp/ArrowDown (navigate), Escape (close)
   */
  const handleResultKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, searchResults.length - 1);
      const nextOption = searchResultsRef.current?.querySelectorAll('[role="option"]')[nextIndex];
      (nextOption as HTMLElement | undefined)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        searchInputRef.current?.focus();
      } else {
        const prevIndex = index - 1;
        const prevOption = searchResultsRef.current?.querySelectorAll('[role="option"]')[prevIndex];
        (prevOption as HTMLElement | undefined)?.focus();
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.focus();
    }
  }, [searchResults.length]);

  /**
   * Handles user logout
   * Clears authentication and redirects to home
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigateTo('/');
    } catch (error) {
      logger.error('Logout failed:', { component: 'NavigationBar' }, error);
    }
  }, [logout, navigateTo]);

  /**
   * Closes search results when clicking outside the search area
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Gets user's avatar URL, with fallback to undefined if not available
   * This handles cases where User type may not have avatar property
   */
  const getUserAvatar = () => {
    return (user as any)?.avatar as string | undefined;
  };

  return (
    <nav
      className={cn(
        "bg-white border-b border-gray-200 sticky top-0 z-50",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section: Logo and mobile menu */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMobileMenuToggle}
                className="mr-2 p-2"
                aria-label="Toggle mobile menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            )}

            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Chanuka home"
            >
              <HomeIcon className="h-6 w-6" />
              <span className="hidden sm:block">Chanuka</span>
            </Link>
          </div>

          {/* Center section: Search (desktop) */}
          {showSearch && !isMobile && (
            <div className="flex-1 max-w-lg mx-8 relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-10 pr-4 w-full"
                    aria-label="Search"
                    aria-expanded={showSearchResults}
                    aria-controls="search-results"
                    aria-autocomplete="list"
                    role="combobox"
                  />
                </div>

                {/* Search results dropdown - using proper combobox pattern */}
                {showSearchResults && (
                  <div
                    id="search-results"
                    ref={searchResultsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto"
                    role="listbox"
                    aria-label="Search results"
                  >
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-500">
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((result, index) => (
                          <div
                            key={result.id}
                            onClick={() => handleSearchResultSelect(result)}
                            onKeyDown={(e) => handleResultKeyDown(e, index)}
                            className="w-full text-left p-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset border-b border-gray-100 last:border-b-0"
                            role="option"
                            tabIndex={0}
                            aria-selected={false}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {result.title}
                                </div>
                                {result.description && (
                                  <div className="text-sm text-gray-500">
                                    {result.description}
                                  </div>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {result.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <div className="p-2 border-t border-gray-100">
                          <div
                            role="option"
                            tabIndex={0}
                            onClick={() => {
                              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                              setShowSearchResults(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                                setShowSearchResults(false);
                              }
                            }}
                            className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-500"
                          >
                            View all results for "{searchQuery}"
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Right section: Notifications and user menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile search button */}
            {showSearch && isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/search')}
                className="p-2"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Notifications */}
            {showNotifications && isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative p-2"
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex items-start space-x-2 p-3">
                      <div className="flex-1">
                        <div className={cn(
                          "text-sm",
                          notification.unread ? "font-medium" : "font-normal"
                        )}>
                          {notification.title}
                        </div>
                      </div>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center">
                    <Link to="/notifications" className="w-full text-blue-600">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            {showUserMenu && (
              <>
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full"
                        aria-label="User menu"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getUserAvatar()} alt={user?.name || 'User'} />
                          <AvatarFallback>
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/account/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="flex items-center">
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/auth?mode=login">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/auth?mode=register">Sign Up</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavigationBar;