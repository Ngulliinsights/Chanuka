import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/error-boundary';

// Layout
import AppLayout from '@/components/layout/app-layout';

// Pages
import HomePage from '@/pages/home';
import BillsDashboard from '@/pages/bills-dashboard';
import Dashboard from '@/pages/dashboard';
import CommunityInputPage from '@/pages/community-input';
import NotFoundPage from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  console.log('Rendering React application...');

  React.useEffect(() => {
    console.log('React render complete');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bills" element={<BillsDashboard />} />
              <Route path="/community" element={<CommunityInputPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppLayout>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;