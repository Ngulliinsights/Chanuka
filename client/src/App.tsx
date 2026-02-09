import React, { Suspense, useEffect } from 'react';

import { AppProviders } from '@client/app/providers/AppProviders';
import { AppRouter } from '@client/app/shell/AppRouter'; // Connect the real router
import { AppShell } from '@client/app/shell/AppShell';
import { BrandedFooter } from '@client/app/shell/BrandedFooter';
import { ErrorBoundary } from '@client/core/error/components';
import { Toaster } from '@client/lib/design-system';
import { LoadingStates } from '@client/lib/ui/loading/LoadingStates';
import { logger } from '@client/lib/utils/logger';

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
