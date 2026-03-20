import { BarChart3, Search, Bell, User, Menu } from 'lucide-react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@client/lib/design-system/feedback/Badge';
import { Button } from '@client/lib/design-system/interactive/Button';
import { ChanukaWordmark } from '@client/lib/design-system/media/ChanukaWordmark';
import { cn } from '@client/lib/design-system/utils/cn';
import { LanguageSwitcher } from '@client/lib/ui/i18n/LanguageSwitcher';
import { useI18n } from '@client/lib/hooks/use-i18n';

export interface HeaderProps {
  className?: string;
  onMenuToggle?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onUserMenuClick?: () => void;
  onSearchSubmit?: (query: string) => void;
  transparentOnTop?: boolean;
}

/**
 * Header Component
 * 
 * Application header with responsive navigation, search, and user actions.
 * Supports transparent mode at top of page that transitions to solid background on scroll.
 * 
 * @param onMenuToggle - Callback for mobile menu toggle
 * @param showSearch - Show search input (default: true)
 * @param showNotifications - Show notification bell (default: true)
 * @param showUserMenu - Show user menu button (default: true)
 * @param notificationCount - Number of unread notifications
 * @param transparentOnTop - Use transparent background at top (default: false)
 * 
 * @example
 * <Header
 *   showSearch
 *   notificationCount={3}
 *   onNotificationClick={handleNotifications}
 *   transparentOnTop
 * />
 */
export const Header = React.memo<HeaderProps>(({
  className,
  onMenuToggle,
  showSearch = true,
  showNotifications = true,
  showUserMenu = true,
  notificationCount = 0,
  onNotificationClick,
  onUserMenuClick,
  onSearchSubmit,
  transparentOnTop = false,
}) => {
  const navigate = useNavigate();
  const { language, changeLanguage } = useI18n();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);

  // Track scroll position
  React.useEffect(() => {
    if (!transparentOnTop) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      const scrollThreshold = 20;
      setIsScrolled(window.scrollY > scrollThreshold);
    };
    
    // Initial check
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparentOnTop]);

  // Handle search submission
  const handleSearch = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchSubmit?.(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    }
  }, [searchQuery, onSearchSubmit, navigate]);

  // Dynamic styles based on scroll state
  const headerStyles = React.useMemo(() => {
    if (!transparentOnTop || isScrolled) {
      return 'bg-white/95 backdrop-blur-md shadow-md border-gray-200/50 py-3';
    }
    return 'bg-transparent border-transparent py-5';
  }, [transparentOnTop, isScrolled]);

  // Logo variant based on background
  const logoVariant = (!transparentOnTop || isScrolled) ? 'brand' : 'white';
  
  // Text color based on background
  const textColor = (!transparentOnTop || isScrolled)
    ? 'text-gray-700 hover:text-gray-900'
    : 'text-white/90 hover:text-white';

  const iconButtonClasses = (!transparentOnTop || isScrolled)
    ? 'hover:bg-gray-100'
    : 'hover:bg-white/20';

  return (
    <header
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-500 ease-in-out border-b',
        headerStyles,
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
      {/* Left Section - Logo & Menu */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Menu Toggle */}
        {onMenuToggle && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMenuToggle}
            className={cn(
              'md:hidden flex-shrink-0',
              textColor,
              iconButtonClasses
            )}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo */}
        <Link 
          to="/" 
          className={cn(
            'flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-90 group',
            'min-w-0 flex-shrink'
          )}
          aria-label="Chanuka home"
        >
          <ChanukaWordmark 
            size={140}
            color={logoVariant === 'white' ? 'white' : '#1a2e49'}
            className={cn(
              'filter drop-shadow-sm group-hover:drop-shadow-md transition-all',
              'flex-shrink-0'
            )}
          />
        </Link>
      </div>

      {/* Center Section - Desktop Search */}
      {showSearch && !isMobileSearchOpen && (
        <div 
          className={cn(
            'flex-1 max-w-md mx-4 hidden md:block transition-all duration-500',
            (!transparentOnTop || isScrolled) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-4 pointer-events-none'
          )}
        >
          <form onSubmit={handleSearch} className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search bills, topics, or representatives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 border rounded-full text-sm',
                'bg-gray-50/50 focus:bg-white',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
                'transition-all shadow-sm'
              )}
              aria-label="Search"
            />
          </form>
        </div>
      )}

      {/* Mobile Search Overlay */}
      {showSearch && isMobileSearchOpen && (
        <div className="absolute inset-x-0 top-full bg-white shadow-lg p-4 md:hidden">
          <form onSubmit={handleSearch} className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" 
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2 border rounded-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search"
            />
          </form>
        </div>
      )}

      {/* Right Section - Actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Mobile Search Toggle */}
        {showSearch && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={cn(
              'md:hidden',
              textColor,
              iconButtonClasses
            )}
            aria-label="Toggle search"
            aria-expanded={isMobileSearchOpen}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}

        {/* Language Switcher */}
        <div className="hidden sm:block">
          <LanguageSwitcher variant="compact" />
        </div>

        {/* Notifications */}
        {showNotifications && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onNotificationClick}
            className={cn(
              'relative transition-colors',
              textColor,
              iconButtonClasses
            )}
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  'absolute -top-1 -right-1 h-5 w-5',
                  'flex items-center justify-center p-0 text-xs',
                  'shadow-sm ring-2',
                  (!transparentOnTop || isScrolled) ? 'ring-white' : 'ring-white/20'
                )}
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>
        )}

        {/* User Menu */}
        {showUserMenu && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onUserMenuClick}
            className={cn(
              'transition-colors',
              textColor,
              iconButtonClasses
            )}
            aria-label="User menu"
            aria-haspopup="true"
          >
            <User className="h-5 w-5" />
          </Button>
        )}
      </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;