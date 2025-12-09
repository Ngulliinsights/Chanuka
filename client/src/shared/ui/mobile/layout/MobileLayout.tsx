/**
 * MobileLayout - Lightweight layout orchestrator for mobile interfaces
 * Composes modular components to provide complete mobile UX shell
 */

import React from 'react';

import type { NavigationItem } from '../../../config';
import { useDeviceInfo } from '../../../hooks/mobile/useDeviceInfo';
import { useMobileNavigation } from '../../../hooks/mobile/useMobileNavigation';
import { useScrollManager } from '../../../hooks/mobile/useScrollManager';
import { cn } from '../../../lib/utils';
import { OfflineStatusBanner } from '../feedback/OfflineStatusBanner';
import { PullToRefresh } from '../interaction/PullToRefresh';
import { ScrollToTopButton } from '../interaction/ScrollToTopButton';
import { MobileNavigation } from '../MobileNavigation';

import { AutoHideHeader } from './AutoHideHeader';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
  showPullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  showScrollToTop?: boolean;
  customNavigationItems?: NavigationItem[];
}

export function MobileLayout({
  children,
  className,
  showNavigation = true,
  showPullToRefresh = false,
  onRefresh,
  showScrollToTop = true,
  customNavigationItems,
}: MobileLayoutProps): JSX.Element {
  const { isMobile } = useDeviceInfo();

  const { openDrawer } = useMobileNavigation();

  const { headerVisible } = useScrollManager({
    isEnabled: showNavigation && isMobile,
    showScrollToTop,
    scrollTopThreshold: 300,
    headerToggleThreshold: 10,
  });


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
        <MobileNavigation
          mode="both"
          items={customNavigationItems}
          onLogout={() => {}}
        />
      )}

      {showScrollToTop && <ScrollToTopButton />}
    </div>
  );
}
