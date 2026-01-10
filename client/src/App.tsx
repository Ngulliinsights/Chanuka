import React, { Suspense, useEffect } from 'react';

import { AppProviders } from '@client/app/providers/AppProviders';
import { AppRouter } from '@client/app/shell/AppRouter'; // Connect the real router
import { AppShell } from '@client/app/shell/AppShell';
import { ErrorBoundary } from '@client/core/error/components';
import { Toaster } from '@client/shared/design-system';
import { LoadingStates } from '@client/shared/ui/loading/LoadingStates';
import { logger } from '@client/shared/utils/logger';

function App() {
  useEffect(() => {
    logger.info('🚀 Client Application Initialized');
  }, []);

  return (
    <AppProviders>
      <ErrorBoundary>
        {/* AppShell handles Layout, Nav, Router, and Offline states */}
        <AppShell enableNavigation={true} enableThemeProvider={true}>
          <Suspense fallback={<LoadingStates.PageLoading />}>
            <AppRouter />
          </Suspense>
        </AppShell>
        <Toaster />
      </ErrorBoundary>
    </AppProviders>
  );
}

export default App;
