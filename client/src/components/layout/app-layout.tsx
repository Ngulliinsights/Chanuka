import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useUnifiedNavigation } from '@/hooks/use-unified-navigation';
import { useNavigationPerformance, useSmoothTransition } from '@/hooks/use-navigation-performance';
import { useNavigationAccessibility, useNavigationKeyboardShortcuts } from '@/hooks/use-navigation-accessibility';
import DesktopSidebar from '@/components/navigation/DesktopSidebar';
import MobileNavigation from '@/components/layout/mobile-navigation';
import { SkipLink, useAccessibility } from '@/components/accessibility/accessibility-manager';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { isMobile, mounted, sidebarCollapsed } = useUnifiedNavigation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousIsMobile, setPreviousIsMobile] = useState<boolean | null>(null);
  
  // Performance and accessibility hooks
  const { 
    startTransition, 
    endTransition, 
    enableGPUAcceleration, 
    disableGPUAcceleration,
    isTransitioning: perfIsTransitioning 
  } = useNavigationPerformance();
  
  const { 
    announce, 
    handleKeyboardNavigation, 
    generateSkipLinks, 
    handleRouteChange,
    getAriaAttributes 
  } = useNavigationAccessibility();
  
  const { registerShortcut } = useNavigationKeyboardShortcuts();
  const smoothTransition = useSmoothTransition(300);
  
  // Refs for accessibility and performance
  const layoutRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  
  // Performance optimization: Memoize main content classes
  const mainContentClasses = useCallback(() => {
    if (isMobile) {
      return "flex-1 flex flex-col chanuka-content-transition";
    }
    
    // Desktop: adjust for sidebar width with smooth transitions
    const sidebarWidth = sidebarCollapsed ? 'ml-16' : 'ml-64';
    return `flex-1 flex flex-col chanuka-content-transition ${sidebarWidth}`;
  }, [isMobile, sidebarCollapsed]);
  
  // Accessibility: Skip link handler
  const handleSkipToContent = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainContentRef.current?.focus();
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  // Accessibility: Keyboard navigation for layout
  const handleLayoutKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Alt + M to focus main content
    if (event.altKey && event.key === 'm') {
      event.preventDefault();
      mainContentRef.current?.focus();
    }
    
    // Alt + N to focus navigation (if not mobile)
    if (event.altKey && event.key === 'n' && !isMobile) {
      event.preventDefault();
      const sidebarNav = document.querySelector('[role="navigation"][aria-label="Main navigation"]');
      if (sidebarNav) {
        (sidebarNav as HTMLElement).focus();
      }
    }
  }, [isMobile]);

  // Handle responsive breakpoint transitions with performance optimization
  useEffect(() => {
    if (mounted && previousIsMobile !== null && previousIsMobile !== isMobile) {
      // Start performance-optimized transition
      startTransition(300);
      smoothTransition.start();
      setIsTransitioning(true);
      
      // Announce layout change to screen readers
      announce(`Layout changed to ${isMobile ? 'mobile' : 'desktop'} view`);
      
      // Enable GPU acceleration during transition
      if (layoutRef.current) {
        enableGPUAcceleration(layoutRef.current);
      }
      
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        endTransition();
        
        // Disable GPU acceleration after transition
        if (layoutRef.current) {
          disableGPUAcceleration(layoutRef.current);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
    
    if (mounted) {
      setPreviousIsMobile(isMobile);
    }
  }, [isMobile, mounted, previousIsMobile, startTransition, endTransition, enableGPUAcceleration, disableGPUAcceleration, announce, smoothTransition]);

  // Register keyboard shortcuts for navigation
  useEffect(() => {
    const unregisterShortcuts = [
      // Alt + M to focus main content
      registerShortcut('m', () => {
        mainContentRef.current?.focus();
        announce('Focused main content');
      }, { alt: true }),
      
      // Alt + N to focus navigation
      registerShortcut('n', () => {
        if (!isMobile) {
          const sidebarNav = document.querySelector('[role="navigation"][aria-label="Main navigation"]');
          if (sidebarNav) {
            (sidebarNav as HTMLElement).focus();
            announce('Focused navigation menu');
          }
        }
      }, { alt: true }),
      
      // Alt + S to focus search (if available)
      registerShortcut('s', () => {
        const searchInput = document.querySelector('input[type="search"], [role="searchbox"]');
        if (searchInput) {
          (searchInput as HTMLElement).focus();
          announce('Focused search');
        }
      }, { alt: true })
    ];
    
    return () => {
      unregisterShortcuts.forEach(unregister => unregister());
    };
  }, [registerShortcut, isMobile, announce]);

  // Prevent layout shift during hydration with proper SSR placeholder
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* SSR Placeholder - matches expected desktop layout */}
          <div className="hidden lg:block w-64 bg-white border-r border-gray-200 transition-all duration-300" />
          
          {/* Main content area with proper spacing */}
          <div className="flex-1 flex flex-col">
            {/* Mobile header placeholder */}
            <div className="lg:hidden bg-white border-b border-gray-200 h-16" />
            
            {/* Main content */}
            <main className="flex-1 min-h-screen">
              {children}
            </main>
            
            {/* Footer placeholder */}
            <footer className="bg-white border-t mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center text-gray-600">
                  <p>&copy; 2024 Chanuka Platform. Promoting transparent governance.</p>
                </div>
              </div>
            </footer>
            
            {/* Mobile bottom nav placeholder */}
            <div className="lg:hidden h-16 bg-white border-t" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate main content margin based on sidebar state
  const getMainContentClasses = () => {
    if (isMobile) {
      return "flex-1 flex flex-col chanuka-content-transition";
    }
    
    // Desktop: adjust for sidebar width with smooth transitions
    const sidebarWidth = sidebarCollapsed ? 'ml-16' : 'ml-64';
    return `flex-1 flex flex-col chanuka-content-transition ${sidebarWidth}`;
  };

  const { announceToScreenReader } = useAccessibility();

  // Announce layout changes to screen readers
  useEffect(() => {
    if (mounted && previousIsMobile !== null && previousIsMobile !== isMobile) {
      announceToScreenReader(`Layout changed to ${isMobile ? 'mobile' : 'desktop'} view`);
    }
  }, [isMobile, mounted, previousIsMobile, announceToScreenReader]);

  return (
    <div 
      ref={layoutRef}
      className="chanuka-layout-stable min-h-screen bg-gray-50"
      onKeyDown={handleLayoutKeyDown}
    >
      {/* Skip Links for Accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      <SkipLink href="#search">Skip to search</SkipLink>
      
      <div className="relative chanuka-layout-transition">
        {/* Desktop Sidebar - Fixed positioning for smooth transitions */}
        {!isMobile && (
          <div className="fixed top-0 left-0 h-full z-30">
            <DesktopSidebar className={`chanuka-sidebar-transition ${
              isTransitioning ? 'opacity-90' : 'opacity-100'
            }`} />
          </div>
        )}
        
        {/* Main content area with responsive positioning */}
        <div className={mainContentClasses()}>
          {/* Mobile Navigation - Only shown on mobile */}
          {isMobile && (
            <div className={`chanuka-layout-transition ${
              isTransitioning ? 'chanuka-mobile-nav-enter-active opacity-90' : 'opacity-100'
            }`}>
              <MobileNavigation />
            </div>
          )}
          
          {/* Main Content with proper spacing and transitions */}
          <main 
            ref={mainContentRef}
            id="main-content"
            className={`flex-1 overflow-auto chanuka-content-transition ${
              isMobile ? 'pb-16' : 'min-h-screen'
            } ${isTransitioning ? 'opacity-95' : 'opacity-100'}`}
            role="main"
            aria-label="Main content"
            tabIndex={-1}
          >
            <div className="w-full">
              {children}
            </div>
          </main>
          
          {/* Footer with responsive behavior */}
          <footer 
            className={`bg-white border-t mt-auto chanuka-layout-transition ${
              isMobile ? 'mb-16' : ''
            }`}
            role="contentinfo"
            aria-label="Site footer"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-gray-600">
                <p>&copy; 2024 Chanuka Platform. Promoting transparent governance.</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;