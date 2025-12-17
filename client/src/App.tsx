// External dependencies first (React, React Router, etc.)
import { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Internal component imports - Updated to FSD structure
import { MobileHeader } from '@client/shared/ui/mobile/layout';
import { AppProviders } from '@client/app/providers/AppProviders';
import { ErrorBoundary } from '@client/core/error/components';
import { LoadingStates } from '@client/shared/ui/loading/LoadingStates';
import { OfflineProvider } from '@client/shared/ui/offline/offline-manager';
import { UserJourneyOptimizer } from '@client/features/users/ui/onboarding/UserJourneyOptimizer';
import { CookieConsentBanner } from '@client/features/security/ui/privacy/CookieConsentBanner';
import { Toaster, useBrandVoice, useLanguage } from '@client/shared/design-system';

import { useIsMobile } from '@client/hooks/use-mobile';
import { logger } from '@client/utils/logger';

/**
 * Main App Component
 * 
 * The App is wrapped by AppProviders in index.tsx, which includes:
 * - Redux store (for global state)
 * - React Query (for API data management)
 * - ChanukaProviders (brand voice, multilingual, bandwidth-aware rendering)
 * - Authentication, Theme, Accessibility providers
 * 
 * Design System Integration:
 * - BrandVoiceProvider: Provides microcopy, tone, and brand personality
 * - MultilingualProvider: Handles localization (English/Swahili)
 * - LowBandwidthProvider: Detects network speed and optimizes rendering
 * 
 * Usage in components:
 *   const { getMicrocopy } = useBrandVoice();
 *   const { language, setLanguage } = useLanguage();
 */
function App() {
  const isMobile = useIsMobile();
  const { getMicrocopy } = useBrandVoice();
  const { language } = useLanguage();

  // Load user state on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('App initialized', { language });
      } catch (error) {
        logger.error('App initialization failed', { error });
      }
    };

    initializeApp();
  }, [language]);

  return (
    <BrowserRouter>
      <AppProviders>
        <ErrorBoundary>
          <CookieConsentBanner />
          <OfflineProvider>
            <div />
          </OfflineProvider>
          <UserJourneyOptimizer onPersonaSelected={() => {}} onSkip={() => {}} />

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