
import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { BarChart3, X, Search, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../ui/logo';
import { 
  MobileHeaderProps, 
  NavigationItem, 
  LayoutError, 
  LayoutRenderError,
  validateNavigationItem,
  safeValidateNavigationItem
} from './index';

const DEFAULT_NAVIGATION: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <></> },
  { id: 'bills', label: 'Bills', href: '/bills', icon: <></> },
  { id: 'analysis', label: 'Analysis', href: '/analysis', icon: <></> },
  { id: 'sponsorship', label: 'Sponsorship', href: '/bill-sponsorship-analysis', icon: <></> },
  { id: 'verification', label: 'Verification', href: '/expert-verification', icon: <></> },
];

export function MobileHeader({ 
  title = "Chanuka", 
  showLogo = true, 
  showSearch = true, 
  showMenu = true,
  onMenuToggle,
  onSearchClick,
  className,
  leftActions = [],
  rightActions = []
}: MobileHeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [headerError, setHeaderError] = useState<LayoutError | null>(null);
  const [location] = useLocation();

  // Validate header actions
  useEffect(() => {
    const allActions = [...leftActions, ...rightActions];
    for (const action of allActions) {
      try {
        // Basic validation for header actions
        if (!action.id || !action.label || !action.onClick) {
          throw new Error(`Invalid header action: missing required properties`);
        }
      } catch (error) {
        const layoutError = new LayoutRenderError(
          `Header action validation failed: ${(error as Error).message}`,
          'MobileHeader',
          { action }
        );
        setHeaderError(layoutError);
        break;
      }
    }
  }, [leftActions, rightActions]);

  const handleMenuToggle = useCallback(() => {
    try {
      setIsMenuOpen(prev => !prev);
      onMenuToggle?.();
    } catch (error) {
      const layoutError = new LayoutRenderError(
        `Menu toggle failed: ${(error as Error).message}`,
        'MobileHeader'
      );
      setHeaderError(layoutError);
    }
  }, [onMenuToggle]);

  const handleSearchClick = useCallback(() => {
    try {
      onSearchClick?.();
    } catch (error) {
      const layoutError = new LayoutRenderError(
        `Search click failed: ${(error as Error).message}`,
        'MobileHeader'
      );
      setHeaderError(layoutError);
    }
  }, [onSearchClick]);

  // Error recovery
  const recoverFromError = useCallback(() => {
    setHeaderError(null);
    setIsMenuOpen(false);
  }, []);

  // Error boundary rendering
  if (headerError) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-red-600 text-sm">Header Error: {headerError.message}</span>
          <button
            onClick={recoverFromError}
            className="text-red-600 hover:text-red-800 text-sm underline"
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
      <>
        {/* Header */}
        <header className={cn("bg-card border-b border-border px-4 py-3", className)}>
          <div className="flex items-center justify-between">
            {/* Left side - Logo and left actions */}
            <div className="flex items-center gap-2">
              {showLogo && (
                <Logo 
                  size="md" 
                  showText={true}
                  textClassName="text-lg font-bold text-primary"
                />
              )}
              {!showLogo && title && (
                <h1 className="text-lg font-bold text-primary">{title}</h1>
              )}
              {leftActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "p-2 rounded-md hover:bg-muted transition-colors",
                    action.disabled && "opacity-50 cursor-not-allowed",
                    action.className
                  )}
                  type="button"
                  aria-label={action.label}
                  title={action.label}
                >
                  {action.icon}
                  {action.badge && action.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Right side - Search, menu, and right actions */}
            <div className="flex items-center gap-2">
              {rightActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    "p-2 rounded-md hover:bg-muted transition-colors relative",
                    action.disabled && "opacity-50 cursor-not-allowed",
                    action.className
                  )}
                  type="button"
                  aria-label={action.label}
                  title={action.label}
                >
                  {action.icon}
                  {action.badge && action.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </button>
              ))}
              
              {showSearch && (
                <button 
                  onClick={handleSearchClick}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                  type="button"
                  aria-label="Search"
                  title="Search"
                >
                  <Search className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
              
              {showMenu && (
                <button 
                  onClick={handleMenuToggle}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                  type="button"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                  title={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMenuOpen ? (
                    <X className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="bg-card border-b border-border">
            <nav className="px-4 py-2 space-y-1" role="navigation" aria-label="Mobile navigation">
              {DEFAULT_NAVIGATION.map((item) => {
                const is_active = location === item.href;
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      is_active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    aria-current={is_active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </>
    );
  } catch (error) {
    const layoutError = new LayoutRenderError(
      `Mobile header render failed: ${(error as Error).message}`,
      'MobileHeader'
    );
    setHeaderError(layoutError);
    return null;
  }
}

