/**
 * MobileLayout - Lightweight layout orchestrator for mobile interfaces
 * Composes modular components to provide complete mobile UX shell
 */

import React, { useCallback, useState } from 'react';

import type { NavigationItem } from '../../../config/navigation';
import { useMobileNavigation } from '../../../hooks/mobile/useMobileNavigation';
import { useScrollManager } from '../../../hooks/mobile/useScrollManager';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { cn } from '../../../lib/utils';
import { OfflineStatusBanner } from '../feedback/OfflineStatusBanner';
import { PullToRefresh } from '../interaction/PullToRefresh';
import { ScrollToTopButton } from '../interaction/ScrollToTopButton';

import { AutoHideHeader } from './AutoHideHeader';
import { BottomNavigationBar } from './BottomNavigationBar';
import { NavigationDrawer } from './NavigationDrawer';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
  showPullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  showScrollToTop?: boolean;
  customNavigationItems?: NavigationItem[];
  onNavigationClick?: (itemId: string) => void;
}

export function MobileLayout({
  children,
  className,
  showNavigation = true,
  showPullToRefresh = false,
  onRefresh,
  showScrollToTop = true,
  customNavigationItems,
  onNavigationClick,
}: MobileLayoutProps): JSX.Element {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [activeNavItemId, setActiveNavItemId] = useState<string>();
  const { isDrawerOpen, openDrawer, closeDrawer } = useMobileNavigation();

  const { headerVisible } = useScrollManager({
    isEnabled: showNavigation && isMobile,
    showScrollToTop,
    scrollTopThreshold: 300,
    headerToggleThreshold: 10,
  });

  const handleNavigationClick = useCallback(
    (itemId: string) => {
      setActiveNavItemId(itemId);
      onNavigationClick?.(itemId);
      closeDrawer();
    },
    [onNavigationClick, closeDrawer]
  );

  if (!isMobile) {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        {children}
        {showScrollToTop && <ScrollToTopButton />}
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <OfflineStatusBanner />
      
      {showPullToRefresh && onRefresh ? (
        <PullToRefresh onRefresh={onRefresh}>
          <AutoHideHeader
            visible={headerVisible}
            onMenuClick={openDrawer}
            showFilterButton={false}
          />
          <main className="pb-20 px-4 py-6">{children}</main>
        </PullToRefresh>
      ) : (
        <>
          <AutoHideHeader
            visible={headerVisible}
            onMenuClick={openDrawer}
            showFilterButton={false}
          />
          <main className="pb-20 px-4 py-6">{children}</main>
        </>
      )}

      {showNavigation && (
        <>
          <NavigationDrawer
            isOpen={isDrawerOpen}
            onClose={closeDrawer}
            navigationItems={customNavigationItems}
            onNavigationClick={handleNavigationClick}
            activeItemId={activeNavItemId}
          />
          <BottomNavigationBar
            items={customNavigationItems}
            activeId={activeNavItemId}
            onNavigate={handleNavigationClick}
          />
        </>
      )}

      {showScrollToTop && <ScrollToTopButton />}
    </div>
  );
}
