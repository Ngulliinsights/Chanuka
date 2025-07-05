import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import ErrorBoundary from './components/error-boundary';

// Layout components
import AppLayout from './components/layout/app-layout';

// Page components
import Home from './pages/home';
import BillsDashboard from './pages/bills-dashboard';
import CommunityInput from './pages/community-input';
import Dashboard from './pages/dashboard';

// Import CSS
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
          <div className="min-h-screen bg-background">
            <AppLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bills" element={<BillsDashboard />} />
                <Route path="/community-input" element={<CommunityInput />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </AppLayout>
          </div>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;