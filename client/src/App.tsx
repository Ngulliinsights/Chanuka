import { Suspense, useEffect } from 'react';

import { AppProviders } from '@client/app/providers/AppProviders';
import { AppRouter } from '@client/app/shell/AppRouter';
import { AppShell } from '@client/app/shell/AppShell';
import { ErrorBoundary } from '@client/infrastructure/error/components';
import { Toaster } from '@client/lib/design-system';
import { LoadingStates } from '@client/lib/ui/loading/LoadingStates';
import { logger } from '@client/lib/utils/logger';
import { FeedbackWidget } from '@client/lib/ui/feedback/FeedbackWidget';
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
        <FeedbackWidget position="bottom-right" />
      </ErrorBoundary>
    </AppProviders>
  );
}

export default App;
