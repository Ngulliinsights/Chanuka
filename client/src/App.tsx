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
  const [isReady, setIsReady] = React.useState(false);

  console.log('Rendering React application...');

  React.useEffect(() => {
    console.log('React render complete');
    // Simple ready state management
    setTimeout(() => setIsReady(true), 100);
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Chanuka Platform...</p>
        </div>
      </div>
    );
  }

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