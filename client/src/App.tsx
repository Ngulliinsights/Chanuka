// External dependencies first (React, React Router, etc.)
import { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Internal component imports - Updated to FSD structure
import { MobileHeader } from '@client/shared/ui/mobile/layout';
import { AppProviders } from '@client/app/providers/AppProviders';
import { ErrorBoundary } from '@client/core/error/components';
import { LoadingStates } from '@client/shared/ui/loading/LoadingStates';
import { OfflineProvider } from '@client/shared/ui/offline/offline-manager';
import { UserJourneyOptimizer } from '@client/shared/ui/onboarding/UserJourneyOptimizer';
import { CookieConsentBanner } from '@client/shared/ui/privacy/CookieConsentBanner';
import { Toaster } from '@client/shared/design-system/primitives/toaster';
import { UserAccountIntegration } from '@client/features/users/ui/profile/UserAccountIntegration';
import { useIsMobile } from '@client/hooks/use-mobile';
import { logger } from '@client/utils/logger';

function App() {
  const isMobile = useIsMobile();

  // Load user state on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Your initialization logic here
        logger.info('App initialized successfully');
      } catch (error) {
        logger.error('App initialization failed', { error });
      }
    };

    initializeApp();
  }, []);

  return (
    <BrowserRouter>
      <AppProviders>
        <ErrorBoundary>
          <CookieConsentBanner />
          <OfflineProvider>
            <div />
          </OfflineProvider>
          <UserJourneyOptimizer onPersonaSelected={() => {}} onSkip={() => {}} />
          <UserAccountIntegration>
            <div />
          </UserAccountIntegration>

          {isMobile && <MobileHeader />}

          <Suspense fallback={<LoadingStates.PageLoading />}>
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/about" element={<div>About Page</div>} />
            </Routes>
          </Suspense>

          <Toaster />
        </ErrorBoundary>
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;