// External dependencies first (React, React Router, etc.)
import { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Internal component imports
import { AppProviders } from '@client/components/AppProviders';
import { ErrorBoundary } from '@client/components/error-handling/ErrorBoundary';
import { EnhancedUXIntegration } from '@client/components/integration/EnhancedUXIntegration';
import { LoadingStates } from '@client/components/loading/LoadingStates';
import { OfflineProvider } from '@client/components/offline/offline-manager';
import { UserJourneyOptimizer } from '@client/components/onboarding/UserJourneyOptimizer';
import { CookieConsentBanner } from '@client/components/privacy';
import { Toaster } from '@client/components/ui/toaster';
import { UserAccountIntegration } from '@client/components/user/UserAccountIntegration';
import { useIsMobile } from '@client/hooks/use-mobile';
import { logger } from '@client/utils/logger';

// Mobile components
import { BottomNavigationBar, MobileHeader } from '@/components/mobile/index';

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
          <EnhancedUXIntegration>
            <div />
          </EnhancedUXIntegration>

          {isMobile && <MobileHeader />}

          <Suspense fallback={<LoadingStates.PageLoading />}>
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/about" element={<div>About Page</div>} />
            </Routes>
          </Suspense>

          {isMobile && <BottomNavigationBar />}
          <Toaster />
        </ErrorBoundary>
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;