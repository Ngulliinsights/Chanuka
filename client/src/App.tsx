import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/error-boundary';
import MobileNavigation from '@/components/layout/mobile-navigation';

// Pages
import HomePage from '@/pages/home';
import BillsDashboard from '@/pages/bills-dashboard';
import CommunityInput from '@/pages/community-input';
import Dashboard from '@/pages/dashboard';
import NotFound from '@/pages/not-found';
import BillDetail from '@/pages/bill-detail';
import BillAnalysis from '@/pages/bill-analysis';
import BillSponsorshipAnalysis from '@/pages/bill-sponsorship-analysis';
import ExpertVerification from '@/pages/expert-verification';
import AuthPage from '@/pages/auth-page';
import Profile from '@/pages/profile';
import Onboarding from '@/pages/onboarding';
import SearchPage from '@/pages/search';
import AdminPage from '@/pages/admin';
import UserProfilePage from '@/pages/user-profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  console.log('Rendering React application...');

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <MobileNavigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bills" element={<BillsDashboard />} />
              <Route path="/bills/:id" element={<BillDetail />} />
              <Route path="/bills/:id/analysis" element={<BillAnalysis />} />
              <Route path="/bill-sponsorship-analysis" element={<BillSponsorshipAnalysis />} />
              <Route path="/community" element={<CommunityInput />} />
              <Route path="/expert-verification" element={<ExpertVerification />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user-profile" element={<UserProfilePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </BrowserRouter>
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;