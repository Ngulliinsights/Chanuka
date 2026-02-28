import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@client/infrastructure/auth';
import { logger } from '@client/lib/utils/logger';
import BrandedLoadingScreen from '@client/lib/ui/loading/BrandedLoadingScreen';

// Lazy load both implementations
const CoreHomePage = React.lazy(() => import('./core-home'));
const EnhancedHomePage = React.lazy(() => import('./HomePage'));

/**
 * Smart Home Page Selector
 * 
 * Determines which home page implementation to render based on:
 * 1. User preference (reduced motion)
 * 2. Device capabilities (implicity handled by reduced motion query for now)
 * 3. Potentially network speed or battery status in future iterations
 */
const SmartHomePageSelector: React.FC = () => {
  const [shouldUseCore, setShouldUseCore] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldUseCore(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setShouldUseCore(e.matches);
    mediaQuery.addEventListener('change', handler);

    logger.info('Smart Home Page Selector initialized', {
      mode: mediaQuery.matches ? 'Core (Basic)' : 'Enhanced (Additives)',
      userId: user?.id
    });

    return () => mediaQuery.removeEventListener('change', handler);
  }, [user]);

  return (
    <Suspense fallback={<BrandedLoadingScreen message="Loading home experience..." />}>
      {shouldUseCore ? <CoreHomePage /> : <EnhancedHomePage />}
    </Suspense>
  );
};

export default SmartHomePageSelector;