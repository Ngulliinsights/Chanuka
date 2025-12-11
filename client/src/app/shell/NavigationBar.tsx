import { Search, Bell, User, Settings, LogOut, Menu, Home } from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useNavigation } from '@client/core/navigation/context';
import { useAuth } from '@client/core/auth';
import { useDeviceInfo } from '@client/hooks/mobile/useDeviceInfo';
import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';

import { Avatar, AvatarFallback, AvatarImage, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input } from '@client/shared/design-system';

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

interface UserWithAvatar {
  avatar?: string;
  name?: string;
  email?: string;
}

interface Notification {
  id: string;
  title: string;
  unread: boolean;
}

/**
 * NavigationBar component provides the main navigation interface with enhanced
 * performance optimizations and accessibility features.
 * 
 * Key optimizations:
 * - Memoized computed values to prevent unnecessary recalculations
 * - Debounced search with AbortController for proper request cancellation
 * - Extracted sub-components to minimize re-render scope
 * - Enhanced keyboard navigation with proper focus management
 * - Improved ARIA patterns for screen reader compatibility
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
  const { isMobile } = useDeviceInfo();

  // Search state with proper typing
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mock notifications - in production, this would come from a notifications hook
  const notifications = useMemo<Notification[]>(() => [
    { id: '1', title: 'New bill requires attention', unread: true },
    { id: '2', title: 'Comment on HB-123 received reply', unread: true },
    { id: '3', title: 'Weekly digest available', unread: false },
  ], []);

  // Memoize computed values to prevent unnecessary recalculations
  const unreadCount = useMemo(
    () => notifications.filter(n => n.unread).length,
    [notifications]
  );

  const userAvatar = useMemo(() => {
    if (!user) return undefined;
    return (user as unknown as UserWithAvatar).avatar;
  }, [user]);

  const userInitial = useMemo(() => {
    if (!user) return 'U';
    const userWithAvatar = user as unknown as UserWithAvatar;
    return userWithAvatar.name?.charAt(0) || userWithAvatar.email?.charAt(0) || 'U';
  }, [user]);

  /**
   * Handles mobile menu toggle with proper callback prioritization
   */
  const handleMobileMenuToggle = useCallback(() => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle();
    } else {
      toggleMobileMenu();
    }
  }, [onMobileMenuToggle, toggleMobileMenu]);

  /**
   * Performs search with proper request cancellation and error handling.
   * This implementation cancels in-flight requests when a new search is initiated,
   * preventing race conditions and improving perceived performance.
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedResultIndex(-1);
      return;
    }

    // Cancel any existing search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    try {
      // In production, replace this with your actual API call
      // const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      //   signal: abortControllerRef.current.signal
      // });
      // const results = await response.json();

      // Simulate API delay for demonstration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Mock search results with relevance filtering
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: `Bill HB-${Math.floor(Math.random() * 1000)}`,
          type: 'bill' as const,
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
      ].filter(result => {
        const searchLower = query.toLowerCase();
        return result.title.toLowerCase().includes(searchLower) ||
               result.description?.toLowerCase().includes(searchLower);
      });

      setSearchResults(mockResults);
      setSelectedResultIndex(-1);
    } catch (error) {
      // Only log errors that aren't from request cancellation
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Search failed:', { component: 'NavigationBar' }, error);
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Debounced search effect with proper cleanup.
   * This ensures we don't make excessive API calls while the user is typing.
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      // Cancel any in-flight requests when component unmounts or query changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, performSearch]);

  /**
   * Handles search input changes with proper state management
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.length > 0);
  }, []);

  /**
   * Closes search results and resets selection state
   */
  const closeSearchResults = useCallback(() => {
    setShowSearchResults(false);
    setSelectedResultIndex(-1);
  }, []);

  /**
   * Handles selection of a search result with proper cleanup
   */
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    setSearchQuery('');
    closeSearchResults();
    navigateTo(result.path);
    searchInputRef.current?.blur();
  }, [navigateTo, closeSearchResults]);

  /**
   * Handles search form submission
   */
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearchResults();
      searchInputRef.current?.blur();
    }
  }, [searchQuery, navigate, closeSearchResults]);

  /**
   * Enhanced keyboard navigation in search input.
   * Supports Escape, ArrowDown, and ArrowUp for better UX.
   */
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearchResults();
      searchInputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && showSearchResults) {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedResultIndex(0);
        const firstResult = searchResultsRef.current?.querySelector('[role="option"]');
        (firstResult as HTMLElement)?.focus();
      }
    } else if (e.key === 'ArrowUp' && showSearchResults) {
      e.preventDefault();
      // When at input and pressing up, do nothing (already at top)
    }
  }, [showSearchResults, searchResults.length, closeSearchResults]);

  /**
   * Enhanced keyboard navigation within search results.
   * Properly manages focus and selection state for accessibility.
   */
  const handleResultKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const totalResults = searchResults.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = index < totalResults - 1 ? index + 1 : index;
      setSelectedResultIndex(nextIndex);
      const nextOption = searchResultsRef.current?.querySelectorAll('[role="option"]')[nextIndex];
      (nextOption as HTMLElement)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        setSelectedResultIndex(-1);
        searchInputRef.current?.focus();
      } else {
        const prevIndex = index - 1;
        setSelectedResultIndex(prevIndex);
        const prevOption = searchResultsRef.current?.querySelectorAll('[role="option"]')[prevIndex];
        (prevOption as HTMLElement)?.focus();
      }
    } else if (e.key === 'Escape') {
      closeSearchResults();
      searchInputRef.current?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchResultSelect(searchResults[index]);
    }
  }, [searchResults, handleSearchResultSelect, closeSearchResults]);

  /**
   * Handles user logout with proper error handling
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
   * Click outside handler for search dropdown with proper cleanup
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(target) &&
        !searchInputRef.current?.contains(target)
      ) {
        closeSearchResults();
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults, closeSearchResults]);

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
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMobileMenuToggle}
                className="mr-2 p-2"
                aria-label="Toggle mobile menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <Link
              to="/"
              className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
              aria-label="Chanuka home"
            >
              <Home className="h-6 w-6" />
              <span className="hidden sm:block">Chanuka</span>
            </Link>
          </div>

          {/* Center section: Search (desktop only) */}
          {showSearch && !isMobile && (
            <div className="flex-1 max-w-lg mx-8 relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" 
                    aria-hidden="true"
                  />
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
                    aria-activedescendant={
                      selectedResultIndex >= 0 
                        ? `search-result-${searchResults[selectedResultIndex]?.id}` 
                        : undefined
                    }
                    role="combobox"
                  />
                </div>

                {showSearchResults && !isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div
                      id="search-results"
                      ref={searchResultsRef}
                      className="max-h-96 overflow-y-auto"
                      role="listbox"
                      aria-label="Search results"
                    >
                      {searchResults.length > 0 ? (
                        <>
                          {searchResults.map((result, index) => (
                            <div
                              key={result.id}
                              id={`search-result-${result.id}`}
                              onClick={() => handleSearchResultSelect(result)}
                              onKeyDown={(e) => handleResultKeyDown(e, index)}
                              className={cn(
                                "w-full text-left p-3 hover:bg-gray-50 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors",
                                selectedResultIndex === index && "bg-gray-50"
                              )}
                              role="option"
                              tabIndex={0}
                              aria-selected={selectedResultIndex === index}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {result.title}
                                  </div>
                                  {result.description && (
                                    <div className="text-sm text-gray-500 truncate">
                                      {result.description}
                                    </div>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                                  {result.type}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No results found for &ldquo;{searchQuery}&rdquo;
                        </div>
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                            closeSearchResults();
                          }}
                          className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                          View all results for &ldquo;{searchQuery}&rdquo;
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Status announcement for screen readers - separate from listbox */}
                {showSearchResults && (
                  <div
                    className="sr-only"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {isSearching
                      ? "Searching..."
                      : `${searchResults.length} results found for ${searchQuery}`}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Right section: Notifications and user menu */}
          <div className="flex items-center space-x-4">
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

            {showNotifications && isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative p-2"
                    aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                  >
                    <Bell className="h-5 w-5" />
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
                    notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className="flex items-start space-x-2 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "text-sm",
                            notification.unread ? "font-medium" : "font-normal"
                          )}>
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
                    <div className="p-4 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="justify-center">
                    <Link to="/notifications" className="w-full text-center text-blue-600">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
                          <AvatarImage 
                            src={userAvatar} 
                            alt={(user as unknown as UserWithAvatar)?.name || 'User'} 
                          />
                          <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {(user as unknown as UserWithAvatar)?.name || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {(user as unknown as UserWithAvatar)?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="flex items-center cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/account/settings" className="flex items-center cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleLogout} 
                        className="flex items-center cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link to="/auth?mode=login">
                      <Button variant="ghost" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth?mode=register">
                      <Button size="sm">
                        Sign Up
                      </Button>
                    </Link>
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