/**
 * MobileLayout - Lightweight layout orchestrator for mobile interfaces
 * Composes modular components to provide complete mobile UX shell
 */


import type { NavigationItem } from '@client/lib/config/navigation';
import React from 'react';

import { useDeviceInfo } from '@client/lib/hooks/mobile/useDeviceInfo';
import { useMobileNavigation } from '@client/lib/hooks/mobile/useMobileNavigation';
import { useScrollManager } from '@client/lib/hooks/mobile/useScrollManager';
import { OfflineStatusBanner } from '@client/lib/ui/mobile/feedback/OfflineStatusBanner';
import { PullToRefresh } from '@client/lib/ui/mobile/interaction/PullToRefresh';
import { ScrollToTopButton } from '@client/lib/ui/mobile/interaction/ScrollToTopButton';
import { MobileNavigation } from '@client/lib/ui/mobile/MobileNavigation';
import { cn } from '@client/lib/utils/cn';

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
        <MobileNavigation mode="both" items={customNavigationItems} onLogout={() => {}} />
      )}

      {showScrollToTop && <ScrollToTopButton />}
    </div>
  );
}
