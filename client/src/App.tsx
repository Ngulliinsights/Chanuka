import { Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Architecture Imports
import { AppProviders } from '@client/app/providers/AppProviders';
import AppRouter from '@client/app/shell/AppRouter'; // Connect the real router
import { AppShell } from '@client/app/shell/AppShell';
import { ErrorBoundary } from '@client/core/error/components';
import { Toaster } from '@client/shared/design-system';
import { LoadingStates } from '@client/shared/ui/loading/LoadingStates';
import { logger } from '@client/utils/logger';

function App() {
  useEffect(() => {
    logger.info('🚀 Client Application Initialized');
  }, []);

  return (
    <AppProviders>
      <BrowserRouter>
        <ErrorBoundary>
          {/* AppShell handles Layout, Nav, and Offline states */}
          <AppShell enableNavigation={true} enableThemeProvider={true}>
            <Suspense fallback={<LoadingStates.PageLoading />}>
              <AppRouter />
            </Suspense>
          </AppShell>
          <Toaster />
        </ErrorBoundary>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
